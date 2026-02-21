
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'starcon-super-secret-key';
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
const GEMINI_AUDIO_MODEL = 'gemini-2.5-flash-preview-tts';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || '';
const HUGGINGFACE_MUSIC_MODEL = 'facebook/musicgen-small';
const MAX_WORDS_PER_TRACK = 12;
const db = new Database('starcon.db');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    avatar_url TEXT,
    anthem_url TEXT
  );
  CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    word TEXT,
    translation TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS completed_sectors (
    user_id INTEGER,
    sector_id TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, sector_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS radio_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    style TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS radio_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    channel_id INTEGER,
    title TEXT NOT NULL,
    style TEXT,
    prompt TEXT,
    words_script TEXT,
    source TEXT,
    audio_base64 TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(channel_id) REFERENCES radio_channels(id)
  );
`);

// Helper to add columns if they don't exist (for existing DBs)
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN anthem_url TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE radio_tracks ADD COLUMN words_script TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE radio_tracks ADD COLUMN source TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE radio_tracks ADD COLUMN prompt TEXT;");
} catch (e) {}

const buildWordsScript = (words: Array<{ word: string; translation?: string }>) => {
  return words
    .slice(0, MAX_WORDS_PER_TRACK)
    .map((w) => `${w.word}${w.translation ? ` significa ${w.translation}` : ''}`)
    .join('. ');
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const encodeWavBase64 = (samples: Int16Array, sampleRate: number) => {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM header size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byteRate
  buffer.writeUInt16LE(2, 32); // blockAlign
  buffer.writeUInt16LE(16, 34); // bitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  return buffer.toString('base64');
};

const generateFallbackRetroLoop = (style: string, wordsScript: string) => {
  const sampleRate = 24000;
  const durationSec = 15;
  const totalSamples = sampleRate * durationSec;
  const samples = new Int16Array(totalSamples);
  const seed = hashString(`${style}|${wordsScript || ''}`) || 12345;
  const rand = mulberry32(seed);

  const scales: Record<string, number[]> = {
    jazz: [220, 247, 277, 330, 370, 415],
    beats: [196, 220, 247, 262, 294, 330],
    ambient: [174, 196, 220, 247, 294, 330],
    rock: [196, 220, 247, 294, 330, 392],
    dark: [110, 123, 147, 165, 185, 220],
    default: [196, 220, 247, 294, 330, 392],
  };

  const styleKey = (() => {
    const lower = style.toLowerCase();
    if (lower.includes('jazz')) return 'jazz';
    if (lower.includes('beat')) return 'beats';
    if (lower.includes('ambient')) return 'ambient';
    if (lower.includes('rock')) return 'rock';
    if (lower.includes('dark')) return 'dark';
    return 'default';
  })();

  const notes = scales[styleKey] || scales.default;
  const bpm = styleKey === 'ambient' ? 85 : styleKey === 'rock' ? 128 : 112;
  const beatsPerSec = bpm / 60;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beat = Math.floor(t * beatsPerSec);
    const step = beat % notes.length;
    const phaseInBeat = (t * beatsPerSec) % 1;
    const note = notes[step] * (1 + ((step % 3) - 1) * 0.01);
    const bassNote = notes[(step + notes.length - 2) % notes.length] / 2;

    const env = Math.exp(-phaseInBeat * 5);
    const leadSine = Math.sin(2 * Math.PI * note * t);
    const leadSquare = Math.sign(Math.sin(2 * Math.PI * (note * 0.5) * t)) * 0.25;
    const bass = Math.sin(2 * Math.PI * bassNote * t) * 0.35;

    const kickEnv = Math.exp(-((t * beatsPerSec) % 1) * 15);
    const kick = Math.sin(2 * Math.PI * 48 * t) * kickEnv * 0.5;
    const hatGate = (beat % 2 === 0 && phaseInBeat < 0.08) ? 1 : 0;
    const hat = (rand() * 2 - 1) * hatGate * 0.12;

    let sample = (leadSine * 0.45 + leadSquare + bass) * env + kick + hat;
    sample = Math.max(-1, Math.min(1, sample));
    samples[i] = Math.floor(sample * 32767);
  }

  return encodeWavBase64(samples, sampleRate);
};

const extractBase64Audio = (response: any): string | null => {
  const candidates = response?.candidates ?? [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  }
  return null;
};

let geminiBackoffUntil = 0;

const isQuotaError = (message: string) => /quota|resource_exhausted|429/i.test(message);

const parseRetrySeconds = (message: string) => {
  const match = message.match(/retry in ([\d.]+)s/i);
  return match ? Number(match[1]) : 20;
};

const buildMusicPrompt = (style: string, wordsScript: string) => {
  return `Create a retro 1990s space-adventure radio track.
  Style: ${style}.
  Mood: melodic, catchy, game-like, inspired by Space Quest style.
  Include this vocabulary as sung or chanted words in Spanish pronunciation:
  ${wordsScript || 'cosmic, station, sector, signal'}.
  Keep it around 12-15 seconds. No explanation text, only performance audio.`;
};

const buildHuggingFacePrompt = (style: string, wordsScript: string) => {
  return `Retro 1990s space game soundtrack, style ${style}, melodic and catchy.
  Include vocal-like melodic motifs inspired by these words: ${wordsScript}.`;
};

const toBase64FromArrayBuffer = (audioBuffer: ArrayBuffer) => {
  return Buffer.from(audioBuffer).toString('base64');
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateTrackAudioWithHuggingFace = async (style: string, wordsScript: string) => {
  if (!HUGGINGFACE_API_KEY) return null;

  let lastError = 'Unknown error';

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${HUGGINGFACE_MUSIC_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'audio/wav',
        },
        body: JSON.stringify({
          inputs: buildHuggingFacePrompt(style, wordsScript),
          parameters: {
            guidance_scale: 3,
            max_new_tokens: 1024,
          },
        }),
      }
    );

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        const text = await response.text();
        throw new Error(`Hugging Face respondió sin audio: ${text}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return toBase64FromArrayBuffer(arrayBuffer);
    }

    const text = await response.text();
    lastError = `Hugging Face error: ${response.status} ${text}`;
    if (response.status === 503 && attempt === 0) {
      // Model cold start: wait and retry once.
      await sleep(3000);
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
};

const generateTrackAudio = async (style: string, wordsScript: string) => {
  const fallbackAudio = generateFallbackRetroLoop(style, wordsScript);

  if (!GEMINI_API_KEY) {
    return {
      audioBase64: fallbackAudio,
      source: 'fallback-synth',
      warning: 'No se encontró API key de Gemini. Se usó generador local.',
    };
  }

  if (Date.now() < geminiBackoffUntil) {
    const seconds = Math.ceil((geminiBackoffUntil - Date.now()) / 1000);
    if (HUGGINGFACE_API_KEY) {
      try {
        const hfAudio = await generateTrackAudioWithHuggingFace(style, wordsScript);
        if (hfAudio) {
          return {
            audioBase64: hfAudio,
            source: 'huggingface-musicgen',
            warning: `Gemini en espera por cuota. Se usó Hugging Face MusicGen (${seconds}s).`,
          };
        }
      } catch (error) {
        console.error('Hugging Face fallback failed:', error);
      }
    }
    return {
      audioBase64: fallbackAudio,
      source: 'fallback-synth',
      warning: `Gemini en espera por cuota. Reintenta IA en ~${seconds}s.`,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = buildMusicPrompt(style, wordsScript);
    const response = await ai.models.generateContent({
      model: GEMINI_AUDIO_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
    });

    const base64Audio = extractBase64Audio(response);
    if (!base64Audio) {
      return {
        audioBase64: fallbackAudio,
        source: 'fallback-synth',
        warning: 'La IA no devolvió audio. Se usó generador local.',
      };
    }

    return {
      audioBase64: base64Audio,
      source: 'gemini-tts',
      warning: null as string | null,
    };
  } catch (error: any) {
    const message = error?.message || String(error || '');
    if (isQuotaError(message)) {
      const retrySeconds = parseRetrySeconds(message);
      geminiBackoffUntil = Date.now() + retrySeconds * 1000;
      if (HUGGINGFACE_API_KEY) {
        try {
          const hfAudio = await generateTrackAudioWithHuggingFace(style, wordsScript);
          if (hfAudio) {
            return {
              audioBase64: hfAudio,
              source: 'huggingface-musicgen',
              warning: `Cuota Gemini agotada. Se usó Hugging Face MusicGen (${retrySeconds}s).`,
            };
          }
        } catch (hfError) {
          console.error('Hugging Face fallback failed:', hfError);
        }
      }
      return {
        audioBase64: fallbackAudio,
        source: 'fallback-synth',
        warning: `Cuota de IA agotada. Se usó música local temporalmente (${retrySeconds}s).`,
      };
    }

    if (HUGGINGFACE_API_KEY) {
      try {
        const hfAudio = await generateTrackAudioWithHuggingFace(style, wordsScript);
        if (hfAudio) {
          return {
            audioBase64: hfAudio,
            source: 'huggingface-musicgen',
            warning: 'Gemini falló. Se usó Hugging Face MusicGen.',
          };
        }
      } catch (hfError) {
        console.error('Hugging Face fallback failed:', hfError);
      }
    }

    return {
      audioBase64: fallbackAudio,
      source: 'fallback-synth',
      warning: 'Error de IA. Se usó música local temporalmente.',
    };
  }
};

const getOrCreateUserChannel = (userId: number, name?: string, style?: string) => {
  let channel: any = db
    .prepare('SELECT id, user_id, name, style, created_at, updated_at FROM radio_channels WHERE user_id = ?')
    .get(userId);

  const safeName = (name || 'Canal Personal').toString().slice(0, 80);
  const safeStyle = (style || 'Monolith Burger Jazz').toString().slice(0, 120);

  if (!channel) {
    const info = db
      .prepare('INSERT INTO radio_channels (user_id, name, style) VALUES (?, ?, ?)')
      .run(userId, safeName, safeStyle);
    channel = db
      .prepare('SELECT id, user_id, name, style, created_at, updated_at FROM radio_channels WHERE id = ?')
      .get(info.lastInsertRowid);
    return channel;
  }

  if (name !== undefined || style !== undefined) {
    db.prepare('UPDATE radio_channels SET name = ?, style = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .run(safeName, safeStyle, userId);
    channel = db
      .prepare('SELECT id, user_id, name, style, created_at, updated_at FROM radio_channels WHERE user_id = ?')
      .get(userId);
  }

  return channel;
};

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // WebSocket broadcast
  const broadcast = (data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Token inválido' });
      req.user = user;
      next();
    });
  };

  // API Routes
  app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
      const token = jwt.sign({ id: info.lastInsertRowid, username }, JWT_SECRET);
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ id: info.lastInsertRowid, username });
    } catch (err) {
      res.status(400).json({ error: 'El usuario ya existe' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ id: user.id, username: user.username });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    const user: any = db.prepare('SELECT id, username, avatar_url, anthem_url FROM users WHERE id = ?').get(req.user.id);
    res.json(user);
  });

  app.post('/api/profile', authenticateToken, (req: any, res) => {
    const { avatar_url, anthem_url } = req.body;
    if (avatar_url !== undefined) {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatar_url, req.user.id);
    }
    if (anthem_url !== undefined) {
      db.prepare('UPDATE users SET anthem_url = ? WHERE id = ?').run(anthem_url, req.user.id);
    }
    res.json({ success: true });
  });

  app.get('/api/words', authenticateToken, (req: any, res) => {
    const words = db.prepare('SELECT * FROM words WHERE user_id = ?').all(req.user.id);
    res.json(words);
  });

  app.post('/api/words', authenticateToken, (req: any, res) => {
    const { id, word, translation } = req.body;
    db.prepare('INSERT INTO words (id, user_id, word, translation) VALUES (?, ?, ?, ?)').run(id, req.user.id, word, translation);
    res.json({ id, word, translation });
  });

  app.delete('/api/words/:id', authenticateToken, (req: any, res) => {
    db.prepare('DELETE FROM words WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  app.get('/api/sectors', authenticateToken, (req: any, res) => {
    const sectors = db.prepare('SELECT sector_id FROM completed_sectors WHERE user_id = ?').all(req.user.id);
    res.json(sectors.map((s: any) => s.sector_id));
  });

  app.post('/api/sectors/complete', authenticateToken, (req: any, res) => {
    const { sector_id } = req.body;
    try {
      db.prepare('INSERT OR IGNORE INTO completed_sectors (user_id, sector_id) VALUES (?, ?)').run(req.user.id, sector_id);
      broadcast({ type: 'MISSION_COMPLETE', username: req.user.username, sector_id });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Error al registrar sector' });
    }
  });

  app.get('/api/radio/channel', authenticateToken, (req: any, res) => {
    const channel = getOrCreateUserChannel(req.user.id);
    const tracks = db
      .prepare(
        `SELECT id, channel_id, title, style, prompt, words_script, source, audio_base64, created_at
         FROM radio_tracks
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(req.user.id);

    res.json({ channel, tracks });
  });

  app.post('/api/radio/channel', authenticateToken, (req: any, res) => {
    const { name, style } = req.body;
    const channel = getOrCreateUserChannel(req.user.id, name, style);
    res.json(channel);
  });

  app.post('/api/radio/tune', authenticateToken, async (req: any, res) => {
    try {
      const { style, words = [] } = req.body || {};
      const normalizedWords = Array.isArray(words)
        ? words
            .map((w: any) => ({
              word: String(w?.word || '').trim(),
              translation: String(w?.translation || '').trim(),
            }))
            .filter((w: any) => w.word.length > 0)
            .slice(0, MAX_WORDS_PER_TRACK)
        : [];

      const styleName = (style || 'Monolith Burger Jazz').toString().slice(0, 120);
      const wordsScript =
        buildWordsScript(normalizedWords) ||
        'sector, estación, misión, galaxia, señal, nave';
      const generated = await generateTrackAudio(styleName, wordsScript);

      res.json({
        audio_base64: generated.audioBase64,
        source: generated.source,
        warning: generated.warning,
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'No se pudo sintonizar la estación.' });
    }
  });

  app.post('/api/radio/tracks', authenticateToken, (req: any, res) => {
    const {
      title,
      style,
      prompt,
      words_script,
      audio_base64,
      channel_name,
    } = req.body || {};

    if (!audio_base64 || typeof audio_base64 !== 'string') {
      return res.status(400).json({ error: 'audio_base64 es obligatorio.' });
    }

    const channel = getOrCreateUserChannel(req.user.id, channel_name, style);
    const safeTitle = (title || `Pista ${new Date().toLocaleString()}`).toString().slice(0, 100);
    const safeStyle = (style || channel.style || 'Monolith Burger Jazz').toString().slice(0, 120);
    const safePrompt = prompt ? String(prompt).slice(0, 800) : '';
    const safeWordsScript = words_script ? String(words_script).slice(0, 1200) : '';

    const info = db.prepare(
      `INSERT INTO radio_tracks (user_id, channel_id, title, style, prompt, words_script, source, audio_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.user.id,
      channel.id,
      safeTitle,
      safeStyle,
      safePrompt,
      safeWordsScript,
      'manual',
      audio_base64
    );

    const track = db.prepare(
      `SELECT id, channel_id, title, style, prompt, words_script, source, audio_base64, created_at
       FROM radio_tracks WHERE id = ?`
    ).get(info.lastInsertRowid);

    res.json({ track, warning: null });
  });

  app.post('/api/radio/tracks/generate', authenticateToken, async (req: any, res) => {
    try {
      const { title, style, words = [], channel_name } = req.body || {};
      const normalizedWords = Array.isArray(words)
        ? words
            .map((w: any) => ({
              word: String(w?.word || '').trim(),
              translation: String(w?.translation || '').trim(),
            }))
            .filter((w: any) => w.word.length > 0)
            .slice(0, MAX_WORDS_PER_TRACK)
        : [];

      if (normalizedWords.length === 0) {
        return res.status(400).json({ error: 'Se requieren palabras para componer la canción.' });
      }

      const channel = getOrCreateUserChannel(req.user.id, channel_name, style);
      const styleName = (style || channel.style || 'Monolith Burger Jazz').toString().slice(0, 120);
      const wordsScript = buildWordsScript(normalizedWords);
      const prompt = buildMusicPrompt(styleName, wordsScript);
      const generated = await generateTrackAudio(styleName, wordsScript);

      const safeTitle = (title || `Learning Jam ${new Date().toLocaleTimeString()}`).toString().slice(0, 100);

      const info = db.prepare(
        `INSERT INTO radio_tracks (user_id, channel_id, title, style, prompt, words_script, source, audio_base64)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        req.user.id,
        channel.id,
        safeTitle,
        styleName,
        prompt,
        wordsScript,
        generated.source,
        generated.audioBase64
      );

      const track = db.prepare(
        `SELECT id, channel_id, title, style, prompt, words_script, source, audio_base64, created_at
         FROM radio_tracks WHERE id = ?`
      ).get(info.lastInsertRowid);

      res.json({ track, warning: generated.warning });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'No se pudo generar la pista.' });
    }
  });

  app.delete('/api/radio/tracks/:id', authenticateToken, (req: any, res) => {
    db.prepare('DELETE FROM radio_tracks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();


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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'starcon-super-secret-key';
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
`);

// Helper to add columns if they don't exist (for existing DBs)
try {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
} catch (e) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN anthem_url TEXT;");
} catch (e) {}

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

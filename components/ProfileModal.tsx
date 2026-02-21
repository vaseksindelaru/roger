
import React, { useState, useRef, useEffect } from 'react';
import { RadioTrack, WordItem } from '../types';
import { generateRetroAvatar } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';
import {
  addTrackToRadioChannel,
  deleteRadioTrack,
  fetchRadioChannel,
  generateLearningTrack,
  saveRadioChannel,
  tuneRadioStation,
} from '../services/radioService';

interface ProfileModalProps {
  user: any;
  words: WordItem[];
  onClose: () => void;
  onUpdate: (data: any) => void;
  isDarkMode: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, words, onClose, onUpdate, isDarkMode }) => {
  const [avatar, setAvatar] = useState(user.avatar_url || '');
  const [avatarNotice, setAvatarNotice] = useState('');
  const [radioAudio, setRadioAudio] = useState(user.anthem_url || '');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewRadio, setPreviewRadio] = useState<string | null>(null);
  const [radioError, setRadioError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSource, setCurrentSource] = useState<AudioBufferSourceNode | null>(null);
  const [selectedStation, setSelectedStation] = useState('Monolith Burger Jazz');
  const [channelName, setChannelName] = useState(`${user.username} FM`);
  const [channelTracks, setChannelTracks] = useState<RadioTrack[]>([]);
  const [trackTitle, setTrackTitle] = useState('Learning Jam');
  const [channelWarning, setChannelWarning] = useState('');
  const [isChannelLoading, setIsChannelLoading] = useState(false);
  const [isGeneratingTrack, setIsGeneratingTrack] = useState(false);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const [lyricsNow, setLyricsNow] = useState('');
  const chantTimeoutRef = useRef<number | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stations = ['Monolith Burger Jazz', 'Xenon City Beats', 'Estraana Ambient', 'Galaxy Gallop Rock', 'Vohaul Dark Signal'];

  useEffect(() => {
    const loadChannel = async () => {
      setIsChannelLoading(true);
      try {
        const data = await fetchRadioChannel();
        if (data?.channel?.name) setChannelName(data.channel.name);
        if (data?.channel?.style) setSelectedStation(data.channel.style);
        setChannelTracks(data?.tracks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsChannelLoading(false);
      }
    };
    loadChannel();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount: stop all audio and clear timeouts
      if (chantTimeoutRef.current) {
        window.clearTimeout(chantTimeoutRef.current);
        chantTimeoutRef.current = null;
      }
      currentSourceRef.current = null;
      stopChant();
      soundManager.stopAllAudio();
    };
  }, []);

  const playRadioAudio = async (audioData: string, options?: { loop?: boolean; clearTrackOnEnded?: boolean }) => {
    // Stop any currently playing audio first to prevent overlapping
    soundManager.stopBackgroundMusic();
    currentSourceRef.current = null;
    setCurrentSource(null);
    
    const source = await soundManager.playBackgroundMusic(audioData, {
      loop: options?.loop ?? true,
      onEnded: () => {
        // Only clear if this source is still the current one
        if (currentSourceRef.current === source) {
          currentSourceRef.current = null;
          setIsPlaying(false);
          setCurrentSource(null);
        }
        if (options?.clearTrackOnEnded) {
          setPlayingTrackId(null);
          stopChant();
          setLyricsNow('');
        }
      },
    });
    if (source) {
      currentSourceRef.current = source;
      setCurrentSource(source);
      setIsPlaying(true);
    }
  };

  const stopChant = () => {
    if (chantTimeoutRef.current) {
      window.clearTimeout(chantTimeoutRef.current);
      chantTimeoutRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const toChantTokens = (script: string): string[] => {
    return script
      .split('.')
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        const [word, translation] = line.split(' significa ').map((v) => v?.trim());
        const values = [word, translation].filter((v): v is string => !!v && v.length > 0);
        return values;
      })
      .slice(0, 24);
  };

  const chantWordsScript = (script: string) => {
    if (!script || !('speechSynthesis' in window)) return;
    const tokens = toChantTokens(script);
    if (!tokens.length) return;

    stopChant();
    setLyricsNow(tokens.join(' • '));

    let index = 0;
    const speakNext = () => {
      const token = tokens[index % tokens.length];
      index += 1;
      const utterance = new SpeechSynthesisUtterance(token);
      utterance.lang = 'es-ES';
      utterance.rate = 1.06;
      utterance.pitch = 1.05;
      utterance.volume = 0.8;
      utterance.onend = () => {
        chantTimeoutRef.current = window.setTimeout(speakNext, 120);
      };
      utterance.onerror = () => {
        chantTimeoutRef.current = window.setTimeout(speakNext, 200);
      };
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const getErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
    return raw || 'No se pudo sintonizar la estación.';
  };

  const fitAvatarToFrame = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 128;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo crear canvas de ajuste.');

          ctx.imageSmoothingEnabled = false;
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              ctx.fillStyle = (x + y) % 2 === 0 ? '#12203b' : '#172849';
              ctx.fillRect(x, y, 1, 1);
            }
          }

          const maxDim = 112;
          const scale = Math.min(maxDim / img.width, maxDim / img.height);
          const dw = Math.max(1, Math.floor(img.width * scale));
          const dh = Math.max(1, Math.floor(img.height * scale));
          const dx = Math.floor((size - dw) / 2);
          const dy = Math.floor((size - dh) / 2) - 2;
          ctx.drawImage(img, dx, dy, dw, dh);

          ctx.fillStyle = '#0a111f';
          ctx.fillRect(0, 0, size, 2);
          ctx.fillRect(0, size - 2, size, 2);
          ctx.fillRect(0, 0, 2, size);
          ctx.fillRect(size - 2, 0, 2, size);
          ctx.fillStyle = '#4de08f';
          ctx.fillRect(2, 2, size - 4, 1);
          ctx.fillRect(2, size - 3, size - 4, 1);
          ctx.fillRect(2, 2, 1, size - 4);
          ctx.fillRect(size - 3, 2, 1, size - 4);

          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('No se pudo normalizar el avatar.'));
      img.src = dataUrl;
    });
  };

  const generateLocalRetroAvatar = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const smallSize = 64;
          const finalSize = 128;
          const palette: Array<[number, number, number]> = [
            [0, 0, 0],
            [34, 32, 52],
            [69, 40, 60],
            [102, 57, 49],
            [143, 86, 59],
            [223, 113, 38],
            [217, 160, 102],
            [238, 195, 154],
            [251, 242, 54],
            [153, 229, 80],
            [106, 190, 48],
            [55, 148, 110],
            [75, 105, 47],
            [82, 75, 36],
            [50, 60, 57],
            [63, 63, 116],
            [48, 96, 130],
            [91, 110, 225],
            [99, 155, 255],
            [95, 205, 228],
            [203, 219, 252],
            [255, 255, 255],
            [155, 173, 183],
            [132, 126, 135],
            [105, 106, 106],
            [89, 86, 82],
            [118, 66, 138],
            [172, 50, 50],
            [217, 87, 99],
            [215, 123, 186],
            [143, 151, 74],
            [138, 111, 48],
          ];
          const bayer4 = [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5],
          ];

          const nearestPalette = (r: number, g: number, b: number): [number, number, number] => {
            let best = palette[0];
            let bestDist = Number.POSITIVE_INFINITY;
            for (const color of palette) {
              const dr = r - color[0];
              const dg = g - color[1];
              const db = b - color[2];
              const dist = dr * dr + dg * dg + db * db;
              if (dist < bestDist) {
                bestDist = dist;
                best = color;
              }
            }
            return best;
          };

          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = smallSize;
          smallCanvas.height = smallSize;
          const sctx = smallCanvas.getContext('2d');
          if (!sctx) throw new Error('No se pudo crear contexto de canvas.');
          sctx.imageSmoothingEnabled = false;

          sctx.fillStyle = '#101a2b';
          sctx.fillRect(0, 0, smallSize, smallSize);
          const inset = 4;
          const innerSize = smallSize - inset * 2;
          const scale = Math.min(innerSize / img.width, innerSize / img.height);
          const dw = Math.max(1, Math.floor(img.width * scale));
          const dh = Math.max(1, Math.floor(img.height * scale));
          const dx = inset + Math.floor((innerSize - dw) / 2);
          const dy = inset + Math.floor((innerSize - dh) / 2);
          sctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);

          const imageData = sctx.getImageData(0, 0, smallSize, smallSize);
          for (let y = 0; y < smallSize; y++) {
            for (let x = 0; x < smallSize; x++) {
              const i = (y * smallSize + x) * 4;
              const contrast = 1.1;
              const threshold = (bayer4[y % 4][x % 4] - 7.5) / 16;
              const bias = threshold * 10;

              const rawR = imageData.data[i];
              const rawG = imageData.data[i + 1];
              const rawB = imageData.data[i + 2];
              const avg = (rawR + rawG + rawB) / 3;
              let r = avg + (rawR - avg) * 1.16;
              let g = avg + (rawG - avg) * 1.12;
              let b = avg + (rawB - avg) * 1.08;

              r = ((r / 255 - 0.5) * contrast + 0.5) * 255 + bias + 4;
              g = ((g / 255 - 0.5) * contrast + 0.5) * 255 + bias + 1;
              b = ((b / 255 - 0.5) * contrast + 0.5) * 255 + bias - 2;

              r = Math.max(0, Math.min(255, r));
              g = Math.max(0, Math.min(255, g));
              b = Math.max(0, Math.min(255, b));

              const [pr, pg, pb] = nearestPalette(r, g, b);
              imageData.data[i] = pr;
              imageData.data[i + 1] = pg;
              imageData.data[i + 2] = pb;
            }
          }
          sctx.putImageData(imageData, 0, 0);

          const quantized = sctx.getImageData(0, 0, smallSize, smallSize);
          const data = quantized.data;
          for (let y = 1; y < smallSize - 1; y++) {
            for (let x = 1; x < smallSize - 1; x++) {
              const i = (y * smallSize + x) * 4;
              const left = ((y * smallSize + (x - 1)) * 4);
              const right = ((y * smallSize + (x + 1)) * 4);
              const up = ((((y - 1) * smallSize) + x) * 4);
              const down = ((((y + 1) * smallSize) + x) * 4);

              const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
              const lumX =
                (data[right] * 0.299 + data[right + 1] * 0.587 + data[right + 2] * 0.114) -
                (data[left] * 0.299 + data[left + 1] * 0.587 + data[left + 2] * 0.114);
              const lumY =
                (data[down] * 0.299 + data[down + 1] * 0.587 + data[down + 2] * 0.114) -
                (data[up] * 0.299 + data[up + 1] * 0.587 + data[up + 2] * 0.114);
              const edge = Math.abs(lumX) + Math.abs(lumY);
              if (edge > 86 && y < Math.floor(smallSize * 0.72)) {
                const dark = lum < 122 ? 0.84 : 0.9;
                data[i] = Math.max(0, Math.floor(data[i] * dark));
                data[i + 1] = Math.max(0, Math.floor(data[i + 1] * dark));
                data[i + 2] = Math.max(0, Math.floor(data[i + 2] * dark));
              }
            }
          }
          sctx.putImageData(quantized, 0, 0);

          const outCanvas = document.createElement('canvas');
          outCanvas.width = finalSize;
          outCanvas.height = finalSize;
          const octx = outCanvas.getContext('2d');
          if (!octx) throw new Error('No se pudo crear salida de avatar.');
          octx.imageSmoothingEnabled = false;
          for (let y = 0; y < finalSize; y++) {
            for (let x = 0; x < finalSize; x++) {
              octx.fillStyle = (x + y) % 2 === 0 ? '#12203b' : '#172849';
              octx.fillRect(x, y, 1, 1);
            }
          }
          octx.drawImage(smallCanvas, 0, 0, finalSize, finalSize);

          // Keep full portrait visible; avoid covering lower quarter with overlays.

          octx.fillStyle = '#0a111f';
          octx.fillRect(0, 0, finalSize, 2);
          octx.fillRect(0, finalSize - 2, finalSize, 2);
          octx.fillRect(0, 0, 2, finalSize);
          octx.fillRect(finalSize - 2, 0, 2, finalSize);
          octx.fillStyle = '#4de08f';
          octx.fillRect(2, 2, finalSize - 4, 1);
          octx.fillRect(2, finalSize - 3, finalSize - 4, 1);
          octx.fillRect(2, 2, 1, finalSize - 4);
          octx.fillRect(finalSize - 3, 2, 1, finalSize - 4);

          resolve(outCanvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
      img.src = dataUrl;
    });
  };

  const handleStationChange = (station: string) => {
    stopPreview();
    setSelectedStation(station);
    setPreviewRadio(null); // Clear preview when changing station
    setRadioError('');
    soundManager.playSFX('click');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/jpeg';
        setIsGeneratingAvatar(true);
        setAvatarNotice('');
        soundManager.playSFX('scan');
        try {
          const pixelAvatar = await generateRetroAvatar(base64, mimeType);
          const normalizedAvatar = await fitAvatarToFrame(`data:image/png;base64,${pixelAvatar}`);
          setAvatar(normalizedAvatar);
          setAvatarNotice('');
          soundManager.playSFX('success');
        } catch (err) {
          console.error(err);
          try {
            const localAvatar = await generateLocalRetroAvatar(dataUrl);
            setAvatar(localAvatar);
            const msg = getErrorMessage(err).toLowerCase();
            const isQuota =
              msg.includes('quota') ||
              msg.includes('resource_exhausted') ||
              msg.includes('rate limit') ||
              msg.includes('too many requests');
            setAvatarNotice(
              isQuota
                ? 'Cuota de IA agotada. Retrato 128x128 de tripulación generado localmente.'
                : 'IA no disponible. Retrato 128x128 de tripulación generado localmente.'
            );
            soundManager.playSFX('success');
          } catch (fallbackErr) {
            console.error(fallbackErr);
            soundManager.playSFX('error');
            alert(`Error generando avatar pixelado:\n${getErrorMessage(err)}`);
          }
        } finally {
          setIsGeneratingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTuneRadio = async () => {
    setIsGeneratingRadio(true);
    setRadioError('');
    soundManager.playSFX('scan');
    try {
      const tuneResponse = await tuneRadioStation({
        style: selectedStation,
        words: words.slice(0, 8),
      });
      setPreviewRadio(tuneResponse.audio_base64);
      await playRadioAudio(tuneResponse.audio_base64);
      if (tuneResponse.warning) {
        setRadioError(tuneResponse.warning);
      }
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      soundManager.playSFX('error');
      setRadioError(getErrorMessage(err));
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const playPreview = async () => {
    if (!previewRadio) return;
    await playRadioAudio(previewRadio);
  };

  const stopPreview = () => {
    // Clear the ref first to prevent any pending callbacks from interfering
    currentSourceRef.current = null;
    setCurrentSource(null);
    
    // Stop all audio through the sound manager (this properly stops all tracked sources)
    soundManager.stopAllAudio();
    
    // Stop any speech synthesis
    stopChant();
    
    // Update UI state
    setIsPlaying(false);
    setPlayingTrackId(null);
    setLyricsNow('');
  };

  const handleSaveChannel = async () => {
    setChannelWarning('');
    try {
      await saveRadioChannel(channelName, selectedStation);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    }
  };

  const handleAddCurrentSignalToChannel = async () => {
    const finalAudio = previewRadio || radioAudio;
    if (!finalAudio) {
      setChannelWarning('No hay señal actual para guardar en el canal.');
      return;
    }

    setIsSavingTrack(true);
    setChannelWarning('');
    try {
      const response = await addTrackToRadioChannel({
        title: `${trackTitle || 'Pista manual'} (${selectedStation})`,
        style: selectedStation,
        prompt: `Radio station capture: ${selectedStation}`,
        words_script: '',
        audio_base64: finalAudio,
        channel_name: channelName,
      });
      setChannelTracks(prev => [response.track, ...prev]);
      if (response.warning) setChannelWarning(response.warning);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    } finally {
      setIsSavingTrack(false);
    }
  };

  const handleGenerateLearningTrack = async () => {
    if (!words.length) {
      setChannelWarning('No hay palabras cargadas para crear la canción.');
      soundManager.playSFX('error');
      return;
    }

    const selectedWords = words.slice(0, 10);
    setIsGeneratingTrack(true);
    setChannelWarning('');
    soundManager.playSFX('scan');
    try {
      const response = await generateLearningTrack({
        title: `${trackTitle || 'Learning Jam'} (${selectedStation})`,
        style: selectedStation,
        words: selectedWords,
        channel_name: channelName,
      });
      setChannelTracks(prev => [response.track, ...prev]);
      if (response.warning) {
        setChannelWarning(`${response.warning} Canción creada en modo local con letra sincronizada.`);
      }
      await playRadioAudio(response.track.audio_base64, { loop: false, clearTrackOnEnded: true });
      setPlayingTrackId(response.track.id);
      if (response.track.words_script) {
        chantWordsScript(response.track.words_script);
      }
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    } finally {
      setIsGeneratingTrack(false);
    }
  };

  const handlePlayTrack = async (track: RadioTrack) => {
    // Stop any currently playing track first
    stopPreview();
    
    await playRadioAudio(track.audio_base64, { loop: false, clearTrackOnEnded: true });
    setPlayingTrackId(track.id);
    if (track.words_script) {
      chantWordsScript(track.words_script);
    } else {
      setLyricsNow('');
    }
  };

  const handleDeleteTrack = async (trackId: number) => {
    try {
      await deleteRadioTrack(trackId);
      setChannelTracks(prev => prev.filter(t => t.id !== trackId));
      // Always stop current playback when deleting a track to avoid lingering audio.
      stopPreview();
      soundManager.playSFX('beep');
    } catch (err) {
      console.error(err);
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          avatar_url: avatar, 
          anthem_url: previewRadio || radioAudio 
        }),
      });
      if (response.ok) {
        const finalAudio = previewRadio || radioAudio;
        onUpdate({ avatar_url: avatar, anthem_url: finalAudio });
        if (finalAudio) {
          setRadioAudio(finalAudio);
          await playRadioAudio(finalAudio);
        } else {
          stopPreview();
        }
        soundManager.playSFX('success');
        onClose();
      }
    } catch (err) {
      console.error(err);
      soundManager.playSFX('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="absolute inset-0 stars-bg"></div>
      <div className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border-8 relative z-10 ${
        isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b-4 border-green-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { stopPreview(); soundManager.playSFX('beep'); onClose(); }} className="text-green-900 hover:text-green-400 font-mystic">← ATRÁS</button>
            <h2 className="text-2xl font-mystic text-green-400 flicker">PERFIL DE CADETE</h2>
          </div>
          <div className="text-[10px] font-mono text-green-900 uppercase">ID: {user.username}</div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Avatar Section */}
          <div className="space-y-6">
            <label className="block text-[10px] font-mystic text-green-900 uppercase">Avatar Retro-Pixel</label>
            <div className="relative group">
              <div className={`w-48 h-48 mx-auto border-4 border-green-900 bg-black flex items-center justify-center overflow-hidden ${isGeneratingAvatar ? 'animate-pulse' : ''}`}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-contain pixelated" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
                {isGeneratingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-[10px] font-mystic text-green-400 animate-pulse">PIXELANDO...</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full py-2 bg-green-900/20 border-2 border-green-900 text-green-400 font-mystic text-[10px] hover:bg-green-900/40 transition-all"
              >
                SUBIR FOTO (NANO BANANA 2)
              </button>
              {avatarNotice && (
                <div className="mt-2 p-2 border border-amber-700 bg-amber-950/30 text-amber-300 font-mono text-[8px] uppercase">
                  {avatarNotice}
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          {/* Radio Section */}
          <div className="space-y-6">
            <label className="block text-[10px] font-mystic text-green-900 uppercase">Radio de la Nave</label>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                {stations.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStationChange(s)}
                    className={`py-2 px-3 text-left border-2 font-mono text-[8px] uppercase transition-all flex items-center justify-between ${
                      selectedStation === s 
                      ? 'bg-green-500 text-black border-green-400' 
                      : 'bg-black text-green-900 border-green-900 hover:border-green-500'
                    }`}
                  >
                    <span>{s}</span>
                    {selectedStation === s && <span className="animate-pulse">●</span>}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTuneRadio}
                  disabled={isGeneratingRadio}
                  className="flex-1 py-3 bg-green-900/20 border-2 border-green-500 text-green-400 font-mystic text-[10px] hover:bg-green-900/40 transition-all disabled:opacity-50"
                >
                  {isGeneratingRadio ? 'SINTONIZANDO...' : 'SINTONIZAR ESTACIÓN'}
                </button>
                <button
                  onClick={() => {
                    stopPreview();
                    setPreviewRadio(null);
                    setRadioAudio('');
                    soundManager.playSFX('beep');
                  }}
                  className="px-4 py-3 border-2 border-red-900 text-red-500 font-mystic text-[10px] hover:bg-red-900/20 transition-all"
                  title="Silenciar Radio"
                >
                  OFF
                </button>
              </div>

              {radioError && (
                <div className="p-3 border-2 border-red-700 bg-red-950/30 text-red-400 text-[9px] font-mono whitespace-pre-wrap">
                  {radioError}
                </div>
              )}

              {previewRadio && (
                <div className="p-4 border-2 border-green-500 bg-green-900/10 space-y-3">
                  <span className="text-[8px] font-mono text-green-500 uppercase block">SEÑAL DETECTADA</span>
                  <div className="flex gap-2">
                    <button
                      onClick={isPlaying ? stopPreview : playPreview}
                      className="flex-1 py-2 bg-green-500 text-black font-mystic text-[10px] hover:bg-green-400"
                    >
                      {isPlaying ? 'DETENER' : 'ESCUCHAR RADIO'}
                    </button>
                  </div>
                </div>
              )}

              {radioAudio && !previewRadio && (
                <div className="p-4 border-2 border-green-900 bg-black">
                  <span className="text-[8px] font-mono text-green-900 uppercase block mb-2">ESTACIÓN FAVORITA</span>
                  <button
                    onClick={isPlaying ? stopPreview : async () => await playRadioAudio(radioAudio)}
                    className="w-full py-2 border border-green-900 text-green-700 font-mystic text-[10px] hover:text-green-400"
                  >
                    {isPlaying ? 'DETENER' : 'REPRODUCIR ÚLTIMA SEÑAL'}
                  </button>
                </div>
              )}

              <div className="p-4 border-2 border-cyan-700 bg-cyan-950/20 space-y-3">
                <span className="text-[8px] font-mono text-cyan-300 uppercase block">CANAL DE RADIO PERSONAL</span>

                <input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full p-2 bg-black border border-cyan-700 text-cyan-200 font-mono text-[10px] outline-none focus:border-cyan-400"
                  placeholder="NOMBRE DEL CANAL"
                />

                <input
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  className="w-full p-2 bg-black border border-cyan-700 text-cyan-200 font-mono text-[10px] outline-none focus:border-cyan-400"
                  placeholder="TITULO DE LA PISTA"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveChannel}
                    className="py-2 border border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/20"
                  >
                    GUARDAR CANAL
                  </button>
                  <button
                    onClick={handleAddCurrentSignalToChannel}
                    disabled={isSavingTrack}
                    className="py-2 border border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/20 disabled:opacity-50"
                  >
                    {isSavingTrack ? 'GUARDANDO...' : 'AÑADIR SEÑAL'}
                  </button>
                </div>

                <button
                  onClick={handleGenerateLearningTrack}
                  disabled={isGeneratingTrack || isChannelLoading}
                  className="w-full py-3 bg-cyan-400 text-black font-mystic text-[10px] border-2 border-cyan-300 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {isGeneratingTrack ? 'COMPONIENDO...' : 'CREAR CANCIÓN CON MIS PALABRAS'}
                </button>

                {channelWarning && (
                  <div className="p-2 border border-amber-600 bg-amber-950/30 text-amber-300 text-[9px] font-mono whitespace-pre-wrap">
                    {channelWarning}
                  </div>
                )}

                {lyricsNow && isPlaying && (
                  <div className="p-2 border border-cyan-600 bg-cyan-950/40 text-cyan-200 text-[9px] font-mono uppercase whitespace-pre-wrap">
                    LETRA ACTIVA: {lyricsNow}
                  </div>
                )}

                <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {isChannelLoading && (
                    <div className="text-[9px] font-mono text-cyan-500 uppercase">CARGANDO CANAL...</div>
                  )}
                  {!isChannelLoading && channelTracks.length === 0 && (
                    <div className="text-[9px] font-mono text-cyan-700 uppercase">
                      AÚN NO HAY CANCIONES EN TU CANAL.
                    </div>
                  )}
                  {channelTracks.map((track) => (
                    <div key={track.id} className="border border-cyan-900 bg-black/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[9px] font-mono text-cyan-300 truncate uppercase">{track.title}</div>
                          <div className="text-[8px] font-mono text-cyan-700 uppercase">
                            {track.style} · {track.source || 'manual'}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={playingTrackId === track.id ? stopPreview : async () => await handlePlayTrack(track)}
                            className="px-2 py-1 border border-cyan-700 text-cyan-300 font-mystic text-[9px] hover:border-cyan-400"
                          >
                            {playingTrackId === track.id && isPlaying ? 'STOP' : 'PLAY'}
                          </button>
                          <button
                            onClick={() => handleDeleteTrack(track.id)}
                            className="px-2 py-1 border border-red-800 text-red-400 font-mystic text-[9px] hover:bg-red-900/20"
                          >
                            DEL
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t-4 border-green-900 flex gap-4">
          <button
            onClick={() => { stopPreview(); soundManager.playSFX('beep'); onClose(); }}
            className="flex-1 py-4 border-2 border-green-900 text-green-900 font-mystic text-xs hover:text-green-400"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-4 bg-green-500 text-black font-mystic text-xs border-4 border-green-400 hover:bg-green-400 disabled:opacity-50 shadow-lg shadow-green-500/20"
          >
            {isSaving ? 'GUARDANDO...' : 'GUARDAR PREFERENCIAS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;

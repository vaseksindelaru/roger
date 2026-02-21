import React, { useEffect, useRef, useState } from 'react';
import { WordItem } from '../types';
import { generateRetroAvatar } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';
import { fetchRadioChannel, tuneRadioStation } from '../services/radioService';

interface ProfileModalProps {
  user: any;
  words: WordItem[];
  availableStations: string[];
  onClose: () => void;
  onUpdate: (data: any) => void;
  isDarkMode: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  words,
  availableStations,
  onClose,
  onUpdate,
  isDarkMode,
}) => {
  const [avatar, setAvatar] = useState(user.avatar_url || '');
  const [avatarNotice, setAvatarNotice] = useState('');
  const [radioAudio, setRadioAudio] = useState(user.anthem_url || '');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewRadio, setPreviewRadio] = useState<string | null>(null);
  const [radioError, setRadioError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedStation, setSelectedStation] = useState(availableStations[0] || 'Monolith Burger Jazz');

  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keepPlayingOnCloseRef = useRef(false);

  const stations = availableStations.length > 0
    ? availableStations
    : ['Monolith Burger Jazz', 'Monolith Bar Classic (SQ4)', 'Xenon City Beats', 'Vohaul Dark Signal'];

  const getErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
    return raw || 'No se pudo sintonizar la estación.';
  };

  const stopPreview = () => {
    currentSourceRef.current = null;
    soundManager.stopAllAudio();
    setIsPlaying(false);
  };

  const playRadioAudio = async (audioData: string) => {
    stopPreview();
    const source = await soundManager.playBackgroundMusic(audioData, {
      loop: true,
      onEnded: () => {
        if (currentSourceRef.current === source) {
          currentSourceRef.current = null;
          setIsPlaying(false);
        }
      },
    });
    if (source) {
      currentSourceRef.current = source;
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const loadChannelStyle = async () => {
      try {
        const data = await fetchRadioChannel();
        if (data?.channel?.style) {
          setSelectedStation(data.channel.style);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadChannelStyle();
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;
    const exists = stations.some((station) => station.toLowerCase() === selectedStation.toLowerCase());
    if (!exists) {
      setSelectedStation(stations[0]);
    }
  }, [availableStations.join('||')]);

  useEffect(() => {
    return () => {
      // Only stop audio if we're not keeping it playing after save
      if (!keepPlayingOnCloseRef.current) {
        currentSourceRef.current = null;
        soundManager.stopAllAudio();
      }
    };
  }, []);

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
            [0, 0, 0], [34, 32, 52], [69, 40, 60], [102, 57, 49], [143, 86, 59], [223, 113, 38], [217, 160, 102],
            [238, 195, 154], [251, 242, 54], [153, 229, 80], [106, 190, 48], [55, 148, 110], [75, 105, 47],
            [82, 75, 36], [50, 60, 57], [63, 63, 116], [48, 96, 130], [91, 110, 225], [99, 155, 255], [95, 205, 228],
            [203, 219, 252], [255, 255, 255], [155, 173, 183], [132, 126, 135], [105, 106, 106], [89, 86, 82],
            [118, 66, 138], [172, 50, 50], [217, 87, 99], [215, 123, 186], [143, 151, 74], [138, 111, 48],
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
              const threshold = (bayer4[y % 4][x % 4] - 7.5) / 16;
              const bias = threshold * 10;
              const contrast = 1.1;

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

              const [pr, pg, pb] = nearestPalette(
                Math.max(0, Math.min(255, r)),
                Math.max(0, Math.min(255, g)),
                Math.max(0, Math.min(255, b))
              );
              imageData.data[i] = pr;
              imageData.data[i + 1] = pg;
              imageData.data[i + 2] = pb;
            }
          }
          sctx.putImageData(imageData, 0, 0);

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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const handleStationChange = (station: string) => {
    stopPreview();
    setSelectedStation(station);
    setPreviewRadio(null);
    setRadioError('');
    soundManager.playSFX('click');
  };

  const handleTuneRadio = async () => {
    setIsGeneratingRadio(true);
    setRadioError('');
    soundManager.playSFX('scan');
    try {
      const response = await tuneRadioStation({
        style: selectedStation,
        words: words.slice(0, 8),
      });
      setPreviewRadio(response.audio_base64);
      await playRadioAudio(response.audio_base64);
      if (response.warning) setRadioError(response.warning);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      setRadioError(getErrorMessage(err));
      soundManager.playSFX('error');
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const finalAudio = previewRadio || radioAudio;
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url: avatar,
          anthem_url: finalAudio,
        }),
      });
      if (response.ok) {
        onUpdate({ avatar_url: avatar, anthem_url: finalAudio });
        if (finalAudio) {
          setRadioAudio(finalAudio);
          // Set flag to keep audio playing when modal closes
          keepPlayingOnCloseRef.current = true;
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

          <div className="space-y-6">
            <label className="block text-[10px] font-mystic text-green-900 uppercase">Música de Fondo</label>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {stations.map((station) => (
                  <button
                    key={station}
                    onClick={() => handleStationChange(station)}
                    className={`py-2 px-3 text-left border-2 font-mono text-[8px] uppercase transition-all flex items-center justify-between ${
                      selectedStation === station
                        ? 'bg-green-500 text-black border-green-400'
                        : 'bg-black text-green-900 border-green-900 hover:border-green-500'
                    }`}
                  >
                    <span className="truncate">{station}</span>
                    {selectedStation === station && <span className="animate-pulse">●</span>}
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
                  <button
                    onClick={isPlaying ? stopPreview : async () => await playRadioAudio(previewRadio)}
                    className="w-full py-2 bg-green-500 text-black font-mystic text-[10px] hover:bg-green-400"
                  >
                    {isPlaying ? 'DETENER' : 'ESCUCHAR RADIO'}
                  </button>
                </div>
              )}

              {!previewRadio && radioAudio && (
                <div className="p-4 border-2 border-green-900 bg-black">
                  <span className="text-[8px] font-mono text-green-900 uppercase block mb-2">ESTACIÓN ACTUAL</span>
                  <button
                    onClick={isPlaying ? stopPreview : async () => await playRadioAudio(radioAudio)}
                    className="w-full py-2 border border-green-900 text-green-700 font-mystic text-[10px] hover:text-green-400"
                  >
                    {isPlaying ? 'DETENER' : 'REPRODUCIR'}
                  </button>
                </div>
              )}

              <div className="p-3 border border-cyan-700 bg-cyan-950/20 text-cyan-300 text-[9px] font-mono uppercase">
                CREA ESTACIONES Y CANCIONES EN EL LOCALIZADOR DE SEÑALES DEL MENÚ INICIO.
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

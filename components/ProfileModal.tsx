
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
      if (chantTimeoutRef.current) {
        window.clearTimeout(chantTimeoutRef.current);
        chantTimeoutRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playRadioAudio = async (audioData: string) => {
    const source = await soundManager.playBackgroundMusic(audioData);
    if (source) {
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

  const generateLocalRetroAvatar = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const smallSize = 28;
          const mediumSize = 64;
          const finalSize = 224;

          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = smallSize;
          smallCanvas.height = smallSize;
          const sctx = smallCanvas.getContext('2d');
          if (!sctx) throw new Error('No se pudo crear contexto de canvas.');

          const crop = Math.min(img.width, img.height);
          const sx = (img.width - crop) / 2;
          const sy = (img.height - crop) / 2;
          sctx.drawImage(img, sx, sy, crop, crop, 0, 0, smallSize, smallSize);

          const imageData = sctx.getImageData(0, 0, smallSize, smallSize);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = Math.round(imageData.data[i] / 32) * 32;
            imageData.data[i + 1] = Math.round(imageData.data[i + 1] / 32) * 32;
            imageData.data[i + 2] = Math.round(imageData.data[i + 2] / 32) * 32;
          }
          sctx.putImageData(imageData, 0, 0);

          // Build a crew-style frame and uniform in medium resolution.
          const midCanvas = document.createElement('canvas');
          midCanvas.width = mediumSize;
          midCanvas.height = mediumSize;
          const mctx = midCanvas.getContext('2d');
          if (!mctx) throw new Error('No se pudo crear salida intermedia de avatar.');
          mctx.imageSmoothingEnabled = false;
          mctx.drawImage(smallCanvas, 0, 0, mediumSize, mediumSize);

          const uniformTop = Math.floor(mediumSize * 0.62);
          mctx.fillStyle = '#1f2b4d';
          mctx.fillRect(0, uniformTop, mediumSize, mediumSize - uniformTop);

          mctx.fillStyle = '#2f4d8a';
          mctx.beginPath();
          mctx.moveTo(0, mediumSize);
          mctx.lineTo(Math.floor(mediumSize * 0.34), uniformTop);
          mctx.lineTo(Math.floor(mediumSize * 0.66), uniformTop);
          mctx.lineTo(mediumSize, mediumSize);
          mctx.closePath();
          mctx.fill();

          mctx.fillStyle = '#0f1528';
          mctx.beginPath();
          mctx.moveTo(Math.floor(mediumSize * 0.42), uniformTop);
          mctx.lineTo(Math.floor(mediumSize * 0.5), Math.floor(uniformTop + mediumSize * 0.14));
          mctx.lineTo(Math.floor(mediumSize * 0.58), uniformTop);
          mctx.closePath();
          mctx.fill();

          // Confederation badge (pixel style).
          const badgeX = Math.floor(mediumSize * 0.75);
          const badgeY = Math.floor(uniformTop + mediumSize * 0.09);
          mctx.fillStyle = '#f7d36b';
          mctx.fillRect(badgeX - 3, badgeY - 3, 7, 7);
          mctx.fillStyle = '#ffedb3';
          mctx.fillRect(badgeX - 1, badgeY - 1, 3, 3);

          // Retro frame.
          mctx.strokeStyle = '#0a0f1f';
          mctx.lineWidth = 2;
          mctx.strokeRect(1, 1, mediumSize - 2, mediumSize - 2);
          mctx.strokeStyle = '#4de08f';
          mctx.lineWidth = 1;
          mctx.strokeRect(3, 3, mediumSize - 6, mediumSize - 6);

          const outCanvas = document.createElement('canvas');
          outCanvas.width = finalSize;
          outCanvas.height = finalSize;
          const octx = outCanvas.getContext('2d');
          if (!octx) throw new Error('No se pudo crear salida de avatar.');
          octx.imageSmoothingEnabled = false;
          octx.drawImage(midCanvas, 0, 0, finalSize, finalSize);
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
    soundManager.stopBackgroundMusic();
    stopChant();
    setIsPlaying(false);
    setCurrentSource(null);
    setLyricsNow('');
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
          setAvatar(`data:image/png;base64,${pixelAvatar}`);
          setAvatarNotice('');
          soundManager.playSFX('success');
        } catch (err) {
          console.error(err);
          try {
            const localAvatar = await generateLocalRetroAvatar(dataUrl);
            setAvatar(localAvatar);
            setAvatarNotice('IA no disponible. Retrato de tripulación generado localmente.');
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
    soundManager.stopBackgroundMusic();
    stopChant();
    setIsPlaying(false);
    setPlayingTrackId(null);
    setCurrentSource(null);
    setLyricsNow('');
    // If we have a saved radio, resume it? Or just leave it stopped.
    // For now, let's just stop.
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
      await playRadioAudio(response.track.audio_base64);
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
    await playRadioAudio(track.audio_base64);
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
      if (playingTrackId === trackId) {
        stopPreview();
      }
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
          soundManager.stopBackgroundMusic();
          setIsPlaying(false);
          setCurrentSource(null);
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
            <button onClick={() => { soundManager.playSFX('beep'); onClose(); }} className="text-green-900 hover:text-green-400 font-mystic">← ATRÁS</button>
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
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover pixelated" />
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
                SUBIR FOTO (NANO BANANAS)
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
                    soundManager.stopBackgroundMusic();
                    stopChant();
                    setIsPlaying(false);
                    setCurrentSource(null);
                    setLyricsNow('');
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
            onClick={() => { soundManager.playSFX('beep'); onClose(); }}
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

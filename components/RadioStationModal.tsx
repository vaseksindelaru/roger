import React, { useEffect, useRef, useState } from 'react';
import { RadioTrack, WordItem } from '../types';
import { soundManager } from '../services/SoundManager';
import {
  addTrackToRadioChannel,
  deleteRadioTrack,
  extractStationCatalog,
  fetchRadioChannel,
  generateLearningTrack,
  mergeStationCatalog,
  saveRadioChannel,
  tuneRadioStation,
} from '../services/radioService';

interface RadioStationModalProps {
  user: any;
  words: WordItem[];
  isDarkMode: boolean;
  initialStations: string[];
  onStationsUpdate: (stations: string[]) => void;
  onClose: () => void;
}

const RadioStationModal: React.FC<RadioStationModalProps> = ({
  user,
  words,
  isDarkMode,
  initialStations,
  onStationsUpdate,
  onClose,
}) => {
  const [stationCatalog, setStationCatalog] = useState<string[]>(mergeStationCatalog(initialStations));
  const [selectedStation, setSelectedStation] = useState(mergeStationCatalog(initialStations)[0] || 'Monolith Burger Jazz');
  const [newStationName, setNewStationName] = useState('');
  const [channelName, setChannelName] = useState(`${user.username} FM`);
  const [trackTitle, setTrackTitle] = useState('Learning Jam');
  const [channelTracks, setChannelTracks] = useState<RadioTrack[]>([]);
  const [previewRadio, setPreviewRadio] = useState<string | null>(null);
  const [radioError, setRadioError] = useState('');
  const [channelWarning, setChannelWarning] = useState('');
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
  const [isGeneratingTrack, setIsGeneratingTrack] = useState(false);
  const [isSavingTrack, setIsSavingTrack] = useState(false);
  const [isChannelLoading, setIsChannelLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const initialStationsKey = initialStations.join('||');

  const getErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err || '');
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
    return raw || 'No se pudo procesar la señal.';
  };

  const stopPlayback = () => {
    currentSourceRef.current = null;
    soundManager.stopAllAudio();
    setIsPlaying(false);
    setPlayingTrackId(null);
  };

  const playRadioAudio = async (
    audioBase64: string,
    options?: {
      loop?: boolean;
      trackId?: number | null;
    }
  ) => {
    stopPlayback();
    const source = await soundManager.playBackgroundMusic(audioBase64, {
      loop: options?.loop ?? true,
      onEnded: () => {
        if (currentSourceRef.current === source) {
          currentSourceRef.current = null;
          setIsPlaying(false);
          setPlayingTrackId(null);
        }
      },
    });
    if (!source) return;
    currentSourceRef.current = source;
    setIsPlaying(true);
    setPlayingTrackId(options?.trackId ?? null);
  };

  useEffect(() => {
    const loadChannel = async () => {
      setIsChannelLoading(true);
      try {
        const data = await fetchRadioChannel();
        const catalog = extractStationCatalog(data, initialStations);
        setStationCatalog(catalog);
        onStationsUpdate(catalog);
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
    setStationCatalog((prev) => {
      const next = mergeStationCatalog([...initialStations, ...prev]);
      return next.join('||') === prev.join('||') ? prev : next;
    });
  }, [initialStationsKey]);

  useEffect(() => {
    return () => {
      currentSourceRef.current = null;
      soundManager.stopAllAudio();
    };
  }, []);

  const syncStations = (stations: string[]) => {
    const normalized = mergeStationCatalog(stations);
    setStationCatalog(normalized);
    onStationsUpdate(normalized);
  };

  const handleCreateStation = async () => {
    const station = newStationName.trim().slice(0, 120);
    if (!station) {
      setChannelWarning('Escribe un nombre de estación antes de crearla.');
      soundManager.playSFX('error');
      return;
    }
    try {
      await saveRadioChannel(channelName, station);
      syncStations([...stationCatalog, station]);
      setSelectedStation(station);
      setNewStationName('');
      setChannelWarning(`Estación "${station}" creada y añadida al localizador.`);
      soundManager.playSFX('success');
    } catch (err) {
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    }
  };

  const handleSaveChannel = async () => {
    setChannelWarning('');
    try {
      await saveRadioChannel(channelName, selectedStation);
      syncStations([...stationCatalog, selectedStation]);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    }
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
      await playRadioAudio(response.audio_base64, { loop: true, trackId: null });
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

  const handleAddCurrentSignalToChannel = async () => {
    if (!previewRadio) {
      setChannelWarning('Primero sintoniza o genera una señal para guardarla.');
      soundManager.playSFX('error');
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
        audio_base64: previewRadio,
        channel_name: channelName,
      });
      setChannelTracks((prev) => [response.track, ...prev]);
      syncStations([...stationCatalog, response.track.style]);
      if (response.warning) setChannelWarning(response.warning);
      soundManager.playSFX('success');
    } catch (err) {
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

    setIsGeneratingTrack(true);
    setChannelWarning('');
    soundManager.playSFX('scan');
    try {
      const response = await generateLearningTrack({
        title: `${trackTitle || 'Learning Jam'} (${selectedStation})`,
        style: selectedStation,
        words: words.slice(0, 10),
        channel_name: channelName,
      });
      setChannelTracks((prev) => [response.track, ...prev]);
      syncStations([...stationCatalog, response.track.style]);
      if (response.warning) {
        setChannelWarning(`${response.warning} Canción creada en modo local con letra sincronizada.`);
      }
      await playRadioAudio(response.track.audio_base64, { loop: false, trackId: response.track.id });
      soundManager.playSFX('success');
    } catch (err) {
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    } finally {
      setIsGeneratingTrack(false);
    }
  };

  const handleDeleteTrack = async (trackId: number) => {
    try {
      await deleteRadioTrack(trackId);
      setChannelTracks((prev) => prev.filter((track) => track.id !== trackId));
      stopPlayback();
      soundManager.playSFX('beep');
    } catch (err) {
      setChannelWarning(getErrorMessage(err));
      soundManager.playSFX('error');
    }
  };

  const handlePlayTrack = async (track: RadioTrack) => {
    await playRadioAudio(track.audio_base64, { loop: false, trackId: track.id });
  };

  const handleClose = () => {
    stopPlayback();
    soundManager.playSFX('beep');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="absolute inset-0 stars-bg"></div>
      <div className={`w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border-8 relative z-10 ${
        isDarkMode ? 'bg-black border-cyan-900' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6 border-b-4 border-cyan-900 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleClose} className="text-cyan-300 hover:text-cyan-100 font-mystic">← ATRÁS</button>
            <h2 className="text-2xl font-mystic text-cyan-300">LOCALIZADOR DE SEÑALES</h2>
          </div>
          <div className="text-[10px] font-mono text-cyan-700 uppercase">PILOTO: {user.username}</div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <label className="block text-[10px] font-mystic text-cyan-400 uppercase">
              Estaciones Galácticas Disponibles
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {stationCatalog.map((station) => (
                <button
                  key={station}
                  onClick={() => { setSelectedStation(station); soundManager.playSFX('click'); }}
                  className={`py-2 px-3 text-left border-2 font-mono text-[9px] uppercase transition-all flex items-center justify-between ${
                    selectedStation === station
                      ? 'bg-cyan-400 text-black border-cyan-300'
                      : 'bg-black text-cyan-200 border-cyan-900 hover:border-cyan-500'
                  }`}
                >
                  <span className="truncate">{station}</span>
                  {selectedStation === station && <span className="animate-pulse">●</span>}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                placeholder="Nueva estación personalizada"
                className="p-2 bg-black border border-cyan-700 text-cyan-200 font-mono text-[10px] outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleCreateStation}
                className="px-3 py-2 border-2 border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/20"
              >
                CREAR
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTuneRadio}
                disabled={isGeneratingRadio}
                className="flex-1 py-3 bg-cyan-900/20 border-2 border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/40 transition-all disabled:opacity-50"
              >
                {isGeneratingRadio ? 'SINTONIZANDO...' : 'SINTONIZAR ESTACIÓN'}
              </button>
              <button
                onClick={stopPlayback}
                className="px-4 py-3 border-2 border-red-900 text-red-500 font-mystic text-[10px] hover:bg-red-900/20 transition-all"
              >
                STOP
              </button>
            </div>

            {radioError && (
              <div className="p-2 border border-red-700 bg-red-950/30 text-red-300 text-[9px] font-mono whitespace-pre-wrap">
                {radioError}
              </div>
            )}

            {previewRadio && (
              <div className="p-3 border-2 border-cyan-600 bg-cyan-950/20 space-y-2">
                <span className="text-[8px] font-mono text-cyan-300 uppercase block">SEÑAL PRELIMINAR</span>
                <button
                  onClick={isPlaying && playingTrackId === null ? stopPlayback : async () => await playRadioAudio(previewRadio, { loop: true, trackId: null })}
                  className="w-full py-2 border border-cyan-500 text-cyan-200 font-mystic text-[10px] hover:bg-cyan-900/20"
                >
                  {isPlaying && playingTrackId === null ? 'DETENER PREVIEW' : 'REPRODUCIR PREVIEW'}
                </button>
                <button
                  onClick={handleAddCurrentSignalToChannel}
                  disabled={isSavingTrack}
                  className="w-full py-2 border border-cyan-500 text-cyan-200 font-mystic text-[10px] hover:bg-cyan-900/20 disabled:opacity-50"
                >
                  {isSavingTrack ? 'GUARDANDO...' : 'AÑADIR PREVIEW AL CANAL'}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-mystic text-cyan-400 uppercase">Tu Canal Personalizado</label>
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
              placeholder="TÍTULO DE LA PISTA"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveChannel}
                className="py-2 border border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/20"
              >
                GUARDAR CANAL
              </button>
              <button
                onClick={handleGenerateLearningTrack}
                disabled={isGeneratingTrack || isChannelLoading}
                className="py-2 bg-cyan-400 text-black font-mystic text-[10px] border-2 border-cyan-300 hover:bg-cyan-300 disabled:opacity-50"
              >
                {isGeneratingTrack ? 'COMPONIENDO...' : 'CREAR CANCIÓN'}
              </button>
            </div>

            {channelWarning && (
              <div className="p-2 border border-amber-600 bg-amber-950/30 text-amber-300 text-[9px] font-mono whitespace-pre-wrap">
                {channelWarning}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {isChannelLoading && (
                <div className="text-[9px] font-mono text-cyan-500 uppercase">CARGANDO PISTAS...</div>
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
                        onClick={playingTrackId === track.id && isPlaying ? stopPlayback : async () => await handlePlayTrack(track)}
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

        <div className="p-4 border-t-4 border-cyan-900 flex justify-end">
          <button
            onClick={handleClose}
            className="px-6 py-2 border-2 border-cyan-500 text-cyan-300 font-mystic text-[10px] hover:bg-cyan-900/20"
          >
            CERRAR LOCALIZADOR
          </button>
        </div>
      </div>
    </div>
  );
};

export default RadioStationModal;


import React, { useState, useRef } from 'react';
import { WordItem } from '../types';
import { generateShipRadio, generateRetroAvatar } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';

interface ProfileModalProps {
  user: any;
  words: WordItem[];
  onClose: () => void;
  onUpdate: (data: any) => void;
  isDarkMode: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, words, onClose, onUpdate, isDarkMode }) => {
  const [avatar, setAvatar] = useState(user.avatar_url || '');
  const [radioAudio, setRadioAudio] = useState(user.anthem_url || '');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingRadio, setIsGeneratingRadio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewRadio, setPreviewRadio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSource, setCurrentSource] = useState<AudioBufferSourceNode | null>(null);
  const [selectedStation, setSelectedStation] = useState('Monolith Burger Jazz');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stations = ['Monolith Burger Jazz', 'Xenon City Beats', 'Estraana Ambient', 'Galaxy Gallop Rock', 'Vohaul Dark Signal'];

  const handleStationChange = (station: string) => {
    setSelectedStation(station);
    setPreviewRadio(null); // Clear preview when changing station
    soundManager.playSFX('click');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setIsGeneratingAvatar(true);
        soundManager.playSFX('scan');
        try {
          const pixelAvatar = await generateRetroAvatar(base64);
          setAvatar(`data:image/png;base64,${pixelAvatar}`);
          soundManager.playSFX('success');
        } catch (err) {
          console.error(err);
          soundManager.playSFX('error');
          alert("Error generando avatar pixelado.");
        } finally {
          setIsGeneratingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTuneRadio = async () => {
    setIsGeneratingRadio(true);
    soundManager.playSFX('scan');
    try {
      const audioData = await generateShipRadio(selectedStation);
      setPreviewRadio(audioData);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      soundManager.playSFX('error');
    } finally {
      setIsGeneratingRadio(false);
    }
  };

  const playPreview = async () => {
    if (!previewRadio) return;
    const source = await soundManager.playBackgroundMusic(previewRadio);
    if (source) {
      setCurrentSource(source);
      setIsPlaying(true);
    }
  };

  const stopPreview = () => {
    soundManager.stopBackgroundMusic();
    setIsPlaying(false);
    // If we have a saved radio, resume it? Or just leave it stopped.
    // For now, let's just stop.
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
          soundManager.playBackgroundMusic(finalAudio);
        } else {
          soundManager.stopBackgroundMusic();
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
                    onClick={isPlaying ? stopPreview : async () => {
                      const source = await soundManager.playBackgroundMusic(radioAudio);
                      if (source) {
                        setCurrentSource(source);
                        setIsPlaying(true);
                      }
                    }}
                    className="w-full py-2 border border-green-900 text-green-700 font-mystic text-[10px] hover:text-green-400"
                  >
                    {isPlaying ? 'DETENER' : 'REPRODUCIR ÚLTIMA SEÑAL'}
                  </button>
                </div>
              )}
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


import React, { useState, useRef } from 'react';
import { extractWordsFromImage, parseTextToWords, parseAudioToWords } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';

interface BulkImportModalProps {
  onAddWords: (words: {word: string, translation: string}[]) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ onAddWords, onClose, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'voice'>('text');
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setIsProcessing(true);
    soundManager.playSFX('scan');
    try {
      const results = await parseTextToWords(text);
      onAddWords(results);
      soundManager.playSFX('success');
      onClose();
    } catch (error) {
      console.error(error);
      soundManager.playSFX('error');
      alert("Error al invocar el grimorio de texto.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSubmit = async () => {
    if (!preview) return;
    setIsProcessing(true);
    soundManager.playSFX('scan');
    try {
      const base64 = preview.split(',')[1];
      const results = await extractWordsFromImage(base64);
      onAddWords(results);
      soundManager.playSFX('success');
      onClose();
    } catch (error) {
      console.error(error);
      soundManager.playSFX('error');
      alert("La visión arcana ha fallado. Reintenta con otra imagen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    soundManager.playSFX('beep');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioBlob(null);
    } catch (err) {
      console.error("No se pudo acceder al oráculo de voz:", err);
      alert("Asegúrate de conceder permisos de micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      soundManager.playSFX('beep');
    }
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    soundManager.playSFX('scan');
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const results = await parseAudioToWords(base64);
        onAddWords(results);
        soundManager.playSFX('success');
        onClose();
      };
    } catch (error) {
      console.error(error);
      soundManager.playSFX('error');
      alert("Las vibraciones arcanas se han perdido. Intenta de nuevo.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border-8 transition-all ${
        isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'
      }`}>
        <div className="p-8 flex items-center justify-between border-b-4 border-green-900">
          <div>
            <h2 className={`text-2xl font-mystic ${isDarkMode ? 'text-green-400' : 'text-amber-600'}`}>IMPORTACIÓN DE DATOS</h2>
            <p className="text-xs text-green-900 uppercase tracking-widest mt-1 font-mono">Cargando módulos de memoria externa</p>
          </div>
          <button onClick={onClose} className="p-2 text-green-900 hover:text-green-400 font-mystic">✕</button>
        </div>

        <div className="flex border-b-4 border-green-900">
          <button 
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-4 text-[10px] font-mystic uppercase tracking-widest transition-all ${activeTab === 'text' ? 'text-green-400 border-b-4 border-green-400 bg-green-900/10' : 'text-green-900'}`}
          >
            📟 TEXTO
          </button>
          <button 
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-4 text-[10px] font-mystic uppercase tracking-widest transition-all ${activeTab === 'image' ? 'text-green-400 border-b-4 border-green-400 bg-green-900/10' : 'text-green-900'}`}
          >
            👁️ ESCÁNER
          </button>
          <button 
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-4 text-[10px] font-mystic uppercase tracking-widest transition-all ${activeTab === 'voice' ? 'text-green-400 border-b-4 border-green-400 bg-green-900/10' : 'text-green-900'}`}
          >
            🎤 AUDIO
          </button>
        </div>

        <div className="p-8">
          {isProcessing ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-6">
              <div className="w-16 h-16 border-4 border-green-900 border-t-green-500 rounded-none animate-pulse bg-green-900/20"></div>
              <p className="font-mystic text-green-500 animate-pulse text-xl flicker">PROCESANDO DATOS...</p>
            </div>
          ) : (
            <>
              {activeTab === 'text' && (
                <div className="space-y-6">
                  <p className={`text-sm font-mono uppercase ${isDarkMode ? 'text-green-800' : 'text-slate-500'}`}>
                    Ingresa lista de términos. El mainframe los clasificará.
                  </p>
                  <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="EJEMPLO: TISCH - MESA, STUHL - SILLA..."
                    className={`w-full h-48 p-6 rounded-none outline-none border-4 font-mono uppercase resize-none ${
                      isDarkMode ? 'bg-black border-green-900 text-green-400 placeholder-green-900' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button 
                    onClick={handleTextSubmit}
                    className="w-full py-4 bg-green-500 text-black font-mystic text-[10px] rounded-none hover:bg-green-400 transition-all shadow-xl border-4 border-green-400"
                  >
                    EJECUTAR CARGA
                  </button>
                </div>
              )}

              {activeTab === 'image' && (
                <div className="space-y-6 text-center">
                  <p className={`text-sm font-mono uppercase ${isDarkMode ? 'text-green-800' : 'text-slate-500'}`}>
                    Sube captura de registro visual.
                  </p>
                  
                  {preview ? (
                    <div className="relative group mx-auto w-64 h-64">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-none border-4 border-green-500 shadow-2xl grayscale contrast-125" />
                      <button 
                        onClick={() => setPreview(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-none shadow-lg font-mystic"
                      >✕</button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-64 border-4 border-dashed rounded-none flex flex-col items-center justify-center cursor-pointer transition-all ${
                        isDarkMode ? 'border-green-900 hover:border-green-500 bg-green-900/10' : 'border-slate-200 hover:border-amber-500/30 bg-slate-50'
                      }`}
                    >
                      <span className="text-5xl mb-4">📷</span>
                      <p className="font-mystic text-[10px] text-green-900">INICIAR ESCÁNER ÓPTICO</p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleImageSubmit}
                    disabled={!preview}
                    className={`w-full py-4 font-mystic text-[10px] rounded-none transition-all shadow-xl border-4 ${
                      !preview ? 'bg-slate-900 text-green-900 border-green-900 cursor-not-allowed' : 'bg-green-500 text-black border-green-400 hover:bg-green-400'
                    }`}
                  >
                    ACTIVAR ESCÁNER TÁCTICO
                  </button>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-8 text-center">
                  <p className={`text-sm font-mono uppercase ${isDarkMode ? 'text-green-800' : 'text-slate-500'}`}>
                    Dicta términos al receptor de audio.
                  </p>
                  
                  <div className="flex flex-col items-center justify-center py-6">
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-32 h-32 rounded-none border-4 flex items-center justify-center text-4xl transition-all relative ${
                        isRecording 
                        ? 'bg-red-500 border-red-400 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.5)]' 
                        : (audioBlob ? 'bg-blue-900 border-blue-500 shadow-lg' : 'bg-green-900 border-green-500 shadow-lg hover:scale-105')
                      }`}
                    >
                      {isRecording ? '⏹️' : (audioBlob ? '🔄' : '🎤')}
                      {isRecording && (
                        <div className="absolute inset-0 border-4 border-white/20 animate-ping"></div>
                      )}
                    </button>
                    <p className={`mt-6 font-mystic tracking-widest text-sm ${
                      isRecording ? 'text-red-500 animate-pulse' : 'text-green-500'
                    }`}>
                      {isRecording ? 'CAPTANDO SEÑAL...' : (audioBlob ? 'SEÑAL ALMACENADA' : 'INICIAR RECEPTOR')}
                    </p>
                  </div>

                  {audioBlob && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <audio src={URL.createObjectURL(audioBlob)} controls className="mx-auto mb-6 h-10 filter invert hue-rotate-90 opacity-80" />
                      <button 
                        onClick={handleVoiceSubmit}
                        className="w-full py-4 bg-green-500 text-black font-mystic rounded-none hover:bg-green-400 transition-all shadow-xl uppercase tracking-widest text-[10px] border-4 border-green-400"
                      >
                        DECODIFICAR SEÑAL
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;

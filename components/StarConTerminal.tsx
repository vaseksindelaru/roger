
import React, { useState } from 'react';
import { generateStarConReport } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';

interface StarConTerminalProps {
  word: string;
  language: string;
  onClose: () => void;
  onRevealLetter: () => void;
  onRevealFullWord: () => void;
}

const StarConTerminal: React.FC<StarConTerminalProps> = ({ word, language, onClose, onRevealLetter, onRevealFullWord }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<{report: string, interpretation: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setIsLoading(true);
    setError(null);
    soundManager.playSFX('scan');
    try {
      const report = await generateStarConReport(word, language);
      if (report && report.report) {
        setData(report);
        setIsFlipped(true);
        soundManager.playSFX('success');
      } else {
        throw new Error("No se recibieron datos del escaneo.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error de conexión con la Computadora Central.");
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="absolute inset-0 stars-bg"></div>
      
      <div className="relative w-full max-w-lg p-6 flex flex-col items-center">
        <button onClick={() => { soundManager.playSFX('beep'); onClose(); }} className="absolute -top-10 right-4 text-green-500/50 hover:text-green-500 font-mystic text-xl">✕</button>

        {!isFlipped ? (
          <div className="text-center">
            <h2 className="font-mystic text-2xl text-green-500 mb-8 flicker">TERMINAL STARCON</h2>
            <div 
              onClick={!isLoading ? handleScan : undefined}
              className={`w-64 h-96 mx-auto cursor-pointer transition-transform hover:scale-105 active:scale-95 border-4 ${isLoading ? 'animate-pulse border-green-400 bg-green-900/20' : 'border-green-900 bg-black'}`}
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-2 border-2 border-green-900/30"></div>
                <div className="text-6xl mb-4">📟</div>
                <div className="font-mystic text-green-900 text-[10px] tracking-[0.1em] uppercase text-center">Insertar Disco de Datos</div>
              </div>
            </div>
            {error && (
              <div className="mt-6 p-4 border-2 border-red-500 bg-red-900/20 text-red-400 font-mono text-xs uppercase">
                ⚠️ {error}
                <button 
                  onClick={handleScan}
                  className="block mt-2 text-green-400 hover:text-green-300 underline"
                >
                  Reintentar
                </button>
              </div>
            )}
            <p className="text-green-900 mt-8 font-mono text-xs tracking-widest uppercase flicker">Haz clic para iniciar escaneo</p>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 duration-300 w-full">
            <div className="bg-black border-4 border-green-500 p-10 shadow-[0_0_50px_rgba(34,197,94,0.2)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
              
              <div className="text-center space-y-8">
                <div className="inline-block p-4 bg-green-500/10 border-2 border-green-500 mb-4">
                  <span className="text-4xl">🛰️</span>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-mystic text-green-500 text-[10px] tracking-[0.2em] uppercase">Informe de Escaneo</h4>
                  <p className="text-xl font-mono text-green-400 leading-relaxed uppercase">
                    "{data?.report}"
                  </p>
                </div>

                <div className="h-1 bg-green-900 w-24 mx-auto"></div>

                <div className="space-y-2">
                  <h4 className="font-mystic text-green-900 text-[8px] tracking-[0.1em] uppercase text-center">Análisis de Datos</h4>
                  <p className="text-green-600 text-sm font-mono leading-relaxed uppercase">
                    {data?.interpretation}
                  </p>
                </div>

                <div className="pt-8 flex flex-col gap-4">
                  <button 
                    onClick={() => { soundManager.playSFX('click'); onRevealLetter(); onClose(); }}
                    className="w-full bg-green-500 text-black font-black py-4 hover:bg-green-400 transition-all font-mystic text-[10px]"
                  >
                    REVELAR BYTE (LETRA)
                  </button>
                  <button 
                    onClick={() => { soundManager.playSFX('error'); onRevealFullWord(); }}
                    className="w-full bg-red-900 text-red-100 border-2 border-red-500 font-black py-4 hover:bg-red-800 transition-all font-mystic text-[10px]"
                  >
                    SOBRECARGA (PALABRA)
                  </button>
                  <button 
                    onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                    className="w-full bg-transparent text-green-900 font-bold py-4 hover:text-green-500 transition-all font-mystic text-[8px]"
                  >
                    ABORTAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StarConTerminal;

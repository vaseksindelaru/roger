
import React from 'react';

interface SettingsModalProps {
  initialHelp: number;
  setInitialHelp: (n: number) => void;
  selectedLanguages: string[];
  setSelectedLanguages: (langs: string[]) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

const LANGUAGES = [
  { id: 'español', name: 'Español', flag: '🇪🇸' },
  { id: 'inglés', name: 'English', flag: '🇺🇸' },
  { id: 'alemán', name: 'Deutsch', flag: '🇩🇪' },
  { id: 'francés', name: 'Français', flag: '🇫🇷' },
  { id: 'italiano', name: 'Italiano', flag: '🇮🇹' }
];

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  initialHelp, 
  setInitialHelp, 
  selectedLanguages, 
  setSelectedLanguages, 
  onClose,
  isDarkMode
}) => {
  const toggleLanguage = (langId: string) => {
    if (selectedLanguages.includes(langId)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== langId));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, langId]);
    }
  };

  const getPriority = (langId: string) => {
    const index = selectedLanguages.indexOf(langId);
    return index !== -1 ? index + 1 : null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-8 ${
        isDarkMode ? 'bg-black border-green-900 shadow-green-900/20' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-8 border-b-4 flex items-center justify-between ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-50/50 border-slate-100'}`}>
          <h2 className={`text-2xl font-mystic tracking-tight ${isDarkMode ? 'text-green-400' : 'text-slate-800'}`}>SISTEMA</h2>
          <button 
            onClick={onClose} 
            className={`p-3 rounded-none border-2 transition-all ${isDarkMode ? 'text-green-900 border-green-900 hover:text-green-400 hover:border-green-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-10 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <section>
            <label className={`block text-[10px] font-mystic uppercase tracking-[0.1em] mb-6 ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>
              PRIORIDAD DE SECTORES (IDIOMAS)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {LANGUAGES.map((lang) => {
                const priority = getPriority(lang.id);
                const isActive = priority !== null;
                
                return (
                  <button
                    key={lang.id}
                    onClick={() => toggleLanguage(lang.id)}
                    className={`group w-full flex items-center justify-between p-4 rounded-none border-4 transition-all duration-300 ${
                      isActive
                      ? (isDarkMode ? 'border-green-500 bg-green-500/10' : 'border-indigo-600 bg-indigo-50 shadow-md')
                      : (isDarkMode ? 'border-green-900 bg-black opacity-40 grayscale' : 'border-slate-100 bg-white hover:border-slate-200 grayscale opacity-50')
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-none border-2 flex items-center justify-center font-bold text-xs transition-colors ${
                        isActive ? 'bg-green-500 text-black border-green-400' : (isDarkMode ? 'bg-slate-900 text-green-900 border-green-900' : 'bg-slate-100 text-slate-400')
                      }`}>
                        {priority || '—'}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <span className={`font-mono font-bold tracking-tight uppercase ${isActive ? (isDarkMode ? 'text-green-400' : 'text-indigo-900') : (isDarkMode ? 'text-green-900' : 'text-slate-500')}`}>
                          {lang.name}
                        </span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-none bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <label className={`block text-[10px] font-mystic uppercase tracking-[0.1em] mb-6 ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>
              AYUDA DE NAVEGACIÓN (LETRAS)
            </label>
            <div className={`grid grid-cols-4 gap-3 p-2 rounded-none border-2 ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-100'}`}>
              {[0, 1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setInitialHelp(n)}
                  className={`py-4 rounded-none text-xs font-mystic transition-all border-2 ${
                    initialHelp === n 
                    ? (isDarkMode ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20' : 'bg-white text-indigo-600 shadow-sm scale-105')
                    : (isDarkMode ? 'text-green-900 border-transparent hover:text-green-500' : 'text-slate-400 hover:text-slate-600')
                  }`}
                >
                  {n === 0 ? 'OFF' : `${n} L`}
                </button>
              ))}
            </div>
          </section>

          <section>
            <label className={`block text-[10px] font-mystic uppercase tracking-[0.1em] mb-6 ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>
              CONFIGURACIÓN DE AUDIO
            </label>
            <div className={`space-y-4 p-4 rounded-none border-2 ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-100'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-green-700 uppercase">VOLUMEN MAESTRO</span>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  defaultValue="0.5"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    // We'll handle this in App.tsx or via a global state
                    (window as any).setMasterVolume?.(val);
                  }}
                  className="accent-green-500 w-32" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-green-700 uppercase">EFECTOS (SFX)</span>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  defaultValue="0.7"
                  onChange={(e) => (window as any).setSFXVolume?.(parseFloat(e.target.value))}
                  className="accent-green-500 w-32" 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-green-700 uppercase">MÚSICA</span>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  defaultValue="0.3"
                  onChange={(e) => (window as any).setMusicVolume?.(parseFloat(e.target.value))}
                  className="accent-green-500 w-32" 
                />
              </div>
            </div>
          </section>
        </div>

        <div className={`p-6 border-t-4 ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-50 border-slate-100'}`}>
          <button
            onClick={onClose}
            className={`w-full py-5 rounded-none font-mystic text-sm uppercase tracking-widest transition-all shadow-xl active:scale-[0.97] border-4 ${
              isDarkMode ? 'bg-green-500 text-black border-green-400 hover:bg-green-400' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            GUARDAR CAMBIOS
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;


import React, { useState, useEffect } from 'react';
import WordList from './components/WordList';
import CrosswordUI from './components/CrosswordUI';
import FullWordListModal from './components/FullWordListModal';
import SettingsModal from './components/SettingsModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import RadioStationModal from './components/RadioStationModal';
import AlienTranslatorGame from './components/AlienTranslatorGame';
import SectorMap from './components/SectorMap';
import MissionFeed from './components/MissionFeed';
import { WordItem, CrosswordData } from './types';
import { buildCrossword } from './logic/crosswordBuilder';
import { generateCluesForWords, generateDailyThemeWords, generateStartupSong } from './services/geminiService';
import { soundManager } from './services/SoundManager';
import {
  extractStationCatalog,
  fetchRadioChannel,
  GALACTIC_PRESET_STATIONS,
  mergeStationCatalog,
} from './services/radioService';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [words, setWords] = useState<WordItem[]>([]);
  const [crossword, setCrossword] = useState<CrosswordData | null>(null);
  const [clues, setClues] = useState<Record<string, Record<string, { sentence: string, localizedWord: string }>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullList, setShowFullList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSignalLocator, setShowSignalLocator] = useState(false);
  const [showAlienGame, setShowAlienGame] = useState(false);
  const [initialHelp, setInitialHelp] = useState(0);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['inglés']);
  const [learningLanguage, setLearningLanguage] = useState<string>('inglés');
  const [translationLanguage, setTranslationLanguage] = useState<string>('español');
  const [completedSectors, setCompletedSectors] = useState<string[]>([]);
  const [currentSector, setCurrentSector] = useState<{id: string, name: string, image?: string} | null>(null);
  const [availableStations, setAvailableStations] = useState<string[]>(mergeStationCatalog(GALACTIC_PRESET_STATIONS));

  useEffect(() => {
    checkAuth();
    
    // Global setters for SettingsModal
    (window as any).setMasterVolume = (v: number) => soundManager.setVolumes(v, 0.7, 0.3);
    (window as any).setSFXVolume = (v: number) => soundManager.setVolumes(0.5, v, 0.3);
    (window as any).setMusicVolume = (v: number) => soundManager.setVolumes(0.5, 0.7, v);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        fetchWords();
        fetchSectors();
        refreshStationCatalog();
      }
    } catch (err) {
      console.error('Auth check failed', err);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const refreshStationCatalog = async () => {
    try {
      const payload = await fetchRadioChannel();
      setAvailableStations(extractStationCatalog(payload));
    } catch (err) {
      setAvailableStations(mergeStationCatalog(GALACTIC_PRESET_STATIONS));
    }
  };

  const fetchWords = async () => {
    try {
      const response = await fetch('/api/words');
      if (response.ok) {
        const data = await response.json();
        setWords(data);
      }
    } catch (err) {
      console.error('Failed to fetch words', err);
    }
  };

  const fetchSectors = async () => {
    try {
      const response = await fetch('/api/sectors');
      if (response.ok) {
        const data = await response.json();
        setCompletedSectors(data);
      }
    } catch (err) {
      console.error('Failed to fetch sectors', err);
    }
  };

  const markSectorComplete = async (sectorId: string) => {
    try {
      await fetch('/api/sectors/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id: sectorId }),
      });
      setCompletedSectors(prev => [...new Set([...prev, sectorId])]);
    } catch (err) {
      console.error('Failed to mark sector complete', err);
    }
  };

  const toggleTheme = () => {
    soundManager.playSFX('beep');
    setIsDarkMode(!isDarkMode);
  };

  const handleLogin = async (userData: any) => {
    setUser(userData);
    fetchWords();
    fetchSectors();
    refreshStationCatalog();
    if (userData.anthem_url) {
      soundManager.playBackgroundMusic(userData.anthem_url);
    } else {
      try {
        const audioData = await generateStartupSong(userData.username);
        soundManager.playGeneratedAudio(audioData);
      } catch (e) {
        soundManager.playSFX('success');
      }
    }
  };

  const handleAddWord = async (word: string, translation: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    try {
      const response = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, word, translation }),
      });
      if (response.ok) {
        const newItem = await response.json();
        setWords(prev => [newItem, ...prev]);
        soundManager.playSFX('click');
      }
    } catch (err) {
      soundManager.playSFX('error');
    }
  };

  const handleRemoveWord = async (id: string) => {
    try {
      const response = await fetch(`/api/words/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setWords(words.filter(w => w.id !== id));
        soundManager.playSFX('beep');
      }
    } catch (err) {
      soundManager.playSFX('error');
    }
  };

  const handleLogout = async () => {
    soundManager.playSFX('error');
    soundManager.stopBackgroundMusic();
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setWords([]);
    setCrossword(null);
    setCompletedSectors([]);
    setAvailableStations(mergeStationCatalog(GALACTIC_PRESET_STATIONS));
  };

  const handleDailyChallenge = async () => {
    soundManager.playSFX('scan');
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateDailyThemeWords();
      const wordStrings = data.words.map(w => w.word);
      const newCrossword = buildCrossword(wordStrings);
      if (!newCrossword) throw new Error("Error generando reto diario.");
      
      newCrossword.theme = data.theme;
      const generatedClues = await generateCluesForWords(wordStrings, selectedLanguages);
      setClues(generatedClues);
      setCrossword(newCrossword);
      setCurrentSector({ id: 'DAILY', name: data.theme });
      soundManager.playSFX('success');
    } catch (err) {
      setError("No se pudo cargar el reto diario.");
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (words.length < 3) {
      soundManager.playSFX('error');
      setError("Necesitas al menos 3 palabras para crear un crucigrama.");
      return;
    }
    soundManager.playSFX('scan');
    setIsLoading(true);
    setError(null);
    try {
      const wordStrings = words.map(w => w.word);
      const newCrossword = buildCrossword(wordStrings);
      if (!newCrossword) throw new Error("No se pudo encajar el vocabulario.");
      newCrossword.initialHelp = initialHelp;
      const generatedClues = await generateCluesForWords(wordStrings, selectedLanguages);
      setClues(generatedClues);
      setCrossword(newCrossword);
      setCurrentSector(null);
      soundManager.playSFX('success');
    } catch (err: any) {
      setError(err.message || "Error al generar.");
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSector = async (sector: any) => {
    setIsLoading(true);
    setError(null);
    try {
      // Generate words based on sector difficulty/theme if needed
      // For now, use existing words but mark it as a sector mission
      const wordStrings = words.slice(0, 5 + sector.difficulty).map(w => w.word);
      if (wordStrings.length < 3) {
        throw new Error("Necesitas más palabras en tu banco para esta misión.");
      }
      const newCrossword = buildCrossword(wordStrings);
      if (!newCrossword) throw new Error("Error en la matriz del sector.");
      
      newCrossword.theme = sector.name;
      const generatedClues = await generateCluesForWords(wordStrings, selectedLanguages);
      setClues(generatedClues);
      setCrossword(newCrossword);
      setCurrentSector({ id: sector.id, name: sector.name, image: sector.image });
      soundManager.playSFX('success');
    } catch (err: any) {
      setError(err.message);
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrosswordComplete = () => {
    if (currentSector && currentSector.id !== 'DAILY') {
      markSectorComplete(currentSector.id);
    }
    soundManager.playSFX('success');
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-500 font-mystic animate-pulse">INICIALIZANDO STARCON-OS...</div>
      </div>
    );
  }

  const getRank = () => {
    const count = completedSectors.length;
    if (count >= 6) return 'ALMIRANTE';
    if (count >= 4) return 'COMANDANTE';
    if (count >= 2) return 'TENIENTE';
    return 'CADETE';
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-[#000000] text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {!user && <LoginModal onLogin={handleLogin} isDarkMode={isDarkMode} />}
      
      <header className={`${isDarkMode ? 'bg-black border-green-900' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b-4 sticky top-0 z-20 h-16 shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20 border-2 border-green-400">
              <span className="text-xl">🚀</span>
            </div>
            <h1 className={`text-2xl font-mystic tracking-tighter ${isDarkMode ? 'text-green-400' : 'text-slate-900'}`}>StarCon-OS</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user && (
              <button 
                onClick={() => { soundManager.playSFX('click'); setShowProfile(true); }}
                className="hidden md:flex items-center gap-2 px-3 py-1 border-2 border-green-900 rounded-lg hover:border-green-500 transition-all"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-6 h-6 rounded-none border border-green-500 pixelated" />
                ) : (
                  <span className="text-[10px] font-mystic text-green-700">{getRank()}:</span>
                )}
                <span className="text-xs font-mono text-green-400 uppercase">{user.username}</span>
                {user.avatar_url && <span className="text-[8px] font-mystic text-green-700 ml-1">{getRank()}</span>}
              </button>
            )}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg border-2 transition-all ${isDarkMode ? 'bg-slate-900 text-green-400 border-green-900 hover:border-green-500' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? '☼' : '☾'}
            </button>
            {user && (
              <button
                onClick={() => { soundManager.playSFX('click'); setShowSignalLocator(true); }}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-cyan-800 text-cyan-300 hover:border-cyan-500 transition-all font-mystic text-[10px]"
                title="Localizador de Señales"
              >
                🛰 LOCALIZADOR
              </button>
            )}
            {user && (
              <button
                onClick={() => { soundManager.playSFX('click'); setShowAlienGame(true); }}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-purple-800 text-purple-300 hover:border-purple-500 transition-all font-mystic text-[10px]"
                title="Traductor Universal"
              >
                👽 TRADUCTOR
              </button>
            )}
            {user && (
              <button 
                onClick={handleLogout}
                className="p-2 rounded-lg border-2 border-red-900 text-red-500 hover:bg-red-900/20 transition-all font-mystic text-[10px]"
                title="Cerrar Sesión"
              >
                OFF
              </button>
            )}
            <button 
              onClick={handleDailyChallenge}
              className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border-2 ${
                isDarkMode 
                ? 'bg-green-900/20 text-green-400 border-green-500/50 hover:bg-green-900/40' 
                : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
              }`}
            >
              📡 Misión de Sector
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-6">
            <WordList 
              words={words} 
              onAddWord={handleAddWord} 
              onRemoveWord={handleRemoveWord} 
              onGenerate={handleGenerate}
              onShowFullList={() => { soundManager.playSFX('click'); setShowFullList(true); }}
              onOpenSettings={() => { soundManager.playSFX('click'); setShowSettings(true); }}
              isLoading={isLoading}
              selectedLanguagesCount={selectedLanguages.length}
              isDarkMode={isDarkMode}
            />
            <MissionFeed isDarkMode={isDarkMode} />
          </div>

          <div className="lg:col-span-8 space-y-8">
            {!crossword && !isLoading && (
              <SectorMap 
                completedSectors={completedSectors} 
                onSelectSector={handleSelectSector}
                isDarkMode={isDarkMode}
              />
            )}

            {isLoading ? (
              <div className={`${isDarkMode ? 'bg-black border-green-500/30' : 'bg-white border-slate-200'} rounded-xl shadow-2xl p-20 flex flex-col items-center justify-center border-4`}>
                <div className={`w-16 h-16 border-4 rounded-none animate-pulse mb-8 ${isDarkMode ? 'bg-green-500/20 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]' : 'border-green-200 border-t-green-500'}`}></div>
                <h3 className={`text-2xl font-mystic text-green-500 flicker`}>ACCEDIENDO AL MAINFRAME...</h3>
                <p className={`${isDarkMode ? 'text-green-700' : 'text-slate-500'} mt-2 font-mono uppercase tracking-widest`}>Escaneando sectores multilingües</p>
              </div>
            ) : crossword ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  {crossword.theme && (
                    <div className="bg-black border-4 border-green-500 p-4 rounded-xl text-green-500 shadow-xl relative overflow-hidden flex-1 mr-4 flex items-center gap-4">
                      {currentSector?.image && (
                        <img 
                          src={currentSector.image} 
                          alt={crossword.theme}
                          className="w-20 h-20 border-2 border-cyan-500 pixelated flex-shrink-0"
                        />
                      )}
                      <div className="relative z-10">
                        <span className="text-green-700 text-xs font-black uppercase tracking-widest">Sector Detectado</span>
                        <h2 className="text-3xl font-mystic">{crossword.theme}</h2>
                      </div>
                      <div className="absolute -right-8 -bottom-8 text-8xl opacity-10 rotate-12">🛸</div>
                    </div>
                  )}
                  <button 
                    onClick={() => { soundManager.playSFX('beep'); setCrossword(null); }}
                    className="p-6 border-4 border-green-900 bg-black text-green-900 font-mystic hover:text-green-500 hover:border-green-500 transition-all rounded-xl"
                  >
                    ← MAPA
                  </button>
                </div>
                <CrosswordUI 
                  data={crossword} 
                  cluesWithText={clues} 
                  targetLanguages={selectedLanguages}
                  isDarkMode={isDarkMode}
                  onComplete={handleCrosswordComplete}
                />
              </div>
            ) : (
              <div className={`${isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'} rounded-xl shadow-2xl p-16 flex flex-col items-center text-center border-4 border-dashed`}>
                <div className={`w-24 h-24 rounded-lg flex items-center justify-center text-5xl mb-8 animate-pulse shadow-lg ${isDarkMode ? 'bg-green-900/20 border-2 border-green-500 shadow-green-500/10' : 'bg-slate-100 shadow-amber-200'}`}>📟</div>
                <h3 className={`text-3xl font-mystic ${isDarkMode ? 'text-green-400' : 'text-slate-800'}`}>COORDENADAS PENDIENTES</h3>
                <p className={`${isDarkMode ? 'text-green-800' : 'text-slate-500'} mt-4 max-w-sm font-mono uppercase`}>
                  Selecciona un sector en el mapa o deja que la Computadora Central elija tu ruta hoy.
                </p>
                <button 
                  onClick={handleDailyChallenge}
                  className="mt-10 bg-green-500 text-black px-10 py-4 rounded-lg font-black hover:bg-green-400 transition-all shadow-xl hover:shadow-green-500/20 font-mystic text-xs"
                >
                  INICIAR ESCANEO DIARIO
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showFullList && <FullWordListModal words={words} onClose={() => { soundManager.playSFX('beep'); setShowFullList(false); }} isDarkMode={isDarkMode} />}
      {showSettings && (
        <SettingsModal 
          initialHelp={initialHelp} setInitialHelp={setInitialHelp}
          selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages}
          learningLanguage={learningLanguage} setLearningLanguage={setLearningLanguage}
          translationLanguage={translationLanguage} setTranslationLanguage={setTranslationLanguage}
          onClose={() => { soundManager.playSFX('beep'); setShowSettings(false); }}
          isDarkMode={isDarkMode}
        />
      )}
      {showProfile && user && (
        <ProfileModal 
          user={user}
          words={words}
          availableStations={availableStations}
          onClose={() => { soundManager.playSFX('beep'); setShowProfile(false); }}
          onUpdate={(data) => setUser({ ...user, ...data })}
          isDarkMode={isDarkMode}
        />
      )}
      {showSignalLocator && user && (
        <RadioStationModal
          user={user}
          words={words}
          isDarkMode={isDarkMode}
          initialStations={availableStations}
          onStationsUpdate={(stations) => setAvailableStations(mergeStationCatalog(stations))}
          onClose={() => setShowSignalLocator(false)}
        />
      )}
      {showAlienGame && (
        <AlienTranslatorGame 
          learningLanguage={learningLanguage}
          translationLanguage={translationLanguage}
          words={words}
          onClose={() => setShowAlienGame(false)} 
        />
      )}
    </div>
  );
};

export default App;

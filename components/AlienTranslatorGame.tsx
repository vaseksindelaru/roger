
import React, { useState, useEffect, useCallback } from 'react';
import { generateVocabularyDialogue } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';
import { WordItem } from '../types';

interface LanguageData {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Record<string, LanguageData> = {
  'español': { id: 'español', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  'inglés': { id: 'inglés', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  'alemán': { id: 'alemán', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  'francés': { id: 'francés', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  'italiano': { id: 'italiano', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' }
};

interface DialogueTurn {
  targetText: string;
  translation: string;
  options: string[];
  optionTranslations: string[];
}

interface GameState {
  phase: 'intro' | 'dialogue' | 'result';
  currentTurn: number;
  score: number;
  dialogue: DialogueTurn[];
  feedback: string | null;
  isCorrect: boolean | null;
}

const AlienTranslatorGame: React.FC<{ 
  learningLanguage: string; 
  translationLanguage: string;
  words: WordItem[];
  onClose: () => void 
}> = ({ learningLanguage, translationLanguage, words, onClose }) => {
  const [state, setState] = useState<GameState>({
    phase: 'intro',
    currentTurn: 0,
    score: 0,
    dialogue: [],
    feedback: null,
    isCorrect: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [currentOptionTranslations, setCurrentOptionTranslations] = useState<string[]>([]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);
  const [showTranslation, setShowTranslation] = useState(false);

  const learningLang = LANGUAGES[learningLanguage] || LANGUAGES['inglés'];
  const translationLang = LANGUAGES[translationLanguage] || LANGUAGES['español'];

  const startGame = async () => {
    if (words.length < 3) {
      return;
    }
    setIsLoading(true);
    soundManager.playSFX('scan');
    try {
      const dialogue = await generateVocabularyDialogue(
        learningLanguage, 
        translationLanguage, 
        words
      );
      setState(prev => ({
        ...prev,
        phase: 'dialogue',
        dialogue: [dialogue],
        currentTurn: 0,
      }));
      setCurrentOptions(dialogue.options || []);
      setCurrentOptionTranslations(dialogue.optionTranslations || []);
      setCorrectAnswerIndex(0); // First option is always correct
      setShowTranslation(false);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    const isCorrect = answerIndex === correctAnswerIndex;
    soundManager.playSFX(isCorrect ? 'success' : 'error');
    
    setState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 10 : prev.score,
      feedback: isCorrect 
        ? '¡Correcto! Excelente elección.' 
        : `¡Incorrecto! La respuesta correcta era: "${currentOptions[correctAnswerIndex]}"`,
      isCorrect,
    }));

    // Generate next turn after delay
    setTimeout(async () => {
      if (state.currentTurn >= 3) {
        setState(prev => ({ ...prev, phase: 'result' }));
        return;
      }

      setIsLoading(true);
      try {
        const nextDialogue = await generateVocabularyDialogue(
          learningLanguage, 
          translationLanguage, 
          words
        );
        setState(prev => ({
          ...prev,
          dialogue: [...prev.dialogue, nextDialogue],
          currentTurn: prev.currentTurn + 1,
          feedback: null,
          isCorrect: null,
        }));
        setCurrentOptions(nextDialogue.options || []);
        setCurrentOptionTranslations(nextDialogue.optionTranslations || []);
        setCorrectAnswerIndex(0);
        setShowTranslation(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };

  const speakText = (text: string, lang?: string) => {
    soundManager.playSFX('beep');
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Map language names to speech synthesis language codes
      const langCodes: Record<string, string> = {
        'español': 'es-ES',
        'inglés': 'en-US',
        'alemán': 'de-DE',
        'francés': 'fr-FR',
        'italiano': 'it-IT'
      };
      
      const targetLang = lang || learningLanguage;
      const langCode = langCodes[targetLang] || 'en-US';
      
      // Try to find a voice for the target language
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
      if (voice) utterance.voice = voice;
      utterance.lang = langCode;
      
      speechSynthesis.speak(utterance);
    }
  };

  const goBackToMenu = () => {
    soundManager.playSFX('beep');
    setState(prev => ({
      ...prev,
      phase: 'intro',
      currentTurn: 0,
      score: 0,
      dialogue: [],
      feedback: null,
      isCorrect: null,
    }));
    setCurrentOptions([]);
    setCurrentOptionTranslations([]);
    setCorrectAnswerIndex(0);
    setShowTranslation(false);
  };

  // Load voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
      };
    }
  }, []);

  const hasEnoughWords = words.length >= 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-y-auto">
      <div className="absolute inset-0 stars-bg"></div>
      
      <div className="relative w-full max-w-2xl p-4 md:p-6 my-8 md:my-0">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="font-mystic text-xl md:text-3xl text-green-500 flicker tracking-wider">
            🌍 TRADUCTOR UNIVERSAL 🌍
          </h2>
          <p className="text-green-700 font-mono text-[10px] md:text-xs mt-2 uppercase tracking-widest">
            Aprende {learningLang.name} con tu vocabulario
          </p>
        </div>

        {/* Score Display */}
        {state.phase !== 'intro' && (
          <div className="flex flex-wrap justify-between items-center mb-4 md:mb-6 px-2 md:px-4 gap-2">
            <div className="text-green-400 font-mono text-xs md:text-sm">
              PUNTOS: <span className="text-green-500 font-bold text-lg md:text-xl">{state.score}</span>
            </div>
            <div className="text-green-400 font-mono text-xs md:text-sm">
              RONDA: <span className="text-green-500 font-bold">{state.currentTurn + 1}/4</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl md:text-2xl">{learningLang.flag}</span>
              <span className="text-green-500 font-mystic text-xs md:text-sm">{learningLang.nativeName}</span>
            </div>
          </div>
        )}

        {/* Intro Phase */}
        {state.phase === 'intro' && (
          <div className="space-y-6">
            <div className="bg-black border-4 border-green-500 p-4 md:p-6 rounded-xl">
              {!hasEnoughWords ? (
                <div className="text-center">
                  <div className="text-red-400 font-mystic text-lg mb-4">
                    ⚠️ VOCABULARIO INSUFICIENTE
                  </div>
                  <p className="text-green-400 font-mono text-sm mb-4">
                    Necesitas al menos 3 palabras en tu vocabulario para practicar.
                  </p>
                  <p className="text-green-700 font-mono text-xs">
                    Palabras actuales: {words.length}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-green-400 font-mono text-center mb-6 text-sm md:text-base">
                    Practica traduciendo frases de Space Quest usando tu vocabulario.
                  </p>
                  
                  <div className="bg-black border-4 border-cyan-500 p-4 rounded-xl mb-4">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-4xl md:text-5xl">{learningLang.flag}</span>
                      <div className="text-center">
                        <div className="text-cyan-500 font-mystic text-lg md:text-xl">{learningLang.nativeName}</div>
                        <div className="text-cyan-700 font-mono text-xs">Idioma de aprendizaje</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black border-4 border-purple-500 p-4 rounded-xl mb-6">
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-4xl md:text-5xl">{translationLang.flag}</span>
                      <div className="text-center">
                        <div className="text-purple-500 font-mystic text-lg md:text-xl">{translationLang.nativeName}</div>
                        <div className="text-purple-700 font-mono text-xs">Idioma de traducción</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-green-700 font-mono text-xs text-center mb-4">
                    Palabras disponibles: {words.length}
                  </div>

                  <button
                    onClick={startGame}
                    disabled={isLoading}
                    className="w-full p-4 border-2 border-green-500 bg-black hover:bg-green-900/20 transition-all text-center font-mystic text-green-500 text-lg"
                  >
                    {isLoading ? 'CARGANDO...' : 'COMENZAR PRÁCTICA'}
                  </button>
                </>
              )}

              {/* Exit button in intro phase */}
              <div className="mt-6 pt-4 border-t border-green-900">
                <button
                  onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                  className="w-full p-3 border-2 border-red-900 bg-black hover:border-red-500 hover:bg-red-900/20 transition-all text-center font-mystic text-red-400 text-sm"
                >
                  ✕ SALIR DEL JUEGO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dialogue Phase */}
        {state.phase === 'dialogue' && state.dialogue.length > 0 && (
          <div className="space-y-4 md:space-y-6">
            {/* Target Language Phrase */}
            <div className="bg-black border-4 border-cyan-500 p-4 md:p-6 rounded-xl">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="text-3xl md:text-4xl">{learningLang.flag}</div>
                <div className="flex-1">
                  <div className="text-cyan-500 font-mystic text-[10px] md:text-xs mb-2 uppercase tracking-widest">
                    Situación:
                  </div>
                  <p className="text-cyan-400 font-mono text-base md:text-lg tracking-wide">
                    "{state.dialogue[state.currentTurn]?.targetText}"
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => speakText(state.dialogue[state.currentTurn]?.targetText || '', learningLanguage)}
                      className="text-cyan-700 hover:text-cyan-500 text-[10px] md:text-xs font-mono flex items-center gap-1"
                    >
                      🔊 Escuchar en {learningLang.name}
                    </button>
                    <button
                      onClick={() => setShowTranslation(!showTranslation)}
                      className="text-purple-700 hover:text-purple-500 text-[10px] md:text-xs font-mono flex items-center gap-1"
                    >
                      🌐 Traducción
                    </button>
                  </div>
                  {showTranslation && (
                    <div className="mt-2 p-2 border border-purple-500/30 rounded bg-purple-900/10">
                      <span className="text-purple-400 font-mono text-sm">
                        {translationLang.flag} {state.dialogue[state.currentTurn]?.translation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Feedback */}
            {state.feedback && (
              <div className={`p-3 md:p-4 border-2 rounded text-sm md:text-base ${state.isCorrect ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-red-500 bg-red-900/20 text-red-400'}`}>
                {state.feedback}
              </div>
            )}

            {/* Answer Options */}
            {!state.feedback && (
              <div className="bg-black border-4 border-green-900 p-4 md:p-6 rounded-xl">
                <div className="text-green-700 font-mystic text-[10px] md:text-xs mb-3 md:mb-4 uppercase tracking-widest">
                  ¿Qué sigue?
                </div>
                <div className="grid grid-cols-1 gap-2 md:gap-3">
                  {currentOptions.map((option, idx) => (
                    <div key={idx} className="relative">
                      <button
                        onClick={() => handleAnswer(idx)}
                        disabled={isLoading}
                        className="w-full p-3 md:p-4 border-2 border-green-900 bg-black hover:border-green-500 hover:bg-green-900/20 transition-all text-left font-mono text-green-400 disabled:opacity-50 text-sm md:text-base"
                      >
                        <span className="text-green-700 mr-2">[{idx + 1}]</span>
                        {option}
                      </button>
                      <div className="flex gap-2 mt-1 px-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); speakText(option, learningLanguage); }}
                          className="text-cyan-700 hover:text-cyan-500 text-[10px] font-mono"
                        >
                          🔊
                        </button>
                        <span className="text-purple-700 text-[10px] font-mono">
                          {translationLang.flag} {currentOptionTranslations[idx]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons inside answer options */}
                <div className="mt-4 md:mt-6 pt-4 border-t border-green-900 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                    className="p-2 md:p-3 border-2 border-red-900 bg-black hover:border-red-500 hover:bg-red-900/20 transition-all text-center font-mystic text-red-400 text-xs md:text-sm"
                  >
                    ✕ MENÚ INICIO
                  </button>
                  <button
                    onClick={goBackToMenu}
                    className="p-2 md:p-3 border-2 border-purple-900 bg-black hover:border-purple-500 hover:bg-purple-900/20 transition-all text-center font-mystic text-purple-400 text-xs md:text-sm"
                  >
                    ← MENÚ JUEGO
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons during feedback */}
            {state.feedback && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                  className="p-2 md:p-3 border-2 border-red-900 bg-black hover:border-red-500 hover:bg-red-900/20 transition-all text-center font-mystic text-red-400 text-xs md:text-sm"
                >
                  ✕ MENÚ INICIO
                </button>
                <button
                  onClick={goBackToMenu}
                  className="p-2 md:p-3 border-2 border-purple-900 bg-black hover:border-purple-500 hover:bg-purple-900/20 transition-all text-center font-mystic text-purple-400 text-xs md:text-sm"
                >
                  ← MENÚ JUEGO
                </button>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-green-500 font-mystic animate-pulse text-sm md:text-base">
                PROCESANDO TRADUCCIÓN...
              </div>
            )}
          </div>
        )}

        {/* Result Phase */}
        {state.phase === 'result' && (
          <div className="bg-black border-4 border-green-500 p-6 md:p-8 rounded-xl text-center">
            <div className="text-5xl md:text-6xl mb-4">🏆</div>
            <h3 className="font-mystic text-xl md:text-2xl text-green-500 mb-4">
              ¡PRÁCTICA COMPLETADA!
            </h3>
            <p className="text-green-400 font-mono mb-6 text-sm md:text-base">
              Puntuación final: <span className="text-green-500 text-2xl md:text-3xl font-bold">{state.score}</span> puntos
            </p>
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center">
              <button
                onClick={() => setState(prev => ({ ...prev, phase: 'intro', score: 0, dialogue: [] }))}
                className="px-4 md:px-6 py-2 md:py-3 bg-green-500 text-black font-mystic hover:bg-green-400 transition-all text-sm md:text-base"
              >
                NUEVA PRÁCTICA
              </button>
              <button
                onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                className="px-4 md:px-6 py-2 md:py-3 border-2 border-green-500 text-green-500 font-mystic hover:bg-green-900/20 transition-all text-sm md:text-base"
              >
                SALIR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlienTranslatorGame;


import React, { useState, useEffect, useCallback } from 'react';
import { generateAlienDialogue } from '../services/geminiService';
import { soundManager } from '../services/SoundManager';

interface AlienSpecies {
  id: string;
  name: string;
  description: string;
  difficulty: number;
  color: string;
  avatar: string;
}

const ALIEN_SPECIES: AlienSpecies[] = [
  { id: 'keronian', name: 'Keroniano', description: 'Comerciantes amigables del sistema Keron', difficulty: 1, color: '#22c55e', avatar: '👽' },
  { id: 'sarien', name: 'Sarien', description: 'Guerreros estrictos del imperio Sarien', difficulty: 2, color: '#ef4444', avatar: '🛸' },
  { id: 'estray', name: 'Estrayano', description: 'Sereneros místicos de Estraana', difficulty: 3, color: '#a855f7', avatar: '🌟' },
  { id: 'vohaul', name: 'Vohaul', description: 'IA rebelde con vocabulario técnico', difficulty: 4, color: '#06b6d4', avatar: '🤖' },
  { id: 'slug', name: 'Slug', description: 'Criaturas lentas pero sabias', difficulty: 5, color: '#f97316', avatar: '🦠' },
];

interface DialogueTurn {
  speaker: 'alien' | 'player';
  alienText: string;
  translation: string;
  options?: string[];
  correctOption?: number;
}

interface GameState {
  phase: 'intro' | 'select' | 'dialogue' | 'result';
  selectedSpecies: AlienSpecies | null;
  currentTurn: number;
  score: number;
  dialogue: DialogueTurn[];
  feedback: string | null;
  isCorrect: boolean | null;
}

const AlienTranslatorGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [state, setState] = useState<GameState>({
    phase: 'intro',
    selectedSpecies: null,
    currentTurn: 0,
    score: 0,
    dialogue: [],
    feedback: null,
    isCorrect: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<string>('');

  const startEncounter = async (species: AlienSpecies) => {
    setIsLoading(true);
    soundManager.playSFX('scan');
    try {
      const dialogue = await generateAlienDialogue(species.id, species.difficulty);
      setState(prev => ({
        ...prev,
        phase: 'dialogue',
        selectedSpecies: species,
        dialogue: [dialogue],
        currentTurn: 0,
      }));
      setCurrentOptions(dialogue.options || []);
      setCorrectAnswer(dialogue.translation);
      soundManager.playSFX('success');
    } catch (err) {
      console.error(err);
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const isCorrect = answer === correctAnswer;
    soundManager.playSFX(isCorrect ? 'success' : 'error');
    
    setState(prev => ({
      ...prev,
      score: isCorrect ? prev.score + 10 * (prev.selectedSpecies?.difficulty || 1) : prev.score,
      feedback: isCorrect 
        ? '¡Comunicación exitosa! El alienígena asiente con aprobación.' 
        : `¡Error de traducción! La respuesta correcta era: "${correctAnswer}"`,
      isCorrect,
    }));

    // Generate next turn after delay
    setTimeout(async () => {
      if (state.currentTurn >= 4) {
        setState(prev => ({ ...prev, phase: 'result' }));
        return;
      }

      setIsLoading(true);
      try {
        const nextDialogue = await generateAlienDialogue(
          state.selectedSpecies!.id, 
          state.selectedSpecies!.difficulty
        );
        setState(prev => ({
          ...prev,
          dialogue: [...prev.dialogue, nextDialogue],
          currentTurn: prev.currentTurn + 1,
          feedback: null,
          isCorrect: null,
        }));
        setCurrentOptions(nextDialogue.options || []);
        setCorrectAnswer(nextDialogue.translation);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 2000);
  };

  const speakAlien = (text: string) => {
    soundManager.playSFX('beep');
    // Use Web Speech API for alien voice effect
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.7;
      utterance.pitch = 0.5;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm">
      <div className="absolute inset-0 stars-bg"></div>
      
      <div className="relative w-full max-w-2xl p-6">
        <button 
          onClick={() => { soundManager.playSFX('beep'); onClose(); }} 
          className="absolute -top-10 right-4 text-green-500/50 hover:text-green-500 font-mystic text-xl"
        >
          ✕
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-mystic text-3xl text-green-500 flicker tracking-wider">
            🛸 TRADUCTOR UNIVERSAL 🛸
          </h2>
          <p className="text-green-700 font-mono text-xs mt-2 uppercase tracking-widest">
            Aprende idiomas alienígenas a través del diálogo
          </p>
        </div>

        {/* Score Display */}
        {state.phase !== 'intro' && (
          <div className="flex justify-between items-center mb-6 px-4">
            <div className="text-green-400 font-mono text-sm">
              PUNTOS: <span className="text-green-500 font-bold text-xl">{state.score}</span>
            </div>
            <div className="text-green-400 font-mono text-sm">
              RONDA: <span className="text-green-500 font-bold">{state.currentTurn + 1}/5</span>
            </div>
            {state.selectedSpecies && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{state.selectedSpecies.avatar}</span>
                <span className="text-green-500 font-mystic text-sm">{state.selectedSpecies.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Intro Phase */}
        {state.phase === 'intro' && (
          <div className="space-y-6">
            <div className="bg-black border-4 border-green-500 p-6 rounded-xl">
              <p className="text-green-400 font-mono text-center mb-6">
                Bienvenido al programa de entrenamiento del Traductor Universal.
                <br />
                Selecciona una especie alienígena para practicar:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ALIEN_SPECIES.map(species => (
                  <button
                    key={species.id}
                    onClick={() => startEncounter(species)}
                    disabled={isLoading}
                    className="p-4 border-2 border-green-900 bg-black hover:border-green-500 transition-all text-left group"
                    style={{ borderColor: isLoading ? undefined : `${species.color}40` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{species.avatar}</span>
                      <div className="flex-1">
                        <div className="font-mystic text-green-500 group-hover:text-green-400">
                          {species.name}
                        </div>
                        <div className="text-green-700 text-xs font-mono">
                          {species.description}
                        </div>
                      </div>
                      <div className="text-xs font-mono" style={{ color: species.color }}>
                        {'★'.repeat(species.difficulty)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dialogue Phase */}
        {state.phase === 'dialogue' && state.dialogue.length > 0 && (
          <div className="space-y-6">
            {/* Alien Speech */}
            <div className="bg-black border-4 border-cyan-500 p-6 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{state.selectedSpecies?.avatar}</div>
                <div className="flex-1">
                  <div className="text-cyan-500 font-mystic text-xs mb-2 uppercase tracking-widest">
                    {state.selectedSpecies?.name} dice:
                  </div>
                  <p className="text-cyan-400 font-mono text-lg tracking-wide">
                    "{state.dialogue[state.currentTurn]?.alienText}"
                  </p>
                  <button
                    onClick={() => speakAlien(state.dialogue[state.currentTurn]?.alienText || '')}
                    className="mt-2 text-cyan-700 hover:text-cyan-500 text-xs font-mono"
                  >
                    🔊 Escuchar pronunciación
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {state.feedback && (
              <div className={`p-4 border-2 rounded ${state.isCorrect ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-red-500 bg-red-900/20 text-red-400'}`}>
                {state.feedback}
              </div>
            )}

            {/* Answer Options */}
            {!state.feedback && (
              <div className="bg-black border-4 border-green-900 p-6 rounded-xl">
                <div className="text-green-700 font-mystic text-xs mb-4 uppercase tracking-widest">
                  Selecciona la traducción correcta:
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {currentOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option)}
                      disabled={isLoading}
                      className="p-4 border-2 border-green-900 bg-black hover:border-green-500 hover:bg-green-900/20 transition-all text-left font-mono text-green-400 disabled:opacity-50"
                    >
                      <span className="text-green-700 mr-2">[{idx + 1}]</span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="text-center text-green-500 font-mystic animate-pulse">
                PROCESANDO TRADUCCIÓN...
              </div>
            )}
          </div>
        )}

        {/* Result Phase */}
        {state.phase === 'result' && (
          <div className="bg-black border-4 border-green-500 p-8 rounded-xl text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="font-mystic text-2xl text-green-500 mb-4">
              ¡ENTRENAMIENTO COMPLETADO!
            </h3>
            <p className="text-green-400 font-mono mb-6">
              Puntuación final: <span className="text-green-500 text-3xl font-bold">{state.score}</span> puntos
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setState(prev => ({ ...prev, phase: 'intro', score: 0, dialogue: [] }))}
                className="px-6 py-3 bg-green-500 text-black font-mystic hover:bg-green-400 transition-all"
              >
                NUEVO ENTRENAMIENTO
              </button>
              <button
                onClick={() => { soundManager.playSFX('beep'); onClose(); }}
                className="px-6 py-3 border-2 border-green-500 text-green-500 font-mystic hover:bg-green-900/20 transition-all"
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

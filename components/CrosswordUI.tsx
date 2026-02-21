
import React, { useState, useEffect } from 'react';
import { CrosswordData, Clue } from '../types';
import { getWordHint } from '../logic/hintSystem';
import StarConTerminal from './StarConTerminal';
import { soundManager } from '../services/SoundManager';

interface CrosswordUIProps {
  data: CrosswordData;
  cluesWithText: Record<string, Record<string, { sentence: string, localizedWord: string }>>;
  targetLanguages: string[];
  isDarkMode: boolean;
  onComplete?: () => void;
}

const CrosswordUI: React.FC<CrosswordUIProps> = ({ data, cluesWithText, targetLanguages, isDarkMode, onComplete }) => {
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [isHinted, setIsHinted] = useState<boolean[][]>([]);
  const [completedWords, setCompletedWords] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ x: number, y: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [oracleWord, setOracleWord] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!data || !data.grid || data.grid.length === 0) return;
    
    const initialGrid = Array(data.height).fill(null).map(() => Array(data.width).fill(''));
    const initialHinted = Array(data.height).fill(null).map(() => Array(data.width).fill(false));

    if (data.initialHelp && data.initialHelp > 0) {
      data.clues.forEach(clue => {
        const hint = getWordHint(clue.word, data.initialHelp!);
        for (let i = 0; i < hint.text.length; i++) {
          const char = hint.text[i];
          const x = clue.direction === 'across' ? clue.x + hint.startIndex + i : clue.x;
          const y = clue.direction === 'across' ? clue.y : clue.y + hint.startIndex + i;
          
          if (y < data.height && x < data.width && data.grid[y] && data.grid[y][x]) {
            initialGrid[y][x] = char.toUpperCase();
            initialHinted[y][x] = true;
          }
        }
      });
    }

    setUserGrid(initialGrid);
    setIsHinted(initialHinted);
    checkFullState(initialGrid);
  }, [data]);

  const checkFullState = (grid: string[][]) => {
    if (!grid || grid.length === 0) return;
    
    let totalCells = 0;
    let correctCells = 0;
    const newlyCompleted = new Set<string>();

    data.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          totalCells++;
          const userVal = grid[y]?.[x];
          if (userVal?.toUpperCase() === cell.solution.toUpperCase()) {
            correctCells++;
          }
        }
      });
    });

    data.clues.forEach(clue => {
      let isWordCorrect = true;
      for (let i = 0; i < clue.length; i++) {
        const x = clue.direction === 'across' ? clue.x + i : clue.x;
        const y = clue.direction === 'across' ? clue.y : clue.y + i;
        if (grid[y]?.[x]?.toUpperCase() !== data.grid[y]?.[x]?.solution.toUpperCase()) {
          isWordCorrect = false;
          break;
        }
      }
      if (isWordCorrect) {
        newlyCompleted.add(`${clue.word}-${clue.x}-${clue.y}`);
      }
    });

    if (newlyCompleted.size > completedWords.size) {
      soundManager.playSFX('success');
      if (newlyCompleted.size === data.clues.length && onComplete) {
        onComplete();
      }
    }
    setCompletedWords(newlyCompleted);
    setProgress(totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0);
  };

  const isCellInCompletedWord = (x: number, y: number) => {
    return data.clues.some(clue => {
      if (!completedWords.has(`${clue.word}-${clue.x}-${clue.y}`)) return false;
      if (clue.direction === 'across') {
        return y === clue.y && x >= clue.x && x < clue.x + clue.length;
      } else {
        return x === clue.x && y >= clue.y && y < clue.y + clue.length;
      }
    });
  };

  const handleInputChange = (x: number, y: number, value: string) => {
    soundManager.playSFX('click');
    const val = value.toUpperCase().slice(-1);
    const newGrid = userGrid.map(row => [...row]);
    if (!newGrid[y]) return;
    newGrid[y][x] = val;
    setUserGrid(newGrid);
    checkFullState(newGrid);
  };

  const revealLetter = (word: string) => {
    soundManager.playSFX('click');
    const clue = data.clues.find(c => c.word === word);
    if (!clue) return;
    const newGrid = userGrid.map(row => [...row]);
    const newHinted = isHinted.map(row => [...row]);
    for (let i = 0; i < clue.length; i++) {
      const x = clue.direction === 'across' ? clue.x + i : clue.x;
      const y = clue.direction === 'across' ? clue.y : clue.y + i;
      if (newGrid[y] && (newGrid[y][x] === '' || newGrid[y][x] !== data.grid[y][x]?.solution)) {
        newGrid[y][x] = data.grid[y][x]!.solution.toUpperCase();
        newHinted[y][x] = true;
        break;
      }
    }
    setUserGrid(newGrid);
    setIsHinted(newHinted);
    checkFullState(newGrid);
  };

  const revealFullWord = (word: string) => {
    soundManager.playSFX('error');
    const clue = data.clues.find(c => c.word === word);
    if (!clue) return;
    const newGrid = userGrid.map(row => [...row]);
    const newHinted = isHinted.map(row => [...row]);
    for (let i = 0; i < clue.length; i++) {
      const x = clue.direction === 'across' ? clue.x + i : clue.x;
      const y = clue.direction === 'across' ? clue.y : clue.y + i;
      newGrid[y][x] = data.grid[y][x]!.solution.toUpperCase();
      newHinted[y][x] = true;
    }
    setUserGrid(newGrid);
    setIsHinted(newHinted);
    checkFullState(newGrid);
  };

  const ClueItem: React.FC<{ clue: Clue }> = ({ clue }) => {
    const clueNumber = data.grid[clue.y]?.[clue.x]?.clueNumber || '?';
    const isDone = completedWords.has(`${clue.word}-${clue.x}-${clue.y}`);
    
    const normalizedWord = clue.word.toUpperCase();
    const wordClues = cluesWithText[normalizedWord] || {};

    const renderSentence = (sentence: string, localizedWord: string, done: boolean) => {
      if (!done) return `"${sentence}"`;
      
      const parts = sentence.split('____');
      return (
        <span className="relative">
          "{parts[0]}
          <span className={`inline-block px-2 py-0.5 mx-1 rounded-sm font-black tracking-tight transition-all duration-1000 transform scale-110 ${
            isDarkMode 
            ? 'text-green-400 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
            : 'text-green-700 bg-green-500/10 shadow-[0_0_10px_rgba(22,163,74,0.2)]'
          }`}>
            {localizedWord.toUpperCase()}
          </span>
          {parts[1]}"
        </span>
      );
    };

    return (
      <div className={`p-6 rounded-xl border-4 transition-all shadow-md relative overflow-hidden ${
        isDone 
          ? (isDarkMode ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50/50 border-green-500/30')
          : (isDarkMode ? 'bg-black border-green-900 hover:border-green-500/30' : 'bg-white border-slate-200 hover:border-green-600')
      }`}>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 flex items-center justify-center rounded-none border-2 text-xs font-black shadow-inner transition-colors ${
                isDone ? 'bg-green-700 text-white border-green-400' : 'bg-green-500 text-black border-green-900'
              }`}>
                {clueNumber}
              </span>
              <span className={`text-[10px] font-mystic uppercase tracking-[0.1em] transition-colors ${isDone ? 'text-green-600' : 'text-green-400'}`}>
                {isDone ? 'REGISTRO CONFIRMADO' : 'DATOS DE SECTOR'}
              </span>
            </div>

            <div className="space-y-6">
              {targetLanguages.map((lang, idx) => {
                const clueData = wordClues[lang];
                
                return (
                  <div key={lang} className={`relative pl-5 border-l-4 transition-all ${
                    isDone 
                      ? (isDarkMode ? 'border-green-500/30' : 'border-green-500/40')
                      : (isDarkMode ? 'border-green-500/20' : 'border-green-500/40')
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-none border transition-colors ${
                        isDone 
                          ? (isDarkMode ? 'bg-green-500/10 text-green-500/70 border-green-500/30' : 'bg-green-100 text-green-700 border-green-200')
                          : (isDarkMode ? 'bg-slate-900 text-green-700 border-green-900' : 'bg-slate-100 text-slate-500 border-slate-200')
                      }`}>
                        {lang}
                      </p>
                      {idx === 0 && !isDone && <span className="text-green-500 animate-pulse text-xs">■</span>}
                    </div>
                    
                    {clueData ? (
                      <p className={`text-[15px] font-bold leading-relaxed transition-all duration-700 font-mono uppercase ${
                        isDone 
                          ? (isDarkMode ? 'text-green-900' : 'text-slate-900/40') 
                          : (isDarkMode ? 'text-green-400' : 'text-slate-900')
                      }`}>
                        {renderSentence(clueData.sentence, clueData.localizedWord, isDone)}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] font-medium text-green-500/40 italic font-mono">
                        <div className="w-1.5 h-1.5 rounded-none bg-green-500 animate-ping"></div>
                        ACCEDIENDO A STARCON...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {!isDone && (
            <div className="flex flex-col gap-3 ml-4">
              <button 
                onClick={() => setOracleWord(clue.word)}
                className="p-3.5 bg-green-500/10 text-green-500 border-2 border-green-500/20 rounded-none hover:bg-green-500/20 hover:scale-110 transition-all shadow-sm"
                title="Consultar Terminal"
              >
                📟
              </button>
              <button 
                onClick={() => revealFullWord(clue.word)}
                className="p-3.5 bg-red-500/10 text-red-500 border-2 border-red-500/20 rounded-none hover:bg-red-500/20 hover:scale-110 transition-all shadow-sm"
                title="Sobrecarga de Datos"
              >
                ☢️
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const isGridReady = userGrid.length > 0;

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-black">
        {/* Header with progress and close button */}
        <div className="flex items-center justify-between p-4 border-b-4 border-green-900 bg-black">
          <div className="flex items-center gap-4">
            <span className="text-green-500 font-mystic text-lg">{data.theme || 'SECTOR'}</span>
            <div className="w-48 h-4 rounded-none overflow-hidden border-2 border-green-900">
              <div 
                className="h-full bg-green-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-green-400 font-mono text-xs">{progress}%</span>
          </div>
          <button
            onClick={() => { soundManager.playSFX('beep'); setIsFullscreen(false); }}
            className="px-4 py-2 border-2 border-red-900 text-red-400 font-mystic text-xs hover:border-red-500"
          >
            ✕ SALIR
          </button>
        </div>

        {/* Main content - Grid centered, clues below */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Grid section */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {isGridReady && (
              <div 
                className={`grid p-2 rounded-none shadow-2xl border-4 bg-black border-green-900`}
                style={{ 
                  gap: '2px',
                  gridTemplateColumns: `repeat(${data.width}, minmax(22px, 32px))`,
                  width: 'fit-content'
                }}
              >
                {data.grid.map((row, y) => 
                  row.map((cell, x) => {
                    const isCompleted = isCellInCompletedWord(x, y);
                    const isCellCorrect = cell && userGrid[y]?.[x]?.toUpperCase() === cell.solution;
                    const userCellValue = userGrid[y]?.[x] || '';
                    
                    return (
                      <div 
                        key={`${x}-${y}`} 
                        className={`relative flex items-center justify-center transition-all duration-300 rounded-none border-2 aspect-square ${
                          cell 
                          ? (isCompleted 
                              ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                              : (isHinted[y]?.[x] 
                                  ? 'bg-blue-500/20 border-blue-500/50' 
                                  : 'bg-slate-900 border-green-900 shadow-sm')) 
                          : 'bg-black border-transparent opacity-100'
                        } ${selectedCell?.x === x && selectedCell?.y === y ? 'ring-4 ring-green-500 z-10 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : ''}`}
                        onClick={() => cell && setSelectedCell({ x, y })}
                      >
                        {cell && (
                          <>
                            {cell.clueNumber && (
                              <span className="absolute top-0 left-0 text-[6px] font-black leading-none text-green-900">
                                {cell.clueNumber}
                              </span>
                            )}
                            <input
                              type="text"
                              maxLength={1}
                              value={userCellValue}
                              onChange={(e) => handleInputChange(x, y, e.target.value)}
                              className={`w-full h-full text-center text-sm font-black uppercase outline-none bg-transparent font-mono ${
                                userCellValue !== ''
                                  ? (isCellCorrect ? 'text-green-400' : 'text-red-500') 
                                  : 'text-white'
                              }`}
                            />
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Clues section - below the grid */}
          <div className="h-[40vh] border-t-4 border-green-900 bg-black overflow-y-auto">
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-mystic uppercase tracking-[0.2em] mb-4 flex items-center gap-3 text-green-500/50">
                  <div className="w-2 h-2 rounded-none bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div> HORIZONTALES
                </h3>
                <div className="space-y-4">
                  {data.clues.filter(c => c.direction === 'across').map((c, i) => <ClueItem key={`h-${i}`} clue={c} />)}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-mystic uppercase tracking-[0.2em] mb-4 flex items-center gap-3 text-green-500/50">
                  <div className="w-2 h-2 rounded-none bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div> VERTICALES
                </h3>
                <div className="space-y-4">
                  {data.clues.filter(c => c.direction === 'down').map((c, i) => <ClueItem key={`v-${i}`} clue={c} />)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {oracleWord && (
          <StarConTerminal 
            word={oracleWord} 
            language={targetLanguages[0] || 'inglés'} 
            onClose={() => setOracleWord(null)} 
            onRevealLetter={() => revealLetter(oracleWord)}
            onRevealFullWord={() => { revealFullWord(oracleWord); setOracleWord(null); }}
          />
        )}
      </div>
    );
  }

  // Normal mode - Grid at top, clues below
  return (
    <div className="relative">
      {/* Barra de Progreso y botón fullscreen */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex-1 h-6 rounded-none overflow-hidden shadow-inner border-4 ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-200 border-slate-300'}`}>
          <div 
            className="h-full bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={() => { soundManager.playSFX('click'); setIsFullscreen(true); }}
          className={`px-4 py-2 border-2 font-mystic text-xs transition-all ${
            isDarkMode 
              ? 'bg-black border-green-900 text-green-400 hover:border-green-500' 
              : 'bg-white border-slate-300 text-slate-600 hover:border-green-500'
          }`}
          title="Pantalla completa"
        >
          ⛶
        </button>
      </div>

      <div className={`rounded-xl shadow-2xl overflow-hidden flex flex-col border-8 transition-all ${
        isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-800'
      }`}>
        {/* Grid del Tablero - Arriba */}
        <div className={`p-2 sm:p-4 flex items-center justify-center overflow-auto ${
          isDarkMode ? 'bg-black' : 'bg-slate-100'
        }`}>
          {isGridReady ? (
            <div 
              className={`grid p-2 sm:p-3 rounded-none shadow-2xl border-4 ${
                isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-400'
              }`}
              style={{ 
                gap: '2px',
                gridTemplateColumns: `repeat(${data.width}, minmax(24px, 36px))`,
                width: 'fit-content'
              }}
            >
              {data.grid.map((row, y) => 
                row.map((cell, x) => {
                  const isCompleted = isCellInCompletedWord(x, y);
                  const isCellCorrect = cell && userGrid[y]?.[x]?.toUpperCase() === cell.solution;
                  const userCellValue = userGrid[y]?.[x] || '';
                  
                  return (
                    <div 
                      key={`${x}-${y}`} 
                      className={`relative flex items-center justify-center transition-all duration-300 rounded-none border-2 aspect-square ${
                        cell 
                        ? (isCompleted 
                            ? (isDarkMode ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-green-50 border-green-600') 
                            : (isHinted[y]?.[x] 
                                ? (isDarkMode ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-500') 
                                : (isDarkMode ? 'bg-slate-900 border-green-900 shadow-sm' : 'bg-white border-slate-300 shadow-sm'))) 
                        : (isDarkMode ? 'bg-black border-transparent opacity-100' : 'bg-slate-800 border-slate-900 shadow-inner')
                      } ${selectedCell?.x === x && selectedCell?.y === y ? 'ring-4 ring-green-500 z-10 scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : ''}`}
                      onClick={() => cell && setSelectedCell({ x, y })}
                    >
                      {cell && (
                        <>
                          {cell.clueNumber && (
                            <span className={`absolute top-0 left-0 text-[6px] font-black leading-none ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>
                              {cell.clueNumber}
                            </span>
                          )}
                          <input
                            type="text"
                            maxLength={1}
                            value={userCellValue}
                            onChange={(e) => handleInputChange(x, y, e.target.value)}
                            className={`w-full h-full text-center text-xs sm:text-sm font-black uppercase outline-none bg-transparent font-mono ${
                              userCellValue !== ''
                                ? (isCellCorrect 
                                    ? (isDarkMode ? 'text-green-400' : 'text-green-900') 
                                    : 'text-red-500') 
                                : (isDarkMode ? 'text-white' : 'text-slate-900')
                            }`}
                          />
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="w-16 h-16 border-4 border-green-500/10 border-t-green-500 rounded-none animate-pulse bg-green-900/20"></div>
              <p className="font-mystic text-base uppercase tracking-[0.2em] text-green-500/40">Iniciando Sistema...</p>
            </div>
          )}
        </div>

        {/* Pistas - Abajo */}
        <div className={`w-full border-t-8 flex flex-col max-h-[500px] ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-50 border-slate-800'}`}>
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className={`text-xs font-mystic uppercase tracking-[0.2em] mb-6 flex items-center gap-4 ${isDarkMode ? 'text-green-500/50' : 'text-green-700'}`}>
                  <div className="w-3 h-3 rounded-none bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div> HORIZONTALES
                </h3>
                <div className="space-y-6">
                  {data.clues.filter(c => c.direction === 'across').map((c, i) => <ClueItem key={`h-${i}`} clue={c} />)}
                </div>
              </div>
              <div>
                <h3 className={`text-xs font-mystic uppercase tracking-[0.2em] mb-6 flex items-center gap-4 ${isDarkMode ? 'text-green-500/50' : 'text-green-700'}`}>
                  <div className="w-3 h-3 rounded-none bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div> VERTICALES
                </h3>
                <div className="space-y-6">
                  {data.clues.filter(c => c.direction === 'down').map((c, i) => <ClueItem key={`v-${i}`} clue={c} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {oracleWord && (
        <StarConTerminal 
          word={oracleWord} 
          language={targetLanguages[0] || 'inglés'} 
          onClose={() => setOracleWord(null)} 
          onRevealLetter={() => revealLetter(oracleWord)}
          onRevealFullWord={() => { revealFullWord(oracleWord); setOracleWord(null); }}
        />
      )}
    </div>
  );
};

export default CrosswordUI;


import React, { useState } from 'react';
import { WordItem } from '../types';
import BulkImportModal from './BulkImportModal';
import { soundManager } from '../services/SoundManager';

interface WordListProps {
  words: WordItem[];
  onAddWord: (word: string, translation: string) => void;
  onRemoveWord: (id: string) => void;
  onGenerate: () => void;
  onShowFullList: () => void;
  onOpenSettings: () => void;
  isLoading: boolean;
  selectedLanguagesCount: number;
  isDarkMode: boolean;
}

const WordList: React.FC<WordListProps> = ({ 
  words, 
  onAddWord, 
  onRemoveWord, 
  onGenerate, 
  onShowFullList, 
  onOpenSettings,
  isLoading,
  selectedLanguagesCount,
  isDarkMode
}) => {
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWord.trim() && newTranslation.trim()) {
      onAddWord(newWord.trim(), newTranslation.trim());
      setNewWord('');
      setNewTranslation('');
    } else {
      soundManager.playSFX('error');
    }
  };

  const handleAddMultiple = (newWords: {word: string, translation: string}[]) => {
    newWords.forEach(w => onAddWord(w.word, w.translation));
    soundManager.playSFX('success');
  };

  return (
    <div className={`rounded-xl shadow-lg p-6 h-full flex flex-col border-4 transition-colors duration-300 ${
      isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-xl font-mystic flex items-center gap-2 ${isDarkMode ? 'text-green-400' : 'text-slate-800'}`}>
          <span className={`p-2 rounded-lg text-sm border-2 ${isDarkMode ? 'bg-green-900/20 text-green-400 border-green-500' : 'bg-indigo-100 text-indigo-600'}`}>💾</span>
          DATOS ({words.length})
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { soundManager.playSFX('beep'); setShowBulkModal(true); }}
            className={`p-2 rounded-lg border-2 transition-all ${isDarkMode ? 'text-green-400 border-green-900 hover:border-green-500' : 'text-amber-600 hover:bg-amber-50'}`}
            title="Importación de Datos"
          >
            📥
          </button>
          <button 
            onClick={onShowFullList}
            className={`p-2 rounded-lg border-2 transition-all ${isDarkMode ? 'text-green-700 border-green-900 hover:text-green-400 hover:border-green-500' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
            title="Ver lista completa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button 
            onClick={onOpenSettings}
            className={`p-2 rounded-lg border-2 transition-all relative ${isDarkMode ? 'text-green-700 border-green-900 hover:text-green-400 hover:border-green-500' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
            title="Ajustes de Sistema"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-green-500 text-black text-[9px] font-bold w-4 h-4 rounded-none flex items-center justify-center border-2 border-black">
              {selectedLanguagesCount}
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="NUEVO TÉRMINO"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            className={`w-full p-4 rounded-none outline-none transition-all border-2 font-mono uppercase ${
              isDarkMode 
              ? 'bg-black border-green-900 text-green-400 placeholder-green-900 focus:border-green-500' 
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-inner'
            }`}
          />
          <input
            type="text"
            placeholder="TRADUCCIÓN"
            value={newTranslation}
            onChange={(e) => setNewTranslation(e.target.value)}
            className={`w-full p-4 rounded-none outline-none transition-all border-2 font-mono uppercase ${
              isDarkMode 
              ? 'bg-black border-green-900 text-green-400 placeholder-green-900 focus:border-green-500' 
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-inner'
            }`}
          />
        </div>
        <button
          type="submit"
          className={`w-full py-4 rounded-none font-mystic uppercase tracking-widest text-[10px] transition-all shadow-lg border-2 ${
            isDarkMode 
            ? 'bg-green-900/40 text-green-400 border-green-500 hover:bg-green-900/60' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          SUBIR AL MAINFRAME
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {words.length === 0 ? (
          <p className={`text-center py-10 font-mono uppercase ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>
            MEMORIA VACÍA.
          </p>
        ) : (
          words.slice(0, 30).map((item) => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-none border-2 group transition-all ${
              isDarkMode ? 'bg-black border-green-900 hover:border-green-500' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
            }`}>
              <div className="overflow-hidden">
                <p className={`font-bold truncate font-mono uppercase ${isDarkMode ? 'text-green-400' : 'text-slate-700'}`}>{item.word}</p>
                <p className={`text-xs truncate font-mono uppercase ${isDarkMode ? 'text-green-800' : 'text-slate-400'}`}>{item.translation}</p>
              </div>
              <button 
                onClick={() => onRemoveWord(item.id)} 
                className={`transition-colors p-2 rounded-none border ${isDarkMode ? 'text-green-900 border-green-900 hover:text-red-500 hover:border-red-500' : 'text-slate-300 hover:text-red-500 hover:bg-red-50'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || words.length < 3}
        className={`mt-4 w-full py-5 rounded-none font-mystic text-[10px] uppercase tracking-[0.1em] shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 border-4 ${
          isLoading || words.length < 3 
          ? 'bg-slate-900 text-green-900 border-green-900 cursor-not-allowed' 
          : 'bg-green-500 text-black border-green-400 hover:bg-green-400'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-none animate-pulse bg-green-900"></div>
            <span>PROCESANDO...</span>
          </div>
        ) : (
          <>
            <span>🛰️</span>
            <span>GENERAR SECTOR</span>
          </>
        )}
      </button>

      {showBulkModal && (
        <BulkImportModal 
          onAddWords={handleAddMultiple} 
          onClose={() => setShowBulkModal(false)} 
          isDarkMode={isDarkMode} 
        />
      )}
    </div>
  );
};

export default WordList;

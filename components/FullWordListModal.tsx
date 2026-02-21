
import React, { useState } from 'react';
import { WordItem } from '../types';

interface FullWordListModalProps {
  words: WordItem[];
  onClose: () => void;
  isDarkMode: boolean;
}

const FullWordListModal: React.FC<FullWordListModalProps> = ({ words, onClose, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredWords = words.filter(
    (w) => 
      w.word.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.translation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border-8 ${
        isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'
      }`}>
        {/* Header */}
        <div className={`p-8 border-b-4 flex items-center justify-between sticky top-0 z-10 ${
          isDarkMode ? 'bg-black border-green-900 backdrop-blur-md' : 'bg-white/80 border-slate-100 backdrop-blur-md'
        }`}>
          <div>
            <h2 className={`text-2xl font-mystic tracking-tight ${isDarkMode ? 'text-green-400' : 'text-slate-800'}`}>BANCO DE MEMORIA</h2>
            <p className={`text-sm font-mono uppercase ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>{words.length} registros almacenados en el sector</p>
          </div>
          <button 
            onClick={onClose}
            className={`p-3 rounded-none border-2 transition-all ${isDarkMode ? 'text-green-900 border-green-900 hover:text-green-400 hover:border-green-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className={`px-8 py-6 border-b-4 ${isDarkMode ? 'bg-black border-green-900' : 'bg-slate-50 border-slate-100'}`}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-900">🔍</span>
            <input 
              type="text"
              placeholder="BUSCAR REGISTRO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-6 py-4 rounded-none outline-none transition-all border-4 font-mono uppercase ${
                isDarkMode 
                ? 'bg-black border-green-900 text-green-400 placeholder-green-900 focus:border-green-500' 
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500 shadow-sm'
              }`}
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWords.length > 0 ? (
              filteredWords.map((item) => (
                <div key={item.id} className={`p-6 border-4 rounded-none transition-all flex flex-col gap-2 ${
                  isDarkMode ? 'bg-black border-green-900 hover:border-green-500' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg'
                }`}>
                  <span className={`text-[10px] font-mystic uppercase tracking-widest ${isDarkMode ? 'text-green-700' : 'text-indigo-500'}`}>ORIGEN</span>
                  <span className={`text-xl font-mono font-bold leading-tight uppercase ${isDarkMode ? 'text-green-400' : 'text-slate-800'}`}>{item.word}</span>
                  <div className={`h-1 my-2 ${isDarkMode ? 'bg-green-900' : 'bg-slate-100'}`}></div>
                  <span className={`text-[10px] font-mystic uppercase tracking-widest ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>TRADUCCIÓN</span>
                  <span className={`font-mono font-bold uppercase ${isDarkMode ? 'text-green-600' : 'text-slate-600'}`}>{item.translation}</span>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className={`text-lg font-mono uppercase ${isDarkMode ? 'text-green-900' : 'text-slate-400'}`}>SIN COINCIDENCIAS PARA "{searchTerm}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t-4 text-center text-[10px] font-mystic uppercase tracking-[0.1em] ${
          isDarkMode ? 'bg-black border-green-900 text-green-900' : 'bg-slate-50 border-slate-100 text-slate-400'
        }`}>
          SISTEMA OPERATIVO STARCON V1.0
        </div>
      </div>
    </div>
  );
};

export default FullWordListModal;

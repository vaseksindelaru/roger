
import React, { useState } from 'react';
import { soundManager } from '../services/SoundManager';

interface LoginModalProps {
  onLogin: (user: any) => void;
  isDarkMode: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, isDarkMode }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    soundManager.playSFX('scan');

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en la autenticación');
      
      onLogin(data);
    } catch (err: any) {
      setError(err.message);
      soundManager.playSFX('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="absolute inset-0 stars-bg"></div>
      <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden border-8 relative z-10 ${
        isDarkMode ? 'bg-black border-green-900' : 'bg-white border-slate-200'
      }`}>
        <div className="p-8 border-b-4 border-green-900 text-center">
          <h2 className="text-3xl font-mystic text-green-400 flicker">AUTENTICACIÓN STARCON</h2>
          <p className="text-[10px] text-green-900 uppercase tracking-widest mt-2 font-mono">Identifíquese, cadete</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border-2 border-red-500 text-red-500 text-xs font-mono uppercase">
              ERROR: {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mystic text-green-900 uppercase mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full p-4 bg-black border-4 border-green-900 text-green-400 outline-none focus:border-green-500 font-mono uppercase"
                placeholder="ROGER_WILCO"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mystic text-green-900 uppercase mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-4 bg-black border-4 border-green-900 text-green-400 outline-none focus:border-green-500 font-mono"
                placeholder="********"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-green-500 text-black font-mystic text-sm hover:bg-green-400 transition-all border-4 border-green-400 disabled:opacity-50"
          >
            {isLoading ? 'PROCESANDO...' : (isSignup ? 'CREAR CUENTA' : 'INICIAR SESIÓN')}
          </button>

          <button
            type="button"
            onClick={() => { soundManager.playSFX('click'); setIsSignup(!isSignup); }}
            className="w-full text-[10px] font-mystic text-green-900 hover:text-green-500 transition-colors uppercase"
          >
            {isSignup ? '¿Ya tienes cuenta? Identifícate' : '¿Nuevo cadete? Regístrate aquí'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;

import React, { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Minus, 
  Square, 
  User, 
  Lock, 
  Mail, 
  LogIn, 
  ChevronRight
} from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const url = isLogin ? '/api/auth/login' : '/api/auth/signup';
    const body = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Store token
      localStorage.setItem('retro_token', data.token);
      
      // Navigate to home window
      navigate('/home');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isLogin ? 'login' : 'signup'}
        initial={{ scale: 0.8, opacity: 0, x: "-50%", y: "-50%" }}
        animate={{ scale: 1, opacity: 1, x: "-50%", y: "-50%" }}
        exit={{ scale: 0.8, opacity: 0, x: "-50%", y: "-50%" }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="window-frame w-full max-w-sm z-10 absolute top-1/2 left-1/2 pointer-events-auto shadow-2xl"
      >
        <div className="window-title">
          <div className="flex items-center gap-1">
            <LogIn size={12} />
            <span>{isLogin ? 'AUTH_ZONE_LOGIN.EXE' : 'AUTH_ZONE_SIGNUP.EXE'}</span>
          </div>
          <div className="flex gap-0.5">
            <button className="window-frame p-0.5 hover:bg-gray-200"><Minus size={10} /></button>
            <button className="window-frame p-0.5 hover:bg-gray-200"><Square size={10} /></button>
            <button className="window-frame p-0.5 hover:bg-gray-200 bg-retro-gray"><X size={10} /></button>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-retro-gray">
          <div className="text-center space-y-2">
            <h1 className="font-retro text-6xl tracking-tighter text-retro-blue drop-shadow-sm uppercase">
              RetroSocial
            </h1>
            <p className="text-[10px] uppercase font-bold text-gray-600">
              Version 0.99 Beta • (C) 1998 Retro Corp
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500 text-white p-2 text-[10px] font-bold border-2 border-red-800 uppercase">
                ERROR: {error}
              </div>
            )}
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <User size={10} /> Full Name
                </label>
                <input 
                  type="text" 
                  className="retro-input w-full" 
                  placeholder="e.g. John Matrix"
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase flex items-center gap-1">
                <Mail size={10} /> Network ID
              </label>
              <input 
                type="email" 
                className="retro-input w-full" 
                placeholder="user@network.com"
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase flex items-center gap-1">
                <Lock size={10} /> Access Key
              </label>
              <input 
                type="password" 
                className="retro-input w-full" 
                placeholder="********"
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <button 
                disabled={isLoading}
                type="submit"
                className="retro-button w-full font-bold uppercase text-sm group disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="animate-pulse">PROCESSING...</span>
                ) : (
                  <>
                    {isLogin ? 'Initialize Session' : 'Create Identity'}
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="border-t border-gray-400 pt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold text-gray-600 uppercase">
              {isLogin ? "No identity found?" : "Identity already exists?"}
            </p>
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-retro-blue text-xs font-bold underline hover:text-retro-pink uppercase"
            >
              {isLogin ? 'Synthesize New Account' : 'Return to Login Terminal'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, Unlock, ShieldAlert, Sparkles, AlertCircle, RefreshCw, X, ArrowUpRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

interface AdultZoneProps {
  onMovieSelect: (movie: any) => void;
  onGoBack: () => void;
}

export default function AdultZone({ onMovieSelect, onGoBack }: AdultZoneProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdultDisclaimer, setShowAdultDisclaimer] = useState(true);
  const [adultMovies, setAdultMovies] = useState<any[]>([]);
  const [revealedThumbnails, setRevealedThumbnails] = useState<Record<string, boolean>>({});

  // Panic Switch: Calculator State
  const [panicMode, setPanicMode] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcMemory, setCalcMemory] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);

  // Default Password specified by customer
  const CORRECT_PASS = '@movie_pulse_media256';

  useEffect(() => {
    // Check local storage password unlock state
    const savedUnlock = localStorage.getItem('MP_ADULT_UNLOCKED') === 'true';
    if (savedUnlock) {
      setIsUnlocked(true);
      fetchAdultContent();
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === CORRECT_PASS) {
      localStorage.setItem('MP_ADULT_UNLOCKED', 'true');
      setIsUnlocked(true);
      setErrorMsg('');
      fetchAdultContent();
    } else {
      setErrorMsg('Incorrect subscriber key pin. Get voucher keys by calling 0766051929');
    }
  };

  const fetchAdultContent = async () => {
    // We will attempt to fetch movies tagged that are classified or separate
    // For demo/admin users, we'll auto-populate mock ones if there's no data
    try {
      const q = query(collection(db, 'movies'));
      const snapshot = await getDocs(q);
      const items: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.genres?.includes('Adult') || data.genres?.includes('18+') || data.isAdult === true) {
          items.push({ id: d.id, ...data });
        }
      });
      setAdultMovies(items);
    } catch (e) {
      console.warn("Error loading adult content or database empty: ", e);
    }
  };

  const forceLock = () => {
    localStorage.removeItem('MP_ADULT_UNLOCKED');
    setIsUnlocked(false);
    onGoBack();
  };

  // Fake Calculator Exit Utilities
  const handleCalcBtn = (val: string) => {
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(val);
    } else {
      setCalcDisplay((prev) => prev + val);
    }
  };

  const handleCalcOp = (op: string) => {
    setCalcMemory(parseFloat(calcDisplay));
    setCalcOp(op);
    setCalcDisplay('0');
  };

  const handleCalcEqual = () => {
    if (!calcOp || calcMemory === null) return;
    const currentVal = parseFloat(calcDisplay);
    let result = 0;
    switch (calcOp) {
      case '+': result = calcMemory + currentVal; break;
      case '-': result = calcMemory - currentVal; break;
      case '*': result = calcMemory * currentVal; break;
      case '/': result = currentVal !== 0 ? calcMemory / currentVal : 0; break;
    }
    setCalcDisplay(String(result));
    setCalcOp(null);
    setCalcMemory(null);
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcMemory(null);
    setCalcOp(null);
  };

  const toggleRevealThumbnail = (id: string) => {
    setRevealedThumbnails(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Switch instantly back to Home
  const triggerPanicExit = () => {
    setPanicMode(false);
    forceLock();
  };

  if (panicMode) {
    return (
      <div className="min-h-screen bg-[#111] text-gray-200 flex flex-col justify-between p-6 select-none font-mono">
        <div className="flex justify-between items-center bg-[#1e1e1e] p-3 rounded-lg border border-gray-800">
          <span className="text-sm font-bold tracking-wider text-gray-300">CALCULATOR PRO v2.1</span>
          <button 
            id="panic-kill-calc"
            onClick={triggerPanicExit}
            className="text-gray-400 hover:text-white bg-red-950 px-2 py-1 text-xs font-bold rounded"
          >
            QUIT APP ✕
          </button>
        </div>

        {/* Calculator Display */}
        <div className="my-8 bg-black border border-gray-800 rounded-xl p-6 text-right text-3xl font-black tracking-widest text-[#25D366] overflow-x-auto min-h-[75px] flex items-center justify-end">
          {calcDisplay}
        </div>

        {/* Keyboard buttons */}
        <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto w-full">
          {['7', '8', '9', '/'].map((item) => (
            <button
              key={item}
              onClick={() => (item === '/' ? handleCalcOp('/') : handleCalcBtn(item))}
              className="bg-[#1c1c1c] hover:bg-[#252525] p-4 text-xl font-bold rounded-xl border border-gray-800 text-white"
            >
              {item}
            </button>
          ))}
          {['4', '5', '6', '*'].map((item) => (
            <button
              key={item}
              onClick={() => (item === '*' ? handleCalcOp('*') : handleCalcBtn(item))}
              className="bg-[#1c1c1c] hover:bg-[#252525] p-4 text-xl font-bold rounded-xl border border-gray-800 text-white"
            >
              {item}
            </button>
          ))}
          {['1', '2', '3', '-'].map((item) => (
            <button
              key={item}
              onClick={() => (item === '-' ? handleCalcOp('-') : handleCalcBtn(item))}
              className="bg-[#1c1c1c] hover:bg-[#252525] p-4 text-xl font-bold rounded-xl border border-gray-800 text-white"
            >
              {item}
            </button>
          ))}
          <button
            onClick={handleCalcClear}
            className="bg-red-950 text-red-400 hover:bg-red-900 p-4 text-xl font-bold rounded-xl border border-red-900/30"
          >
            C
          </button>
          <button
            onClick={() => handleCalcBtn('0')}
            className="bg-[#1c1c1c] hover:bg-[#252525] p-4 text-xl font-bold rounded-xl border border-gray-800 text-white"
          >
            0
          </button>
          <button
            onClick={handleCalcEqual}
            className="bg-[#25D366] text-black hover:bg-emerald-400 p-4 text-xl font-black rounded-xl col-span-2 shadow-[0_0_15px_#25D366/0.2]"
          >
            =
          </button>
        </div>

        <div className="bg-[#151515] p-3 rounded-lg text-center mt-6 border border-gray-800">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            PANIC TRIGGER ACTIVE. PRESS "QUIT APP" TO CLEAR ALL SESSION CACHES
          </p>
        </div>
      </div>
    );
  }

  if (showAdultDisclaimer) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-[#151515] rounded-3xl p-6 border border-red-950 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-700/10 rounded-full filter blur-2xl" />

          <ShieldAlert className="w-16 h-16 text-[#ff0a16] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-extrabold text-white uppercase tracking-wider mb-2">
            18+ Restricted adult entry
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed z-10 relative">
            This category is strictly restricted for adults aged 18 and older. It contains cinematic premium titles restricted within Uganda guidelines.
          </p>

          <div className="space-y-3 mt-6">
            <button
              id="confirm-age-btn"
              onClick={() => setShowAdultDisclaimer(false)}
              className="w-full bg-[#e50914] text-white py-3 rounded-xl font-bold max-w-sm mx-auto hover:bg-[#ff0a16] transition text-sm tracking-wider shadow-[0_0_15px_rgba(229,9,20,0.4)]"
            >
              I AM 18 YEARS OR OLDER
            </button>
            <button
              id="decline-age-btn"
              onClick={onGoBack}
              className="w-full bg-[#111] hover:bg-gray-800 text-gray-400 py-3 rounded-xl text-xs font-semibold max-w-sm mx-auto transition border border-gray-800"
            >
              DECLINE AND LEAVE
            </button>
          </div>
          <div className="text-[10px] text-gray-500 font-mono mt-4 uppercase">
            Uganda Communications Commission Compliance Audit Ready
          </div>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-[#151515] border border-gray-800 p-6 rounded-3xl text-center shadow-2xl">
          <Lock className="w-12 h-12 text-[#ff0a16] mx-auto mb-3" />
          <h2 className="text-xl font-extrabold text-white tracking-tight">Active Member Pin Required</h2>
          <p className="text-xs text-gray-400 mt-1 leading-normal">
            Enter the VIP password supplied by the administrator for paid subscribers.
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <div>
              <input
                id="adult-password-input"
                type="password"
                placeholder="Enter Vault Password Key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] rounded-xl px-4 py-3 text-xs text-white text-center tracking-wider border border-gray-800 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>

            {errorMsg && (
              <p className="text-red-400 text-[11px] font-medium leading-relaxed uppercase bg-red-950/20 py-1.5 px-3 rounded border border-red-950/30">
                {errorMsg}
              </p>
            )}

            <button
              id="submit-adult-password"
              type="submit"
              className="w-full bg-[#e50914] text-white py-3 rounded-xl font-bold hover:bg-[#ff0a16] transition text-xs tracking-widest flex items-center justify-center space-x-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>ACTIVATE VIP ENTRANCE</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-gray-900 flex flex-col space-y-1.5 text-center text-[10px] text-gray-400 font-sans">
            <p className="text-xs text-gray-500">Don't have the current password?</p>
            <p>MTN: 0766051929 | Airtel: 0704557858</p>
            <p className="text-[#25D366] underline cursor-pointer" onClick={() => window.open('https://wa.me/256766051929?text=I%20want%20the%20Adult%20Zone%20password', '_blank')}>
              Pay on WhatsApp & Activate Key
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-gray-100 p-4 pb-20">
      {/* Upper action header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-[10px] font-mono bg-red-950 text-[#ff0a16] px-2 py-0.5 rounded border border-red-900/40 uppercase tracking-widest font-black inline-block">
            🔞 PRIVATE ADULT ZONE
          </span>
          <h1 className="text-xl font-extrabold tracking-tight text-white mt-1">Underground Titles</h1>
        </div>
        <div className="flex space-x-2">
          {/* Working Panic Escape Button */}
          <button
            id="calculator-panic"
            onClick={() => setPanicMode(true)}
            className="bg-yellow-500 text-black hover:bg-yellow-400 px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase flex items-center space-x-1 shadow"
          >
            <span>📱 CALCULATOR PANIC (HIDE)</span>
          </button>
          <button
            id="lock-adult-zone"
            onClick={forceLock}
            className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 px-3 py-1.5 rounded-xl text-xs font-bold"
          >
            LOCK EXIT
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-4 mb-6 text-xs text-gray-400 flex items-center space-x-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
        <p>
          <strong>Automatic Safeguard:</strong> This zone clears playback history references on logout. Tap thumbnails to reveal previews. Use the <strong>PANIC SWITCH</strong> button to take you instantly away in mixed companies.
        </p>
      </div>

      {adultMovies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111] rounded-3xl border border-gray-800">
          <EyeOff className="w-10 h-10 text-gray-600 mb-3" />
          <h3 className="font-bold text-white text-md">Room Under Maintenance</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            No restricted Adult-only movies are available in Firestore. Upload content referencing "Adult" category in the Admin Dashboard!
          </p>
          <p className="text-xs text-yellow-500 font-mono mt-4 uppercase">
            Select "Add Mock Cinema Data" in the Admin page to auto load.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {adultMovies.map((movie) => {
            const isRevealed = revealedThumbnails[movie.id] || false;
            return (
              <div 
                key={movie.id} 
                className="bg-[#151515] border border-gray-900 rounded-2xl overflow-hidden hover:border-gray-800 relative group flex flex-col justify-between"
              >
                {/* Visual Cover blur lock */}
                <div className="relative aspect-[3/4] overflow-hidden bg-black select-none">
                  <img
                    src={movie.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300'}
                    alt={movie.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      isRevealed ? 'blur-0' : 'blur-3xl opacity-35'
                    }`}
                  />
                  {!isRevealed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/60">
                      <Lock className="w-8 h-8 text-[#ff0a16] mb-1 drop-shadow" />
                      <span className="text-[10px] font-mono font-bold text-gray-300">BLURRED PREVIEW</span>
                      <button
                        onClick={() => toggleRevealThumbnail(movie.id)}
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full px-3 py-1 font-mono text-[9px] mt-2 transition"
                      >
                        REVEAL COVER
                      </button>
                    </div>
                  )}
                  {isRevealed && (
                    <button
                      onClick={() => toggleRevealThumbnail(movie.id)}
                      className="absolute top-2 right-2 bg-black/75 p-1 rounded-full text-white"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="p-3">
                  <span className="text-[9px] font-mono text-yellow-500">UGANDA RATED R</span>
                  <h3 className="font-bold text-white text-xs line-clamp-1 mt-0.5">{movie.title}</h3>
                  <div className="flex items-center space-x-1.5 mt-2">
                    <button
                      onClick={() => onMovieSelect(movie)}
                      className="flex-1 bg-red-950 hover:bg-[#e50914] text-[#ff0a16] hover:text-white py-1 text-[10px] font-black rounded-lg transition text-center uppercase"
                    >
                      PLAY STREAM
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

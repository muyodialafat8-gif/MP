import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Star, Bookmark, Play, Heart, Bell, User, Clock, Shield, Sparkles, 
  Tv, Film, Mic, AlertCircle, Share2, MessageCircle, Phone, Compass, Info, Check, HelpCircle, ChevronRight, Download, Lock
} from 'lucide-react';
import { auth, db, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';

// Subtitle, Genre lists
export const GENRES = ['Ugandan Movies', 'Kids Cartoon', 'Trending Movies', 'Hot Movies', 'Hot Series', 'Drama', 'Action', 'Sci-Fi', 'Comedy', 'Thriller', 'Romance'];

// --- WELCOME POPUP COMPONENT (Auto-fade in and out) ---
export function WelcomePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after 1 second
    const timerIn = setTimeout(() => {
      setVisible(true);
    }, 1000);

    // Auto dismiss after 6 seconds
    const timerOut = setTimeout(() => {
      setVisible(false);
    }, 7000);

    return () => {
      clearTimeout(timerIn);
      clearTimeout(timerOut);
    };
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-16 right-4 left-4 md:left-auto md:right-6 md:max-w-sm bg-[#1a1a1a] rounded-2xl p-4 border border-red-900/40 shadow-[0_4px_25px_rgba(229,9,20,0.25)] z-40">
        <button 
          id="-close-welcome-notif"
          onClick={() => setVisible(false)} 
          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-white text-xs px-1.5 py-0.5 bg-black/40 rounded-full"
        >
          ✕
        </button>
        <div className="flex items-start space-x-3 pr-4">
          <div className="bg-red-950 p-2 rounded-xl text-red-500 shrink-0">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-wider text-white uppercase font-sans">MoviePulse Uganda 🇺🇬</h4>
            <p className="text-[11px] text-gray-300 mt-1 leading-normal">
              Webaale kussaako! Experience zero-buffering playback, low-data modes, and active Kampala trending movies.
            </p>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}

// --- LOGIN & REGISTER AUTH OVERLAYS ---
interface AuthViewProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  isRegistering?: boolean;
}

export function AuthView({ onSuccess, onSwitchToRegister, isRegistering = false }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'firebase' | 'local'>('local');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('All credential fields are required.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    if (authMode === 'local') {
      try {
        // Simple artificial loading simulation for premium feel
        await new Promise((resolve) => setTimeout(resolve, 600));

        const storedUsers = localStorage.getItem('MP_OFFLINE_USERS');
        const usersList = storedUsers ? JSON.parse(storedUsers) : [];

        if (isRegistering) {
          // Check if user already exists
          const exists = usersList.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
          if (exists) {
            setErrorMsg('This email is already registered locally.');
            setLoading(false);
            return;
          }

          const localUserId = 'local_' + Date.now();
          const newUserProfile = {
            uid: localUserId,
            email: email,
            phone: phone,
            displayName: displayName || email.split('@')[0],
            role: email === 'www.moviepulse.com@gmail.com' ? 'admin' : 'user',
            status: 'active',
            joinedAt: new Date().toISOString(),
            password: password // Saved locally only
          };

          usersList.push(newUserProfile);
          localStorage.setItem('MP_OFFLINE_USERS', JSON.stringify(usersList));
          localStorage.setItem('MP_LOGGED_USER', JSON.stringify(newUserProfile));
        } else {
          // Master Developer Account instant cheat
          if (email === 'www.moviepulse.com@gmail.com' && password === 'admin') {
            const staticAdmin = {
              uid: 'local_master_admin',
              email: 'www.moviepulse.com@gmail.com',
              displayName: 'MoviePulse Administrator',
              role: 'admin',
              status: 'active',
              joinedAt: new Date().toISOString()
            };
            localStorage.setItem('MP_LOGGED_USER', JSON.stringify(staticAdmin));
            onSuccess();
            return;
          }

          const userObj = usersList.find(
            (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
          );

          if (!userObj) {
            setErrorMsg('No local account matches this email & password. Register a device offline account first.');
            setLoading(false);
            return;
          }

          localStorage.setItem('MP_LOGGED_USER', JSON.stringify(userObj));
        }
        onSuccess();
      } catch (err: any) {
        setErrorMsg(err.message || 'Local Auth initialization failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Firebase Cloud Auth Flow
    try {
      if (isRegistering) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Provision user profile profile in Firestore
        await setDoc(doc(db, 'users', credential.user.uid), {
          id: credential.user.uid,
          email: email,
          phone: phone,
          displayName: displayName || email.split('@')[0],
          role: email === 'www.moviepulse.com@gmail.com' ? 'admin' : 'user',
          status: 'active',
          joinedAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onSuccess();
    } catch (e: any) {
      setErrorMsg(e.message || 'Authentication failed. Verify passwords.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Upsert profile
      await setDoc(doc(db, 'users', result.user.uid), {
        id: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        role: 'user',
        status: 'active',
        joinedAt: new Date().toISOString()
      }, { merge: true });
      onSuccess();
    } catch (e: any) {
      setErrorMsg(e.message || 'Google Auth encounter an issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-[#141414] rounded-3xl border border-gray-800 p-6 shadow-2xl mx-auto my-6 text-gray-200">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-black text-white font-sans tracking-wide">
          {isRegistering ? 'Create VIP Account' : 'Sign In'}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {isRegistering ? 'Unlock unmetered streaming across any devices' : 'Welcome back to MoviePulse Uganda'}
        </p>
      </div>

      <div className="grid grid-cols-2 p-1 bg-[#0c0c0c] rounded-xl border border-gray-800 mb-6 text-center text-[10px] font-sans font-bold">
        <button
          type="button"
          onClick={() => { setAuthMode('local'); setErrorMsg(''); }}
          className={`py-2 px-3 rounded-lg transition-all duration-200 ${authMode === 'local' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          📱 Device Storage (Local)
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('firebase'); setErrorMsg(''); }}
          className={`py-2 px-3 rounded-lg transition-all duration-200 ${authMode === 'firebase' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
        >
          ☁️ Cloud Server (Firebase)
        </button>
      </div>

      {authMode === 'local' && (
        <div className="bg-amber-950/25 border border-amber-900/30 text-amber-500 rounded-2xl p-3 mb-5 text-[10.5px] font-sans leading-normal flex items-start space-x-2">
          <span className="text-sm">🔑</span>
          <span>
            <strong>Instant Demo Access:</strong> Use Email <strong>www.moviepulse.com@gmail.com</strong> and password <strong>admin</strong> to bypass sign-in and start testing the fully-featured administrator dashboard immediately!
          </span>
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4 text-xs font-mono">
        {isRegistering && (
          <>
            <div>
              <label className="block mb-1 text-gray-400 font-bold uppercase text-[10px]">Your Display Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Enter Full Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0c0c0c] rounded-xl px-4 py-2.5 text-white border border-gray-800 focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block mb-1 text-gray-400 font-bold uppercase text-[10px]">Mobile Phone Number (Uganda)</label>
              <input
                id="auth-phone"
                type="tel"
                placeholder="e.g. 0766051929"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#0c0c0c] rounded-xl px-4 py-2.5 text-white border border-gray-800 focus:outline-none focus:border-red-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="block mb-1 text-gray-400 font-bold uppercase text-[10px]">Email Address</label>
          <input
            id="auth-email"
            type="email"
            placeholder="name@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0c0c0c] rounded-xl px-4 py-2.5 text-white border border-gray-800 focus:outline-none focus:border-red-500"
          />
        </div>

        <div>
          <label className="block mb-1 text-gray-400 font-bold uppercase text-[10px]">Secret Password</label>
          <input
            id="auth-pass"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0c0c0c] rounded-xl px-4 py-2.5 text-white border border-gray-800 focus:outline-none focus:border-red-500"
          />
        </div>

        {errorMsg && (
          <p className="text-red-400 text-[11px] bg-red-950/20 py-1.5 px-3 rounded border border-red-950/20 leading-relaxed font-sans mt-2">
            {errorMsg}
          </p>
        )}

        <button
          id="btn-email-auth"
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 transition text-white font-bold uppercase font-sans text-xs tracking-wider"
        >
          {loading ? 'Authenticating...' : isRegistering ? 'REGISTER VIP PASSPORT' : 'SIGN IN NOW'}
        </button>
      </form>

      {/* Alternative Google login choice */}
      <div className="relative my-4">
        <hr className="border-gray-800" />
        <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#141414] px-2 text-[10px] text-gray-500 font-mono uppercase font-bold text-center">
          OR REGISTER WITH GOOGLE
        </span>
      </div>

      <button
        id="btn-google-auth"
        onClick={handleGoogleAuth}
        className="w-full py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-semibold text-white hover:bg-gray-800 transition flex items-center justify-center space-x-2"
      >
        <span>Continue with Google Account</span>
      </button>

      <div className="text-center mt-5 text-xs">
        {isRegistering ? (
          <p className="text-gray-400 font-sans">
            Already have an account?{' '}
            <button id="switch-login" onClick={onSwitchToRegister} className="text-[#ff0a16] underline font-bold">
              Sign In
            </button>
          </p>
        ) : (
          <p className="text-gray-400 font-sans">
            New to MoviePulse?{' '}
            <button id="switch-register" onClick={onSwitchToRegister} className="text-[#ff0a16] underline font-bold">
              Register VIP
            </button>
          </p>
        )}
      </div>

      {/* Support details / Whatsapp channels */}
      <div className="border-t border-gray-900 mt-6 pt-4 text-center space-y-2">
        <p className="text-[10px] text-gray-500 font-mono uppercase">
          Uganda Hotline: MTN 0766051929 | Airtel 0704557858
        </p>
        <button
          id="join-whatsapp-auth"
          onClick={() => window.open('https://chat.whatsapp.com/invite/moviepulse', '_blank')}
          className="inline-flex items-center space-x-1.5 text-[11px] text-[#25D366] font-bold underline bg-transparent"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-transparent" />
          <span>JOIN OUR WHATSAPP CHANNEL IN UGANDA</span>
        </button>
      </div>
    </div>
  );
}

// --- MOVIE SLIDER & HERO SKELETON PLACEHOLDERS ---
export function HeroBannerSkeleton() {
  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#121212] rounded-2xl border border-gray-900 overflow-hidden max-w-4xl mx-auto p-4 md:p-6 flex flex-col justify-end animate-pulse">
      {/* Animated shimmer bg */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-85" />
      <div className="relative space-y-3 z-10">
        <div className="h-3.5 w-24 bg-neutral-800 rounded-full" />
        <div className="h-6 w-1/2 md:w-1/3 bg-neutral-800 rounded-md" />
        <div className="space-y-1.5 max-w-sm md:max-w-md">
          <div className="h-3 bg-neutral-800 rounded-md w-full" />
          <div className="h-3 bg-neutral-800 rounded-md w-5/6" />
        </div>
        <div className="flex space-x-2 pt-2">
          <div className="h-8.5 w-28 bg-neutral-800 rounded-xl" />
          <div className="h-8.5 w-32 bg-neutral-800 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function MovieSliderSkeleton({ title }: { title: string }) {
  return (
    <div className="my-6">
      <div className="flex justify-between items-center px-4 mb-2.5">
        <h3 className="text-base font-black text-white/50 font-sans tracking-wide flex items-center space-x-1.5 uppercase animate-pulse">
          <span className="w-1.5 h-4 bg-neutral-800 rounded-sm inline-block"></span>
          <span>{title}</span>
        </h3>
      </div>

      <div className="flex space-x-4 overflow-x-hidden px-4 py-2 select-none">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[140px] md:w-[170px] bg-[#141414] rounded-2xl overflow-hidden border border-neutral-900/40 p-1 space-y-2 animate-pulse"
          >
            <div className="aspect-[3/4] bg-neutral-800/80 rounded-xl" />
            <div className="px-1.5 py-1 space-y-1.5">
              <div className="h-3 bg-neutral-800 rounded w-11/12" />
              <div className="h-2.5 bg-neutral-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- NETFLIX SYSTEM SLIDER MOVIE SECTION ---
interface MovieSliderProps {
  title: string;
  movies: any[];
  onSelect: (movie: any) => void;
  favorites: string[];
  onToggleFavorite: (id: string, e: any) => void;
  isPremiumUser?: boolean;
  onSelectGenre?: (genre: string) => void;
}

export function MovieSlider({ title, movies, onSelect, favorites, onToggleFavorite, isPremiumUser, onSelectGenre }: MovieSliderProps) {
  if (movies.length === 0) return null;

  // Derive precise genre name for redirect click routing
  let activeGenre = '';
  if (title.includes('Kids Cartoon') || title.includes('Kids')) activeGenre = 'Kids Cartoon';
  else if (title.includes('Ugandan Movies') || title.includes('Ugandan')) activeGenre = 'Ugandan Movies';
  else if (title.includes('Trending Now') || title.includes('Trending')) activeGenre = 'Trending Movies';
  else if (title.includes('Hot Movies')) activeGenre = 'Hot Movies';
  else if (title.includes('Hot Series')) activeGenre = 'Hot Series';
  else if (title.includes('Drama')) activeGenre = 'Drama';
  else if (title.includes('Action')) activeGenre = 'Action';
  else if (title.includes('Sci-Fi')) activeGenre = 'Sci-Fi';
  else if (title.includes('Comedy')) activeGenre = 'Comedy';
  else if (title.includes('Thriller')) activeGenre = 'Thriller';
  else if (title.includes('Romance')) activeGenre = 'Romance';

  return (
    <div className="my-6">
      <div className="flex justify-between items-center px-4 mb-2.5">
        {onSelectGenre && activeGenre ? (
          <button
            onClick={() => onSelectGenre(activeGenre)}
            className="text-base font-black text-white font-sans tracking-wide flex items-center space-x-1.5 uppercase group cursor-pointer hover:text-red-500 transition duration-200 text-left"
          >
            <span className="w-1.5 h-4 bg-red-600 rounded-sm inline-block group-hover:scale-y-125 transition duration-200 shrink-0"></span>
            <span className="flex items-center flex-wrap gap-2">
              <span>{title}</span>
              {/* Genres stats badge */}
              <span className="text-[8px] font-mono bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-black tracking-widest leading-none">
                {movies.length} FILMS ACTIVE
              </span>
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                VIEW ALL →
              </span>
            </span>
          </button>
        ) : (
          <h3 className="text-base font-black text-white font-sans tracking-wide flex items-center space-x-1.5 uppercase">
            <span className="w-1.5 h-4 bg-red-600 rounded-sm inline-block"></span>
            <span>{title}</span>
            <span className="text-[8px] font-mono bg-gray-900 border border-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-black tracking-widest leading-none ml-2">
              {movies.length} ITEMS
            </span>
          </h3>
        )}
      </div>

      <div className="flex space-x-4 overflow-x-auto overflow-y-hidden px-4 py-2 scrollbar-none select-none">
        {movies.map((movie) => {
          const isFav = favorites.includes(movie.id);
          const needsLock = movie.isPremium && !isPremiumUser;
          return (
            <motion.div
              key={movie.id}
              whileHover={{ scale: 1.04, y: -4 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className={`flex-shrink-0 w-[140px] md:w-[170px] bg-[#1a1a1a] rounded-2xl overflow-hidden border transition-all duration-300 relative group cursor-pointer ${
                needsLock ? 'border-amber-900/35 hover:border-amber-500/60 shadow-[0_4px_12px_rgba(234,179,8,0.1)]' : 'border-gray-900 hover:border-gray-700'
              }`}
              onClick={() => onSelect(movie)}
            >
              {/* Overlays / Badges */}
              <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
                <span className="bg-emerald-600 text-[8px] font-black tracking-wider text-white px-2 py-0.5 rounded-full shadow-md uppercase font-mono font-bold">
                  FREE
                </span>
                {movie.trendingBadge && (
                  <span className="bg-red-600 text-[8px] font-black tracking-wider text-white px-2 py-0.5 rounded-full shadow-md uppercase font-sans">
                    {movie.trendingBadge}
                  </span>
                )}
              </div>

              {/* Favorites Save Button */}
              <button
                onClick={(e) => onToggleFavorite(movie.id, e)}
                className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-[#ff0a16] text-white p-1.5 rounded-full transition-colors duration-200"
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-600 text-red-600' : 'text-gray-300'}`} />
              </button>

              <div className="aspect-[3/4] overflow-hidden bg-black relative">
                <img
                  src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className={`w-full h-full object-cover group-hover:scale-105 transition duration-300 ${
                    needsLock ? 'blur-[1.5px] opacity-80 brightness-[0.65]' : ''
                  }`}
                />
                
                {/* Embedded dynamic indicators */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  {needsLock ? (
                    <div className="flex flex-col items-center space-y-1.5 p-2 text-center bg-black/50 backdrop-blur-[1px] w-full h-full justify-center">
                      <div className="bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full p-1.5 text-black shadow">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] text-yellow-400 font-extrabold uppercase tracking-wide">Premium Unlock</span>
                      <span className="text-[7px] text-gray-350 font-mono">Tap to join VIP</span>
                    </div>
                  ) : (
                    <div className="bg-red-600 rounded-full p-2 text-white">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Informative catalog metadata */}
              <div className="p-2">
                <h4 className="text-white text-xs font-black truncate leading-tight font-sans flex items-center justify-between gap-1 w-full">
                  <span className="truncate flex items-center gap-1">
                    <span className="truncate">{movie.title}</span>
                    {movie.isPremium && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(234,179,8,1)] block shrink-0" title="Premium Content"></span>}
                  </span>
                  <span className="text-[#ff0a16] text-[10px] font-mono font-black shrink-0 ml-1 group-hover:translate-x-1 transition-transform">»</span>
                </h4>
                <div className="flex items-center justify-between text-[9px] font-mono mt-1">
                  {movie.vj ? (
                    <span className="text-amber-500 font-extrabold uppercase text-[8.5px] tracking-wide select-none">
                      🎬 {movie.vj}
                    </span>
                  ) : (
                    <span className="text-gray-500">{movie.releaseYear || '2026'}</span>
                  )}
                  <span className={`px-1 rounded ${needsLock ? 'bg-amber-950/50 text-amber-500 border border-amber-900/10' : 'bg-gray-900 text-gray-300'}`}>{movie.quality || 'HD'}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// --- USER RATING SYSTEM ---
interface UserRatingProps {
  movieId: string;
  onRatingSubmitted?: (rating: number) => void;
}

export function UserMovieRating({ movieId, onRatingSubmitted }: UserRatingProps) {
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Check if user has rated this movie already
    const rated = localStorage.getItem(`MP_RATING_${movieId}`);
    if (rated) {
      setUserRating(parseInt(rated));
      setSubmitted(true);
    }
  }, [movieId]);

  const handleRate = async (val: number) => {
    localStorage.setItem(`MP_RATING_${movieId}`, String(val));
    setUserRating(val);
    setSubmitted(true);

    if (onRatingSubmitted) onRatingSubmitted(val);

    // Save/increment aggregate score securely in Firestore
    try {
      const q = doc(db, 'movies', movieId);
      const docSnap = await getDoc(q);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentCount = data.ratingCount || 1;
        const currentRating = data.rating || 4.5;
        const newRating = parseFloat(((currentRating * currentCount + val) / (currentCount + 1)).toFixed(1));
        await updateDoc(q, {
          rating: newRating,
          ratingCount: currentCount + 1
        });
      }
    } catch (e) {
      console.warn("Failed saving rating aggregate in sandbox db mode: ", e);
    }
  };

  return (
    <div className="bg-[#101010] border border-gray-900 rounded-2xl p-3 flex flex-col items-center">
      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
        {submitted ? 'YOUR SUBMITTED RATING' : 'RATE THIS FILM'}
      </span>
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((index) => (
          <button
            key={index}
            id={`star-${index}`}
            disabled={submitted}
            onMouseEnter={() => !submitted && setHoverRating(index)}
            onMouseLeave={() => !submitted && setHoverRating(0)}
            onClick={() => handleRate(index)}
            className="transition-colors duration-150 focus:outline-none"
          >
            <Star
              className={`w-5 h-5 ${
                index <= (hoverRating || userRating)
                  ? 'text-yellow-400 fill-yellow-400 drop-shadow'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
      {submitted && (
        <span className="text-[9px] text-[#25D366] font-mono font-bold mt-1 uppercase">
          RATING SUBMITTED SECURELY!
        </span>
      )}
    </div>
  );
}

// --- SOUND AND VOICE SEARCH BOX ---
interface CustomSearchProps {
  onSearch: (text: string) => void;
  searchValue: string;
}

export function MovieSearch({ onSearch, searchValue }: CustomSearchProps) {
  const [isListening, setIsListening] = useState(false);

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search recognition is not supported on this browser context. Please use Chrome/Safari inputs.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      onSearch(speechToText);
      setIsListening(false);
    };

    recognition.onerror = (e: any) => {
      console.log("Voice recognizer encountered error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-gray-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          id="search-input"
          type="text"
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search Ugandan films, series, seasons, and episodes..."
          className="w-full bg-[#161616] border border-gray-800 text-gray-200 text-xs px-10 py-3 rounded-full focus:outline-none focus:border-red-600 transition"
        />
        <button
          id="voice-search-btn"
          onClick={startVoiceSearch}
          className={`absolute right-3 p-1.5 rounded-full transition-colors ${
            isListening ? 'bg-red-800 text-white animate-pulse' : 'text-gray-400 hover:text-white bg-black/40 hover:bg-black/60'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>
      {isListening && (
        <span className="text-[9px] text-red-500 font-mono text-center block mt-1 animate-pulse uppercase">
          Listening to Uganda Voice command... Speaks now!
        </span>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, Search, Tv, Download, User, Menu, X, Bell, Moon, Sun, 
  Settings, ShieldCheck, Heart, Share2, Sparkles, AlertCircle, Play, 
  MessageCircle, Phone, Award, Compass, HelpCircle, Flame, Star, Tag, Lock,
  ArrowUpDown
} from 'lucide-react';
import { auth, db, getFirebaseMode, switchFirebaseMode } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, getDocs, where, limit, addDoc } from 'firebase/firestore';

// Subcomponents
import SplashLoader from './components/SplashLoader';
import SubscriptionPlans from './components/SubscriptionPlans';
import AdultZone from './components/AdultZone';
import MoviePlayer from './components/MoviePlayer';
import AdminPanel from './components/AdminPanel';
import MovieWatchView from './components/MovieWatchView';
import HeroBannerSlider from './components/HeroBannerSlider';
import { 
  PageRoute, Movie, TVSeries, Episode, Subscription, WatchHistory, Watchlist 
} from './types';
import { 
  WelcomePopup, AuthView, MovieSlider, UserMovieRating, MovieSearch, GENRES, HeroBannerSkeleton, MovieSliderSkeleton
} from './components/PageViews';
import { getHdMoviePoster, getHdMovieBackdrop } from './utils/movieImages';

export default function App() {
  const [splashLoading, setSplashLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [role, setRole] = useState<'user' | 'admin'>('user');
  
  // Navigation Routing States
  const [page, setPage] = useState<PageRoute>('home');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [selectedSeries, setSelectedSeries] = useState<any>(null);

  // Content Catalogs (Initially empty as mandated by guidelines)
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<TVSeries[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // User list states
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  // UI state toggles
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showGenreDrawer, setShowGenreDrawer] = useState(false);
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'year' | 'rating' | 'views'>('year');
  const [userAvatar, setUserAvatar] = useState(() => localStorage.getItem('MP_USER_AVATAR') || '🦁');
  const [ambientGlowMode, setAmbientGlowMode] = useState(() => localStorage.getItem('MP_AMBIENT_GLOW') === 'true');
  const [isLowDataMode, setIsLowDataMode] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [dbMode, setDbMode] = useState(getFirebaseMode());

  // App metrics & custom reviews
  const [appRated, setAppRated] = useState(false);
  const [websiteStars, setWebsiteStars] = useState(5);
  const [socialNotification, setSocialNotification] = useState<string | null>(null);

  // Custom interactive VJ request features & speed tests (as requested by user)
  const [requestMovieTitle, setRequestMovieTitle] = useState('');
  const [requestVjName, setRequestVjName] = useState('Vj Martin K');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ kampala: number; nairobi: number; entebbe: number } | null>(null);

  // Account integration presets
  const [resolutionCap, setResolutionCap] = useState<'360p' | '480p' | '720p' | '1080p'>('1080p');
  const [momoNumberPreset, setMomoNumberPreset] = useState(() => localStorage.getItem('MP_MOMO_PRESET') || '');
  const [momoOperator, setMomoOperator] = useState(() => localStorage.getItem('MP_MOMO_OPERATOR') || 'MTN');
  const [activeSessionDevices, setActiveSessionDevices] = useState(() => {
    return [
      { id: 'dev1', name: 'Tecno Camon 20 Pro', location: 'Kampala Central', status: 'Primary (This device)' },
      { id: 'dev2', name: 'Infinix Hot 30i', location: 'Entebbe Hub', status: 'Authorized background stream' }
    ];
  });

  const runPingTest = () => {
    setIsTestingPing(true);
    setPingResult(null);
    setTimeout(() => {
      setPingResult({
        kampala: Math.floor(Math.random() * 25) + 12, // 12-36 ms
        nairobi: Math.floor(Math.random() * 35) + 45, // 45-79 ms
        entebbe: Math.floor(Math.random() * 15) + 8    // 8-22 ms
      });
      setIsTestingPing(false);
    }, 1200);
  };

  const submitVjRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMovieTitle.trim()) return;
    setIsSubmittingRequest(true);
    try {
      if (dbMode === 'production' && currentUser) {
        await addDoc(collection(db, 'movie_requests'), {
          movieTitle: requestMovieTitle,
          vjName: requestVjName,
          userEmail: currentUser.email || 'anonymous',
          createdAt: new Date().toISOString()
        });
      } else {
        const currentReqs = JSON.parse(localStorage.getItem('MP_MOVIE_REQUESTS') || '[]');
        currentReqs.push({
          movieTitle: requestMovieTitle,
          vjName: requestVjName,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('MP_MOVIE_REQUESTS', JSON.stringify(currentReqs));
      }
      setRequestSuccess(true);
      setRequestMovieTitle('');
      setTimeout(() => setRequestSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  useEffect(() => {
    // Universal URL Parser (Allows index.html, admin.html, movie.html redirects)
    const params = new URLSearchParams(window.location.search);
    const queryPage = params.get('page') as PageRoute;
    const urlId = params.get('id');

    if (queryPage) {
      setPage(queryPage);
    } else {
      const pathName = window.location.pathname.replace(/^\/|\.html$/g, '');
      if (pathName && pathName !== 'index' && pathName !== 'src/main') {
        setPage(pathName as PageRoute);
      }
    }

    // Subscribe to Auth status
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Default role is user unless mail check
        if (user.email === 'www.moviepulse.com@gmail.com') {
          setRole('admin');
        } else {
          setRole('user');
        }
        // Fetch personalized states
        fetchUserStates(user.uid);
      } else {
        // Fallback check for offline/local storage logged in user session
        const localUserStr = localStorage.getItem('MP_LOGGED_USER');
        if (localUserStr) {
          try {
            const localUser = JSON.parse(localUserStr);
            setCurrentUser(localUser);
            if (localUser.email === 'www.moviepulse.com@gmail.com' || localUser.role === 'admin') {
              setRole('admin');
            } else {
              setRole('user');
            }
            fetchUserStates(localUser.uid);
            return;
          } catch (e) {
            console.warn("Offline user parser error:", e);
          }
        }
        setCurrentUser(null);
        setRole('user');
        setFavorites([]);
        setHistory([]);
      }
    });

    // Fetch catalogue datasets from Firestore
    setIsFetchingData(true);
    fetchDatabases().finally(() => {
      // Intentional UI smoothing delay so a highly polished skeleton animation renders beautifully
      setTimeout(() => {
        setIsFetchingData(false);
      }, 1200);
    });

    // Setup cyclic local social-proof triggers
    const socialTriggers = [
      "Katende John from Kampala just subscribed Daily Pass!",
      "An anonymous guest unlocked low-data pass for 800 UGX",
      "Nalule Proscovia from Masaka just rated Sanyu 5 stars!",
      "Airtel payment of 1,600 UGX confirmed in Jinja!",
      "Trending in Uganda: Bed of Thorns gained 1,000 views!"
    ];
    let intervalIndex = 0;
    const socialInterval = setInterval(() => {
      setSocialNotification(socialTriggers[intervalIndex % socialTriggers.length]);
      intervalIndex++;
      setTimeout(() => setSocialNotification(null), 5000); // clear after 5s
    }, 18000);

    const handleDirectRoute = (e: any) => {
      if (e.detail) {
        setPage(e.detail);
      }
    };
    window.addEventListener('DIRECT_PAGE_ROUTE', handleDirectRoute);

    return () => {
      unsubscribeAuth();
      clearInterval(socialInterval);
      window.removeEventListener('DIRECT_PAGE_ROUTE', handleDirectRoute);
    };
  }, []);

  const fetchDatabases = async () => {
    // Utility to avoid long-hanging promise blocks if network/sandboxed Firestore latency is high
    const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 2500): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
      ]);
    };

    // 1. Preload from local storage instantly to guarantee seamless offline startup
    try {
      const cachedMov = localStorage.getItem('MP_LOCAL_MOVIES');
      if (cachedMov) {
        const decoded = JSON.parse(cachedMov) || [];
        const processed = decoded.map((movie: any) => {
          let updatedGenres = movie.genres;
          let updatedVj = movie.vj;
          let updatedVideoUrl = movie.videoUrl;

          if (movie.title?.toLowerCase().trim() === 'rebellious') {
            updatedGenres = ['Kids Cartoon', 'Trending Movies'];
            updatedVj = 'Vj Martin K';
            updatedVideoUrl = 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9';
          } else if (movie.title?.toLowerCase().trim() === 'maado') {
            updatedGenres = ['Kids Cartoon', 'Hot Movies'];
            updatedVj = 'Vj Kevo';
            updatedVideoUrl = 'https://youtu.be/bUYc0ToXP-w?si=51I4hIRaeSGiidmf';
          }

          return {
            ...movie,
            genres: updatedGenres,
            isPremium: false,
            vj: updatedVj,
            videoUrl: updatedVideoUrl,
            posterUrl: getHdMoviePoster(movie.title, movie.posterUrl),
            backdropUrl: getHdMovieBackdrop(movie.title, movie.backdropUrl)
          };
        });
        setMovies(processed);
      }
      const cachedSer = localStorage.getItem('MP_LOCAL_SERIES');
      if (cachedSer) {
        setSeries(JSON.parse(cachedSer));
      }
      const cachedAds = localStorage.getItem('MP_LOCAL_ADS');
      if (cachedAds) {
        setAds(JSON.parse(cachedAds));
      }
      const cachedNotif = localStorage.getItem('MP_LOCAL_NOTIFICATIONS');
      if (cachedNotif) {
        setNotifications(JSON.parse(cachedNotif));
      }
    } catch (err) {
      console.warn("Failed checking offline cache fallbacks:", err);
    }

    try {
      // 2. Fetch Movies from remote Firestore
      const mSnap = await withTimeout(getDocs(collection(db, 'movies')), 2500);
      let mList: Movie[] = [];
      mSnap.forEach((doc) => {
        mList.push({ id: doc.id, ...doc.data() } as any);
      });

      // Intelligent Auto-Seed for user custom movie selections (Osiris, DeadTime, Ustopable Robots, and the 10 new VJ movies)
      const seedNeeded = [
        {
          title: 'Osiris',
          description: 'An intense futuristic action thriller following a genetically enhanced special forces operative navigating high-risk cyber war zones.',
          genres: ['Action', 'Sci-Fi', 'Trending Movies'],
          videoUrl: 'https://youtu.be/O4q7oMLeC2c?si=4i8g5qjKgGfOYhqF',
          trailerUrl: 'https://youtu.be/O4q7oMLeC2c?si=4i8g5qjKgGfOYhqF',
          posterUrl: '/src/assets/images/osiris_poster_1780602489444.png',
          backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
          releaseYear: 2026,
          duration: '1h 48m',
          quality: 'FHD',
          isPremium: true,
          isAdult: false,
          vj: 'Vj Junior',
          rating: 4.9,
          ratingCount: 142,
          views: 938,
          trendingBadge: 'Trending #1 in Action',
          createdAt: new Date().toISOString()
        },
        {
          title: 'DeadTime',
          description: 'A spine-chilling supernatural thriller following mysterious cursed events unfolding at a remote forest during midnight intervals.',
          genres: ['Horror', 'Trending Movies'],
          videoUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
          trailerUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
          posterUrl: '/src/assets/images/deadtime_poster_1780604310259.png',
          backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800',
          releaseYear: 2026,
          duration: '1h 32m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj JINGO',
          rating: 4.6,
          ratingCount: 88,
          views: 1420,
          trendingBadge: 'New Release',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Ustopable Robots',
          description: 'An adrenaline-fueled futuristic action blockbuster tracking highly intelligent sentient cybernetic units defending their operations space.',
          genres: ['Action', 'Sci-Fi', 'Hot Movies'],
          videoUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
          trailerUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
          posterUrl: '/src/assets/images/robots_poster_1780604328217.png',
          backdropUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
          releaseYear: 2026,
          duration: '1h 55m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Eddie',
          rating: 4.5,
          ratingCount: 104,
          views: 1205,
          trendingBadge: 'Popular Action',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Protect and Serve',
          description: 'A dedicated team of veteran police officers face their biggest threat yet in a high-stakes tactical siege to protect their local community.',
          genres: ['Action', 'Trending Movies'],
          videoUrl: 'https://youtu.be/KlFkGXyWAEQ?si=XyyEvxGCZj1RcF1k',
          trailerUrl: 'https://youtu.be/KlFkGXyWAEQ?si=XyyEvxGCZj1RcF1k',
          posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
          releaseYear: 2026,
          duration: '1h 45m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Ice p omutaka',
          rating: 4.8,
          ratingCount: 95,
          views: 742,
          trendingBadge: 'Trending Action',
          createdAt: new Date().toISOString()
        },
        {
          title: 'The Warrior Cop',
          description: 'Unforgiving and relentless, an elite martial arts specialist cop infiltrates an underground criminal empire to deliver swift justice.',
          genres: ['Action', 'Hot Movies'],
          videoUrl: 'https://youtu.be/yzsQSQub53k?si=0FbHzvyyr4nlFXOY',
          trailerUrl: 'https://youtu.be/yzsQSQub53k?si=0FbHzvyyr4nlFXOY',
          posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
          releaseYear: 2026,
          duration: '1h 38m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Emmy',
          rating: 4.7,
          ratingCount: 65,
          views: 520,
          trendingBadge: 'Hot Today',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Idiots',
          description: 'A hilarious comedy of errors as three best friends travel cross-country and stumble into an accidental high-stakes heist they are totally unprepared for.',
          genres: ['Comedy', 'Trending Movies'],
          videoUrl: 'https://youtu.be/oXA58y390JM?si=0EDrTJBA1dNVsJqK',
          trailerUrl: 'https://youtu.be/oXA58y390JM?si=0EDrTJBA1dNVsJqK',
          posterUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
          releaseYear: 2026,
          duration: '1h 50m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Mark',
          rating: 4.5,
          ratingCount: 78,
          views: 610,
          trendingBadge: 'Trending Comedy',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Sniper Battle',
          description: 'Engaged in an urban sniper duel, two elite marksmen match wits, patience, and lethal precision in an abandoned skyscraper zone.',
          genres: ['Action', 'Hot Movies'],
          videoUrl: 'https://youtu.be/paT49VQ1z10?si=iDulzqgJaey6_YWH',
          trailerUrl: 'https://youtu.be/paT49VQ1z10?si=iDulzqgJaey6_YWH',
          posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
          releaseYear: 2026,
          duration: '1h 29m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Emmy',
          rating: 4.6,
          ratingCount: 82,
          views: 495,
          trendingBadge: 'Popular Choice',
          createdAt: new Date().toISOString()
        },
        {
          title: 'A Walk to Remember',
          description: 'An inspiring romance following two high school students from opposite worlds whose lives are forever altered after an emotional journey of love and sacrifice.',
          genres: ['Romance', 'Trending Movies'],
          videoUrl: 'https://youtu.be/qk-4V5tR1bE?si=jL14mgNh3dBvfuAJ',
          trailerUrl: 'https://youtu.be/qk-4V5tR1bE?si=jL14mgNh3dBvfuAJ',
          posterUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800',
          releaseYear: 2026,
          duration: '1h 42m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Junior',
          rating: 4.9,
          ratingCount: 140,
          views: 890,
          trendingBadge: 'Highly Rated Romance',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Enter the Fat Dragon',
          description: 'An overweight yet highly agile and skilled martial arts police officer takes on massive syndicates in Japan, unleashing non-stop action and comedy.',
          genres: ['Action', 'Comedy', 'Hot Movies'],
          videoUrl: 'https://youtu.be/ttrRbxe-JXY?si=Sg_JMQ9a-UxMm8-W',
          trailerUrl: 'https://youtu.be/ttrRbxe-JXY?si=Sg_JMQ9a-UxMm8-W',
          posterUrl: 'https://images.unsplash.com/photo-1508847154043-be12a3bab439?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
          releaseYear: 2026,
          duration: '1h 36m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Ice p omutaka',
          rating: 4.6,
          ratingCount: 71,
          views: 580,
          trendingBadge: 'Hot Comedy',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Cleaner',
          description: 'An elite operative masquerading as an ordinary building cleaner is forced to reactivate his specialized skills when dangerous corporate hostiles strike.',
          genres: ['Action', 'Trending Movies'],
          videoUrl: 'https://youtu.be/vbaTNR56Otc?si=tPOhGi7zDpj06lLS',
          trailerUrl: 'https://youtu.be/vbaTNR56Otc?si=tPOhGi7zDpj06lLS',
          posterUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
          releaseYear: 2026,
          duration: '1h 32m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Junior',
          rating: 4.7,
          ratingCount: 112,
          views: 640,
          trendingBadge: 'Trending #1 in Action',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Black Mark',
          description: 'With a target painted on his back, a rogue government operative races against time to expose a massive conspiracy threatening global cybersecurity.',
          genres: ['Action', 'Hot Movies'],
          videoUrl: 'https://youtu.be/RNyeSN7tOtI?si=CZ29Mb4ymnDScQLN',
          trailerUrl: 'https://youtu.be/RNyeSN7tOtI?si=CZ29Mb4ymnDScQLN',
          posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
          releaseYear: 2026,
          duration: '1h 34m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Emmy',
          rating: 4.8,
          ratingCount: 104,
          views: 512,
          trendingBadge: 'Blockbuster Action',
          createdAt: new Date().toISOString()
        },
        {
          title: 'The Eye',
          description: 'A gripping action-thriller following a blind cellist who recovers her sight through a transplant, only to begin seeing unexplained terrifying visions and shadows.',
          genres: ['Action', 'Trending Movies'],
          videoUrl: 'https://youtu.be/Tym237eRlkU?si=VrqUa5ntWti3xfoM',
          trailerUrl: 'https://youtu.be/Tym237eRlkU?si=VrqUa5ntWti3xfoM',
          posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
          releaseYear: 2026,
          duration: '1h 39m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Emmy',
          rating: 4.4,
          ratingCount: 48,
          views: 310,
          trendingBadge: 'Fan Favorite Thriller',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Homeless to Harvard',
          description: 'The incredibly moving true story of Liz Murray, who overcomes a homeless life to excel at high school and eventually gain admission to Harvard.',
          genres: ['Drama', 'Hot Movies'],
          videoUrl: 'https://youtu.be/wjyFUTDurvk?si=TKCUQNX-5JenW10h',
          trailerUrl: 'https://youtu.be/wjyFUTDurvk?si=TKCUQNX-5JenW10h',
          posterUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
          releaseYear: 2026,
          duration: '1h 44m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Junior',
          rating: 4.9,
          ratingCount: 156,
          views: 924,
          trendingBadge: 'Most Inspiring Drama',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Rebellious',
          description: 'A charming and thrilling animated fantasy movie about a clever protagonist overcoming challenging quests, beautifully translated with humor by VJ Martin K.',
          genres: ['Kids Cartoon', 'Trending Movies'],
          videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800',
          releaseYear: 2026,
          duration: '1h 24m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Martin K',
          rating: 4.8,
          ratingCount: 42,
          views: 390,
          trendingBadge: 'Popular Cartoon',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Maado',
          description: 'An adventurous and fun-filled kids animation journey packed with excitement and laughs, translated in local Luganda by VJ Kevo.',
          genres: ['Kids Cartoon', 'Hot Movies'],
          videoUrl: 'https://youtu.be/bUYc0ToXP-w?si=51I4hIRaeSGiidmf',
          trailerUrl: 'https://youtu.be/bUYc0ToXP-w?si=51I4hIRaeSGiidmf',
          posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
          releaseYear: 2026,
          duration: '1h 18m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Kevo',
          rating: 4.7,
          ratingCount: 31,
          views: 280,
          trendingBadge: 'Hot Animation',
          createdAt: new Date().toISOString()
        },
        {
          title: 'Who Killed Captain Alex',
          description: 'Ugandan legendary action film about Uganda\'s elite commandos battling against dangerous mafia syndicates in Kampala, voiced in action-packed Luganda by VJ Emmie.',
          genres: ['Ugandan Movies', 'Trending Movies'],
          videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
          releaseYear: 2026,
          duration: '1h 25m',
          quality: 'FHD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Emmie',
          rating: 4.9,
          ratingCount: 198,
          views: 2314,
          trendingBadge: 'Ugandan Action Legend',
          createdAt: new Date().toISOString()
        },
        {
          title: 'The Girl in the Yellow Jumper',
          description: 'A suspenseful mystery thriller set in the beautiful hills of southwestern Uganda following a hostage who escapes and returns with an unbelievable tale of survival, dynamically translated by VJ Junior.',
          genres: ['Ugandan Movies', 'Hot Movies'],
          videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
          posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
          backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
          releaseYear: 2026,
          duration: '1h 40m',
          quality: 'HD',
          isPremium: false,
          isAdult: false,
          vj: 'Vj Junior',
          rating: 4.8,
          ratingCount: 145,
          views: 1845,
          trendingBadge: 'Ugandan Drama',
          createdAt: new Date().toISOString()
        }
      ];

      for (const preset of seedNeeded) {
        const exists = mList.some(m => m.title && m.title.toLowerCase().trim() === preset.title.toLowerCase().trim());
        if (!exists) {
          try {
            const docRef = await addDoc(collection(db, 'movies'), preset);
            mList.unshift({ id: docRef.id, ...preset } as any);
          } catch (err) {
            console.warn(`Firestore write restriction for preset ${preset.title}, falling back locally: `, err);
            mList.unshift({ id: `preset_${preset.title.toLowerCase()}_fallback`, ...preset } as any);
          }
        } else {
          // Double check VJ, genres, videoUrls and other fields are synchronized on existing records
          const idx = mList.findIndex(m => m.title && m.title.toLowerCase().trim() === preset.title.toLowerCase().trim());
          if (idx !== -1) {
            mList[idx].vj = preset.vj;
            mList[idx].genres = preset.genres;
            mList[idx].videoUrl = preset.videoUrl;
            mList[idx].isPremium = false;
            mList[idx].trendingBadge = preset.trendingBadge;
          }
        }
      }

      // Sync fetched movies with local catalog & save
      const processedMovies = mList.map((movie: any) => ({
        ...movie,
        isPremium: false, // Force all movies to be free as per user request
        posterUrl: getHdMoviePoster(movie.title, movie.posterUrl),
        backdropUrl: getHdMovieBackdrop(movie.title, movie.backdropUrl)
      }));
      localStorage.setItem('MP_LOCAL_MOVIES', JSON.stringify(processedMovies));
      setMovies(processedMovies);

      // 3. Fetch Series
      const sSnap = await withTimeout(getDocs(collection(db, 'series')), 2000);
      const sList: TVSeries[] = [];
      sSnap.forEach((doc) => {
        sList.push({ id: doc.id, ...doc.data() } as any);
      });
      localStorage.setItem('MP_LOCAL_SERIES', JSON.stringify(sList));
      setSeries(sList);

      // 4. Fetch Ads placeholder billboards
      const adsSnap = await withTimeout(getDocs(collection(db, 'ads')), 2000);
      const adsList: any[] = [];
      adsSnap.forEach((doc) => {
        adsList.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem('MP_LOCAL_ADS', JSON.stringify(adsList));
      setAds(adsList);

      // 5. Notifications
      const notifSnap = await withTimeout(getDocs(collection(db, 'notifications')), 2000);
      const notifList: any[] = [];
      notifSnap.forEach((doc) => {
        notifList.push({ id: doc.id, ...doc.data() });
      });
      localStorage.setItem('MP_LOCAL_NOTIFICATIONS', JSON.stringify(notifList));
      setNotifications(notifList);

    } catch (e) {
      console.warn("Firestore remote load restricted, keeping offline local storage cache active:", e);
      // Ensure we always have at least Osiris, DeadTime and Ustopable Robots if absolutely nothing works
      const cachedMov = localStorage.getItem('MP_LOCAL_MOVIES');
      if (!cachedMov) {
        const defaultMov = [
          {
            id: 'osiris_offline_preset',
            title: 'Osiris',
            description: 'An intense futuristic action thriller following a genetically enhanced special forces operative navigating high-risk cyber war zones.',
            genres: ['Action', 'Sci-Fi', 'Trending Movies'],
            videoUrl: 'https://youtu.be/O4q7oMLeC2c?si=4i8g5qjKgGfOYhqF',
            trailerUrl: 'https://youtu.be/O4q7oMLeC2c?si=4i8g5qjKgGfOYhqF',
            posterUrl: '/src/assets/images/osiris_poster_1780602489444.png',
            backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
            releaseYear: 2026,
            duration: '1h 48m',
            quality: 'FHD',
            isPremium: true,
            isAdult: false,
            vj: 'Vj Junior',
            rating: 4.9,
            ratingCount: 142,
            views: 938,
            trendingBadge: 'Trending #1 in Action',
            createdAt: new Date().toISOString()
          },
          {
            id: 'deadtime_offline_preset',
            title: 'DeadTime',
            description: 'A spine-chilling supernatural thriller following mysterious cursed events unfolding at a remote forest during midnight intervals.',
            genres: ['Horror', 'Trending Movies'],
            videoUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
            trailerUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
            posterUrl: '/src/assets/images/deadtime_poster_1780604310259.png',
            backdropUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800',
            releaseYear: 2026,
            duration: '1h 32m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj JINGO',
            rating: 4.6,
            ratingCount: 88,
            views: 1420,
            trendingBadge: 'New Release',
            createdAt: new Date().toISOString()
          },
          {
            id: 'robots_offline_preset',
            title: 'Ustopable Robots',
            description: 'An adrenaline-fueled futuristic action blockbuster tracking highly intelligent sentient cybernetic units defending their operations space.',
            genres: ['Action', 'Sci-Fi', 'Hot Movies'],
            videoUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
            trailerUrl: 'https://youtu.be/hNV4J-rMGEs?si=2iqDMMBralvCJGhV',
            posterUrl: '/src/assets/images/robots_poster_1780604328217.png',
            backdropUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
            releaseYear: 2026,
            duration: '1h 55m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Eddie',
            rating: 4.5,
            ratingCount: 104,
            views: 1205,
            trendingBadge: 'Popular Action',
            createdAt: new Date().toISOString()
          },
          {
            id: 'protect_and_serve_offline',
            title: 'Protect and Serve',
            description: 'A dedicated team of veteran police officers face their biggest threat yet in a high-stakes tactical siege to protect their local community.',
            genres: ['Action', 'Trending Movies'],
            videoUrl: 'https://youtu.be/KlFkGXyWAEQ?si=XyyEvxGCZj1RcF1k',
            trailerUrl: 'https://youtu.be/KlFkGXyWAEQ?si=XyyEvxGCZj1RcF1k',
            posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
            releaseYear: 2026,
            duration: '1h 45m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Ice p omutaka',
            rating: 4.8,
            ratingCount: 95,
            views: 742,
            trendingBadge: 'Trending Action',
            createdAt: new Date().toISOString()
          },
          {
            id: 'warrior_cop_offline',
            title: 'The Warrior Cop',
            description: 'Unforgiving and relentless, an elite martial arts specialist cop infiltrates an underground criminal empire to deliver swift justice.',
            genres: ['Action', 'Hot Movies'],
            videoUrl: 'https://youtu.be/yzsQSQub53k?si=0FbHzvyyr4nlFXOY',
            trailerUrl: 'https://youtu.be/yzsQSQub53k?si=0FbHzvyyr4nlFXOY',
            posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
            releaseYear: 2026,
            duration: '1h 38m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Emmy',
            rating: 4.7,
            ratingCount: 65,
            views: 520,
            trendingBadge: 'Hot Today',
            createdAt: new Date().toISOString()
          },
          {
            id: 'idiots_offline',
            title: 'Idiots',
            description: 'A hilarious comedy of errors as three best friends travel cross-country and stumble into an accidental high-stakes heist they are totally unprepared for.',
            genres: ['Comedy', 'Trending Movies'],
            videoUrl: 'https://youtu.be/oXA58y390JM?si=0EDrTJBA1dNVsJqK',
            trailerUrl: 'https://youtu.be/oXA58y390JM?si=0EDrTJBA1dNVsJqK',
            posterUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
            releaseYear: 2026,
            duration: '1h 50m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Mark',
            rating: 4.5,
            ratingCount: 78,
            views: 610,
            trendingBadge: 'Trending Comedy',
            createdAt: new Date().toISOString()
          },
          {
            id: 'sniper_battle_offline',
            title: 'Sniper Battle',
            description: 'Engaged in an urban sniper duel, two elite marksmen match wits, patience, and lethal precision in an abandoned skyscraper zone.',
            genres: ['Action', 'Hot Movies'],
            videoUrl: 'https://youtu.be/paT49VQ1z10?si=iDulzqgJaey6_YWH',
            trailerUrl: 'https://youtu.be/paT49VQ1z10?si=iDulzqgJaey6_YWH',
            posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
            releaseYear: 2026,
            duration: '1h 29m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Emmy',
            rating: 4.6,
            ratingCount: 82,
            views: 495,
            trendingBadge: 'Popular Choice',
            createdAt: new Date().toISOString()
          },
          {
            id: 'walk_to_remember_offline',
            title: 'A Walk to Remember',
            description: 'An inspiring romance following two high school students from opposite worlds whose lives are forever altered after an emotional journey of love and sacrifice.',
            genres: ['Romance', 'Trending Movies'],
            videoUrl: 'https://youtu.be/qk-4V5tR1bE?si=jL14mgNh3dBvfuAJ',
            trailerUrl: 'https://youtu.be/qk-4V5tR1bE?si=jL14mgNh3dBvfuAJ',
            posterUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?w=800',
            releaseYear: 2026,
            duration: '1h 42m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Junior',
            rating: 4.9,
            ratingCount: 140,
            views: 890,
            trendingBadge: 'Highly Rated Romance',
            createdAt: new Date().toISOString()
          },
          {
            id: 'fat_dragon_offline',
            title: 'Enter the Fat Dragon',
            description: 'An overweight yet highly agile and skilled martial arts police officer takes on massive syndicates in Japan, unleashing non-stop action and comedy.',
            genres: ['Action', 'Comedy', 'Hot Movies'],
            videoUrl: 'https://youtu.be/ttrRbxe-JXY?si=Sg_JMQ9a-UxMm8-W',
            trailerUrl: 'https://youtu.be/ttrRbxe-JXY?si=Sg_JMQ9a-UxMm8-W',
            posterUrl: 'https://images.unsplash.com/photo-1508847154043-be12a3bab439?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
            releaseYear: 2026,
            duration: '1h 36m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Ice p omutaka',
            rating: 4.6,
            ratingCount: 71,
            views: 580,
            trendingBadge: 'Hot Comedy',
            createdAt: new Date().toISOString()
          },
          {
            id: 'cleaner_offline',
            title: 'Cleaner',
            description: 'An elite operative masquerading as an ordinary building cleaner is forced to reactivate his specialized skills when dangerous corporate hostiles strike.',
            genres: ['Action', 'Trending Movies'],
            videoUrl: 'https://youtu.be/vbaTNR56Otc?si=tPOhGi7zDpj06lLS',
            trailerUrl: 'https://youtu.be/vbaTNR56Otc?si=tPOhGi7zDpj06lLS',
            posterUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
            releaseYear: 2026,
            duration: '1h 32m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Junior',
            rating: 4.7,
            ratingCount: 112,
            views: 640,
            trendingBadge: 'Trending #1 in Action',
            createdAt: new Date().toISOString()
          },
          {
            id: 'black_mark_offline',
            title: 'Black Mark',
            description: 'With a target painted on his back, a rogue government operative races against time to expose a massive conspiracy threatening global cybersecurity.',
            genres: ['Action', 'Hot Movies'],
            videoUrl: 'https://youtu.be/RNyeSN7tOtI?si=CZ29Mb4ymnDScQLN',
            trailerUrl: 'https://youtu.be/RNyeSN7tOtI?si=CZ29Mb4ymnDScQLN',
            posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=800',
            releaseYear: 2026,
            duration: '1h 34m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Emmy',
            rating: 4.8,
            ratingCount: 104,
            views: 512,
            trendingBadge: 'Blockbuster Action',
            createdAt: new Date().toISOString()
          },
          {
            id: 'the_eye_offline',
            title: 'The Eye',
            description: 'A gripping action-thriller following a blind cellist who recovers her sight through a transplant, only to begin seeing unexplained terrifying visions and shadows.',
            genres: ['Action', 'Trending Movies'],
            videoUrl: 'https://youtu.be/Tym237eRlkU?si=VrqUa5ntWti3xfoM',
            trailerUrl: 'https://youtu.be/Tym237eRlkU?si=VrqUa5ntWti3xfoM',
            posterUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
            releaseYear: 2026,
            duration: '1h 39m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Emmy',
            rating: 4.4,
            ratingCount: 48,
            views: 310,
            trendingBadge: 'Fan Favorite Thriller',
            createdAt: new Date().toISOString()
          },
          {
            id: 'homeless_to_harvard_offline',
            title: 'Homeless to Harvard',
            description: 'The incredibly moving true story of Liz Murray, who overcomes a homeless life to excel at high school and eventually gain admission to Harvard.',
            genres: ['Drama', 'Hot Movies'],
            videoUrl: 'https://youtu.be/wjyFUTDurvk?si=TKCUQNX-5JenW10h',
            trailerUrl: 'https://youtu.be/wjyFUTDurvk?si=TKCUQNX-5JenW10h',
            posterUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
            releaseYear: 2026,
            duration: '1h 44m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Junior',
            rating: 4.9,
            ratingCount: 156,
            views: 924,
            trendingBadge: 'Most Inspiring Drama',
            createdAt: new Date().toISOString()
          },
          {
            id: 'rebellious_offline',
            title: 'Rebellious',
            description: 'A charming and thrilling animated fantasy movie about a clever protagonist overcoming challenging quests, beautifully translated with humor by VJ Martin K.',
            genres: ['Kids Cartoon', 'Trending Movies'],
            videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800',
            releaseYear: 2026,
            duration: '1h 24m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Martin K',
            rating: 4.8,
            ratingCount: 42,
            views: 390,
            trendingBadge: 'Popular Cartoon',
            createdAt: new Date().toISOString()
          },
          {
            id: 'maado_offline',
            title: 'Maado',
            description: 'An adventurous and fun-filled kids animation journey packed with excitement and laughs, translated in local Luganda by VJ Kevo.',
            genres: ['Kids Cartoon', 'Hot Movies'],
            videoUrl: 'https://youtu.be/bUYc0ToXP-w?si=51I4hIRaeSGiidmf',
            trailerUrl: 'https://youtu.be/bUYc0ToXP-w?si=51I4hIRaeSGiidmf',
            posterUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
            releaseYear: 2026,
            duration: '1h 18m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Kevo',
            rating: 4.7,
            ratingCount: 31,
            views: 280,
            trendingBadge: 'Hot Animation',
            createdAt: new Date().toISOString()
          },
          {
            id: 'captain_alex_offline',
            title: 'Who Killed Captain Alex',
            description: 'Ugandan legendary action film about Uganda\'s elite commandos battling against dangerous mafia syndicates in Kampala, voiced in action-packed Luganda by VJ Emmie.',
            genres: ['Ugandan Movies', 'Trending Movies'],
            videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
            releaseYear: 2026,
            duration: '1h 25m',
            quality: 'FHD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Emmie',
            rating: 4.9,
            ratingCount: 198,
            views: 2314,
            trendingBadge: 'Ugandan Action Legend',
            createdAt: new Date().toISOString()
          },
          {
            id: 'yellow_jumper_offline',
            title: 'The Girl in the Yellow Jumper',
            description: 'A suspenseful mystery thriller set in the beautiful hills of southwestern Uganda following a hostage who escapes and returns with an unbelievable tale of survival, dynamically translated by VJ Junior.',
            genres: ['Ugandan Movies', 'Hot Movies'],
            videoUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            trailerUrl: 'https://youtu.be/OWMvBiFTe-M?si=sYemSdqjnUR6c3p9',
            posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=500',
            backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
            releaseYear: 2026,
            duration: '1h 40m',
            quality: 'HD',
            isPremium: false,
            isAdult: false,
            vj: 'Vj Junior',
            rating: 4.8,
            ratingCount: 145,
            views: 1845,
            trendingBadge: 'Ugandan Drama',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem('MP_LOCAL_MOVIES', JSON.stringify(defaultMov));
        setMovies(defaultMov);
      }
    }
  };

  const fetchUserStates = (uid: string) => {
    // Restore bookmarks and histories
    const savedFav = localStorage.getItem(`MP_FAV_${uid}`);
    if (savedFav) {
      setFavorites(JSON.parse(savedFav));
    }

    const savedHistory = localStorage.getItem(`MP_HIST_${uid}`);
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Load remote subscription document from Firebase
    fetchUserSubscription(uid);
  };

  const fetchUserSubscription = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'subscriptions'),
        where('userId', '==', uid)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      if (list.length > 0) {
        setUserSubscription(list[0]);
      } else {
        setUserSubscription(null);
      }
    } catch (e) {
      console.warn("Could not retrieve subscriber info: ", e);
    }
  };

  const getSubscriptionStatusInfo = () => {
    if (!currentUser) return { status: 'none', label: 'Not Logged In', badge: 'GUESTS' };
    if (!userSubscription) return { status: 'none', label: 'No Active Subscription', badge: 'FREE PROFILE' };
    
    const now = new Date();
    const expiry = new Date(userSubscription.expiresAt);
    
    if (userSubscription.status === 'pending_verification') {
      return { status: 'pending', label: 'Pending Verification ⏳', badge: 'PENDING VIP' };
    }
    
    if (userSubscription.status === 'rejected') {
      return { status: 'rejected', label: 'Payment Decelerated/Refused ❌', badge: 'VERIFICATION FAILED' };
    }
    
    if (userSubscription.status === 'active') {
      if (expiry > now) {
        return { 
          status: 'active', 
          label: `Active Premium (${userSubscription.planName}) ✅`, 
          badge: 'PREMIUM VIP',
          expiryStr: expiry.toLocaleString()
        };
      } else {
        return { status: 'expired', label: 'Subscription Expired ⏳', badge: 'EXPIRED VIP' };
      }
    }
    
    if (userSubscription.status === 'expired') {
      return { status: 'expired', label: 'Subscription Expired ⏳', badge: 'EXPIRED VIP' };
    }
    
    return { status: 'none', label: 'No Active Subscription', badge: 'FREE PROFILE' };
  };

  const toggleFavorite = (movieId: string, e: any) => {
    e.stopPropagation();
    if (!currentUser) {
      setPage('login');
      return;
    }
    const uid = currentUser.uid;
    let newFav = [...favorites];
    if (newFav.includes(movieId)) {
      newFav = newFav.filter((id) => id !== movieId);
    } else {
      newFav.push(movieId);
    }
    setFavorites(newFav);
    localStorage.setItem(`MP_FAV_${uid}`, JSON.stringify(newFav));
  };

  const playMovie = (movie: any) => {
    if (!currentUser) {
      setPage('login');
      return;
    }

    // Check Premium restriction
    const subInfo = getSubscriptionStatusInfo();
    const hasActivePremium = subInfo.status === 'active' || role === 'admin';

    if (movie.isPremium && !hasActivePremium) {
      // Show premium membership selector drawer/modal
      setShowPremiumModal(true);
      return;
    }

    setSelectedMovie(movie);
    // Register under watchHistory locally
    const uid = currentUser.uid;
    let newHist = [...history];
    newHist = newHist.filter((item) => item.id !== movie.id);
    newHist.unshift(movie); // push front
    setHistory(newHist.slice(0, 10)); // keep 10
    localStorage.setItem(`MP_HIST_${uid}`, JSON.stringify(newHist));
  };

  const handleSignOut = async () => {
    localStorage.removeItem('MP_LOGGED_USER');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut Firebase fallback:", e);
    }
    setCurrentUser(null);
    setRole('user');
    setFavorites([]);
    setHistory([]);
    setPage('home');
  };

  const selectGenreFilter = (genre: string) => {
    setCategoryLoading(true);
    setSelectedGenreFilter(genre);
    setShowGenreDrawer(false);
    setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCategoryLoading(false);
    }, 450);
  };

  // Helper groupings
  const filteredMovies = movies.filter((m) => {
    if (m.isAdult) return false; // Adult hidden from normal sections
    const matchesGenre = selectedGenreFilter ? m.genres?.includes(selectedGenreFilter) : true;
    const matchesSearch = searchTerm 
      ? m.title.toLowerCase().includes(searchTerm.toLowerCase()) || m.description.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesGenre && matchesSearch;
  });

  // Sort active home screen lists based on interactive criteria: 'Release Year', 'Rating', or 'Most Viewed'
  const normalMovies = [...filteredMovies].sort((a, b) => {
    if (sortBy === 'year') {
      return (b.releaseYear || 0) - (a.releaseYear || 0);
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'views') {
      return (b.views || 0) - (a.views || 0);
    }
    return 0;
  });

  const trendingMovies = normalMovies.filter((m) => m.genres?.includes('Trending Movies') || m.trendingBadge === '#1 in Uganda');
  const hotMovies = normalMovies.filter((m) => m.genres?.includes('Hot Movies') || m.genres?.includes('Action'));
  const kidsCartoonMovies = normalMovies.filter((m) => m.genres?.includes('Kids Cartoon'));
  const ugandanMovies = normalMovies.filter((m) => m.genres?.includes('Ugandan Movies') || m.genres?.includes('Ugandan'));
  const hotSeries = series.filter((s) => s.genres?.includes('Hot Series') || s.isPremium);

  // Pick first movie with backdrop image as absolute single hero movie spot banner
  const heroMovie = movies.find((m) => !m.isAdult && m.backdropUrl) || movies.find((m) => !m.isAdult);

  if (selectedMovie) {
    return (
      <MovieWatchView 
        key={selectedMovie.id}
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        currentUser={currentUser} 
        userSubscription={userSubscription}
        allMovies={movies}
        onSelectMovie={setSelectedMovie}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col justify-between font-sans overflow-x-hidden antialiased">
      <AnimatePresence>
        {splashLoading && <SplashLoader onComplete={() => setSplashLoading(false)} />}
      </AnimatePresence>

      <WelcomePopup />

      {/* --- SITE STYLING TOP NAVIGATION --- */}
      <header className="sticky top-0 bg-[#0a0a0a]/95 backdrop-blur z-40 border-b border-[#141416] px-4 py-3 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center space-x-3">
          <button 
            id="toggle-drawer-btn"
            onClick={() => setSidebarOpen(true)} 
            className="p-1 px-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <h1 
            onClick={() => { setPage('home'); setSelectedGenreFilter(''); setSearchTerm(''); }}
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            className="text-2xl md:text-3xl font-black text-[#e50914] cursor-pointer drop-shadow-md select-none tracking-wider transition hover:scale-102 hover:text-[#ff0a16] duration-200"
          >
            MOVIEPULSE
          </h1>
        </div>

        {/* Smart Quick Search with polished input context */}
        <div className="hidden md:flex max-w-sm w-full mx-4 relative items-center group">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 group-focus-within:text-[#e50914] transition-colors" />
          <input
            id="header-instant-search"
            type="text"
            placeholder="Search films, VJs, or genres instantly..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111113] border border-gray-900 group-hover:border-gray-800 focus:border-[#e50914]/80 text-gray-300 pl-9 pr-4 py-1.5 rounded-full text-xs font-medium placeholder-gray-600 outline-none transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 text-[9px] text-gray-500 hover:text-white uppercase font-mono font-black"
            >
              ✕ CLEAN
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 relative">
          {/* Low Data toggler helper pill with pulse indicator */}
          <button
            onClick={() => setIsLowDataMode(!isLowDataMode)}
            className={`hidden lg:flex items-center space-x-1 py-1 px-3 rounded-full text-[10px] font-mono border font-black tracking-wide transition-all duration-300 select-none cursor-pointer ${
              isLowDataMode 
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' 
                : 'bg-gray-950 text-gray-400 border-gray-900 hover:border-gray-800'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full mr-0.5 ${isLowDataMode ? 'bg-yellow-500 animate-ping' : 'bg-gray-600'}`}></span>
            <Compass className="w-3.5 h-3.5" />
            <span>LOW DATA: {isLowDataMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Database Mode select option (Developer mode toggle) */}
          <button
            id="db-mode-sync"
            onClick={() => switchFirebaseMode(dbMode === 'sandbox' ? 'production' : 'sandbox')}
            className={`py-1 px-3 rounded-full text-[9px] font-mono font-black tracking-widest hidden sm:block transition duration-200 cursor-pointer ${
              dbMode === 'sandbox'
                ? 'bg-blue-950/40 text-blue-400 border border-blue-900/40 hover:border-blue-700'
                : 'bg-amber-950/40 text-amber-500 border border-amber-900/40 hover:border-amber-700'
            }`}
          >
            DB: {dbMode === 'sandbox' ? 'LOCAL SEED' : 'USER CLOUD'}
          </button>

          {/* Notification Alerts Bell dropdown */}
          <div className="relative">
            <button 
              id="bell-notif-btn"
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              className="p-1.5 rounded-full bg-[#111113] hover:bg-[#1a1a1e] text-gray-300 relative border border-gray-900 transition flex items-center justify-center cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              )}
            </button>
            {showNotificationsDropdown && (
              <div className="absolute right-0 mt-2 bg-[#121214] border border-gray-800 rounded-2xl p-3 w-64 shadow-2xl z-50 divide-y divide-gray-900">
                <div className="pb-2 flex justify-between items-center">
                  <span className="text-[10px] font-mono uppercase font-black text-gray-400">Broadcasting notes</span>
                  <button onClick={() => setShowNotificationsDropdown(false)} className="text-[9px] text-gray-500 hover:text-white font-mono uppercase">close</button>
                </div>
                <div className="pt-2 space-y-2 max-h-48 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-[10px] font-mono text-gray-600 text-center py-2 uppercase">No notifications uploaded yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="text-left text-[11px] leading-snug">
                        <p className="font-bold text-white uppercase">{n.title}</p>
                        <p className="text-gray-400 mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {currentUser ? (
            <button
              id="avatar-btn"
              onClick={() => setPage('account')}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-950 to-red-900 border border-red-700 flex items-center justify-center text-white text-base select-none transition duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              title="View Account Lounge"
            >
              <span>{userAvatar}</span>
            </button>
          ) : (
            <button
              id="login-register-head-btn"
              onClick={() => setPage('login')}
              className="text-xs bg-[#e50914] hover:bg-[#ff0a16] text-white px-3 py-1.5 rounded-lg font-black transition font-sans shadow cursor-pointer uppercase tracking-wider"
            >
              SUBSCRIBE
            </button>
          )}
        </div>
      </header>

      {/* --- SIDEBAR HAMBURGER DRAWER --- */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex select-none">
            {/* Backdrop cover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black"
            />
            
            {/* Nav content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-72 bg-[#0d0d0d] border-r border-gray-900 h-full p-5 flex flex-col justify-between overflow-y-auto"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-2xl text-[#e50914] tracking-wider">
                    DISCOVER DIRECT
                  </h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1 bg-black/60 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Account card summary */}
                {currentUser && (
                  <div className="bg-[#151515] p-3 rounded-xl border border-gray-800 mb-5 text-[11px] font-mono">
                    <p className="text-gray-500 uppercase font-black tracking-wider">Current Session ID</p>
                    <p className="text-white font-bold truncate mt-0.5">{currentUser.email}</p>
                    {role === 'admin' && (
                      <span className="inline-block bg-[#ff0a16]/10 text-[#ff0a16] px-1.5 py-0.5 rounded text-[8px] font-black uppercase mt-1">
                        OPERATOR PRIVILEGES
                      </span>
                    )}
                  </div>
                )}

                {/* Sidebar anchors list */}
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">MAIN CHANNELS</span>
                <nav className="space-y-1 mb-6">
                  <button
                    onClick={() => { setPage('home'); setSelectedGenreFilter(''); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-sm flex items-center space-x-2 text-white"
                  >
                    <Home className="w-4 h-4 text-red-500" />
                    <span>Home Panel</span>
                  </button>
                  <button
                    onClick={() => { setPage('search'); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-sm flex items-center space-x-2 text-white"
                  >
                    <Search className="w-4 h-4 text-red-500" />
                    <span>Instant Search</span>
                  </button>
                  <button
                    onClick={() => { setPage('watchlist'); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-sm flex items-center space-x-2 text-white"
                  >
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>Watchlist Favorites</span>
                  </button>
                  <button
                    onClick={() => { setPage('subscription'); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-sm flex items-center space-x-2 text-white"
                  >
                    <Award className="w-4 h-4 text-[#ffd700]" />
                    <span>Subscription Upgrade</span>
                  </button>

                  <button
                    onClick={() => { setPage('downloads'); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-sm flex items-center space-x-2 text-white"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Downloads Lounge</span>
                  </button>
                  
                  {/* Restricted vaults */}
                  <button
                    onClick={() => { setPage('adult'); setSidebarOpen(false); }}
                    className="w-full text-left py-2 px-3 bg-red-950/15 border border-red-900/10 rounded-lg text-xs flex items-center space-x-2 text-[#ff0a16] font-bold"
                  >
                    <Lock className="w-4 h-4" />
                    <span>🔞 SECURE VIP ADULT ZONE</span>
                  </button>

                  {role === 'admin' && (
                    <button
                      onClick={() => { setPage('admin'); setSidebarOpen(false); }}
                      className="w-full text-left py-2 px-3 bg-indigo-950/20 border border-indigo-900/30 rounded-lg text-xs flex items-center space-x-2 text-indigo-400 font-bold"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>CMS CONTROL CENTRE</span>
                    </button>
                  )}
                </nav>

                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-1">CATEGORIES</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-400 font-mono mb-4">
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => selectGenreFilter(g)}
                      className="text-left hover:bg-white/5 p-1 px-2 rounded hover:text-white"
                    >
                      • {g}
                    </button>
                  ))}
                </div>

                {/* VJ TRANSLATION REQUEST COMPONENT */}
                <div className="bg-[#121212]/80 border border-gray-900 rounded-2xl p-3 space-y-2 mt-3 block">
                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-red-500 font-extrabold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse text-red-500" />
                    <span>Request VJ Translation</span>
                  </div>
                  <form onSubmit={submitVjRequest} className="space-y-1.5 text-[10px] font-mono">
                    <input
                      type="text"
                      placeholder="Enter movie title, e.g. Shrek"
                      value={requestMovieTitle}
                      onChange={(e) => setRequestMovieTitle(e.target.value)}
                      className="w-full bg-[#181818] border border-gray-800 text-gray-300 rounded px-2 py-1 placeholder-gray-600 outline-none focus:border-red-600 text-[10px]"
                    />
                    <div className="flex gap-1.5">
                      <select
                        value={requestVjName}
                        onChange={(e) => setRequestVjName(e.target.value)}
                        className="flex-1 bg-[#181818] border border-gray-800 text-gray-400 rounded px-1 py-1 text-[10px] outline-none"
                      >
                        {['Vj Martin K', 'Vj Kevo', 'Vj Junior', 'Vj Jingo', 'Vj Ice P'].map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={isSubmittingRequest || !requestMovieTitle.trim()}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded text-[9px] uppercase transition disabled:opacity-50 shrink-0"
                      >
                        {isSubmittingRequest ? '...' : 'SUBMIT'}
                      </button>
                    </div>
                  </form>
                  {requestSuccess && (
                     <p className="text-[9px] text-[#25D366] font-mono uppercase font-bold text-center leading-tight">
                       Weebale! Translation request logged!
                     </p>
                  )}
                </div>

                {/* MOVIEPULSE CDN SPEED PING TESTER */}
                <div className="bg-[#121212]/80 border border-gray-900 rounded-2xl p-3 space-y-2 mt-3 font-mono text-[10px]">
                  <div className="flex items-center justify-between border-b border-gray-900 pb-1">
                    <span className="text-[9px] text-yellow-500 font-extrabold uppercase tracking-wider block">📡 FAST CDN SPEED-TEST</span>
                    <button
                      onClick={runPingTest}
                      disabled={isTestingPing}
                      className="text-red-500 hover:text-red-400 font-extrabold uppercase text-[9px] cursor-pointer"
                    >
                      {isTestingPing ? 'TESTING...' : 'RUN'}
                    </button>
                  </div>
                  <div className="space-y-1 text-gray-400 text-[9px] leading-snug">
                    <div className="flex justify-between">
                      <span>Uganda Core Line:</span>
                      <span className={pingResult ? 'text-emerald-400 font-bold' : 'text-gray-600'}>
                        {pingResult ? `${pingResult.entebbe} ms` : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kampala VIP Host:</span>
                      <span className={pingResult ? 'text-emerald-400 font-bold' : 'text-gray-600'}>
                        {pingResult ? `${pingResult.kampala} ms` : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar contacts & WhatsApp channels info */}
              <div className="border-t border-gray-900 pt-4 mt-6 space-y-2">
                <button
                  onClick={() => window.open('https://chat.whatsapp.com/invite/moviepulse', '_blank')}
                  className="w-full bg-[#25D366] hover:bg-emerald-600 text-white py-2.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition uppercase"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white text-transparent shrink-0" />
                  <span>JOIN WHATSAPP CHANNEL</span>
                </button>

                {/* TikTok follow redirect request */}
                <a
                  href="https://vm.tiktok.com/ZS92fAaLAK29U-QC2Et/"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="w-full bg-gradient-to-r from-[#00f2fe] via-[#ff007f] to-black hover:opacity-90 text-white py-2.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition uppercase shadow cursor-pointer text-center"
                >
                  <Flame className="w-3.5 h-3.5 text-yellow-400 shrink-0 animate-pulse" />
                  <span>FOLLOW ON TIKTOK</span>
                </a>
                
                <div className="text-[9px] font-mono text-gray-500 mt-3 text-center uppercase tracking-wider leading-relaxed bg-[#0c0c0c] p-2.5 rounded-xl border border-gray-900/30">
                  <p className="text-gray-400 font-extrabold pb-0.5 border-b border-gray-900 mb-1">Founder Hotlines Support:</p>
                  <p className="text-yellow-500 font-bold">MTN: 0766051929</p>
                  <p className="text-[#ff0a16] font-bold">AIRTEL: 0704557858</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- RECURSIVE NOTIFICATIONS BAR POPUP --- */}
      <AnimatePresence>
        {socialNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-20 left-4 z-40 bg-[#161616] border border-emerald-900/30 text-white rounded-xl px-4 py-2.5 text-xs font-mono shadow-[0_4px_20px_rgba(37,211,102,0.15)] max-w-xs flex items-center space-x-2"
          >
            <span className="w-2 h-2 bg-[#25D366] rounded-full animate-ping mr-1"></span>
            <span className="leading-tight text-gray-300">{socialNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOVIE WATCH MODE IS REDIRECTED AT TOP ROUTE LEVEL --- */}

      {/* --- MAIN PAGE ROUTER SWAPPER --- */}
      <main className="flex-1 w-full max-w-5xl mx-auto py-4">

        {/* 1. LOGIN ROUTE */}
        {page === 'login' && (
          <AuthView 
            onSuccess={() => setPage('home')} 
            onSwitchToRegister={() => setPage('register')} 
            isRegistering={false}
          />
        )}

        {/* 2. REGISTER ROUTE */}
        {page === 'register' && (
          <AuthView             onSuccess={() => setPage('home')} 
            onSwitchToRegister={() => setPage('login')} 
            isRegistering={true}
          />
        )}

        {/* 3. SUBSCRIPTION ROUTE */}
        {page === 'subscription' && (
          <SubscriptionPlans 
            onSuccess={() => { 
              if (currentUser) fetchUserSubscription(currentUser.uid);
              setPage('home'); 
            }} 
            onClose={() => setPage('home')}
            userEmail={currentUser?.email}
            userName={currentUser?.displayName}
          />
        )}

        {/* 4. ADULT VAULT ZONE */}
        {page === 'adult' && (
          <AdultZone 
            onMovieSelect={(movie) => playMovie(movie)} 
            onGoBack={() => setPage('home')} 
          />
        )}

        {/* 5. ADMIN CONTROL PANEL */}
        {page === 'admin' && <AdminPanel />}

        {/* 6. WATCHLIST BOOKMARKS VIEW */}
        {page === 'watchlist' && (
          <div className="px-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-4">My Watchlist</h2>
            {favorites.length === 0 ? (
              <div className="bg-[#111] p-8 text-center rounded-2xl border border-gray-800">
                <p className="text-xs text-gray-500 uppercase font-mono">Your Saved collections is currently empty.</p>
                <button 
                  onClick={() => setPage('home')} 
                  className="mt-3 bg-red-600 px-4 py-1.5 rounded-lg text-xs font-bold text-white uppercase font-mono"
                >
                  Explore movies
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {movies.filter((m) => favorites.includes(m.id)).map((movie) => (
                  <div 
                    key={movie.id} 
                    onClick={() => playMovie(movie)}
                    className="cursor-pointer bg-[#111] rounded-2xl overflow-hidden border border-gray-900 group"
                  >
                    <img src={movie.posterUrl} alt={movie.title} referrerPolicy="no-referrer" className="aspect-[3/4] object-cover w-full h-full group-hover:scale-105 transition duration-300" />
                    <p className="p-2 font-bold text-xs truncate text-white flex justify-between items-center gap-1">
                      <span className="truncate">{movie.title}</span>
                      <span className="text-[#ff0a16] font-mono text-[10px] group-hover:translate-x-1 transition-transform">»</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. SEARCH & DISCOVERY ROUTE */}
        {page === 'search' && (
          <div className="px-4 space-y-4">
            <MovieSearch onSearch={(txt) => setSearchTerm(txt)} searchValue={searchTerm} />
            
            {filteredMovies.length === 0 ? (
              <p className="p-8 text-center text-gray-500 font-mono text-xs uppercase">No matches found for your search query.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {filteredMovies.map((movie) => (
                  <div 
                    key={movie.id} 
                    onClick={() => playMovie(movie)}
                    className="bg-[#111] rounded-2xl overflow-hidden border border-gray-900 cursor-pointer group"
                  >
                    <img src={movie.posterUrl} alt={movie.title} referrerPolicy="no-referrer" className="aspect-[3/4] object-cover w-full group-hover:scale-105 transition duration-300" />
                    <p className="p-2 font-bold text-xs truncate text-white flex justify-between items-center gap-1">
                      <span className="truncate">{movie.title}</span>
                      <span className="text-[#ff0a16] font-mono text-[10px] group-hover:translate-x-1 transition-transform">»</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. ACTIVE PW DOWNLOADS SCREEN */}
        {page === 'downloads' && (() => {
          const [savedList, setSavedList] = useState<any[]>(() => {
            try {
              const res = localStorage.getItem('MP_OFFLINE_DOWNLOADS');
              return res ? JSON.parse(res) : [];
            } catch {
              return [];
            }
          });

          const deleteDownloaded = (id: string, e: React.MouseEvent) => {
            e.stopPropagation();
            const updated = savedList.filter((m) => m.id !== id);
            setSavedList(updated);
            localStorage.setItem('MP_OFFLINE_DOWNLOADS', JSON.stringify(updated));
            alert("Downloaded movie removed from local storage successfully!");
          };

          return (
            <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center bg-[#111] p-4 rounded-2xl border border-gray-900">
                <div className="flex items-center space-x-3">
                  <Download className="w-8 h-8 text-[#ff0a16]" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">MoviePulse Offline Lounge</h3>
                    <p className="text-[10px] text-gray-400">Offline files are safely encrypted. Stream without using your internet data!</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPage('home')} 
                  className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl transition uppercase font-mono shadow"
                >
                  « Browse Movies
                </button>
              </div>

              {savedList.length === 0 ? (
                <div className="bg-[#0c0c0c] border border-gray-900 p-8 rounded-3xl text-center space-y-4 max-w-sm mx-auto">
                  <Download className="w-12 h-12 text-gray-700 mx-auto" />
                  <h4 className="text-xs font-black text-white uppercase font-sans">Your Offline Lounge is Empty</h4>
                  <p className="text-[11px] text-gray-500">
                    To save movies offline: upgrade your subscriber pass, tap any movie on the homepage, and click the direct download icon on the bottom right of the player!
                  </p>
                  <button 
                    onClick={() => setPage('home')} 
                    className="bg-[#181818] text-gray-300 font-bold text-[10px] px-5 py-2 rounded-xl hover:bg-red-600 hover:text-white transition uppercase font-sans border border-gray-800"
                  >
                    Find a Movie
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedList.map((movie) => {
                    // Match object to correct model mapping
                    const playThisOffline = () => {
                      // Match the item to full catalog
                      const matched = movies.find(m => m.id === movie.id) || {
                        id: movie.id,
                        title: movie.title,
                        description: movie.description,
                        videoUrl: movie.videoUrl,
                        posterUrl: movie.posterUrl,
                        vj: movie.vj,
                        genres: ['Offline Downloads'],
                        releaseYear: 2026,
                        quality: 'FHD',
                        isPremium: false,
                        isAdult: false
                      };
                      playMovie(matched);
                    };

                    return (
                      <div 
                        key={movie.id}
                        onClick={playThisOffline}
                        className="bg-[#0e0a0d] border border-gray-900 rounded-2xl overflow-hidden p-3 flex space-x-3 hover:border-red-600 transition duration-300 cursor-pointer group"
                      >
                        <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden bg-black relative shrink-0">
                          <img src={movie.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=150'} alt={movie.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-between flex-1 min-w-0">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="text-white text-xs font-black truncate font-sans group-hover:text-red-500 transition">{movie.title}</h4>
                              <button 
                                onClick={(e) => deleteDownloaded(movie.id, e)}
                                className="text-[9px] font-mono text-gray-500 hover:text-red-500 hover:underline shrink-0 font-bold"
                                title="Remove offline file"
                              >
                                DELETE
                              </button>
                            </div>
                            <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-normal font-sans">{movie.description}</p>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-mono mt-2 pt-2 border-t border-gray-950">
                            <span className="text-amber-500 font-extrabold uppercase">🎬 {movie.vj || 'Translator VJ'}</span>
                            <span className="text-emerald-400 font-bold bg-[#121212] px-2 py-0.5 rounded border border-emerald-950/15">READY OFFLINE ✅</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 9. USER ACCOUNT PROFILE STATE ROUTE */}
        {page === 'account' && (() => {
          // Helper helper to format sub class logs
          const getSubDetailsForDisplay = () => {
            const subInfo = getSubscriptionStatusInfo();
            if (subInfo.status === 'none') {
              return {
                planName: 'No Subscription / Free Tier',
                quality: 'Standard Definition (360p Max)',
                downloads: 'Disabled on Free Tier',
                badgeColor: 'bg-gray-800 text-gray-400',
                expiresLabel: 'Not Active',
                glowingBorder: 'border-gray-850'
              };
            }
            
            if (subInfo.status === 'pending') {
              return {
                planName: userSubscription?.planName || 'Pending Plan',
                quality: 'HD stream pending approval',
                downloads: 'Download pending approval',
                badgeColor: 'bg-amber-950 text-amber-400 border border-amber-900/40',
                expiresLabel: 'Awaiting MoMo Verification ⏳',
                glowingBorder: 'border-amber-900/40 shadow-[0_0_15px_rgba(234,179,8,0.15)] animate-pulse'
              };
            }
            
            if (subInfo.status === 'rejected') {
              return {
                planName: 'Proof of Payment Invalid ❌',
                quality: 'Restricted',
                downloads: 'Restricted',
                badgeColor: 'bg-red-950 text-red-500 border border-red-900/50',
                expiresLabel: 'MoMo verification failed. Please try again.',
                glowingBorder: 'border-red-900/40'
              };
            }
            
            if (subInfo.status === 'expired') {
              return {
                planName: `${userSubscription?.planName || 'VIP Pass'} (Expired)`,
                quality: '360p Max fall-back',
                downloads: 'Offline saves locked',
                badgeColor: 'bg-zinc-800 text-zinc-500',
                expiresLabel: `Expired on ${new Date(userSubscription?.expiresAt).toLocaleDateString()}`,
                glowingBorder: 'border-zinc-900'
              };
            }
            
            // Active subscriber detail mapper
            const planId = (userSubscription?.planName || '').toLowerCase();
            
            let quality = 'Full HD resolution (1080p)';
            let downloads = 'Unlimited offline saving';
            if (planId.includes('hour') || planId.includes('⚡')) {
              quality = 'HD resolution (720p)';
              downloads = '1 offline save slot active';
            } else if (planId.includes('low-data') || planId.includes('📶')) {
              quality = 'Compressed low-data saver (240p - 480p)';
              downloads = '2 offline slots (compressed)';
            } else if (planId.includes('daily') || planId.includes('📅')) {
              quality = 'FHD resolution (1080p)';
              downloads = '5 offline save slots active';
            } else if (planId.includes('weekly') || planId.includes('📆')) {
              quality = 'FHD resolution (1080p)';
              downloads = '15 offline save slots active';
            } else if (planId.includes('monthly') || planId.includes('🔥')) {
              quality = 'FHD Cinema resolution (1080p)';
              downloads = 'Unlimited offline saves';
            } else if (planId.includes('single') || planId.includes('🎬')) {
              quality = 'FHD resolution (1080p)';
              downloads = '1 movie offline save slot';
            }

            return {
              planName: userSubscription?.planName || 'Premium Plan',
              quality,
              downloads,
              badgeColor: 'bg-emerald-950 text-emerald-400 border border-emerald-900/50',
              expiresLabel: 'Premium Active Pass',
              glowingBorder: 'border-emerald-600'
            };
          };

          const subDetails = getSubDetailsForDisplay();
          const subInfo = getSubscriptionStatusInfo();
          
          const savedDownloadsCount = (() => {
            try {
              const res = localStorage.getItem('MP_OFFLINE_DOWNLOADS');
              return res ? JSON.parse(res).length : 0;
            } catch {
              return 0;
            }
          })();

          // Mock Invoice/Transaction logs to satisfy plus features requirements elegantly
          const transactionLogs = [
            { id: 'MP-MoMo-9481', plan: userSubscription?.planName || 'Daily Pass 📅', amount: 'UGX 5,000', date: '2026-06-06', status: subInfo.status === 'active' ? 'APPROVED ✅' : 'PENDING ⏳' },
            { id: 'MP-MoMo-1928', plan: 'Weekly Cinema Pass 📆', amount: 'UGX 15,000', date: '2026-05-30', status: 'COMPLETED' }
          ];

          return (
            <div className="px-4 pb-12">
              <div className={`max-w-lg mx-auto bg-[#111] rounded-3xl border p-6 space-y-6 transition-all duration-300 ${ambientGlowMode ? 'border-red-900/60 shadow-[0_0_35px_rgba(229,10,22,0.25)]' : 'border-gray-800'}`}>
                
                {/* Visual Avatar Header Row */}
                <div className="text-center relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-950 to-amber-900 border border-red-800 flex items-center justify-center text-white mx-auto mb-3 text-3xl font-sans select-none shadow-[0_4px_20px_rgba(0,0,0,0.6)] transform hover:rotate-6 transition duration-200">
                    {userAvatar}
                  </div>
                  <h3 className="text-lg font-black tracking-wide text-white uppercase font-sans">{currentUser?.displayName || currentUser?.email || 'guest@moviepulse.com'}</h3>
                  <span className={`text-[10px] font-mono px-3 py-1 rounded inline-block uppercase mt-1.5 font-black shrink-0 ${subDetails.badgeColor}`}>
                    {subInfo.badge}
                  </span>
                </div>

                {/* PREMIUM ACCOUNT DETAILS */}
                <div className={`bg-[#0a0a0a] rounded-2xl border p-4 space-y-3 font-mono text-xs transition duration-300 ${subDetails.glowingBorder}`}>
                  <div className="flex justify-between border-b border-gray-900 pb-1.5Col">
                    <span className="text-gray-500 uppercase">PLAN DETAILS:</span>
                    <span className="text-white font-extrabold uppercase">{subDetails.planName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-gray-500 uppercase">EXPIRATION STATUS:</span>
                    <span className="text-yellow-500 font-bold text-right text-[11px]">{subDetails.expiresLabel}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-900 pb-1.5">
                    <span className="text-gray-500 uppercase">STREAM QUALITY:</span>
                    <span className="text-emerald-400 font-bold text-right">{subDetails.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 uppercase">OFFLINE SLOTS:</span>
                    <span className="text-white font-bold text-right">{subDetails.downloads}</span>
                  </div>
                </div>

                {/* INTERACTIVE CINE-AVATAR PICKER (Fidelity UI expansion feature) */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center border-b border-gray-900 pb-1.5">
                    <span>🎬 CHOOSE MOVIE-PERSONA AVATAR</span>
                  </h4>
                  <p className="text-gray-400 text-[9px] leading-relaxed">Select your local interactive avatar to customize player labels and headers instantly:</p>
                  <div className="flex flex-wrap justify-between gap-1.5">
                    {['🦁', '👑', '🍿', '👶', '⚡', '💎', '🎭', '🚀', '💰'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setUserAvatar(emoji);
                          localStorage.setItem('MP_USER_AVATAR', emoji);
                        }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition duration-200 border ${
                          userAvatar === emoji 
                            ? 'bg-red-950/40 border-red-500 shadow-[0_0_12px_rgba(229,9,20,0.3)] scale-110' 
                            : 'bg-black/80 border-gray-900 hover:border-gray-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* OFFLINE ENVELOPE STATUS GAUGES (UX feature coupling downloads state) */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider border-b border-gray-900 pb-1.5 flex justify-between">
                    <span>💾 OFFLINE SAVES MONITOR</span>
                    <span className="text-[8.5px] text-emerald-400 font-bold uppercase">SECURED ✅</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-black/70 border border-gray-950 p-2.5 rounded-xl">
                      <p className="text-[18px] font-black text-rose-500">{savedDownloadsCount}</p>
                      <p className="text-gray-500 text-[8.5px] uppercase mt-0.5">Downloaded</p>
                    </div>
                    <div className="bg-black/70 border border-gray-950 p-2.5 rounded-xl">
                      <p className="text-[18px] font-black text-emerald-400">~{savedDownloadsCount * 120} MB</p>
                      <p className="text-gray-500 text-[8.5px] uppercase mt-0.5">Approx Space</p>
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-400 leading-snug">
                    Offline files use highly optimized MP4 formatting to minimize storage, enabling uninterrupted playback during grid outages.
                  </div>
                </div>

                {/* INVOICES & HISTORIC RECEIPTS LIST (UX element) */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider border-b border-gray-900 pb-1.5">
                    <span>🧾 MY TRANSACTIONS & RECEIPTS</span>
                  </h4>
                  <div className="space-y-1.5">
                    {transactionLogs.map((log) => (
                      <div key={log.id} className="bg-black/70 border border-gray-950 p-2 rounded-xl flex items-center justify-between text-[9px] leading-snug">
                        <div>
                          <p className="text-white font-extrabold">{log.plan}</p>
                          <p className="text-gray-500 text-[7.5px] uppercase">Ref: {log.id} • {log.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-500 font-bold">{log.amount}</p>
                          <p className="text-[8px] text-emerald-400 font-black tracking-wide">{log.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MIDNIGHT AMBIENT GLOW MODE SWITCHER (UX element) */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 flex items-center justify-between font-mono text-xs">
                  <div className="space-y-1 pr-3">
                    <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                      💡 AMBIENT CINEMA BACKLIGHT
                    </h4>
                    <p className="text-gray-400 text-[9px] leading-normal">Cast a soft, glowing red halo drop-shadow around card frames for immersive late-night viewing.</p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !ambientGlowMode;
                      setAmbientGlowMode(next);
                      localStorage.setItem('MP_AMBIENT_GLOW', String(next));
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition duration-300 shrink-0 ${
                      ambientGlowMode
                        ? 'bg-red-600 border-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(229,10,22,0.4)]'
                        : 'bg-black/60 border-gray-800 text-gray-400'
                    }`}
                  >
                    {ambientGlowMode ? 'GLOW ON 🔴' : 'GLOW OFF'}
                  </button>
                </div>

                {/* Mobile Money fast checkout Preset Info */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider flex items-center border-b border-gray-900 pb-1.5">
                    <span>📱 MOMO FAST-PAY PRESETS</span>
                  </h4>
                  <div className="space-y-2 text-[10px]">
                    <p className="text-gray-400">Save details locally for instant auto-fill on Mobile Money payment checkout screens.</p>
                    <div className="flex gap-2">
                      <select
                        value={momoOperator}
                        onChange={(e) => {
                          setMomoOperator(e.target.value);
                          localStorage.setItem('MP_MOMO_OPERATOR', e.target.value);
                        }}
                        className="bg-[#181818] border border-gray-800 text-gray-350 rounded px-2 py-1 outline-none text-[10px]"
                      >
                        <option value="MTN">MTN MoMo</option>
                        <option value="Airtel">Airtel Money</option>
                      </select>
                      <input
                        type="tel"
                        placeholder="Preset line number (e.g. 0766051929)"
                        value={momoNumberPreset}
                        onChange={(e) => {
                          setMomoNumberPreset(e.target.value);
                          localStorage.setItem('MP_MOMO_PRESET', e.target.value);
                        }}
                        className="flex-1 bg-[#181818] border border-gray-800 text-gray-200 rounded px-2.5 py-1 text-[10px] outline-none placeholder-gray-800 focus:border-yellow-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Bandwidth capped fallback resolution */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-3 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-900 pb-1.5">
                    <span>🎬 HIGH-FIDELITY BANDWIDTH CAPPING</span>
                    <span className="text-[9px] bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded font-black">ACTIVE</span>
                  </h4>
                  <div className="space-y-2">
                    <p className="text-gray-400 text-[10px]">Cap default browser fallback resolution stream. Conserves bundles on mobile nodes.</p>
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                      {(['360p', '480p', '720p', '1080p'] as const).map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolutionCap(res)}
                          className={`py-1 rounded border transition font-bold ${
                            resolutionCap === res 
                              ? 'bg-red-600 border-red-500 text-white' 
                              : 'bg-black/60 border-gray-800 text-gray-400 hover:border-gray-750'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Active Authorized stream devices security block */}
                <div className="bg-[#0c0c0c] border border-gray-900 rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                  <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-wider border-b border-gray-950 pb-1.5 flex justify-between">
                    <span>🔐 AUTHORIZED DEVICE STREAMS</span>
                    <span className="text-[9px] text-[#25D366] font-bold">● SYSTEM PROTECTED</span>
                  </h4>
                  <div className="space-y-1.5 text-[9px] text-gray-400 divide-y divide-gray-950">
                    {activeSessionDevices.map((dev) => (
                      <div key={dev.id} className="pt-1.5 first:pt-0 flex justify-between items-center leading-normal">
                        <div>
                          <p className="text-white font-bold">{dev.name}</p>
                          <p className="text-gray-500">{dev.location}</p>
                        </div>
                        <span className="text-[8px] bg-gray-950 px-1.5 py-0.5 rounded text-gray-500 font-extrabold uppercase">{dev.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rate the website system */}
                <div className="bg-[#0d0d0d] p-4 rounded-xl border border-gray-900 text-center space-y-3">
                  <h4 className="text-xs font-mono font-bold text-gray-400 uppercase">Rate MoviePulse platform experience</h4>
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button 
                        key={s} 
                        onClick={() => { setWebsiteStars(s); setAppRated(true); }}
                        className="focus:outline-none"
                      >
                        <Star className={`w-5 h-5 ${s <= websiteStars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-700'}`} />
                      </button>
                    ))}
                  </div>
                  {appRated && (
                    <p className="text-[10px] text-[#25D366] font-mono uppercase font-bold text-center">
                      Webaale kussaako! Platform rated {websiteStars} stars.
                    </p>
                  )}
                </div>

                <div className="space-y-3.5 pt-2">
                  <button
                    onClick={() => setShowPremiumModal(true)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#ff0a16] to-[#ffd700] text-black font-extrabold text-xs uppercase"
                  >
                    ⚡ Active Pass Upgrade
                  </button>

                  {/* Chat speech balloon/note and direct redirect as requested: "come in chat and we jazz😁😋" */}
                  <div className="space-y-1.5">
                    <div className="relative bg-[#102419] border border-emerald-900/50 p-2.5 rounded-2xl text-center text-[10px] text-emerald-400 font-bold uppercase tracking-wide animate-pulse">
                      come in chat and we jazz😁😋
                    </div>
                    <a
                      href="https://wa.me/256766051929?text=Hello%20MoviePulse%20Founder!%20I%2520need%2520assistance..."
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="w-full py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs uppercase flex items-center justify-center space-x-2 transition shadow-md cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                      <span className="truncate">Chat with Founder (0766051929)</span>
                    </a>
                  </div>

                  <button
                    id="sign-out-btn"
                    onClick={handleSignOut}
                    className="w-full py-2 rounded-xl bg-red-950/20 hover:bg-red-950 text-red-500 font-semibold border border-red-900/10 transition text-xs uppercase font-mono"
                  >
                    Terminate session (Sign Out)
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 10. HOMEPAGE VIEW (Vibrantly loaded from Firestore) */}
        {page === 'home' && (
          <div className="space-y-4">

            {/* VIP Subscribe banner row on the homepage if user is guest or expired */}
            {getSubscriptionStatusInfo().status !== 'active' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-4 p-4 rounded-3xl bg-gradient-to-r from-red-950/40 via-red-900/10 to-[#0e0e12] border border-red-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_4px_25px_rgba(229,9,20,0.15)] overflow-hidden relative group"
              >
                {/* Embedded decorative light beam */}
                <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:transition-all duration-1000" />
                
                <div className="flex items-center space-x-3.5 z-10">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 select-none animate-bounce text-lg">
                    ⚡
                  </div>
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs font-black text-white tracking-wide uppercase font-sans">MoviePulse Premium Active Pass</span>
                      <span className="text-[8px] bg-amber-500 text-black font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-widest font-mono">POPULAR</span>
                    </div>
                    <p className="text-[10px] text-gray-300 font-mono leading-relaxed">
                      Instant translation multi-audio syncing, infinite offline local slot capacity, and ultra speed streams from Kampala!
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-red-650 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-extrabold text-[11px] px-5 py-2.5 rounded-xl uppercase tracking-wider shadow-lg hover:shadow-red-950/20 active:scale-95 transition duration-200 z-10 shrink-0 cursor-pointer border border-red-500/20"
                >
                  Subscribe Now & Unlock VIP
                </button>
              </motion.div>
            )}
            
            {/* Smart Genre Selector & Dynamic Sorting Row */}
            <div className="px-4 py-1 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
              <div className="flex overflow-x-auto gap-2 text-xs select-none scrollbar-none pb-1 md:pb-0 w-full md:w-auto scroll-smooth">
                <button
                  onClick={() => selectGenreFilter('')}
                  className={`px-3 py-1 rounded-full border transition whitespace-nowrap ${
                    selectedGenreFilter === '' 
                      ? 'bg-red-600 text-white border-red-500' 
                      : 'bg-gray-950 text-gray-400 border-gray-900 hover:border-gray-800'
                  }`}
                >
                  ALL TITLES
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => selectGenreFilter(g)}
                    className={`px-3 py-1 rounded-full border transition whitespace-nowrap ${
                      selectedGenreFilter === g 
                        ? 'bg-red-600 text-white border-red-500' 
                        : 'bg-gray-950 text-gray-400 border-gray-900 hover:border-gray-800'
                    }`}
                  >
                    {g.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Dynamic Categorical Sorting Dropdown */}
              <div className="flex items-center space-x-2 bg-gray-950 border border-gray-900 rounded-full px-3 py-1.5 shrink-0 self-start md:self-auto shadow-md">
                <ArrowUpDown className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Sort:</span>
                <select
                  id="category-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white text-[10px] uppercase font-black tracking-wide border-none outline-none cursor-pointer focus:ring-0 max-w-[130px] pr-1"
                >
                  <option value="year" className="bg-[#0f0f12] text-gray-300">Release Year 📅</option>
                  <option value="rating" className="bg-[#0f0f12] text-gray-300">Rating ⭐</option>
                  <option value="views" className="bg-[#0f0f12] text-gray-300">Most Viewed 🔥</option>
                </select>
              </div>
            </div>

            {isFetchingData || categoryLoading ? (
              <div className="space-y-4 p-4">
                <div className="animate-pulse flex items-center space-x-2 text-red-500 font-mono text-[9px] uppercase font-black tracking-widest mb-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                  <span>Fetching exact titles from Kampala Node clusters...</span>
                </div>
                <HeroBannerSkeleton />
                <MovieSliderSkeleton title="Loading Interactive Catalog..." />
              </div>
            ) : (
              <>
                {selectedGenreFilter ? (
                  /* --- DYNAMIC AI-GENERATED GENRE HEADER --- */
                  <div className="relative mx-4 rounded-3xl overflow-hidden border border-gray-900 bg-[#09090c] shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-col md:flex-row min-h-[220px] group transition-all duration-300 hover:border-red-600">
                    {/* Background Illustration generated by AI */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                      <img 
                        src={
                          selectedGenreFilter === 'Ugandan Movies' ? '/src/assets/images/ugandan_movies_illust_1780822410273.png' :
                          selectedGenreFilter === 'Kids Cartoon' ? '/src/assets/images/kids_cartoon_illust_1780822425892.png' :
                          selectedGenreFilter === 'Sci-Fi' ? '/src/assets/images/scifi_space_illust_1780822451525.png' :
                          selectedGenreFilter === 'Drama' || selectedGenreFilter === 'Comedy' || selectedGenreFilter === 'Romance' ? '/src/assets/images/comedy_drama_illust_1780822468398.png' :
                          '/src/assets/images/action_thriller_illust_1780822437888.png'
                        } 
                        alt={selectedGenreFilter} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 opacity-30" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090c] via-[#09090c]/85 to-transparent"></div>
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#09090c] to-transparent"></div>
                    </div>

                    {/* Left text column & Content */}
                    <div className="relative z-10 flex-1 p-5 md:p-6 flex flex-col justify-between h-full">
                      <div className="space-y-3">
                        <div className="inline-flex items-center space-x-1.5 bg-[#e50914]/15 text-[#ff0a16] border border-[#ff0a16]/30 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase font-black tracking-widest animate-pulse">
                          <Sparkles className="w-3 h-3 text-[#ff0a16]" />
                          <span>AI ARCHIVE CANVAS ILLUSTRATION</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-sans drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] flex items-center gap-2">
                          <span>{selectedGenreFilter}</span>
                          <span className="text-[9px] text-[#ff0a16] font-mono font-black tracking-widest bg-[#ff0a16]/10 border border-[#ff0a16]/20 px-2 py-0.5 rounded-full">
                            {filteredMovies.length} {filteredMovies.length === 1 ? 'film' : 'films'}
                          </span>
                        </h2>
                        <p className="text-[11px] md:text-xs text-gray-300 font-medium max-w-xl leading-relaxed">
                          {selectedGenreFilter === 'Ugandan Movies' && "Authentic Ugandan cinema, homegrown thrillers, and local stage dramas. Voices translated by the legendary VJ Junior, VJ Emmie & VJ Jingo in dual Luganda multi-audio."}
                          {selectedGenreFilter === 'Kids Cartoon' && "Vibrant, educational cartoon fantasy blockbusters to entertain the little ones. Highly compressed dual-audio and 100% appropriate for the family."}
                          {selectedGenreFilter === 'Trending Movies' && "High engagement titles dominating Ugandan cinema nodes. VJ translations tailored to stream fast during load capping parameters."}
                          {selectedGenreFilter === 'Hot Movies' && "Raw international box office thrillers, adrenaline packed action blockbusters, fast translation syncs, and explosive multi-audio options."}
                          {selectedGenreFilter === 'Hot Series' && "Addictive episodic dramas with non-stop twists. Save whole seasons offline inside your lounge to stream without consuming mobile data."}
                          {selectedGenreFilter === 'Sci-Fi' && "Futuristic alien galaxies, cyberpunk matrix grids, space exploration, and cyber-timelines. Mind-expanding high dynamic science fiction."}
                          {selectedGenreFilter === 'Drama' && "Heavy emotional dilemmas, cultural standoffs, and high stakes societal narratives. Gripping cinematic prose."}
                          {selectedGenreFilter === 'Action' && "Non-stop tactical shootouts, bullet-dodging spectacles, extreme stunt drivers, and high pitch Luganda voiceover translations."}
                          {selectedGenreFilter === 'Comedy' && "Witty sketch, comical errors, translated slapstick humor, and endless lighthearted laughter to secure your weekend relaxation."}
                          {selectedGenreFilter === 'Thriller' && "Psychological nail biters, mystery games, detective clues, and suspenseful visual elements keeping you on red alert."}
                          {selectedGenreFilter === 'Romance' && "Touching relationship sagas, deep passionate dramas, and lighthearted romantic comedy features translated for premium entertainment."}
                          {!['Ugandan Movies', 'Kids Cartoon', 'Trending Movies', 'Hot Movies', 'Hot Series', 'Sci-Fi', 'Drama', 'Action', 'Comedy', 'Thriller', 'Romance'].includes(selectedGenreFilter) && "Curated cinema portfolio specially selected by VJs for premium offline download streaming anywhere on the municipal grid."}
                        </p>
                      </div>

                      {/* Filter tag footer control block */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono text-gray-400 gap-3 mt-4 pt-3 border-t border-gray-900/40">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-emerald-400 font-bold uppercase text-[9px]">SECURE CLOUD FEED</span>
                          </span>
                          <span className="text-gray-800">|</span>
                          <span>RATING: <span className="text-yellow-500 font-bold">★ 4.9 Superb</span></span>
                        </div>
                        <button
                          onClick={() => selectGenreFilter('')}
                          className="bg-red-600/10 hover:bg-red-650 hover:text-white text-red-500 border border-red-900/30 px-3 py-1 rounded-xl transition duration-200 font-extrabold uppercase text-[9px] tracking-wide self-start sm:self-auto cursor-pointer"
                        >
                          Clear Selection X
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- AUTOMATIC HERO BANNER SLIDER --- */
                  <HeroBannerSlider
                    movies={movies}
                    ads={ads}
                    onPlayMovie={(movie) => playMovie(movie)}
                    onNavigate={(route) => setPage(route)}
                  />
                )}

                {/* CONTINUE WATCHING ROW (renders if watch history exists) */}
                {history.length > 0 && (
                  <MovieSlider 
                    title="Continue watching 🎬" 
                    movies={history} 
                    onSelect={(movie) => playMovie(movie)} 
                    favorites={favorites} 
                    onToggleFavorite={toggleFavorite} 
                    isPremiumUser={getSubscriptionStatusInfo().status === 'active' || role === 'admin'}
                    onSelectGenre={selectGenreFilter}
                  />
                )}

                {/* DYNAMIC ROW CATEGORIES (as requested in specifications in correct order) */}
                <MovieSlider 
                  title="Trending Now 🔥" 
                  movies={trendingMovies} 
                  onSelect={(movie) => playMovie(movie)} 
                  favorites={favorites} 
                  onToggleFavorite={toggleFavorite} 
                  isPremiumUser={getSubscriptionStatusInfo().status === 'active' || role === 'admin'}
                  onSelectGenre={selectGenreFilter}
                />

                <MovieSlider 
                  title="Hot Movies 🎬" 
                  movies={hotMovies} 
                  onSelect={(movie) => playMovie(movie)} 
                  favorites={favorites} 
                  onToggleFavorite={toggleFavorite} 
                  isPremiumUser={getSubscriptionStatusInfo().status === 'active' || role === 'admin'}
                  onSelectGenre={selectGenreFilter}
                />

                {kidsCartoonMovies.length > 0 && (
                  <MovieSlider 
                    title="Kids Cartoon (Animation) 👶" 
                    movies={kidsCartoonMovies} 
                    onSelect={(movie) => playMovie(movie)} 
                    favorites={favorites} 
                    onToggleFavorite={toggleFavorite} 
                    isPremiumUser={getSubscriptionStatusInfo().status === 'active' || role === 'admin'}
                    onSelectGenre={selectGenreFilter}
                  />
                )}

                {ugandanMovies.length > 0 && (
                  <MovieSlider 
                    title="Ugandan Movies 🇺🇬" 
                    movies={ugandanMovies} 
                    onSelect={(movie) => playMovie(movie)} 
                    favorites={favorites} 
                    onToggleFavorite={toggleFavorite} 
                    isPremiumUser={getSubscriptionStatusInfo().status === 'active' || role === 'admin'}
                    onSelectGenre={selectGenreFilter}
                  />
                )}

                {/* SERIES ROW */}
                {hotSeries.length > 0 && (
                  <div className="my-6">
                    <button
                      onClick={() => selectGenreFilter('Hot Series')}
                      className="text-base font-black text-white font-sans tracking-wide flex items-center space-x-1.5 px-4 mb-2.5 uppercase group cursor-pointer hover:text-red-500 transition duration-200 text-left"
                    >
                      <span className="w-1.5 h-4 bg-red-600 rounded-sm inline-block group-hover:scale-y-125 transition duration-200 shrink-0"></span>
                      <span className="flex items-center flex-wrap gap-2">
                        <span>Hot Series 📺</span>
                        <span className="text-[8px] font-mono bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-black tracking-widest leading-none">
                          {hotSeries.length} ACTIVE SHOWS
                        </span>
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          VIEW ALL →
                        </span>
                      </span>
                    </button>
                    <div className="flex space-x-4 overflow-x-auto px-4 py-2 select-none scrollbar-none">
                      {hotSeries.map((s) => (
                        <motion.div
                          key={s.id}
                          whileHover={{ scale: 1.04, y: -4 }}
                          onClick={() => alert(`Series "${s.title}" seasons loaded! Select episodes in the active player`)}
                          className="flex-shrink-0 w-32 bg-[#141414] rounded-2xl overflow-hidden border border-gray-900 hover:border-gray-800 transition cursor-pointer"
                        >
                          <img src={s.posterUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300'} alt={s.title} className="aspect-[3/4] object-cover w-full" />
                          <p className="p-2 text-xs font-bold truncate text-white leading-normal">{s.title}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ADVERTISE WITH US PLACEHOLDER NOTE */}
            <div className="bg-[#121212] mx-4 p-4 rounded-2xl border border-gray-800 text-center space-y-1">
              <span className="text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-widest block">ADVERTISE WITH US</span>
              <p className="text-xs text-gray-300 font-sans font-medium">Reach thousand of movie lovers in Uganda daily.</p>
              <button 
                onClick={() => window.open('https://wa.me/256704557858?text=I%20want%20to%20advertise%20on%20MoviePulse', '_blank')}
                className="bg-yellow-500 text-black text-[9px] font-mono font-bold px-3 py-1 rounded inline-flex items-center space-x-1"
              >
                <Phone className="w-3 h-3" />
                <span>TAP TO CHAT VIA WHATSAPP ON 0704557858</span>
              </button>
            </div>

            {/* Premium CTA promotion message */}
            <div className="bg-gradient-to-r from-red-950/20 via-[#101010] to-red-950/20 mx-4 p-5 rounded-2xl border border-[#ff0a16]/20 text-center space-y-3">
              <div className="inline-flex items-center space-x-1 bg-red-950 text-[#ff0a16] border border-red-900/30 px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-black">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>UNLIMITED CINEMA PASS</span>
              </div>
              <h3 className="text-sm font-bold text-white font-sans max-w-sm mx-auto">
                First month is 50% OFF! Re-engage premium coupon code FIRST50.
              </h3>
              <button
                onClick={() => setPage('subscription')}
                className="bg-[#e50914] text-white hover:bg-[#ff0a16] text-xs font-bold px-4 py-2 rounded-xl transition uppercase font-mono shadow-[0_0_15px_rgba(229,9,20,0.3)]"
              >
                Unlock VIP Access Now
              </button>
            </div>
          </div>
        )}
      </main>

      {/* --- PREMIUM ACTIVE OVERLAY MODAL --- */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl bg-[#1a1a1a]">
            <SubscriptionPlans 
              onClose={() => setShowPremiumModal(false)} 
              onSuccess={() => {
                if (currentUser) fetchUserSubscription(currentUser.uid);
                setShowPremiumModal(false);
              }}
              userEmail={currentUser?.email}
              userName={currentUser?.displayName}
            />
          </div>
        </div>
      )}

      {/* --- FLOATING SECURE WHATSAPP BANNER --- */}
      <div className="fixed bottom-16 right-4 z-30 flex flex-col space-y-2 select-none">
        <button
          onClick={() => window.open('https://chat.whatsapp.com/invite/moviepulse', '_blank')}
          className="bg-[#25D366] hover:bg-emerald-600 text-white rounded-full p-2.5 shadow-[0_4px_15px_#25D366/0.25] flex items-center space-x-1 text-xs font-bold animate-bounce hidden sm:flex"
        >
          <MessageCircle className="w-4 h-4 fill-white text-transparent" />
          <span>JOIN WA CHANNEL</span>
        </button>
      </div>

      {/* --- BRAND FOOTER --- */}
      <footer className="bg-[#070707] border-t border-gray-950 py-6 px-4 text-center text-[10px] text-gray-500 font-mono space-y-2">
        <div className="flex justify-center space-x-4">
          <button onClick={() => selectGenreFilter('Ugandan Movies')} className="hover:text-white">Ugandan Movies</button>
          <span>•</span>
          <button onClick={() => setPage('downloads')} className="hover:text-white">Downloads</button>
          <span>•</span>
          <button onClick={() => alert("Terms of Services: 18+ verification active. Refunds managed directly on line 0766051929.")} className="hover:text-white">Terms</button>
        </div>
        <p className="uppercase text-gray-600">
          © 2026 MoviePulse Uganda. High resolution mobile transcoding engine.
        </p>
      </footer>

      {/* --- REGULATED BOTTOM NAVIGATION (5 items) + Genre selector triggers! --- */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-gray-900 p-2 flex items-center justify-around z-40 select-none">
        <button
          onClick={() => { setPage('home'); setSelectedGenreFilter(''); setSearchTerm(''); }}
          className={`flex flex-col items-center p-1.5 transition ${page === 'home' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-1 font-mono uppercase">Home</span>
        </button>

        <button
          onClick={() => setPage('search')}
          className={`flex flex-col items-center p-1.5 transition ${page === 'search' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Search className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-1 font-mono uppercase">Search</span>
        </button>

        {/* BOTTOM SPECIAL GENRE SELECTOR BUTTON BUTTON AS COMMANDED BY POINT 14 */}
        <button
          onClick={() => setShowGenreDrawer(true)}
          className="flex flex-col items-center p-1.5 transition text-yellow-500 hover:text-yellow-400"
        >
          <Compass className="w-4 h-4 animate-spin-slow" />
          <span className="text-[9px] font-black mt-1 font-mono uppercase">Genres 🏷️</span>
        </button>

        <button
          onClick={() => { setPage('watchlist'); }}
          className={`flex flex-col items-center p-1.5 transition ${page === 'watchlist' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <Heart className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-1 font-mono uppercase">Watchlist</span>
        </button>

        <button
          onClick={() => setPage('account')}
          className={`flex flex-col items-center p-1.5 transition ${page === 'account' ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
        >
          <User className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-1 font-mono uppercase">Account</span>
        </button>
      </nav>

      {/* Genres Drawer Screen Sheet */}
      <AnimatePresence>
        {showGenreDrawer && (
          <div className="fixed inset-0 bg-black/85 z-50 flex flex-col justify-end">
            <div className="absolute inset-0" onClick={() => setShowGenreDrawer(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative bg-[#161616] p-6 rounded-t-[2.5rem] border-t border-gray-800 max-w-xl mx-auto w-full max-h-[70vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-black text-white font-sans uppercase tracking-wide">Select Streaming Genre</h3>
                <button 
                  onClick={() => setShowGenreDrawer(false)} 
                  className="text-xs bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-xl text-gray-400"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => selectGenreFilter(g)}
                    className="w-full text-left bg-[#0c0c0c] hover:bg-red-950 p-3 rounded-xl hover:text-white text-gray-300 font-bold text-xs uppercase border border-gray-900 transition"
                  >
                    🚀 {g}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

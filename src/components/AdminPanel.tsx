import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Shield, PlusCircle, Trash2, List, Play, Award, Tv, ArrowUpRight, FolderPlus, HelpCircle, HardDrive, BellRing, Smartphone, Check, UserCheck, UserX, Clock, Calendar } from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'stats' | 'movies' | 'series' | 'ads' | 'notif' | 'subs'>('stats');

  // Stats indicators
  const [totalUsers, setTotalUsers] = useState(1);
  const [activeSubs, setActiveSubs] = useState(0);
  const [estRevenue, setEstRevenue] = useState(0);
  const [movieCount, setMovieCount] = useState(0);
  const [seriesCount, setSeriesCount] = useState(0);

  // Lists loader
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [adsList, setAdsList] = useState<any[]>([]);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Forms
  const [movieForm, setMovieForm] = useState({
    title: '',
    vj: '',
    description: '',
    genres: 'Action',
    videoUrl: '',
    trailerUrl: '',
    posterUrl: '',
    backdropUrl: '',
    releaseYear: 2026,
    duration: '2h 10m',
    quality: 'HD',
    isPremium: false,
    isAdult: false,
    trendingBadge: '#1 in Uganda',
  });

  const [seriesForm, setSeriesForm] = useState({
    title: '',
    description: '',
    genres: 'Drama',
    posterUrl: '',
    backdropUrl: '',
    releaseYear: 2026,
    isPremium: false,
    trendingBadge: 'New Episode',
  });

  const [episodeForm, setEpisodeForm] = useState({
    seriesId: '',
    season: 1,
    episodeNumber: 1,
    title: '',
    description: '',
    videoUrl: '',
    duration: '45m',
    thumbnailUrl: '',
  });

  const [adForm, setAdForm] = useState({
    title: 'Advertise With MoviePulse',
    targetUrl: 'https://wa.me/256704557858',
    imageUrl: '',
    position: 'homepage_banner',
  });

  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    // 1. Instantly load from localStorage fallback to prevent empty state
    try {
      const cachedMov = localStorage.getItem('MP_LOCAL_MOVIES');
      if (cachedMov) {
        const arr = JSON.parse(cachedMov);
        setMoviesList(arr);
        setMovieCount(arr.length);
      }
      const cachedSer = localStorage.getItem('MP_LOCAL_SERIES');
      if (cachedSer) {
        const arr = JSON.parse(cachedSer);
        setSeriesList(arr);
        setSeriesCount(arr.length);
      }
      const cachedAds = localStorage.getItem('MP_LOCAL_ADS');
      if (cachedAds) {
        const arr = JSON.parse(cachedAds);
        setAdsList(arr);
      }
      const cachedNotif = localStorage.getItem('MP_LOCAL_NOTIFICATIONS');
      if (cachedNotif) {
        setNotifList(JSON.parse(cachedNotif));
      }
      const cachedSubs = localStorage.getItem('MP_LOCAL_SUBSCRIPTIONS');
      if (cachedSubs) {
        const arr = JSON.parse(cachedSubs);
        setSubscriptionsList(arr);
        const now = new Date();
        const activeCount = arr.filter((s: any) => s.status === 'active' && new Date(s.expiresAt) > now).length;
        const rev = arr.filter((s: any) => s.status === 'active').reduce((acc: number, item: any) => acc + (item.price || 0), 0);
        setActiveSubs(activeCount);
        setEstRevenue(rev);
      }
    } catch (err) {
      console.warn("Failed loading Admin fallback cache:", err);
    }

    try {
      // Movies count
      const moviesSnap = await getDocs(collection(db, 'movies'));
      const moviesArr: any[] = [];
      moviesSnap.forEach((doc) => {
        moviesArr.push({ id: doc.id, ...doc.data() });
      });
      setMoviesList(moviesArr);
      setMovieCount(moviesArr.length);
      localStorage.setItem('MP_LOCAL_MOVIES', JSON.stringify(moviesArr));

      // Series catalog
      const seriesSnap = await getDocs(collection(db, 'series'));
      const seriesArr: any[] = [];
      seriesSnap.forEach((doc) => {
        seriesArr.push({ id: doc.id, ...doc.data() });
      });
      setSeriesList(seriesArr);
      setSeriesCount(seriesArr.length);
      localStorage.setItem('MP_LOCAL_SERIES', JSON.stringify(seriesArr));

      // Ads catalog
      const adsSnap = await getDocs(collection(db, 'ads'));
      const adsArr: any[] = [];
      adsSnap.forEach((doc) => {
        adsArr.push({ id: doc.id, ...doc.data() });
      });
      setAdsList(adsArr);
      localStorage.setItem('MP_LOCAL_ADS', JSON.stringify(adsArr));

      // Notifications catalog
      const notifSnap = await getDocs(collection(db, 'notifications'));
      const notifArr: any[] = [];
      notifSnap.forEach((doc) => {
        notifArr.push({ id: doc.id, ...doc.data() });
      });
      setNotifList(notifArr);
      localStorage.setItem('MP_LOCAL_NOTIFICATIONS', JSON.stringify(notifArr));

      // Fetch user profiles log
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersArr: any[] = [];
      usersSnap.forEach((doc) => {
        usersArr.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(usersArr);

      // Fetch subscriptions database log
      const subSnap = await getDocs(collection(db, 'subscriptions'));
      const subsArr: any[] = [];
      let rev = 0;
      let activeCount = 0;
      const now = new Date();
      subSnap.forEach(d => {
        const sub = d.data();
        subsArr.push({ id: d.id, ...sub });
        if (sub.status === 'active') {
          rev += sub.price || 0;
          if (new Date(sub.expiresAt) > now) {
            activeCount++;
          }
        }
      });
      
      // Sort subscriptions newest first
      subsArr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSubscriptionsList(subsArr);
      setActiveSubs(activeCount);
      setEstRevenue(rev);
      setTotalUsers(Math.max(usersArr.length, subsArr.length + 1));
      localStorage.setItem('MP_LOCAL_SUBSCRIPTIONS', JSON.stringify(subsArr));

    } catch (e) {
      console.warn("Could not fetch catalogs of database or in sandbox mode. Details: ", e);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const addMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieForm.title || !movieForm.videoUrl) {
      setErrorMsg('Title and Video Stream URL must be filled.');
      return;
    }
    const newMovie = {
      ...movieForm,
      rating: 4.8,
      ratingCount: 1,
      views: 12,
      genres: movieForm.genres.split(',').map(s => s.trim()),
      createdAt: new Date().toISOString()
    };
    
    // Save to device backup first
    try {
      const stored = localStorage.getItem('MP_LOCAL_MOVIES');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({ id: `local_mov_${Date.now()}`, ...newMovie });
      localStorage.setItem('MP_LOCAL_MOVIES', JSON.stringify(list));
    } catch (err) {
      console.warn("Local storage write skipped:", err);
    }

    try {
      await addDoc(collection(db, 'movies'), newMovie);
      showSuccess(`Movie "${movieForm.title}" uploaded secure to stream catalog!`);
      fetchCatalogs();
      setMovieForm({ ...movieForm, title: '', videoUrl: '', trailerUrl: '', vj: '' });
    } catch (e) {
      console.warn("Firestore offline backup: ", e);
      showSuccess(`Movie "${movieForm.title}" saved successfully to Local Storage!`);
      fetchCatalogs();
      setMovieForm({ ...movieForm, title: '', videoUrl: '', trailerUrl: '', vj: '' });
    }
  };

  const addSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesForm.title) {
      setErrorMsg('Series title is required.');
      return;
    }
    const newSeries = {
      ...seriesForm,
      rating: 4.5,
      genres: seriesForm.genres.split(',').map(s => s.trim()),
      createdAt: new Date().toISOString()
    };

    // Save to device backup first
    try {
      const stored = localStorage.getItem('MP_LOCAL_SERIES');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({ id: `local_ser_${Date.now()}`, ...newSeries });
      localStorage.setItem('MP_LOCAL_SERIES', JSON.stringify(list));
    } catch (err) {
      console.warn("Local storage write skipped:", err);
    }

    try {
      await addDoc(collection(db, 'series'), newSeries);
      showSuccess(`TV Series "${seriesForm.title}" added to directory successfully!`);
      fetchCatalogs();
      setSeriesForm({ ...seriesForm, title: '', posterUrl: '', backdropUrl: '' });
    } catch (e) {
      console.warn("Firestore offline backup: ", e);
      showSuccess(`TV Series "${seriesForm.title}" saved successfully to Local Storage!`);
      fetchCatalogs();
      setSeriesForm({ ...seriesForm, title: '', posterUrl: '', backdropUrl: '' });
    }
  };

  const addEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!episodeForm.seriesId || !episodeForm.title || !episodeForm.videoUrl) {
      setErrorMsg('Select Series, enter Title and Episode Stream URL.');
      return;
    }
    const newEpisode = {
      ...episodeForm,
      views: 0,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'episodes'), newEpisode);
      showSuccess(`Episode "${episodeForm.title}" added to Series catalog!`);
      setEpisodeForm({ ...episodeForm, title: '', videoUrl: '' });
    } catch (e) {
      setErrorMsg(`Firestore setup active: ${String(e)}`);
    }
  };

  const addAdInput = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAd = {
      ...adForm,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Save locally
    try {
      const stored = localStorage.getItem('MP_LOCAL_ADS');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({ id: `local_ad_${Date.now()}`, ...newAd });
      localStorage.setItem('MP_LOCAL_ADS', JSON.stringify(list));
    } catch (err) {
      console.warn("Local storage ad write skipped:", err);
    }

    try {
      await addDoc(collection(db, 'ads'), newAd);
      showSuccess('Ad placement entry configured!');
      fetchCatalogs();
    } catch (e) {
      console.warn("Firestore ads offline backup: ", e);
      showSuccess('Ad placement entry configured locally!');
      fetchCatalogs();
    }
  };

  const addNotificationInput = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) return;
    const newNotif = {
      ...notifForm,
      userScope: 'all',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // Save locally
    try {
      const stored = localStorage.getItem('MP_LOCAL_NOTIFICATIONS');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({ id: `local_not_${Date.now()}`, ...newNotif });
      localStorage.setItem('MP_LOCAL_NOTIFICATIONS', JSON.stringify(list));
    } catch (err) {
      console.warn("Local storage notification write skipped:", err);
    }

    try {
      await addDoc(collection(db, 'notifications'), newNotif);
      showSuccess('Notification broadcasted to all logged-in accounts!');
      fetchCatalogs();
      setNotifForm({ title: '', message: '' });
    } catch (e) {
      console.warn("Firestore notifications offline backup: ", e);
      showSuccess('Notification broadcasted locally!');
      fetchCatalogs();
      setNotifForm({ title: '', message: '' });
    }
  };

  const deleteDocument = async (collName: string, id: string) => {
    // Sync local deletion
    try {
      if (collName === 'movies') {
        const stored = localStorage.getItem('MP_LOCAL_MOVIES');
        if (stored) {
          const list = JSON.parse(stored).filter((m: any) => m.id !== id);
          localStorage.setItem('MP_LOCAL_MOVIES', JSON.stringify(list));
        }
      } else if (collName === 'series') {
        const stored = localStorage.getItem('MP_LOCAL_SERIES');
        if (stored) {
          const list = JSON.parse(stored).filter((s: any) => s.id !== id);
          localStorage.setItem('MP_LOCAL_SERIES', JSON.stringify(list));
        }
      } else if (collName === 'ads') {
        const stored = localStorage.getItem('MP_LOCAL_ADS');
        if (stored) {
          const list = JSON.parse(stored).filter((a: any) => a.id !== id);
          localStorage.setItem('MP_LOCAL_ADS', JSON.stringify(list));
        }
      } else if (collName === 'notifications') {
        const stored = localStorage.getItem('MP_LOCAL_NOTIFICATIONS');
        if (stored) {
          const list = JSON.parse(stored).filter((n: any) => n.id !== id);
          localStorage.setItem('MP_LOCAL_NOTIFICATIONS', JSON.stringify(list));
        }
      }
    } catch (err) {
      console.warn("Failed delete local storage item:", err);
    }

    try {
      await deleteDoc(doc(db, collName, id));
      showSuccess(`Item deleted from collection ${collName}.`);
      fetchCatalogs();
    } catch (e) {
      console.warn("Could not delete from remote database, deleted locally instead:", e);
      showSuccess(`Item deleted successfully (Device Cache sync)!`);
      fetchCatalogs();
    }
  };

  // Populate Uganda Demo Package so testing stream is easy!
  const initializeUgandaDemoData = async () => {
    try {
      // 1. Movie 1: Bed of Thorns
      await addDoc(collection(db, 'movies'), {
        title: 'Bed of Thorns (Drama)',
        description: 'An emotional cinematic masterpiece depicting relationship vulnerabilities and family healing among Kampala residents. Inspired by real events.',
        genres: ['Drama', 'Romance'],
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=400',
        backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
        releaseYear: 2025,
        duration: '1h 55m',
        quality: 'FHD',
        isPremium: false,
        isAdult: false,
        rating: 4.9,
        ratingCount: 34,
        views: 180,
        trendingBadge: 'Hot Today',
        createdAt: new Date().toISOString()
      });

      // 2. Movie 2 (Premium Hollywood): Cosmic Eclipse
      await addDoc(collection(db, 'movies'), {
        title: 'Sanyu - Season 1 (Series)',
        description: 'Follow the exciting story of Sanyu, a sweet rural girl taken to work for a wealthy Kampala household. Fully optimized stream speed.',
        genres: ['Drama'],
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=400',
        backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800',
        releaseYear: 2026,
        duration: 'Season Trailer',
        quality: 'FHD',
        isPremium: true,
        isAdult: false,
        rating: 4.8,
        ratingCount: 22,
        views: 290,
        trendingBadge: 'Hot Today',
        createdAt: new Date().toISOString()
      });

      // 3. Movie 3: Escape Plan
      await addDoc(collection(db, 'movies'), {
        title: 'Escape Plan (Action Sci-Fi)',
        description: 'A suspense-driven post-apocalyptic cinematic thriller optimized for mobile viewing on low-data packages.',
        genres: ['Trending Movies', 'Action', 'Sci-Fi'],
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
        backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
        releaseYear: 2026,
        duration: '2h 15m',
        quality: 'HD',
        isPremium: true,
        isAdult: false,
        rating: 4.7,
        ratingCount: 15,
        views: 89,
        trendingBadge: 'Most Watched',
        createdAt: new Date().toISOString()
      });

      // 4. Premium Action Video: Osiris
      await addDoc(collection(db, 'movies'), {
        title: 'Osiris',
        description: 'An intense futuristic action thriller following a genetically enhanced special forces operative navigating high-risk cyber cyber war zones.',
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
      });

      // 5. Horror Spotlight: DeadTime
      await addDoc(collection(db, 'movies'), {
        title: 'DeadTime',
        description: 'A spine-chilling supernatural thriller following mysterious cursed events unfolding at a remote forest during midnight intervals.',
        genres: ['Horror', 'Trending Movies', 'Hot Movies'],
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
        trendingBadge: 'Hot Today',
        createdAt: new Date().toISOString()
      });

      // 6. Action Blockbuster: Unstoppable Robots
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 7: Protect and Serve
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 8: The Warrior Cop
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 9: Idiots
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 10: Sniper Battle
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 11: A Walk to Remember
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 12: Enter the Fat Dragon
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 13: Cleaner
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 14: Black Mark
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 15: The Eye
      await addDoc(collection(db, 'movies'), {
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
      });

      // New Movie 16: Homeless to Harvard
      await addDoc(collection(db, 'movies'), {
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
      });

      // 17. Movie 17 (18+ Adult Zone): Midnight Shadows
      await addDoc(collection(db, 'movies'), {
        title: 'Midnight Shadows (Strict 18+)',
        description: 'A psychological noir romantic thriller reserved entirely for adult viewers with verified voucher access codes.',
        genres: ['Adult', '18+', 'Thriller'],
        isAdult: true,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        trailerUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800',
        releaseYear: 2025,
        duration: '1h 48m',
        quality: 'HD',
        isPremium: true,
        rating: 4.3,
        ratingCount: 8,
        views: 45,
        trendingBadge: 'Hot Today',
        createdAt: new Date().toISOString()
      });

      // Series 1: Kampala Chronicle
      const seriesRef = await addDoc(collection(db, 'series'), {
        title: 'Kampala Chronicle (Hot Series)',
        description: 'Super-paced political drama set within the heart of Kampala metropolitan councils.',
        genres: ['Hot Series', 'Drama'],
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400',
        backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
        releaseYear: 2026,
        isPremium: false,
        trendingBadge: 'New Episode',
        createdAt: new Date().toISOString()
      });

      // Episodes for Series 1
      await addDoc(collection(db, 'episodes'), {
        seriesId: seriesRef.id,
        season: 1,
        episodeNumber: 1,
        title: 'Ep 1: The Masaka Incursion',
        description: 'Tensions rise as political forces relocate to rural masaka councils.',
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        duration: '45m',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300',
        views: 121,
        createdAt: new Date().toISOString()
      });

      // Homepage Config Default welcome message
      await setDoc(doc(db, 'homepage_config', 'global_settings'), {
        welcomeMessage: "Webaale kussaako! Welcome to MoviePulse Uganda. Watch unlimited movies with zero buffering speeds.",
        featuredAdsEnabled: true
      });

      showSuccess('Beautiful Ugandan demo cinema database successfully seeded! Refreshing...');
      fetchCatalogs();
    } catch (e) {
      setErrorMsg("Seeding failed: " + e);
    }
  };

  const wipeAllData = async () => {
    if (confirm("Are you absolutely sure you want to clean up current movies and reset the cinema directory?")) {
      try {
        moviesList.forEach(m => deleteDocument('movies', m.id));
        seriesList.forEach(s => deleteDocument('series', s.id));
        adsList.forEach(ad => deleteDocument('ads', ad.id));
        notifList.forEach(n => deleteDocument('notifications', n.id));
        showSuccess('Cleaned and exited cinema catalog! The site is now completely empty.');
      } catch (e) {
        setErrorMsg('Clear failed: ' + e);
      }
    }
  };

  const getDurationHoursForPlan = (planName: string) => {
    const p = planName.toLowerCase();
    if (p.includes('hour') || p.includes('⚡')) return 1;
    if (p.includes('low-data') || p.includes('📶')) return 24;
    if (p.includes('single') || p.includes('🎬')) return 12;
    if (p.includes('daily') || p.includes('📅')) return 24;
    if (p.includes('weekly') || p.includes('📆')) return 168;
    if (p.includes('monthly') || p.includes('🔥')) return 720;
    return 720; // fallback 30 days
  };

  const approveSubscriptionCustom = async (sub: any, overrideHours?: number) => {
    try {
      const docRef = doc(db, 'subscriptions', sub.id);
      const hours = overrideHours || getDurationHoursForPlan(sub.planName);
      await updateDoc(docRef, {
        status: 'active',
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
      });
      showSuccess(`Subscription of "${sub.userName || 'Subscriber'}" verified successfully! Active for ${hours} hours.`);
      fetchCatalogs();
    } catch (e) {
      setErrorMsg(`Approval failed: ${e}`);
    }
  };

  const rejectSubscription = async (subId: string) => {
    try {
      const docRef = doc(db, 'subscriptions', subId);
      await updateDoc(docRef, {
        status: 'rejected'
      });
      showSuccess(`Payment proof request declined.`);
      fetchCatalogs();
    } catch (e) {
      setErrorMsg(`Rejection failed: ${e}`);
    }
  };

  const extendSubscription = async (sub: any, extraDays: number) => {
    try {
      const docRef = doc(db, 'subscriptions', sub.id);
      const currentExpiry = new Date(sub.expiresAt || Date.now());
      const newExpiry = new Date(currentExpiry.getTime() + extraDays * 24 * 60 * 60 * 1000);
      await updateDoc(docRef, {
        expiresAt: newExpiry.toISOString(),
        status: 'active'
      });
      showSuccess(`Extended subscription of "${sub.userName || 'Subscriber'}" by +${extraDays} days successfully.`);
      fetchCatalogs();
    } catch (e) {
      setErrorMsg(`Extension failed: ${e}`);
    }
  };

  const banUserAccount = async (userId: string, currentStatus?: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
      await updateDoc(userRef, {
        status: newStatus
      });
      showSuccess(`User profile account modified status to: ${newStatus.toUpperCase()}`);
      fetchCatalogs();
    } catch (e) {
      setErrorMsg(`User status modify failed: ${e}`);
    }
  };

  return (
    <div className="bg-[#141414] rounded-3xl border border-gray-800 p-4 md:p-6 shadow-2xl max-w-4xl mx-auto text-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-6 gap-3">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-[#ff0a16]/10 text-[#ff0a16] border border-[#ff0a16]/20 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest font-black">
            <Shield className="w-3.5 h-3.5" />
            <span>SECURE COMMAND DASHBOARD</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black mt-1 text-white">MoviePulse CMS Operator</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={initializeUgandaDemoData}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-[10px] uppercase px-3 py-2 rounded-xl transition shadow flex items-center space-x-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Initialize Uganda Demo Data</span>
          </button>
          <button
            onClick={wipeAllData}
            className="bg-red-950 text-red-500 hover:bg-red-900 font-mono font-bold text-[10px] uppercase px-3 py-2 rounded-xl transition border border-red-900/20"
          >
            ✕ Wipe Databases
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 p-3 rounded-lg text-xs mb-4 flex items-center space-x-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/20 text-red-400 border border-red-900/30 p-3 rounded-lg text-xs mb-4">
          {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6 overflow-x-auto text-xs font-semibold gap-1">
        {[
          { key: 'stats', label: '📊 OPERATIONAL STATS', icon: List },
          { key: 'subs', label: '💵 PAYMENTS & SUBSCRIBERS', icon: Award },
          { key: 'movies', label: '🎬 ADD NEW MOVIE', icon: Play },
          { key: 'series', label: '📺 ADD TV SERIES', icon: Tv },
          { key: 'ads', label: '📢 BILLBOARDS / ADS', icon: Smartphone },
          { key: 'notif', label: '🔔 ALERT NOTIFICATION', icon: BellRing },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2.5 px-3 whitespace-nowrap rounded-t-xl transition-all duration-200 border-b-2 flex items-center space-x-1.5 ${
                isSelected
                  ? 'border-red-600 text-white bg-[#1c1c1c]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-mono text-gray-500 block uppercase">Total active viewers</span>
              <span className="text-xl font-black text-white">{totalUsers}</span>
            </div>
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-mono text-gray-500 block uppercase">Active VIP Accounts</span>
              <span className="text-xl font-black text-yellow-500">{activeSubs}</span>
            </div>
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-mono text-gray-500 block uppercase">Estimated revenue (UGX)</span>
              <span className="text-xl font-black text-emerald-500">UGX {estRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-[#0c0c0c] p-4 rounded-xl border border-gray-800">
              <span className="text-[10px] font-mono text-gray-500 block uppercase">Cinema Catalog count</span>
              <span className="text-xl font-black text-red-500">{movieCount + seriesCount} items</span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold font-mono uppercase text-gray-400 mb-2">Cinema Databases Entries Log</h3>
            <div className="bg-[#0c0c0c] rounded-xl border border-gray-800 max-h-[250px] overflow-y-auto divide-y divide-gray-900 text-xs">
              {moviesList.length === 0 && seriesList.length === 0 ? (
                <p className="p-4 text-gray-600 text-center font-mono">No films or epics uploaded. Website empty for launch!</p>
              ) : (
                <>
                  {moviesList.map((movie) => (
                    <div key={movie.id} className="p-3 flex justify-between items-center hover:bg-[#111]">
                      <div>
                        <span className="text-[8px] bg-red-950 text-[#ff0a16] px-1 rounded mr-1">MOVIE</span>
                        <span className="text-gray-300 font-bold">{movie.title}</span>
                      </div>
                      <button
                        onClick={() => deleteDocument('movies', movie.id)}
                        className="text-red-500 hover:text-red-400 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {seriesList.map((series) => (
                    <div key={series.id} className="p-3 flex justify-between items-center hover:bg-[#111]">
                      <div>
                        <span className="text-[8px] bg-purple-950 text-[#d946ef] px-1 rounded mr-1">SERIES</span>
                        <span className="text-gray-300 font-bold">{series.title}</span>
                      </div>
                      <button
                        onClick={() => deleteDocument('series', series.id)}
                        className="text-red-500 hover:text-red-400 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Movies Tab */}
      {activeTab === 'movies' && (
        <form onSubmit={addMovie} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block mb-1 font-bold">Movie Title</label>
              <input
                type="text"
                value={movieForm.title}
                onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                placeholder="e.g. Bed of Thorns"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Video CDN URL link</label>
              <input
                type="text"
                value={movieForm.videoUrl}
                onChange={(e) => setMovieForm({ ...movieForm, videoUrl: e.target.value })}
                placeholder="Direct MP4 / streaming URL link"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Trailer Video URL (Optional)</label>
              <input
                type="text"
                value={movieForm.trailerUrl}
                onChange={(e) => setMovieForm({ ...movieForm, trailerUrl: e.target.value })}
                placeholder="Video reference url"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">VJ Movie Host / Translator (e.g. Vj Junior)</label>
              <input
                type="text"
                value={movieForm.vj}
                onChange={(e) => setMovieForm({ ...movieForm, vj: e.target.value })}
                placeholder="e.g. Vj Junior or leave blank"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Categories / Genres (Comma separated)</label>
              <input
                type="text"
                value={movieForm.genres}
                onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                placeholder="Trending Movies, Ugandan Movies, Action"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Portrait Poster Image URL</label>
              <input
                type="text"
                value={movieForm.posterUrl}
                onChange={(e) => setMovieForm({ ...movieForm, posterUrl: e.target.value })}
                placeholder="Image URL link or leave blank for dynamic Unsplash"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Landscape Backdrop banner URL</label>
              <input
                type="text"
                value={movieForm.backdropUrl}
                onChange={(e) => setMovieForm({ ...movieForm, backdropUrl: e.target.value })}
                placeholder="Backdrop URL link"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>

            <div>
              <label className="block mb-1 font-bold">Ugandan Tag Overlay Badge</label>
              <select
                value={movieForm.trendingBadge}
                onChange={(e) => setMovieForm({ ...movieForm, trendingBadge: e.target.value })}
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              >
                <option value="#1 in Uganda">#1 in Uganda 🇺🇬</option>
                <option value="Hot Today">Hot Today 🔥</option>
                <option value="Most Watched">Most Watched 🎬</option>
                <option value="New Release">New Release ⏳</option>
              </select>
            </div>

            {/* Premium vs Restricted toggles */}
            <div className="flex space-x-6 items-center pt-5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={movieForm.isPremium}
                  onChange={(e) => setMovieForm({ ...movieForm, isPremium: e.target.checked })}
                  className="accent-red-600 rounded"
                />
                <span className="font-bold text-yellow-500">Premium Locked</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={movieForm.isAdult}
                  onChange={(e) => setMovieForm({ ...movieForm, isAdult: e.target.checked })}
                  className="accent-red-600 rounded"
                />
                <span className="font-bold text-red-500">🔞 18+ Restricted (Adult)</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition text-xs uppercase"
            >
              Upload Cinema Release Film
            </button>
          </div>
        </form>
      )}

      {/* TV Series Tab */}
      {activeTab === 'series' && (
        <div className="space-y-6">
          <form onSubmit={addSeries} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block mb-1 font-bold">Series Cover Title</label>
                <input
                  type="text"
                  value={seriesForm.title}
                  onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                  placeholder="e.g. Damascus: Sanyu Chapter"
                  className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
                />
              </div>

              <div>
                <label className="block mb-1 font-bold">Genres (Comma split)</label>
                <input
                  type="text"
                  value={seriesForm.genres}
                  onChange={(e) => setSeriesForm({ ...seriesForm, genres: e.target.value })}
                  placeholder="Hot Series, Drama, Comedy"
                  className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs uppercase"
            >
              Add TV Series Container
            </button>
          </form>

          {/* Episode upload sub-form */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm font-bold font-mono text-purple-400 mb-3 uppercase">Upload Episode linked to TV Series</h3>
            <form onSubmit={addEpisode} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 font-bold">Linked Series *</label>
                  <select
                    value={episodeForm.seriesId}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, seriesId: e.target.value })}
                    className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
                  >
                    <option value="">Select TV Series</option>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold">Episode Title</label>
                  <input
                    type="text"
                    value={episodeForm.title}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                    placeholder="e.g. Ep 1: Masaka Councils"
                    className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold">Episode video stream link</label>
                  <input
                    type="text"
                    value={episodeForm.videoUrl}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, videoUrl: e.target.value })}
                    placeholder="Direct stream mp4/cdn URL"
                    className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold">Season Number</label>
                  <input
                    type="number"
                    value={episodeForm.season}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, season: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-bold">Episode Number</label>
                  <input
                    type="number"
                    value={episodeForm.episodeNumber}
                    onChange={(e) => setEpisodeForm({ ...episodeForm, episodeNumber: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase"
              >
                Upload Episode
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === 'ads' && (
        <form onSubmit={addAdInput} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block mb-1 font-bold">Ad Title / Sponsor Note</label>
              <input
                type="text"
                value={adForm.title}
                onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                placeholder="Advertise With us - 0704557858"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold">WhatsApp Action Link</label>
              <input
                type="text"
                value={adForm.targetUrl}
                onChange={(e) => setAdForm({ ...adForm, targetUrl: e.target.value })}
                placeholder="https://wa.me/256704557858"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-yellow-600 text-black font-extrabold rounded-xl text-xs uppercase hover:bg-yellow-500"
          >
            Create Advertising placeholder
          </button>
        </form>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notif' && (
        <form onSubmit={addNotificationInput} className="space-y-4">
          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block mb-1 font-bold">Notification Header Title</label>
              <input
                type="text"
                value={notifForm.title}
                onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                placeholder="e.g. Sanyu New Episodes Out"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800"
              />
            </div>
            <div>
              <label className="block mb-1 font-bold">Detailed Message Body</label>
              <textarea
                value={notifForm.message}
                onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                placeholder="Enter detail notification alerts body"
                className="w-full bg-[#0a0a0a] rounded-lg px-3 py-2 text-white border border-gray-800 h-24"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs uppercase"
          >
            Broadcast Notification Alert
          </button>
        </form>
      )}

      {/* Subscriptions & User Management Tab */}
      {activeTab === 'subs' && (
        <div className="space-y-6">
          <div className="border border-yellow-500/20 bg-yellow-500/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-white font-sans uppercase">💵 Manual Payment Verification Deck</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Review submitted transaction codes, verify with MTN MoMo (*165#) or Airtel Money (*185#) records, and activate subscriptions or adjust user ban states instantly.
              </p>
            </div>
            <button
              onClick={fetchCatalogs}
              className="bg-gray-800 hover:bg-gray-700 text-xs font-mono font-bold uppercase py-1.5 px-4 rounded-xl shrink-0"
            >
              🔄 Refresh List
            </button>
          </div>

          {/* Table of user records & approvals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side: Pending payments queue */}
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl p-4">
              <h4 className="text-xs font-black text-red-500 uppercase font-sans mb-3 flex items-center space-x-1">
                <span className="w-1.5 h-3 bg-red-600 rounded-sm inline-block"></span>
                <span>Pending Verification Queue ({subscriptionsList.filter(s => s.status === 'pending_verification').length})</span>
              </h4>
              
              {subscriptionsList.filter(s => s.status === 'pending_verification').length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-[10px]">
                  ☕ NO PENDING PAYMENT REQUESTS SUBMITTED.
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionsList.filter(s => s.status === 'pending_verification').map((sub) => (
                    <div key={sub.id} className="bg-[#121212] border border-gray-800 p-3 rounded-xl flex flex-col justify-between gap-2.5">
                      <div className="text-xs font-mono">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-white text-[11px] uppercase">{sub.userName || 'Guest User'}</span>
                          <span className="text-[9px] bg-yellow-950 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {sub.paymentMethod || 'MoMo'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Email: {sub.userEmail || 'No email'}</p>
                        <p className="text-[10px] text-gray-400">Phone: <span className="font-semibold text-gray-200">{sub.userPhone}</span></p>
                        <p className="text-[10px] text-gray-400">Selected: <span className="text-red-500 font-black">{sub.planName}</span></p>
                        
                        <div className="bg-black/40 border border-gray-900 px-2 py-1.5 my-2 rounded max-w-full font-black text-[10px] flex items-center justify-between text-yellow-500">
                          <span>TRANS REF:</span>
                          <span className="select-all tracking-wider font-sans uppercase font-bold">{sub.transactionId}</span>
                        </div>
                        
                        <p className="text-[9px] text-gray-500">Submitted at: {new Date(sub.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] font-mono">
                        <button
                          onClick={() => approveSubscriptionCustom(sub)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded uppercase"
                        >
                          ✅ ACTIVATE
                        </button>
                        <button
                          onClick={() => rejectSubscription(sub.id)}
                          className="bg-black border border-gray-800 hover:bg-red-950 text-red-500 font-bold py-1.5 px-3 rounded uppercase"
                        >
                          ✕ DECLINE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side: Active subscriptions list */}
            <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl p-4">
              <h4 className="text-xs font-black text-emerald-500 uppercase font-sans mb-3 flex items-center space-x-1">
                <span className="w-1.5 h-3 bg-emerald-600 rounded-sm inline-block"></span>
                <span>Active Premium VIP Subscribers ({subscriptionsList.filter(s => s.status === 'active').length})</span>
              </h4>
              
              {subscriptionsList.filter(s => s.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-[10px]">
                  No active premium members on Firestore database yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {subscriptionsList.filter(s => s.status === 'active').map((sub) => {
                    const expiry = new Date(sub.expiresAt);
                    const now = new Date();
                    const isExpired = expiry <= now;
                    return (
                      <div key={sub.id} className="bg-[#121212] border border-gray-800/60 p-3 rounded-xl text-xs font-mono">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-[#f1f1f1] uppercase">{sub.userName || 'Subbed User'}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isExpired ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>
                            {isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 h-4">Plan: <span className="font-semibold text-gray-200">{sub.planName}</span></p>
                        <p className="text-[10px] text-gray-400">Phone ref: {sub.userPhone}</p>
                        <p className="text-[10px] text-gray-500 mb-2">Expires: {expiry.toLocaleString()}</p>
                        
                        <div className="flex items-center space-x-1 text-[8px] font-mono justify-end">
                          <span className="text-[9px] text-gray-400 uppercase mr-1">Extend subscription:</span>
                          <button
                            onClick={() => extendSubscription(sub, 1)}
                            className="bg-gray-800 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded uppercase"
                          >
                            +1 Day
                          </button>
                          <button
                            onClick={() => extendSubscription(sub, 7)}
                            className="bg-gray-800 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded uppercase"
                          >
                            +7 Days
                          </button>
                          <button
                            onClick={() => extendSubscription(sub, 30)}
                            className="bg-gray-800 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded uppercase"
                          >
                            +30 Days
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Core Profile directory & Security limits */}
          <div className="bg-[#0b0b0b] border border-gray-800 rounded-2xl p-4">
            <h4 className="text-xs font-black text-gray-300 uppercase font-sans mb-3 flex items-center space-x-1">
              <span className="w-1.5 h-3 bg-gray-500 rounded-sm inline-block"></span>
              <span>All Registered Accounts & Access Controls ({usersList.length})</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-gray-300 text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 uppercase h-8 text-[9px]">
                    <th className="pb-1 pl-2 font-bold">Display Name</th>
                    <th className="pb-1 font-bold">Email Coordinate</th>
                    <th className="pb-1 font-bold">Uganda mobile</th>
                    <th className="pb-1 font-bold">Role</th>
                    <th className="pb-1 font-bold">Account Rule</th>
                    <th className="pb-1 text-right pr-2 font-bold">Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((user) => (
                    <tr key={user.id} className="border-b border-gray-900 hover:bg-[#121212] h-10 transition">
                      <td className="pl-2 font-bold text-white">{user.displayName || 'No Name'}</td>
                      <td>{user.email}</td>
                      <td>{user.phone || '—'}</td>
                      <td className="uppercase font-bold text-indigo-400">{user.role || 'user'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${user.status === 'banned' ? 'bg-red-950 text-red-500' : 'bg-green-950 text-emerald-400'}`}>
                          {user.status === 'banned' ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="text-right pr-2">
                        {user.email === 'www.moviepulse.com@gmail.com' ? (
                          <span className="text-[9px] text-amber-500 font-bold uppercase pl-4">Immutable admin</span>
                        ) : (
                          <button
                            onClick={() => banUserAccount(user.id, user.status)}
                            className={`font-bold font-mono py-1 px-2.5 rounded-lg text-[10px] text-white tracking-wide uppercase transition ${
                              user.status === 'banned'
                                ? 'bg-emerald-600 hover:bg-emerald-500'
                                : 'bg-red-900 hover:bg-red-800'
                            }`}
                          >
                            {user.status === 'banned' ? '✅ RESTORE' : '🚫 BAN ACCOUNT'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

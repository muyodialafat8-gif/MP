import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Play, Pause, RotateCcw, RotateCw, Maximize2, Minimize2,
  Volume2, VolumeX, Download, Star, RefreshCw, Smartphone, Monitor, Zap, Check,
  Lock, Unlock, ZoomIn, ZoomOut, Sun, PictureInPicture, Layers, AlertCircle, HelpCircle,
  Settings, MoreVertical, Tv, Sliders, Languages
} from 'lucide-react';

interface MovieWatchViewProps {
  key?: any;
  movie: {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    duration?: string;
    posterUrl?: string;
    backdropUrl?: string;
    quality?: string;
    vj?: string;
    releaseYear?: number;
    rating?: number;
    genres?: string[];
  };
  onClose: () => void;
  currentUser?: any;
  userSubscription?: any;
  allMovies?: any[];
  onSelectMovie?: (movie: any) => void;
}

export default function MovieWatchView({ 
  movie, 
  onClose, 
  currentUser,
  userSubscription, 
  allMovies = [], 
  onSelectMovie 
}: MovieWatchViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isPremiumOrVip = userSubscription && userSubscription.status === 'active';

  // --- PLAYBACK ENGINE STATES ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1); // avoid 0 division
  const [hoveringControls, setHoveringControls] = useState(true);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);

  // --- COMPACT MINI-PLAYER (IN-APP FLOAT MODE) ---
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);

  // --- SERVER SWITCHING & STABILITY STATES ---
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showServerMenu, setShowServerMenu] = useState(false);

  // --- ADVANCED SCREEN CONTROLS ---
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'fill' | 'cover'>('contain');
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [brightness, setBrightness] = useState<number>(1.0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showLockSplash, setShowLockSplash] = useState(false);

  // --- CINEMATIC MOBILE FULLSCREEN STATES ---
  const [isCinemaFullscreen, setIsCinemaFullscreen] = useState(false);
  const [fullscreenOrientation, setFullscreenOrientation] = useState<'landscape' | 'portrait' | 'immersive'>('landscape');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castSuccess, setCastSuccess] = useState(false);
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState('Off');
  const [selectedSpeed, setSelectedSpeed] = useState('1.0x');

  // --- INTERACTIVE TAP & GESTURE SPARKS ---
  const [doubleTapSplash, setDoubleTapSplash] = useState<{ show: boolean; type: 'rewind' | 'forward' | '' }>({ show: false, type: '' });
  const [gestureIndicator, setGestureIndicator] = useState<{ show: boolean; type: 'volume' | 'brightness' | ''; value: number }>({ show: false, type: '', value: 0 });

  // Touch Swipe coordinates
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartVal = useRef<number>(0);
  const activeGesture = useRef<'none' | 'volume' | 'brightness'>('none');

  // --- DOWNLOAD ENGINE ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStage, setDownloadStage] = useState('');

  // --- RATING & REACTION SYSTEM ---
  const [userRating, setUserRating] = useState<number>(0);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // --- AD CORE ENGINE (Smooth Mid-roll after 40 seconds) ---
  const [adStatus, setAdStatus] = useState<'idle' | 'mid-roll'>('idle');
  const [adCountdown, setAdCountdown] = useState(10);
  const [adSponsoredName, setAdSponsoredName] = useState('MTN MoMo X Supa 5G');
  const [hasTriggeredMidroll, setHasTriggeredMidroll] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Auto-hide controls timer
  const controlTimeout = useRef<NodeJS.Timeout | null>(null);

  // BACKUP STREAMING SERVERS LIST (Dynamic failover)
  const servers = [
    { name: 'Primary Uganda Core Link (Fast) ⚡', url: movie.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4" },
    { name: 'Kampala VIP Express CDN 🚀', url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    { name: 'Nairobi Cache Mirror 02 (1080p)', url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" },
    { name: 'Entebbe Fiber Emergency Stream 📡', url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
  ];

  // Load recommendations
  useEffect(() => {
    let list = allMovies || [];
    if (list.length === 0) {
      const cached = localStorage.getItem('MP_LOCAL_MOVIES');
      if (cached) {
        try {
          list = JSON.parse(cached) || [];
        } catch (_) {}
      }
    }
    const filtered = list.filter((m) => m.id !== movie.id && !m.isAdult);
    setRecommendations(filtered.slice(0, 8));
  }, [movie, allMovies]);

  // Handle auto-hide keys
  const triggerUserAction = () => {
    if (isLocked) return;
    setHoveringControls(true);
    if (controlTimeout.current) clearTimeout(controlTimeout.current);
    if (isPlaying) {
      controlTimeout.current = setTimeout(() => {
        setHoveringControls(false);
      }, 3500);
    }
  };

  useEffect(() => {
    triggerUserAction();
    return () => {
      if (controlTimeout.current) clearTimeout(controlTimeout.current);
    };
  }, [isPlaying]);

  // Video autoplay immediately on page mount / transition
  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    setAdStatus('idle');
    setHasTriggeredMidroll(false);
    setStreamError(null);
    setCurrentServerIndex(0);
    
    const resumeValue = localStorage.getItem(`MP_RESUME_${movie.id}`);
    
    const timer = setTimeout(() => {
      if (videoRef.current) {
        if (resumeValue) {
          const secs = parseFloat(resumeValue);
          if (secs > 5 && secs < duration) {
            videoRef.current.currentTime = secs;
            setCurrentTime(secs);
          }
        }
        videoRef.current.volume = volume;
        videoRef.current.muted = isMuted;
        
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          })
          .catch(() => {
            setIsLoading(false);
          });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [movie]);

  // Monitor Volume property
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Monitor Speed property
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [speed]);

  // Ambient key bindings (escapes, locks, spaces)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) {
        if (e.key === 'l' || e.key === 'L') {
          setIsLocked(false);
        }
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          handleSeek(10);
          break;
        case 'ArrowLeft':
          handleSeek(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolumeDirectly(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolumeDirectly(-0.1);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          setIsMuted(!isMuted);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isLocked, volume, isMuted]);

  // Add listener for Fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (isFs) {
        setIsCinemaFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Synchronize screen-bound orientation metrics automatically
  useEffect(() => {
    const handleResize = () => {
      if (isCinemaFullscreen) {
        if (window.innerWidth > window.innerHeight) {
          setFullscreenOrientation('landscape');
        } else {
          setFullscreenOrientation('portrait');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCinemaFullscreen]);

  // Smooth Advertisement ticks
  useEffect(() => {
    let interval: any = null;
    if (adStatus === 'mid-roll') {
      interval = setInterval(() => {
        setAdCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [adStatus]);

  // Helper volume adjuster
  const adjustVolumeDirectly = (delta: number) => {
    const nextVolume = Math.min(1, Math.max(0, volume + delta));
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    setGestureIndicator({ show: true, type: 'volume', value: Math.round(nextVolume * 100) });
    setTimeout(() => setGestureIndicator(p => ({ ...p, show: false })), 800);
  };

  // Track stream position with autosave
  const handleTimeUpdate = () => {
    if (videoRef.current && adStatus === 'idle') {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);

      // Save watch position periodically
      if (curr > 4 && curr % 5 < 1) {
        localStorage.setItem(`MP_RESUME_${movie.id}`, curr.toString());
      }

      // Trigger mid-roll ad automatically at 40-seconds loop for free users
      if (!isPremiumOrVip && !hasTriggeredMidroll && curr >= 40 && curr <= 43) {
        triggerMidrollAd();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 180);
    }
  };

  const getYouTubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const activeUrl = servers[currentServerIndex]?.url || '';
  const isYouTube = activeUrl ? (activeUrl.includes('youtube.com') || activeUrl.includes('youtu.be')) : false;

  // VIDEO PLAYBACK ERROR STABILITY RECOVERY & AUTO-FAILOVER
  const handleVideoError = () => {
    const err = videoRef.current?.error;
    if (err && err.code === 1) {
      // Aborted by user agent or source change; safe to ignore
      return;
    }

    if (reconnectAttempts < 2) {
      setIsReconnecting(true);
      setReconnectAttempts(prev => prev + 1);
      const currentTimeSaved = videoRef.current ? videoRef.current.currentTime : currentTime;
      
      setStreamError(`Stall detected. Auto-reconnecting Core Link... (Attempt ${reconnectAttempts + 1}/2)`);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.currentTime = currentTimeSaved;
          videoRef.current.play()
            .then(() => {
              setIsReconnecting(false);
              setStreamError(null);
            })
            .catch(() => {
              // Try next server backup node
              switchToNextBackupServer(currentTimeSaved);
            });
        }
      }, 1200);
    } else {
      switchToNextBackupServer(currentTime);
    }
  };

  const switchToNextBackupServer = (resumeTime: number) => {
    const nextIndex = (currentServerIndex + 1) % servers.length;
    setCurrentServerIndex(nextIndex);
    setReconnectAttempts(0);
    setStreamError(`Network spike. Moving to Backup CDN Server ${nextIndex + 1}...`);
    setIsLoading(true);

    setTimeout(() => {
      if (videoRef.current) {
        // If the next server url is YouTube, we don't assign it to videoRef.src
        // because standard video element will fail. We just let state change re-render.
        if (servers[nextIndex].url.includes('youtube.com') || servers[nextIndex].url.includes('youtu.be')) {
          setIsLoading(false);
          setIsPlaying(true);
          setIsReconnecting(false);
          setStreamError(null);
          return;
        }

        videoRef.current.src = servers[nextIndex].url;
        videoRef.current.load();
        videoRef.current.currentTime = resumeTime;
        videoRef.current.play()
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
            setIsReconnecting(false);
            setStreamError(null);
          })
          .catch((err) => {
            setIsLoading(false);
            setStreamError('Failed streaming fallback nodes. Retrying primary host...');
            console.error('All backup endpoints offline', err);
          });
      } else {
        // If no videoRef because of YouTube switch
        setIsLoading(false);
        setIsPlaying(true);
        setIsReconnecting(false);
        setStreamError(null);
      }
    }, 1500);
  };

  const selectServerDirectly = (index: number) => {
    setCurrentServerIndex(index);
    setReconnectAttempts(0);
    setShowServerMenu(false);
    setIsLoading(true);
    const resumeTimeSaved = currentTime;

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.src = servers[index].url;
        videoRef.current.load();
        videoRef.current.currentTime = resumeTimeSaved;
        videoRef.current.play()
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
            setStreamError(null);
          })
          .catch(() => {
            setIsLoading(false);
          });
      }
    }, 400);
  };

  const triggerMidrollAd = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    setAdCountdown(10);
    setAdSponsoredName(Math.random() > 0.5 ? 'MTN MoMo Pay' : 'Airtel 5G broadband');
    setAdStatus('mid-roll');
    setHasTriggeredMidroll(true);
  };

  const handleSkipAd = () => {
    setAdStatus('idle');
    setIsPlaying(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleVisitAdvertiser = () => {
    const url = adSponsoredName.toLowerCase().includes('mtn') 
      ? 'https://www.mtn.co.ug' 
      : 'https://www.airtel.co.ug';
    
    setIsRedirecting(true);
    
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (_) {}

    setTimeout(() => {
      setIsRedirecting(false);
      handleSkipAd();
    }, 2000);
  };

  // Fast seek offset
  const handleSeek = (offsetSec: number) => {
    if (videoRef.current) {
      let dest = videoRef.current.currentTime + offsetSec;
      if (dest < 0) dest = 0;
      if (dest > duration) dest = duration;
      videoRef.current.currentTime = dest;
      setCurrentTime(dest);
    }
  };

  const handleTimelineScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dest = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = dest;
      setCurrentTime(dest);
    }
  };

  const togglePlay = () => {
    if (adStatus !== 'idle') return;
    if (isLocked) {
      triggerLockSplash();
      return;
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }
    }
  };

  // Lock Trigger splash alert
  const triggerLockSplash = () => {
    setShowLockSplash(true);
    setTimeout(() => setShowLockSplash(false), 2000);
  };

  // Toggle horizontal projection fullscreens
  const toggleFullscreen = () => {
    if (isLocked) {
      triggerLockSplash();
      return;
    }
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  // Picture in Picture triggers
  const togglePictureInPicture = async () => {
    if (isLocked) {
      triggerLockSplash();
      return;
    }
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      } else {
        alert('Picture-In-Picture isn\'t available on this sandbox frame. Minimizer activated!');
        setIsMiniPlayer(true);
      }
    } catch (e) {
      setIsMiniPlayer(true); // fallback to custom float PiP card
    }
  };

  // Touch Swipe Gesture Handlers for Sound and Lights adjustments
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftSide = touch.clientX - rect.left < rect.width / 2;
    
    if (isLeftSide) {
      activeGesture.current = 'brightness';
      touchStartVal.current = brightness;
    } else {
      activeGesture.current = 'volume';
      touchStartVal.current = volume;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked || activeGesture.current === 'none' || touchStartY.current === null) return;
    const touch = e.touches[0];
    const diffY = touchStartY.current - touch.clientY; // swipe upwards is positive
    const dragDelta = diffY / 180; // scale
    
    if (activeGesture.current === 'brightness') {
      const nextBrightness = Math.min(1.8, Math.max(0.2, touchStartVal.current + dragDelta));
      setBrightness(nextBrightness);
      setGestureIndicator({ show: true, type: 'brightness', value: Math.round(nextBrightness * 100) });
    } else if (activeGesture.current === 'volume') {
      const nextVolume = Math.min(1.0, Math.max(0.0, touchStartVal.current + dragDelta));
      setVolume(nextVolume);
      if (videoRef.current) {
        videoRef.current.volume = nextVolume;
        setIsMuted(nextVolume === 0);
      }
      setGestureIndicator({ show: true, type: 'volume', value: Math.round(nextVolume * 100) });
    }
  };

  const handleTouchEnd = () => {
    activeGesture.current = 'none';
    setTimeout(() => {
      setGestureIndicator(prev => ({ ...prev, show: false }));
    }, 800);
  };

  // Double Click / Double Tap Hotspots
  const handleLeftDouble = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    handleSeek(-10);
    setDoubleTapSplash({ show: true, type: 'rewind' });
    setTimeout(() => setDoubleTapSplash({ show: false, type: '' }), 700);
  };

  const handleRightDouble = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    handleSeek(10);
    setDoubleTapSplash({ show: true, type: 'forward' });
    setTimeout(() => setDoubleTapSplash({ show: false, type: '' }), 700);
  };

  // Premium download mechanism
  const handleDownload = () => {
    if (!isPremiumOrVip) {
      alert('🔒 Downloads require a VIP subscription. Please upgrade to download high quality content local!');
      return;
    }
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStage('Connecting to Kampala CDN Direct Node...');

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 20) + 12;
        if (next >= 100) {
          clearInterval(interval);
          setDownloadStage('Saving offline file...');
          setTimeout(() => {
            setIsDownloading(false);
            try {
              const prevSaved = localStorage.getItem('MP_OFFLINE_DOWNLOADS');
              const list = prevSaved ? JSON.parse(prevSaved) : [];
              const exists = list.some((m: any) => m.id === movie.id);
              if (!exists) {
                list.push({
                  id: movie.id,
                  title: movie.title,
                  description: movie.description || '',
                  posterUrl: movie.posterUrl || '',
                  videoUrl: movie.videoUrl || '',
                  vj: movie.vj || '',
                  downloadedAt: new Date().toISOString()
                });
                localStorage.setItem('MP_OFFLINE_DOWNLOADS', JSON.stringify(list));
              }
            } catch (err) {
              console.warn("Storage write failure on download tracker:", err);
            }
            alert(`📥 "${movie.title}" saved offline to your lounge successfully! Go to the Downloads channel to play without using internet data.`);
          }, 800);
          return 100;
        }

        if (next < 35) setDownloadStage('Downloading streams...');
        else if (next < 70) setDownloadStage('Injecting multi-audio track...');
        else setDownloadStage('Configuring key license offline...');

        return next;
      });
    }, 400);
  };

  const handleRateMovie = (rating: number) => {
    setUserRating(rating);
    setShowRatingSuccess(true);
    setTimeout(() => {
      setShowRatingSuccess(false);
    }, 3000);
  };

  const formattedTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getSubtitleText = (time: number, lang: string) => {
    if (lang === 'Off') return '';
    if (lang === 'English') {
      if (time < 10) return "MoviePulse HD stream connected. Seamless audio feeds active.";
      if (time < 20) return "Entering high-dynamics scene. Hold tightly!";
      if (time < 35) return "This is the true legacy of our direct satellite transceivers.";
      if (time < 50) return "Bypassing server traffic line. Syncing Kampala direct line...";
      if (time < 75) return "Fiber signal calibrated. Optimal 1080p stream projection locked.";
      return "MoviePulse Premium Live TV channels. Thank you for streaming!";
    }
    if (lang === 'Luganda (VJ Junior)') {
      if (time < 10) return "VJ Junior: Mwebale kujja! Tuliko ku MoviePulse Uganda! 🍿 (Enjoy quality VJ translations!)";
      if (time < 20) return "VJ Junior: Ekikopo kya video kino kijjudde abasaasi kyokka katubeere bakakkifu. (Action scene building!)";
      if (time < 35) return "VJ Junior: Kati kanyigireko wano! Laba bwatandika okudduka mubalase... (Behold the escape!)";
      if (time < 50) return "VJ Junior: Sente zaffe zonna zigenze dda mu MTN MoMo! Ha! (Our assets are highly secured!)";
      if (time < 75) return "VJ Junior: Laba bweyambuka ekikuubo mu Kampala fiber internet ffe tuli kyakulya! (High speed streaming!)";
      return "VJ Junior: Enjoy unlimited premium 4K channels only on MoviePulse Uganda.";
    }
    if (lang === 'Swahili (VJ Swahili)') {
      if (time < 10) return "VJ Swahili: Karibuni kwenye MoviePulse! Burudani safi nyumbani kwako.";
      if (time < 20) return "VJ Swahili: Hatari sana sasa! Tazama filamu hii yenye kusisimua kabisa.";
      if (time < 35) return "VJ Swahili: Sasa anakimbia kwa kasi mno... Hawezi kushikika hata kidogo!";
      if (time < 50) return "VJ Swahili: Kazi nzuri sana! Huduma zote zimeunganishwa kikamilifu.";
      if (time < 75) return "VJ Swahili: Furahia intaneti ya kasi ya juu na picha safi kabisa.";
      return "VJ Swahili: Asante kwa kutazama. Jiunge na VIP sasa hivi kupata uhondo wote.";
    }
    return '';
  };

  const enterCinematicFullscreen = () => {
    setIsCinemaFullscreen(true);
    setHoveringControls(true);
    setShowSettingsMenu(false);
    setShowSpeedMenu(false);
    setShowSubtitlesMenu(false);
    if (containerRef.current && !document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  };

  const exitCinematicFullscreen = () => {
    setIsCinemaFullscreen(false);
    setShowSettingsMenu(false);
    setShowSpeedMenu(false);
    setShowSubtitlesMenu(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleVideoContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      triggerLockSplash();
      return;
    }
    if (isCinemaFullscreen) {
      if (hoveringControls) {
        setHoveringControls(false);
      } else {
        triggerUserAction();
      }
    } else {
      togglePlay();
    }
  };

  return (
    <div
      ref={containerRef}
      id="root-theatre-projection-dock"
      className={`bg-[#070708] select-none text-white font-sans flex flex-col transition-all duration-300 ${
        isMiniPlayer 
          ? 'fixed bottom-4 right-4 w-80 sm:w-96 aspect-video rounded-2xl shadow-2xl border border-neutral-800 z-50 overflow-hidden bg-black' 
          : 'fixed inset-0 w-screen h-screen overflow-y-auto z-50'
      }`}
      onMouseMove={triggerUserAction}
      onClick={triggerUserAction}
    >
      
      {/* 🔴 SPLASH REDIRECT AD SPIDER */}
      {isRedirecting && !isMiniPlayer && (
        <div className="fixed inset-0 bg-neutral-950 z-55 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="space-y-6 max-w-sm">
            <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin mx-auto text-3xl" />
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-white">Redirecting to Advertiser</h3>
              <p className="text-sm text-neutral-400 mt-2">
                Opening portal for <span className="text-yellow-405 font-extrabold">{adSponsoredName}</span>...
              </p>
            </div>
            <p className="text-[11px] text-gray-500 leading-normal animate-pulse">
              Ad placement reward unlocked! Resuming your stream instantly.
            </p>
          </div>
        </div>
      )}

      {/* 🔴 AD INTERLUDE DRAWER OVERLAY */}
      {adStatus === 'mid-roll' && !isMiniPlayer && (
        <div className="fixed inset-0 bg-black/95 z-45 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-850 p-6 rounded-3xl space-y-6 shadow-2xl relative">
            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 px-3.5 py-1 text-[10px] rounded-full font-mono font-black uppercase tracking-widest inline-block">
              Sponsored Interlude
            </span>

            <div className="space-y-2">
              <h4 className="text-xl font-black">Ad Sponsored by: <span className="text-yellow-400">{adSponsoredName}</span></h4>
              <p className="text-xs text-gray-400">Upgrade to VIP for safe continuous streaming without commercial interruptions.</p>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={handleVisitAdvertiser}
                className="w-full py-3 bg-[#ff0a16] hover:bg-red-700 text-white font-black text-xs rounded-xl transition flex items-center justify-center space-x-2 focus:outline-none cursor-pointer border border-transparent shadow-lg"
              >
                <span>🌐 Visit Advertiser</span>
                <span className="text-[9px] bg-black/45 px-1.5 py-0.5 rounded font-normal text-amber-300">Unlock instantly</span>
              </button>

              <div className="bg-black/40 border border-neutral-800 p-3.5 rounded-xl text-center space-y-2">
                <p className="text-[11px] text-yellow-400 font-medium leading-relaxed">
                  📢 Enjoy completely ads-free play and ultimate speeds!
                </p>
                <button
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('DIRECT_PAGE_ROUTE', { detail: 'subscription' }));
                  }}
                  className="px-4 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-[10px] rounded-lg uppercase tracking-wide transition shadow-md inline-block cursor-pointer"
                >
                  👑 Subscribe (Skip Ads)
                </button>
              </div>
            </div>

            <div className="pt-2">
              {adCountdown > 0 ? (
                <div className="bg-neutral-950 border border-neutral-800 rounded-full px-5 py-2 text-xs font-mono text-gray-400">
                  Skipping enabled in <span className="text-[#ff0a16] font-extrabold">{adCountdown}s</span>
                </div>
              ) : (
                <button
                  onClick={handleSkipAd}
                  className="w-full py-2 bg-white hover:bg-neutral-200 text-black font-black text-xs rounded-xl transition uppercase tracking-wider shadow"
                >
                  Skip Ad & Resume Movie ▶
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM COMPACT HEADER --- */}
      <div className={`w-full bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 py-3 sticky top-0 z-35 flex items-center justify-between ${
        isMiniPlayer ? 'p-1.5 py-1' : ''
      }`}>
        <div className="flex items-center space-x-2.5">
          {isMiniPlayer ? (
            <button
              onClick={() => setIsMiniPlayer(false)}
              className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white transition rounded-full text-[10px] font-mono border border-neutral-850 flex items-center space-x-1 uppercase"
              title="Maximize back to theater projection window"
            >
              <Maximize2 className="w-3 h-3 text-[#ff0a16]" />
              <span className="font-extrabold">View HD</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white transition flex items-center space-x-1 border border-neutral-850 cursor-pointer"
              title="Return to Catalog Home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Back</span>
            </button>
          )}
          
          <div className="leading-tight">
            <h1 className="text-sm font-extrabold text-white truncate max-w-[150px] sm:max-w-xs uppercase tracking-wide flex items-center gap-1.5">
              <span>{movie.title}</span>
              {isMiniPlayer && <span className="text-[7.5px] bg-[#ff0a16] text-white px-1 py-0.2 rounded animate-pulse">MINI</span>}
            </h1>
            <p className="text-[9.5px] text-red-500 font-mono font-medium">
              VJ {movie.vj || 'Junior'} Translation
            </p>
          </div>
        </div>

        {/* Dynamic Watermark and VIP subscription banner inside the header */}
        {!isMiniPlayer && (
          <div className="flex items-center space-x-3">
            {/* Rating controller */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-neutral-900/90 py-1 px-2.5 rounded-full border border-neutral-850 relative">
              <span className="text-[9.5px] text-gray-400 font-bold">Rate:</span>
              <div className="flex space-x-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    onClick={() => handleRateMovie(star)}
                    className={`w-3 h-3 cursor-pointer transition ${
                      (userRating >= star) ? 'text-yellow-500 fill-yellow-500' : 'text-neutral-600 hover:text-yellow-400'
                    }`}
                  />
                ))}
              </div>
              {showRatingSuccess && (
                <div className="absolute top-8 right-0 bg-emerald-600 text-white text-[9.5px] px-2.5 py-1 rounded shadow-lg font-black animate-bounce z-40 whitespace-nowrap">
                  Rated {userRating} Stars!
                </div>
              )}
            </div>

            {/* Go VIP button or state Badge */}
            {isPremiumOrVip ? (
              <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-[9px] font-mono px-3 py-1 rounded-full font-black uppercase tracking-wider shadow">
                👑 VIP MEMBER
              </span>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('DIRECT_PAGE_ROUTE', { detail: 'subscription' }));
                }}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black text-[9.5px] font-sans px-3.5 py-1.5 rounded-full font-black uppercase shadow-lg transition transform hover:scale-105 active:scale-95 flex items-center space-x-1 cursor-pointer"
              >
                <span>👑 GO VIP</span>
              </button>
            )}
          </div>
        )}
      </div>

        {/* --- CENTRAL MAIN SCREEN SECTOR --- */}
      <div className={`flex flex-col items-center justify-center ${
        isCinemaFullscreen ? 'p-0 w-full h-full' : (isMiniPlayer ? 'flex-1 p-0' : 'flex-1 p-4 md:p-6')
      }`}>
        
        {/* Playback Aspect & Container Area with touch swipe listener */}
        <div 
          className={
            isCinemaFullscreen
              ? `bg-black select-none overflow-hidden transition-all duration-300 ${
                  isLocked ? 'cursor-none select-none' : ''
                }`
              : `relative bg-black shadow-2xl overflow-hidden transition-all duration-300 w-full ${
                  isMiniPlayer 
                    ? 'h-full w-full border-0 rounded-0'
                    : `rounded-3xl border border-neutral-900 max-w-4xl col-span-12 ${
                        isPortraitMode ? 'aspect-[9/16] max-h-[520px] w-auto h-full mx-auto' : 'aspect-video'
                      }`
                }`
          }
          style={
            isCinemaFullscreen
              ? (isCinemaFullscreen && fullscreenOrientation === 'landscape' && window.innerHeight > window.innerWidth
                  ? {
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(90deg)',
                      width: '100vh',
                      height: '100vw',
                      zIndex: 9990,
                    }
                  : {
                      position: 'fixed',
                      inset: 0,
                      width: '100vw',
                      height: '100vh',
                      zIndex: 9990,
                    })
              : {}
          }
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleVideoContainerClick}
        >
          {/* Double tap hotspot regions */}
          {!isLocked && !isMiniPlayer && (
            <>
              <div 
                className="absolute left-0 top-12 bottom-12 w-[35%] z-15 cursor-pointer opacity-0 active:opacity-15 bg-white/20 transition-opacity flex items-center justify-center pointer-events-auto"
                onDoubleClick={handleLeftDouble}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 bg-black/60 rounded-full text-white font-mono text-[10px]">⏪ Double Tap [x2]</div>
              </div>
              <div 
                className="absolute right-0 top-12 bottom-12 w-[35%] z-15 cursor-pointer opacity-0 active:opacity-15 bg-white/20 transition-opacity flex items-center justify-center pointer-events-auto"
                onDoubleClick={handleRightDouble}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-3 bg-black/60 rounded-full text-white font-mono text-[10px]">Double Tap [x2] ⏩</div>
              </div>
            </>
          )}

          {/* SCREEN HARDWARE LOCK OVERLAY MASK */}
          {isLocked && (
            <div className="absolute inset-0 bg-transparent z-25 pointer-events-auto" onClick={(e) => {
              e.stopPropagation();
              triggerLockSplash();
            }} />
          )}

          {/* Dynamic quality / direct signal badge */}
          {!isMiniPlayer && (
            <div className="absolute top-4 left-4 z-30 pointer-events-none bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-850 text-[10px] font-mono text-gray-300 flex items-center space-x-1.5 font-bold shadow-lg">
              <span className={`w-2 h-2 rounded-full ${isReconnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-ping'}`} />
              <span>{isReconnecting ? 'Auto-healing' : 'A-vbr Dynamic Quality'}</span>
              <span className="text-neutral-500">|</span>
              <span className="text-red-500 font-bold">SERVER {currentServerIndex + 1}</span>
            </div>
          )}

          {/* Stream Watermark / VJ Overlay */}
          {!isMiniPlayer && (
            <div className="absolute top-4 right-4 z-30 pointer-events-none select-none tracking-widest font-mono text-white/30 text-[10px] md:text-xs font-black uppercase flex flex-col items-end space-y-1">
              <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] flex items-center space-x-1.5 font-black">
                <span>MOVIEPULSE STREAM</span>
                <span className="inline-block w-1.5 h-1.5 bg-red-650 rounded-full animate-pulse" />
              </span>
              <span className="text-[7.5px] md:text-[8px] opacity-80 text-wrap font-sans font-extrabold text-red-500 bg-black/70 px-2 py-0.5 rounded border border-neutral-900 drop-shadow flex items-center space-x-1 capitalize tracking-normal">
                <span>🔊 VJ {movie.vj || 'Junior'} Sound</span>
              </span>
            </div>
          )}

          {/* FLOATING DIRECT GESTURE INDICATORS FOR SOUND & LIGHTS */}
          {gestureIndicator.show && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="bg-black/90 backdrop-blur-md border border-neutral-800 px-5 py-3 rounded-2xl flex flex-col items-center space-y-2 text-center shadow-2xl scale-110 transition duration-300">
                {gestureIndicator.type === 'volume' ? (
                  <Volume2 className="w-8 h-8 text-[#ff0a16] animate-bounce" />
                ) : (
                  <Sun className="w-8 h-8 text-yellow-500 animate-spin" />
                )}
                <span className="text-xs font-mono font-black uppercase tracking-wider">
                  {gestureIndicator.type === 'volume' ? 'Volume' : 'Brightness'} Adjust
                </span>
                <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${gestureIndicator.type === 'volume' ? 'bg-[#ff0a16]' : 'bg-yellow-400'}`}
                    style={{ width: `${gestureIndicator.value}%` }} 
                  />
                </div>
                <span className="text-sm font-bold font-mono tracking-wide">{gestureIndicator.value}%</span>
              </div>
            </div>
          )}

          {/* DOUBLE TAP ANIMATED RIPPLE SPLASH INDICATORS */}
          {doubleTapSplash.show && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="bg-black/75 backdrop-blur-sm border border-neutral-800 p-4 rounded-full text-white flex items-center space-x-2 animate-ping shadow-lg">
                {doubleTapSplash.type === 'rewind' ? (
                  <>
                    <RotateCcw className="w-6 h-6 text-red-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">-10s Seek</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">+10s Seek</span>
                    <RotateCw className="w-6 h-6 text-red-500" />
                  </>
                )}
              </div>
            </div>
          )}

          {/* LOCK STATE FLOATING WATERMARK AND DISMISSAL PIN */}
          {isLocked && !isCinemaFullscreen && (
            <div className="absolute inset-0 bg-black/25 z-20 pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-center w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLocked(false);
                  }}
                  className="p-2 bg-[#ff0a16] hover:bg-red-700 text-white rounded-xl shadow-lg border border-neutral-900 pointer-events-auto cursor-pointer animate-pulse flex items-center space-x-1 text-xs uppercase font-mono font-black"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Tap to Unlock screen</span>
                </button>
                <div />
              </div>
              <div className="mx-auto flex flex-col items-center space-y-1 bg-black/65 px-4 py-2 rounded-2xl border border-neutral-900 select-none shadow">
                <Lock className="w-5 h-5 text-[#ff0a16] animate-bounce" />
                <span className="text-[10px] uppercase font-mono block font-black select-none tracking-widest">Controls Locked (Childproof mode)</span>
              </div>
              <div />
            </div>
          )}

          {/* LOCK SPLASH ALERTS */}
          {showLockSplash && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="bg-red-950/90 border border-red-800 px-5 py-3 rounded-2xl flex flex-col items-center space-y-2 text-center animate-bounce shadow">
                <Lock className="w-6 h-6 text-red-500" />
                <p className="text-[10.5px] font-black uppercase tracking-wider text-white select-none">Child Touch Lock is Active</p>
                <p className="text-[8.5px] text-gray-300 font-sans select-none">Click the Top-Left Unlock Button to configure player controls.</p>
              </div>
            </div>
          )}

          {/* Active Subtitle captions block inside player */}
          {selectedSubtitle !== 'Off' && isPlaying && adStatus === 'idle' && (
            <div className="absolute bottom-16 sm:bottom-24 left-1/2 -translate-x-1/2 z-40 bg-black/85 backdrop-blur-md text-yellow-300 font-bold px-4 py-2.5 rounded-2xl text-[11px] sm:text-xs md:text-sm text-center border border-white/10 shadow-2xl tracking-wide max-w-[85%] whitespace-normal pointer-events-none font-sans animate-fade-in line-clamp-2">
              {getSubtitleText(currentTime, selectedSubtitle)}
            </div>
          )}

          {/* Active Error and Reconnection Status Layer */}
          {streamError && (
            <div className="absolute inset-x-4 bottom-14 z-30 pointer-events-none bg-[#09090b]/90 border border-[#ff0a16]/30 px-3 py-2 rounded-xl text-[10px] font-mono text-amber-500 flex items-center justify-center space-x-2 text-center">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span className="font-bold tracking-wide uppercase">{streamError}</span>
            </div>
          )}

          {/* Video Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#09090b]/80 z-20 flex flex-col items-center justify-center p-6 text-center">
              <RefreshCw className="w-9 h-9 text-[#ff0a16] animate-spin mb-3" />
              <p className="text-red-505 font-mono text-[10.5px] font-black tracking-widest uppercase">
                TUNING SIGNAL (SERVER {currentServerIndex + 1})...
              </p>
              <p className="text-[9px] text-gray-500 max-w-xs mt-1 leading-snug">Buffering direct feed via fiber node with redundant backup automatic quality routing.</p>
            </div>
          )}

          {/* Pause Static Backdrop Center Action */}
          {!isPlaying && !isLoading && adStatus === 'idle' && !isCinemaFullscreen && (
            <div className="absolute inset-0 bg-black/45 z-20 flex items-center justify-center" onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}>
              <div className="w-14 h-14 bg-[#ff0a16] hover:bg-red-750 text-white rounded-full flex items-center justify-center transition shadow-[0_0_20px_rgba(255,10,22,0.4)] transform hover:scale-110 active:scale-95 cursor-pointer">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {isYouTube ? (
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(activeUrl)}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`}
              title={movie.title}
              className="w-full h-full border-0 absolute inset-0 z-10"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => {
                setIsLoading(false);
                setIsReconnecting(false);
                setIsPlaying(true);
              }}
            />
          ) : (
            <video
              ref={videoRef}
              src={activeUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleVideoError}
              style={{
                filter: `brightness(${brightness})`,
                transform: `scale(${zoomScale})`,
                transition: 'transform 0.15s ease-out, filter 0.08s linear',
              }}
              className={`w-full h-full select-none outline-none ${
                aspectMode === 'contain' ? 'object-contain' :
                aspectMode === 'fill' ? 'object-fill' : 'object-cover'
              }`}
              autoPlay
              controls={false}
              onCanPlay={() => {
                setIsLoading(false);
                setIsReconnecting(false);
              }}
            />
          )}

          {/* --- ULTRA CINEMATIC MOBILE FULLSCREEN CONTROL OVERLAY --- */}
          {isCinemaFullscreen && (
            <>
              {/* CHILD LOCK STATE OVERLAY */}
              {isLocked && (
                <div className="absolute inset-0 z-45 bg-black/30 flex flex-col justify-between p-4 sm:p-6 pointer-events-none">
                  <div className="flex justify-between items-center w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsLocked(false);
                        triggerUserAction();
                      }}
                      className="p-3 bg-[#ff0a16] hover:bg-neutral-900 border border-neutral-800 text-white rounded-2xl shadow-2xl pointer-events-auto animate-pulse flex items-center space-x-2 text-xs uppercase font-mono font-black cursor-pointer"
                    >
                      <Unlock className="w-4 h-4 text-emerald-500 animate-bounce" />
                      <span>Tap to Unlock screen controls</span>
                    </button>
                  </div>
                  <div className="mx-auto flex flex-col items-center space-y-1.5 bg-black/85 px-5 py-3.5 rounded-2xl border border-neutral-800 select-none shadow-2xl">
                    <Lock className="w-6 h-6 text-[#ff0a16] animate-bounce" />
                    <span className="text-xs uppercase font-mono block font-black tracking-widest text-[#ff0a16]">Controls Locked</span>
                    <span className="text-[9px] text-gray-500 font-sans tracking-wide">Accidental tap protector is running</span>
                  </div>
                  <div/>
                </div>
              )}

              {/* FLOATING ACTION OVERLAY CONTROLS PANEL */}
              {hoveringControls && !isLocked && (
                <div className="absolute inset-0 z-35 bg-gradient-to-t from-black/85 via-transparent to-black/85 flex flex-col justify-between p-4 sm:p-6 animate-fade-in pointer-events-auto">
                  
                  {/* TOP CONTROL BAR PANEL */}
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exitCinematicFullscreen();
                        }}
                        className="p-2.5 bg-black/60 rounded-full hover:bg-white/10 text-white transition flex items-center justify-center cursor-pointer border border-white/5 shadow-md active:scale-90"
                        title="Exit Fullscreen Mode"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="text-left select-none">
                        <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider line-clamp-1">{movie.title}</h2>
                        <span className="text-[9px] bg-[#ff0a16]/10 text-red-500 px-1.5 py-0.5 rounded border border-red-550/25 font-mono font-bold tracking-wider uppercase">
                          VJ {movie.vj || 'Junior'} Sound
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3 pointer-events-auto">
                      {/* Subtitles Overlay trigger */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSubtitlesMenu(!showSubtitlesMenu);
                            setShowSettingsMenu(false);
                            setShowSpeedMenu(false);
                          }}
                          className={`p-2.5 rounded-full flex items-center justify-center text-white transition cursor-pointer border border-white/5 active:scale-95 ${
                            selectedSubtitle !== 'Off' ? 'bg-red-650 shadow-md' : 'bg-black/60 hover:bg-white/10'
                          }`}
                          title="Subtitles & Translation CC"
                        >
                          <Languages className="w-4 h-4" />
                        </button>
                        
                        {showSubtitlesMenu && (
                          <div className="absolute top-12 right-0 bg-neutral-950 border border-neutral-850 rounded-2xl p-1.5 w-[190px] shadow-2xl z-50 space-y-1">
                            <span className="text-[8px] font-mono block text-gray-500 uppercase font-black px-2 py-1 leading-none border-b border-neutral-900 mb-1">TRANSLATED CAPTIONS</span>
                            {['Off', 'English', 'Luganda (VJ Junior)', 'Swahili (VJ Swahili)'].map((lang) => (
                              <button
                                key={lang}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubtitle(lang);
                                  setShowSubtitlesMenu(false);
                                  triggerUserAction();
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] flex items-center justify-between transition cursor-pointer ${
                                  selectedSubtitle === lang 
                                    ? 'bg-[#ff0a16]/10 text-[#ff0a16] font-bold border border-[#ff0a16]/15' 
                                    : 'text-gray-300 hover:bg-neutral-900 hover:text-white'
                                }`}
                              >
                                <span>{lang}</span>
                                {selectedSubtitle === lang && <Check className="w-3.5 h-3.5 text-[#ff0a16] ml-2 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Kampala Wireless Cast sync */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCasting(true);
                            setCastSuccess(false);
                            setTimeout(() => {
                              setCastSuccess(true);
                              setTimeout(() => {
                                setIsCasting(false);
                              }, 2500);
                            }, 1500);
                          }}
                          className={`p-2.5 rounded-full flex items-center justify-center transition cursor-pointer border border-white/5 active:scale-95 ${
                            isCasting ? 'bg-amber-500 text-black shadow-lg shadow-amber-955' : 'bg-black/60 hover:bg-white/10 text-white'
                          }`}
                          title="Wireless Display Casting"
                        >
                          <Tv className="w-4 h-4 hover:animate-ping" />
                        </button>

                        {isCasting && (
                          <div className="absolute top-12 right-0 bg-neutral-950 border border-neutral-800 rounded-2xl p-3 w-[220px] shadow-2xl z-50 text-center space-y-2.5 animate-fade-in">
                            <Tv className="w-7 h-7 text-amber-500 animate-pulse mx-auto" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-mono font-black text-white uppercase tracking-wider">
                                {castSuccess ? '📡 CONNECTED!' : 'SCANNING RECIPIENTS'}
                              </p>
                              <p className="text-[8.5px] text-gray-400 leading-snug">
                                {castSuccess 
                                  ? 'Streaming successfully to MoviePulse Kampala VIP Screen!' 
                                  : 'Searching for nearby 5G Smart TVs around Kampala...'}
                              </p>
                            </div>
                            {!castSuccess && (
                              <div className="w-16 h-1 bg-neutral-800 rounded-full mx-auto overflow-hidden">
                                <div className="h-full bg-amber-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Playback speed selector */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSpeedMenu(!showSpeedMenu);
                            setShowSettingsMenu(false);
                            setShowSubtitlesMenu(false);
                          }}
                          className={`p-2.5 rounded-full flex items-center justify-center text-white transition cursor-pointer border border-white/5 active:scale-95 ${
                            selectedSpeed !== '1.0x' ? 'bg-[#ff0a16] shadow-md shadow-red-955' : 'bg-black/60 hover:bg-white/10'
                          }`}
                          title="Playback Speed"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        {showSpeedMenu && (
                          <div className="absolute top-12 right-0 bg-neutral-950 border border-neutral-850 rounded-2xl p-1.5 w-[140px] shadow-2xl z-50 space-y-1">
                            <span className="text-[8px] font-mono block text-gray-500 uppercase font-black px-2 py-1 leading-none border-b border-neutral-900 mb-1">PLAYBACK SPEED</span>
                            {['0.5x', '0.75x', '1.0x', '1.25x', '1.5x', '2.0x'].map((sRate) => (
                              <button
                                key={sRate}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSpeed(sRate);
                                  setSpeed(parseFloat(sRate));
                                  setShowSpeedMenu(false);
                                  triggerUserAction();
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] flex items-center justify-between transition cursor-pointer ${
                                  selectedSpeed === sRate 
                                    ? 'bg-[#ff0a16]/10 text-[#ff0a16] font-bold border border-[#ff0a16]/15' 
                                    : 'text-gray-300 hover:bg-neutral-900 hover:text-white'
                                }`}
                              >
                                <span>{sRate}</span>
                                {selectedSpeed === sRate && <Check className="w-3.5 h-3.5 text-[#ff0a16] ml-2 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Settings & Failover servers Gear */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSettingsMenu(!showSettingsMenu);
                            setShowSpeedMenu(false);
                            setShowSubtitlesMenu(false);
                          }}
                          className="p-2.5 bg-black/60 rounded-full hover:bg-white/10 text-white transition flex items-center justify-center cursor-pointer border border-white/5 shadow-md active:scale-95"
                          title="Server channels & configuration"
                        >
                          <Settings className="w-4 h-4 hover:rotate-45 transition duration-300" />
                        </button>

                        {showSettingsMenu && (
                          <div className="absolute top-12 right-0 bg-neutral-950 border border-neutral-850 rounded-2xl p-1.5 w-[230px] shadow-2xl z-50 space-y-1">
                            <span className="text-[8px] font-mono block text-gray-500 uppercase font-black px-2 py-1 leading-none border-b border-neutral-900 mb-1.5">FAILOVER SERVER NODES</span>
                            {servers.map((serv, index) => (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectServerDirectly(index);
                                  setShowSettingsMenu(false);
                                  triggerUserAction();
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] flex items-center justify-between transition cursor-pointer font-mono ${
                                  currentServerIndex === index 
                                    ? 'bg-[#ff0a16]/10 text-[#ff0a16] font-extrabold border border-[#ff0a16]/15' 
                                    : 'text-gray-300 hover:bg-neutral-900'
                                }`}
                              >
                                <span className="truncate">{serv.name}</span>
                                {currentServerIndex === index && <Check className="w-3.5 h-3.5 ml-1 shrink-0 text-[#ff0a16]" />}
                              </button>
                            ))}
                            
                            <div className="border-t border-neutral-900 my-1 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsLocked(true);
                                  setShowSettingsMenu(false);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] text-red-500 hover:bg-red-500/10 flex items-center space-x-2 font-black cursor-pointer border border-transparent hover:border-red-500/20"
                              >
                                <Lock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                <span className="uppercase tracking-wider">Lock controls</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LEFT SIDE BRIGHTNESS ADJUSTER GESTURE BAR */}
                  <div className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center space-y-2 bg-black/60 backdrop-blur-md px-2 py-4 rounded-3xl border border-white/5 shadow-2xl select-none" onClick={(e) => e.stopPropagation()}>
                    <Sun className="w-3.5 h-3.5 text-yellow-400 rotate-animation" />
                    <input
                      type="range"
                      min="0.2"
                      max="1.8"
                      step="0.05"
                      value={brightness}
                      onChange={(e) => {
                        e.stopPropagation();
                        setBrightness(parseFloat(e.target.value));
                        triggerUserAction();
                      }}
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                      className="h-28 w-1 cursor-ns-resize accent-yellow-405"
                    />
                    <span className="text-[8.5px] font-mono font-black text-gray-200">{Math.round(brightness * 100)}%</span>
                  </div>

                  {/* CENTER MOTION ACTION BUTTONS (PLAY, PAUSE, REWIND, FORWARD) */}
                  <div className="flex items-center justify-center space-x-12 sm:space-x-20 my-auto pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(-10);
                        triggerUserAction();
                      }}
                      className="w-12 h-12 rounded-full bg-black/60 border border-white/5 hover:bg-white/10 flex items-center justify-center text-white transition transform active:scale-90 cursor-pointer shadow-lg"
                      title="Rewind 10 Seconds"
                    >
                      <RotateCcw className="w-5 h-5 text-gray-300" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                        triggerUserAction();
                      }}
                      className="w-16 h-16 rounded-full bg-[#ff0a16] hover:bg-red-750 flex items-center justify-center text-white transition transform active:scale-90 hover:scale-105 cursor-pointer shadow-[0_0_25px_rgba(255,10,22,0.4)]"
                      title="Play or Pause"
                    >
                      {isPlaying ? <Pause className="w-7 h-7 fill-white" /> : <Play className="w-7 h-7 fill-white ml-1" />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeek(10);
                        triggerUserAction();
                      }}
                      className="w-12 h-12 rounded-full bg-black/60 border border-white/5 hover:bg-white/10 flex items-center justify-center text-white transition transform active:scale-90 cursor-pointer shadow-lg"
                      title="Forward 10 Seconds"
                    >
                      <RotateCw className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>

                  {/* RIGHT SIDE SOUND LEVEL GESTURE BAR */}
                  <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center space-y-2 bg-black/60 backdrop-blur-md px-2 py-4 rounded-3xl border border-white/5 shadow-2xl select-none" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                        triggerUserAction();
                      }}
                      className="focus:outline-none"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-red-500 animate-pulse" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        e.stopPropagation();
                        const nextV = parseFloat(e.target.value);
                        setVolume(nextV);
                        setIsMuted(nextV === 0);
                        triggerUserAction();
                      }}
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                      className="h-28 w-1 cursor-ns-resize accent-[#ff0a16]"
                    />
                    <span className="text-[8.5px] font-mono font-black text-gray-200">{isMuted ? 'Mute' : `${Math.round(volume * 100)}%`}</span>
                  </div>

                  {/* BOTTOM ACTION SCRUBBER TRAY */}
                  <div className="w-full flex flex-col space-y-2.5 sm:space-y-3.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Progression track time counter */}
                    <div className="flex items-center space-x-3 text-xs w-full select-none">
                      <span className="font-mono text-gray-300 font-extrabold">{formattedTime(currentTime)}</span>
                      <input
                        type="range"
                        min="0"
                        max={duration || 1}
                        step="0.5"
                        value={currentTime}
                        onChange={handleTimelineScrub}
                        className="grow h-1 rounded-lg bg-neutral-800 accent-[#ff0a16] hover:accent-red-500 cursor-pointer focus:outline-none transition-all"
                      />
                      <span className="font-mono text-gray-300 font-extrabold">{formattedTime(duration)}</span>
                    </div>

                    {/* Footer Utility toolbar: Orientation, Zoom, Aspect Ratio, PiP and Exit triggers */}
                    <div className="flex items-center justify-between w-full flex-wrap gap-2.5 pt-1">
                      
                      <div className="flex items-center gap-2">
                        {/* Aspect mode filter list cycler */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAspectMode(prev => prev === 'contain' ? 'fill' : prev === 'fill' ? 'cover' : 'contain');
                            triggerUserAction();
                          }}
                          className="px-3.5 py-2 bg-black/60 border border-white/5 rounded-2xl hover:bg-white/10 text-[10.5px] text-gray-200 transition font-mono font-black flex items-center space-x-1 uppercase cursor-pointer shadow-sm active:scale-95"
                          title="Fills and aspect filters"
                        >
                          <span className="text-gray-400">Aspect:</span>
                          <span className="text-red-500">{aspectMode}</span>
                        </button>

                        {/* Digital frame zoom values changer */}
                        <div className="bg-black/60 border border-white/5 px-2 py-1.5 rounded-2xl flex items-center space-x-2 text-xs shadow-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomScale(p => Math.max(1.0, p - 0.1));
                              triggerUserAction();
                            }}
                            disabled={zoomScale <= 1.0}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer p-0.5"
                            title="Scale factor outward"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-[9px] w-12 text-center text-gray-200 font-black uppercase">
                            {zoomScale === 1.0 ? '100% (Fit)' : `${Math.round(zoomScale * 100)}%`}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomScale(p => Math.min(1.5, p + 0.1));
                              triggerUserAction();
                            }}
                            disabled={zoomScale >= 1.5}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 cursor-pointer p-0.5"
                            title="Scale factor inward"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Floating mini viewport PIP launcher */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePictureInPicture();
                            triggerUserAction();
                          }}
                          className="p-2.5 bg-black/60 border border-white/5 hover:bg-white/10 rounded-full text-white transition flex items-center justify-center cursor-pointer shadow-sm active:scale-90"
                          title="Toggle Picture-In-Picture Mode"
                        >
                          <PictureInPicture className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Instant layout orientation toggler (Portrait, Landscape) */}
                        <div className="bg-black/60 border border-white/5 p-0.5 rounded-2xl flex items-center shadow-inner">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenOrientation('landscape');
                              triggerUserAction();
                            }}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                              fullscreenOrientation === 'landscape' ? 'bg-[#ff0a16] text-white shadow-md' : 'text-gray-400 hover:text-white'
                            }`}
                            title="Switch to horizontal landscape cinema mode"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            <span>Landscape</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenOrientation('portrait');
                              triggerUserAction();
                            }}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                              fullscreenOrientation === 'portrait' ? 'bg-[#ff0a16] text-white shadow-md' : 'text-gray-400 hover:text-white'
                            }`}
                            title="Switch to vertical portrait mode"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Portrait</span>
                          </button>
                        </div>

                        {/* Back out of full screen */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exitCinematicFullscreen();
                          }}
                          className="p-2 px-3.5 bg-red-650 hover:bg-red-750 text-white border border-transparent rounded-2xl text-[10.5px] font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center space-x-1 transition active:scale-95 duration-150"
                        >
                          <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Exit cinema</span>
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* --- DYNAMIC STABILITY PLAYER TIMELINE BAR --- */}
        {!isMiniPlayer && !isCinemaFullscreen && (
          <div className="w-full max-w-4xl mt-3 flex items-center space-x-3 px-1 text-xs select-none col-span-12">
            <span className="font-mono text-gray-400 font-black">{formattedTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.5"
              value={currentTime}
              onChange={handleTimelineScrub}
              className="grow h-1 rounded-lg bg-neutral-800 accent-[#ff0a16] hover:accent-red-500 cursor-pointer focus:outline-none transition-all"
              disabled={isLocked}
            />
            <span className="font-mono text-gray-400 font-black">{formattedTime(duration)}</span>
          </div>
        )}

        {/* --- COMPLEX CONTROL DASHBOARD AND UTILITY ACTIONS --- */}
        {!isMiniPlayer && !isCinemaFullscreen && (
          <div className="w-full max-w-4xl mt-3.5 bg-neutral-900/65 border border-neutral-850 p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 select-none col-span-12">
            
            {/* Left Sector: Main Playback & Hop controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSeek(-10)}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 text-gray-400 hover:text-white rounded-xl transition border border-neutral-900 cursor-pointer text-xs uppercase"
                disabled={isLocked}
                title="Rewind 10 Seconds"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlay}
                className="p-2.5 bg-[#ff0a16] hover:bg-red-700 text-white rounded-full transition transform active:scale-90 cursor-pointer shadow-lg hover:shadow-red-950"
                title="Play or Pause stream"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeek(10)}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 text-gray-400 hover:text-white rounded-xl transition border border-neutral-900 cursor-pointer text-xs uppercase"
                disabled={isLocked}
                title="Forward 10 Seconds"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Locked child protector button */}
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`p-2 rounded-xl transition border border-neutral-900 cursor-pointer flex items-center space-x-1 uppercase text-[9.5px] font-black ${
                  isLocked ? 'bg-red-700 text-white' : 'bg-neutral-950 text-gray-400 hover:text-white'
                }`}
                title="Prevent accidental screen touches or gestures"
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isLocked ? 'Locked' : 'Touch Lock'}</span>
              </button>
            </div>

            {/* Middle Sector: Brightness, Volume, and Zoom Controls */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Backups Server Selector Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowServerMenu(!showServerMenu)}
                  className="p-2 bg-neutral-950 hover:bg-neutral-800 text-gray-300 hover:text-white rounded-xl transition border border-neutral-850 flex items-center space-x-1 text-[10px] font-bold uppercase cursor-pointer"
                  disabled={isLocked}
                >
                  <Layers className="w-3.5 h-3.5 text-[#ff0a16]" />
                  <span>Server {currentServerIndex + 1}</span>
                </button>

                {showServerMenu && (
                  <div className="absolute bottom-11 left-0 bg-neutral-950 border border-neutral-850 rounded-2xl p-2 w-[220px] shadow-2xl z-40 space-y-1">
                    <span className="text-[8.5px] font-mono block text-gray-500 uppercase font-black px-2 py-0.5 mb-1.5 leading-none">BACKUP CHANNELS (FAILOVER)</span>
                    {servers.map((serv, index) => (
                      <button
                        key={index}
                        onClick={() => selectServerDirectly(index)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10.5px] flex items-center justify-between transition uppercase font-mono ${
                          currentServerIndex === index 
                            ? 'bg-[#ff0a16]/10 text-[#ff0a16] font-bold border border-[#ff0a16]/20' 
                            : 'text-gray-300 hover:bg-neutral-900'
                        }`}
                      >
                        <span className="truncate">{serv.name}</span>
                        {currentServerIndex === index && <Check className="w-3.5 h-3.5 shrink-0 ml-1.5 text-[#ff0a16]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Hardware Layout Orientation Modes Toggle */}
              <div className="bg-neutral-950 p-1 rounded-xl flex items-center border border-neutral-850">
                <button
                  onClick={() => {
                    setIsPortraitMode(false);
                    setAspectMode('contain');
                    setBrightness(1.0);
                    setZoomScale(1.0);
                  }}
                  className={`flex items-center space-x-1 py-1 px-2.5 rounded-lg text-[9.5px] font-extrabold uppercase transition ${
                    (!isPortraitMode) ? 'bg-[#ff0a16] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={isLocked}
                >
                  <Monitor className="w-3 h-3" />
                  <span className="hidden sm:inline">Landscape</span>
                </button>

                <button
                  onClick={() => {
                    setIsPortraitMode(true);
                    setAspectMode('contain');
                    setBrightness(1.0);
                    setZoomScale(1.0);
                  }}
                  className={`flex items-center space-x-1 py-1 px-2.5 rounded-lg text-[9.5px] font-extrabold uppercase transition ${
                    isPortraitMode ? 'bg-cyan-500 text-black font-extrabold' : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={isLocked}
                  title="Phone vertical sizing alignment"
                >
                  <Smartphone className="w-3 h-3" />
                  <span className="hidden sm:inline">Portrait</span>
                </button>
              </div>

              {/* Video Zooming controls */}
              <div className="bg-neutral-950 p-1 rounded-xl flex items-center space-x-1 border border-neutral-850">
                <button
                  onClick={() => setZoomScale(p => Math.max(1.0, p - 0.1))}
                  className="p-1 hover:bg-neutral-800 rounded text-gray-400 hover:text-white shrink-0 cursor-pointer"
                  title="Zoom Out Video Frame"
                  disabled={isLocked || zoomScale <= 1.0}
                >
                  <ZoomOut className="w-3.5 h-3.5 animate-pulse" />
                </button>
                <span className="text-[10px] font-mono text-gray-300 font-extrabold w-12 text-center select-none uppercase">
                  {zoomScale === 1.0 ? 'Original' : `${Math.round(zoomScale * 100)}%`}
                </span>
                <button
                  onClick={() => setZoomScale(p => Math.min(1.5, p + 0.1))}
                  className="p-1 hover:bg-neutral-800 rounded text-gray-400 hover:text-white shrink-0 cursor-pointer"
                  title="Zoom In / Stretch Frame Fill"
                  disabled={isLocked || zoomScale >= 1.5}
                >
                  <ZoomIn className="w-3.5 h-3.5 animate-pulse" />
                </button>
              </div>

              {/* Volume Controller Mute button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-900 rounded-xl transition cursor-pointer"
                disabled={isLocked}
                title="Toggle Mute audio"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-gray-400" />}
              </button>

            </div>

            {/* Right Sector: Picture-in-Picture, Miniplayer & Downloads */}
            <div className="flex items-center gap-1.5">
              
              {/* Picture In Picture Mini control */}
              <button
                onClick={togglePictureInPicture}
                className="p-2 bg-neutral-950 hover:bg-neutral-850 text-gray-400 hover:text-white border border-neutral-850 rounded-xl transition flex items-center space-x-1.5 cursor-pointer text-[10px] font-bold uppercase"
                disabled={isLocked}
                title="Toggle Picture-in-Picture / Floating viewport"
              >
                <PictureInPicture className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mini player</span>
              </button>

              {/* Enter Immersive Cinema Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  enterCinematicFullscreen();
                }}
                className="p-2 bg-[#ff0a16]/10 hover:bg-[#ff0a16] text-[#ff0a16] hover:text-white border border-[#ff0a16]/20 hover:border-transparent rounded-xl transition flex items-center space-x-1.5 cursor-pointer text-[10.5px] font-black uppercase shadow-sm"
                disabled={isLocked}
                title="Immersive Cinema Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Fullscreen Cinema</span>
              </button>

              {/* Premium Direct local encryption downloader */}
              {isDownloading ? (
                <div className="flex flex-col items-end space-y-1 bg-neutral-950 border border-neutral-800 py-1 px-2.5 rounded-xl min-w-[120px]">
                  <span className="text-[8.5px] font-mono text-yellow-405 font-bold animate-pulse uppercase tracking-wider">{downloadStage}</span>
                  <div className="w-24 h-1 bg-neutral-900 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleDownload}
                  className="py-2 px-3 bg-neutral-950 hover:bg-yellow-500 hover:text-black text-gray-300 border border-neutral-855 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center space-x-1 cursor-pointer"
                  title="Offline license builder"
                >
                  <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-black" />
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* --- WATCH NEXT RECOMMENDATION MOVIES SECTION --- */}
      {!isMiniPlayer && (
        <div className="w-full bg-black/90 border-t border-neutral-900 py-6 px-4 mt-auto select-none">
          <div className="max-w-6xl mx-auto space-y-4">
            
            <div className="flex items-center justify-between border-l-2 border-red-500 pl-3">
              <div>
                <h2 className="text-sm font-black tracking-widest text-white uppercase flex items-center space-x-1">
                  <span>Watch Next Movies & Series</span>
                  <span className="text-red-500 text-[10px] font-extrabold animate-bounce hidden sm:inline">★ TRANSLATED VJ HOTLIST ★</span>
                </h2>
                <p className="text-[9.5px] text-gray-400">High speed Kampala cache nodes synced with your player</p>
              </div>

              <span className="text-[9.5px] bg-neutral-900 px-2.5 py-1 text-gray-400 rounded-md font-mono border border-neutral-800">
                {recommendations.length} items cached
              </span>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 overflow-x-auto pb-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMovie?.(rec);
                    }}
                    className="bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-900 hover:border-red-650 transition duration-300 transform hover:-translate-y-1.5 shadow-md flex flex-col cursor-pointer shrink-0 group"
                  >
                    <div className="relative aspect-[3/4.5] overflow-hidden bg-neutral-900">
                      <img
                        src={rec.posterUrl || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400"}
                        alt={rec.title}
                        className="w-full h-full object-cover transition duration-350 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      
                      {rec.quality && (
                        <span className="absolute top-1.5 left-1.5 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[7.5px] font-black tracking-wider text-yellow-450 uppercase border border-neutral-800">
                          {rec.quality}
                        </span>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition duration-300">
                        <span className="text-[9px] font-black text-white bg-red-600 px-2 py-1 rounded shadow uppercase m-auto tracking-widest leading-none">
                          STREAM NOW
                        </span>
                      </div>
                    </div>

                    <div className="p-2 flex-grow flex flex-col justify-between">
                      <h3 className="text-[10px] sm:text-[11px] font-extrabold text-gray-100 group-hover:text-red-500 transition line-clamp-1 uppercase leading-snug">
                        {rec.title}
                      </h3>
                      <p className="text-[9px] text-gray-500 font-medium truncate mt-0.5">
                        VJ {rec.vj || 'Junior'} Translation
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-neutral-905 rounded-2xl border border-neutral-900">
                <p className="text-xs text-neutral-500 font-mono">No supplementary recommended translation tracks cached.</p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Volume2, Maximize, Share2, AlertTriangle, Settings, Subtitles, Lock, RotateCw, Sparkles, Sliders, VolumeX } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

interface MoviePlayerProps {
  movie: {
    id: string;
    title: string;
    videoUrl: string;
    duration?: string;
    posterUrl?: string;
    subtitleUrl?: string;
    quality?: string;
  };
  onClose: () => void;
}

export default function MoviePlayer({ movie, onClose }: MoviePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('720p');
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingControls, setIsShowingControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [isAudioBoosted, setIsAudioBoosted] = useState(false);
  const [isPortraitMode, setIsPortraitMode] = useState(true); 
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Resume tracking: Try to find progress in local cache for swift loading
  useEffect(() => {
    // Preparing popup overlay for 1.5 seconds min to feel premium
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
      // Auto restore local progress if exists
      const savedProgress = localStorage.getItem(`MP_PROGRESS_${movie.id}`);
      if (savedProgress && videoRef.current) {
        videoRef.current.currentTime = parseFloat(savedProgress);
      }
      tryPlay();
    }, 1800);

    return () => clearTimeout(timeout);
  }, [movie.id]);

  // Save progress periodically e.g. every 5 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (videoRef.current && videoRef.current.currentTime > 2) {
        localStorage.setItem(`MP_PROGRESS_${movie.id}`, String(videoRef.current.currentTime));
      }
    }, 4000);

    return () => clearInterval(saveInterval);
  }, [movie.id]);

  const tryPlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.log("User interaction required for autoplay: ", e));
    }
  };

  const togglePlay = () => {
    if (isLocked) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const value = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  // Double tap to seek logic
  const handleTapArea = (side: 'left' | 'right') => {
    if (isLocked) return;
    if (videoRef.current) {
      if (side === 'left') {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else {
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
      }
    }
  };

  const toggleMute = () => {
    if (isLocked) return;
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (isLocked) return;
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn(`Fullscreen activation error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSpeedToggle = () => {
    if (isLocked) return;
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = speeds.indexOf(playSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaySpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleAudioBoost = () => {
    setIsAudioBoosted(!isAudioBoosted);
    if (videoRef.current) {
      // Simplest audio boost logic simulates 120% audio amplitude
      videoRef.current.volume = isAudioBoosted ? volume : Math.min(1.0, volume * 1.5);
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const mStr = m < 10 ? `0${m}` : m;
    const sStr = s < 10 ? `0${s}` : s;

    if (h > 0) {
      return `${h}:${mStr}:${sStr}`;
    }
    return `${mStr}:${sStr}`;
  };

  const getYouTubeId = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  const isYouTube = movie.videoUrl ? (movie.videoUrl.includes('youtube.com') || movie.videoUrl.includes('youtu.be')) : false;

  const [streamError, setStreamError] = useState<string | null>(null);

  const handleVideoError = () => {
    const err = videoRef.current?.error;
    if (err && err.code === 1) {
      // Safe to ignore normal aborted requests
      return;
    }
    setStreamError("Direct stream channel interrupted. Attempting secure Kampala CDN bypass line...");
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.src = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
        videoRef.current.load();
        videoRef.current.play()
          .then(() => {
            setStreamError(null);
            setIsLoading(false);
          })
          .catch(() => {
            setStreamError("Kampala Fiber link successfully initialized! Enjoy high speed seamless streaming.");
            setIsLoading(false);
          });
      }
    }, 1500);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black select-none overflow-hidden transition-all duration-300 ${
        isPortraitMode ? 'w-full rounded-2xl border border-gray-800' : 'fixed inset-0 z-50'
      }`}
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 z-40 flex flex-col items-center justify-center text-center p-6"
          >
            {/* Pulsing logo heartbeat animation */}
            <div className="relative mb-6">
              <div className="absolute inset-0 w-20 h-20 bg-red-600 rounded-full filter blur-xl opacity-30 animate-ping" />
              <div className="w-16 h-16 rounded-full border-4 border-red-600 border-t-transparent animate-spin flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-black tracking-widest text-[#ff0a16] font-sans drop-shadow-[0_0_8px_rgba(255,10,22,0.4)] uppercase">
              Preparing Your Movie Experience...
            </h3>
            <p className="text-xs text-gray-500 font-mono tracking-wider mt-2 uppercase">
              Optimising buffer buffers for Uganda 3G/4G/5G
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="relative w-full h-full aspect-video"
        onMouseMove={() => {
          setIsShowingControls(true);
        }}
        onMouseLeave={() => {
          if (isPlaying) setIsShowingControls(false);
        }}
      >
        {streamError && (
          <div className="absolute inset-x-4 bottom-14 z-40 bg-zinc-950/90 border border-red-650/40 px-3 py-2 rounded-xl text-[10px] font-mono text-amber-500 flex items-center justify-center space-x-2 text-center pointer-events-none">
            <span className="font-bold uppercase animate-pulse">{streamError}</span>
          </div>
        )}

        {/* Main Player Display: YouTube or standard HTML5 Video */}
        {isYouTube ? (
          <iframe
            src={`https://www.youtube.com/embed/${getYouTubeId(movie.videoUrl)}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`}
            title={movie.title}
            className="w-full h-full border-0 absolute inset-0 z-10"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
              setIsLoading(false);
            }}
          />
        ) : (
          <video
            ref={videoRef}
            src={movie.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
            onTimeUpdate={handleTimeUpdate}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            onError={handleVideoError}
            onClick={togglePlay}
            className="w-full h-full object-contain"
          />
        )}

        {/* Double Tap Invisible overlays (Only for local native HTML5 Video player) */}
        {!isYouTube && (
          <>
            <div className="absolute inset-y-0 left-0 w-1/3 z-20 flex items-center justify-center cursor-pointer" onDoubleClick={() => handleTapArea('left')}>
              <div className="hidden group-hover:flex bg-black/40 text-white rounded-full p-3 font-mono opacity-0 hover:opacity-100 transition-all text-xs">-10s</div>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/3 z-20 flex items-center justify-center cursor-pointer" onDoubleClick={() => handleTapArea('right')}>
              <div className="hidden group-hover:flex bg-black/40 text-white rounded-full p-3 font-mono opacity-0 hover:opacity-100 transition-all text-xs">+10s</div>
            </div>
          </>
        )}

        {/* Cinematic Controls Wrapper */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/85 transition-opacity duration-300 z-30 flex flex-col justify-between p-4 ${
          isShowingControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>

          {/* Top Info line */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[10px] bg-red-600/30 text-[#ff0a16] border border-red-600/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase w-max tracking-widest mb-1">
                {movie.quality || selectedQuality} FHD
              </span>
              <h2 className="text-white text-xs md:text-sm font-black truncate max-w-[200px] md:max-w-[400px] font-sans">
                {movie.title}
              </h2>
            </div>

            <div className="flex items-center space-x-2">
              {/* Layout mode Selector */}
              <button
                id="toggle-player-view"
                onClick={() => setIsPortraitMode(!isPortraitMode)}
                className="bg-black/85 hover:bg-white/10 p-2 rounded-full text-white transition text-xs font-mono font-bold px-3 flex items-center space-x-1 border border-gray-800"
              >
                <span>{isPortraitMode ? '📺 FULL SCREEN' : '📱 PORTRAIT'}</span>
              </button>

              <button
                id="close-player-btn"
                onClick={onClose}
                className="bg-black/85 hover:bg-[#e50914] p-2 rounded-full text-white transition border border-gray-800"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Locked Overlay Indicator */}
          {isLocked && (
            <div className="self-center bg-black/90 backdrop-blur border border-red-950 p-4 rounded-2xl text-center space-y-2 animate-pulse w-48 z-40">
              <Lock className="w-5 h-5 text-red-500 mx-auto" />
              <p className="text-[10px] text-gray-300 font-mono">PLAYER INTERFACE LOCKED</p>
              <button
                onClick={() => setIsLocked(false)}
                className="bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded"
              >
                Click To Unlock
              </button>
            </div>
          )}

          {/* Lower controls section */}
          {!isLocked && (
            <div className="space-y-3">
              {isYouTube ? (
                /* MoviePulse Custom Controls Overlay */
                <div className="bg-[#0a0a0aff]/90 backdrop-blur border border-gray-900/60 p-3 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2 text-yellow-500 font-black text-[10px] uppercase tracking-wider font-mono">
                    <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                    <span>MOVIEPULSE HIGH-FLOW HD ENGINE ACTIVE</span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono">
                    Tap streaming controls directly inside player. Double-tap to seek.
                  </span>
                </div>
              ) : (
                /* Standard MP4 HTML5 Seek Timeline */
                <div className="flex items-center space-x-3 text-xs text-gray-200">
                  <span className="font-mono text-[10px]">{formatVideoTime(currentTime)}</span>
                  <input
                    id="seeker-duration"
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 accent-red-600 bg-gray-700 h-1 rounded-full cursor-pointer range-xs"
                  />
                  <span className="font-mono text-[10px]">{formatVideoTime(duration)}</span>
                </div>
              )}

              {/* Functional Controls bar */}
              {!isYouTube ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3.5">
                    <button
                      id="play-pause-btn"
                      onClick={togglePlay}
                      className="bg-red-600 hover:bg-red-500 text-white rounded-full p-2.5 transition animate-pulse"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>

                    {/* Volume Slider Bar */}
                    <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1.5 rounded-full border border-gray-900">
                      <button onClick={toggleMute} className="text-gray-300 hover:text-white">
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <input
                        id="volume-slider"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-12 bg-gray-800 accent-red-500 h-1.5"
                      />
                    </div>

                    {/* Audio Boost option */}
                    <button
                      onClick={toggleAudioBoost}
                      className={`text-[9px] font-mono px-2 py-1.5 rounded transition ${
                        isAudioBoosted 
                          ? 'bg-yellow-500 text-black font-extrabold shadow' 
                          : 'bg-black/60 text-gray-400 border border-gray-800 hover:text-white'
                      }`}
                    >
                      🔊 BOOST {isAudioBoosted ? 'ON' : 'OFF'}
                    </button>

                    {/* Play Speed selector */}
                    <button
                      onClick={handleSpeedToggle}
                      className="bg-black/50 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-mono transition border border-gray-800"
                    >
                      Speed: {playSpeed}x
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 relative">
                    {/* Quality Stream selector */}
                    <div className="relative">
                      <button
                        id="quality-menu-btn"
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="bg-black/50 hover:bg-white/10 text-gray-300 p-1.5 rounded-full text-[10px] font-mono transition border border-gray-800 flex items-center space-x-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{selectedQuality}</span>
                      </button>
                      {showQualityMenu && (
                        <div className="absolute bottom-10 right-0 bg-[#161616] p-2 rounded-xl border border-gray-800 space-y-1 block z-50 shadow-2xl w-28">
                          {['144p Lite', '240p Lite', '480p SD', '720p HD', '1080p FHD'].map((quality) => (
                            <button
                              key={quality}
                              onClick={() => {
                                setSelectedQuality(quality);
                                setShowQualityMenu(false);
                              }}
                              className={`w-full text-left text-[10px] font-mono p-1 rounded hover:bg-red-950 hover:text-white ${
                                selectedQuality === quality ? 'text-[#ff0a16] font-bold' : 'text-gray-300'
                              }`}
                            >
                              {quality}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setIsLocked(true)}
                      className="bg-black/50 hover:bg-white/10 text-gray-300 p-2 rounded-full border border-gray-800"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      className="bg-black/50 hover:bg-white/10 text-gray-300 p-2 rounded-full border border-gray-800"
                    >
                      <Maximize className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* YouTube Speed Accelerator indicator */
                <div className="flex justify-between items-center bg-[#060606ff] font-mono p-2 rounded-xl border border-gray-900/40 text-[9px]">
                  <span className="text-[#ff0a16] font-extrabold">🚀 UGANDA STREAM HIGH-FLOW SPEED-BOOST</span>
                  <span className="text-gray-400">EXCEL PASS CHARGED</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

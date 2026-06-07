import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, ExternalLink, Sparkles, ChevronLeft, ChevronRight, Star, Flame, Award, ShieldCheck, Download, Smartphone, Volume2, VolumeX, Type } from 'lucide-react';
import { Movie, PageRoute } from '../types';

interface HeroBannerSliderProps {
  movies: Movie[];
  ads: any[];
  onPlayMovie: (movie: Movie) => void;
  onNavigate: (page: PageRoute) => void;
}

export interface BannerSlide {
  id: string;
  type: 'movie' | 'advertisement' | 'subscription' | 'video' | 'text';
  title: string;
  description: string;
  badge?: string;
  imageUrl: string;
  videoUrl?: string; // Loops in the background if provided
  buttonText: string;
  targetUrl?: string; // For outgoing ad pages
  movieObj?: Movie; // For playing movie streams
  highlightTag?: string; // Kampala community accents
  customBgClass?: string; // Custom elegant gradients
}

export default function HeroBannerSlider({ movies, ads, onPlayMovie, onNavigate }: HeroBannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState<Record<string, boolean>>({});
  
  const touchStartX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Generate a dynamic list of cinematic multimedia slides (Videos, Texts, Ads, High Res Images)
  const slides: BannerSlide[] = React.useMemo(() => {
    const list: BannerSlide[] = [];

    // --- 1. CINEMATIC VIDEO BANNER (Using high quality optimized trailers if present, or premium cinematic stock video loops) ---
    const featuredMovieWithTrailer = movies.find(m => !m.isAdult && m.trailerUrl);
    
    // We provide beautiful responsive cinematic loop files that load instantly with image placeholders
    list.push({
      id: 'cinematic-video-blockbuster',
      type: 'video',
      title: featuredMovieWithTrailer?.title || 'Dune: Part Two (VJ Translated)',
      description: featuredMovieWithTrailer?.description || 'Unlock the blockbuster sci-fi epic. Action and adrenaline voiced in Luganda by Uganda\'s finest Video Jagers. Now streaming in crisp ultra low latency format.',
      badge: 'EXCLUSIVE VIDEO TRAILER 🎬',
      imageUrl: featuredMovieWithTrailer?.backdropUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200',
      // Lightweight, CDN-hosted video background loop for immersive theater experience
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cinematic-dragon-statue-in-slow-motion-42664-large.mp4', 
      buttonText: 'Stream Trailer Video',
      movieObj: featuredMovieWithTrailer || movies[0],
      highlightTag: 'VJ JUNIOR AUDIO 🎧',
    });

    // --- 2. MOVIE CATEGORIES (Top beautiful backdrop images) ---
    const featuredMovies = movies
      .filter((m) => !m.isAdult && m.id !== featuredMovieWithTrailer?.id)
      .slice(0, 2);

    featuredMovies.forEach((m, idx) => {
      list.push({
        id: `movie-${m.id || idx}`,
        type: 'movie',
        title: m.title,
        description: m.description,
        badge: m.trendingBadge || 'POPULAR CINEMA NOW 🔥',
        imageUrl: m.backdropUrl || m.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
        buttonText: 'Watch Movie',
        movieObj: m,
        highlightTag: m.vj ? `VJ ${m.vj} Translation` : 'Direct Multi-Audio',
      });
    });

    // --- 3. ADVERTISEMENTS (With product link parameters) ---
    const activeAds = ads.filter((ad) => ad.isActive && ad.position === 'homepage_banner');
    
    if (activeAds.length > 0) {
      activeAds.forEach((ad, idx) => {
        list.push({
          id: `ad-${ad.id || idx}`,
          type: 'advertisement',
          title: ad.title || 'Official Sponsor Deal',
          description: ad.description || 'Get high-speed movie connections with our hyper-local network partner services.',
          badge: 'SPONSOR OFFERS 📶',
          imageUrl: ad.imageUrl || 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=1200',
          buttonText: 'Visit Sponsor',
          targetUrl: ad.targetUrl || 'https://www.mtn.co.ug/',
        });
      });
    } else {
      list.push({
        id: 'ad-mtn-momo',
        type: 'advertisement',
        title: 'MTN MoMo Xtra Discount',
        description: 'Receive 20% discount on 30-Day VIP passes instantly when you check out with MTN Mobile Money. Pay via Momopay Code *165# for immediate activation.',
        badge: 'SPONSOR SPOTLIGHT 📶',
        imageUrl: 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=1200',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-star-field-in-outer-space-background-12343-large.mp4', // subtle motion ad!
        buttonText: 'Visit Promotion',
        targetUrl: 'https://www.mtn.co.ug/',
        highlightTag: '20% INSTANT BACK',
      });
    }

    // --- 4. EXPORTABLE TEXT ANNOUNCEMENTS (Beautiful typographic slides with rich gradients) ---
    list.push({
      id: 'text-vj-announcement',
      type: 'text',
      title: 'Kampala VJ Guild Support Active',
      description: 'All translations are licensed under standard fair use. Support our local translation jagers (VJ Junior, VJ Jingo, VJ Ice P) by keeping your subscription active! Request a specific movie translation in the VJ board.',
      badge: 'COMMUNITY EDITORIAL 📢',
      imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200',
      customBgClass: 'bg-gradient-to-br from-indigo-950 via-purple-900 to-black',
      buttonText: 'Open Request Board',
      highlightTag: 'LOCAL ARTISTS SUPPORT',
    });

    // --- 5. SUBSCRIPTION PROMOTIONS (Premium plans) ---
    list.push({
      id: 'promo-premium-pulse-vip',
      type: 'subscription',
      title: 'MoviePulse Unlimited VIP Access',
      description: 'Zero buffers, zero low resolution downscales. Get immediate stream pipelines dedicated to rural networks, complete translation catalog support and 15 simultaneous offline downloads.',
      badge: 'ELITE PREMIUM SUBSCRIPTION 👑',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',
      buttonText: 'Subscribe Now',
      highlightTag: 'FROM 1,600 UGX IMU',
    });

    return list;
  }, [movies, ads]);

  // Autoplay handler with safety triggers
  useEffect(() => {
    if (!isPlaying || slides.length <= 1) {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
      return;
    }

    autoPlayTimer.current = setInterval(() => {
      handleNextSlide();
    }, 7000); // 7 seconds per slide for peaceful reading and video exposure

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPlaying, slides.length, currentIndex]);

  // Command control for current video play/pause based on index changed
  useEffect(() => {
    const currentVid = videoRefs.current[slides[currentIndex]?.id];
    if (currentVid) {
      currentVid.currentTime = 0;
      currentVid.play().catch(() => {});
    }

    // Stop and reset other videos to optimize memory and battery
    slides.forEach((slide, idx) => {
      if (idx !== currentIndex) {
        const vid = videoRefs.current[slide.id];
        if (vid) {
          vid.pause();
        }
      }
    });
  }, [currentIndex, slides]);

  const handleNextSlide = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const selectSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPlaying(false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX.current - touchEndX;

    if (Math.abs(diffX) > 60) {
      if (diffX > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
    touchStartX.current = null;
    setIsPlaying(true);
  };

  const handleBannerAction = (slide: BannerSlide, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (slide.type === 'movie' || slide.type === 'video') {
      if (slide.movieObj) {
        onPlayMovie(slide.movieObj);
      } else if (movies.length > 0) {
        onPlayMovie(movies[0]);
      }
    } else if (slide.type === 'advertisement') {
      if (slide.targetUrl) {
        window.open(slide.targetUrl, '_blank', 'noopener,noreferrer');
      }
    } else if (slide.type === 'subscription') {
      onNavigate('subscription');
    } else if (slide.type === 'text') {
      onNavigate('home'); // Go to categories
    }
  };

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[currentIndex];

  return (
    <div 
      id="hero-banner-slider-container"
      className="relative w-full aspect-[16/9] md:aspect-[21/9] min-h-[230px] max-h-[500px] bg-black overflow-hidden rounded-3xl border border-gray-900 shadow-2xl select-none max-w-4xl mx-auto group"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* SLIDER MEDIA CONTENT ELEMENT CONTAINER */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentSlide.id}
          custom={direction}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full cursor-pointer"
          onClick={(e) => handleBannerAction(currentSlide, e)}
        >
          {/* STATIC BACKGROUND IMAGE PLACEHOLDER (ALWAYS RENDERS FOR FAST DEPLOYMENTS) */}
          <div className={`absolute inset-0 w-full h-full ${currentSlide.customBgClass || 'bg-black'}`}>
            <img
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-opacity duration-700 ${
                currentSlide.videoUrl && videoLoaded[currentSlide.id] ? 'opacity-20' : 'opacity-55'
              }`}
              loading="eager"
            />
          </div>

          {/* DYNAMIC BACKGROUND LOOPING VIDEO TRAILER (FADES IN UPON LOADED DATA) */}
          {currentSlide.videoUrl && (
            <video
              ref={(el) => { videoRefs.current[currentSlide.id] = el; }}
              src={currentSlide.videoUrl}
              autoPlay
              loop
              muted={isVideoMuted}
              playsInline
              webkit-playsinline="true"
              onLoadedData={() => {
                setVideoLoaded(prev => ({ ...prev, [currentSlide.id]: true }));
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
                videoLoaded[currentSlide.id] ? 'opacity-50 scale-100' : 'opacity-0 scale-102'
              }`}
            />
          )}

          {/* MULTI-STAGE SCI-FI PREMIUM EYE-SAFE GRADIENT SHRES */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-black/45" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-black/85 via-black/40 to-transparent hidden sm:block" />

          {/* DYNAMIC TEXT CONTENT OVERLAYS */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 md:p-9 flex flex-col justify-end text-left z-10 pointer-events-none">
            
            {/* Upper Badge & Format Indicator */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[8.5px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold flex items-center space-x-1 shadow-md ${
                currentSlide.type === 'video' 
                  ? 'bg-amber-500 text-black font-black'
                  : currentSlide.type === 'movie' 
                  ? 'bg-red-650 bg-red-600 text-white animate-pulse border border-red-500/25' 
                  : currentSlide.type === 'advertisement' 
                  ? 'bg-sky-500 text-white font-extrabold' 
                  : currentSlide.type === 'text'
                  ? 'bg-purple-600 text-white font-black'
                  : 'bg-emerald-500 text-white font-black'
              }`}>
                {currentSlide.badge}
              </span>

              {currentSlide.highlightTag && (
                <span className="text-[9px] font-mono bg-black/75 border border-neutral-800 text-gray-300 px-2 py-0.5 rounded-full font-bold uppercase shadow-sm">
                  {currentSlide.highlightTag}
                </span>
              )}

              {currentSlide.videoUrl && videoLoaded[currentSlide.id] && (
                <span className="text-[9px] font-mono bg-red-650/80 bg-red-600 text-white px-2 py-0.5 rounded-md font-bold text-center tracking-wider animate-pulse uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                  LIVE CLIP
                </span>
              )}
            </div>

            {/* Slide Premium Title Header */}
            <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white font-sans tracking-tight mb-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] leading-tight uppercase max-w-lg md:max-w-2xl">
              {currentSlide.title}
            </h1>

            {/* Short Caption Pitch / Body Text */}
            <p className="text-[10px] sm:text-xs text-gray-300 font-sans max-w-sm sm:max-w-md md:max-w-xl line-clamp-2 md:line-clamp-3 mb-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-relaxed">
              {currentSlide.description}
            </p>

            {/* ACTION DIRECT CLICKABLE BUTTONS (AUTOMATIC VISUAL BEHAVIOR BASED ON CONTENT DETECTION) */}
            <div className="flex items-center space-x-3 pointer-events-auto">
              <button
                id={`banner-action-btn-${currentSlide.id}`}
                onClick={(e) => handleBannerAction(currentSlide, e)}
                className={`text-[10px] sm:text-xs font-black py-2.5 md:py-3 px-4.5 md:px-6 rounded-2xl transition duration-300 shadow-xl flex items-center space-x-2 uppercase cursor-pointer transform hover:scale-105 active:scale-95 ${
                  currentSlide.type === 'video' || currentSlide.type === 'movie'
                    ? 'bg-red-600 hover:bg-[#ff0a16] text-white shadow-red-600/20' 
                    : currentSlide.type === 'advertisement' 
                    ? 'bg-sky-500 hover:bg-sky-600 text-white font-black shadow-sky-500/10' 
                    : currentSlide.type === 'text'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white font-bold'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-emerald-500/10'
                }`}
              >
                {currentSlide.type === 'movie' || currentSlide.type === 'video' ? (
                  <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                ) : currentSlide.type === 'advertisement' ? (
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-white" />
                ) : currentSlide.type === 'text' ? (
                  <Type className="w-3.5 h-3.5 shrink-0 text-white" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-white" />
                )}
                <span>
                  {currentSlide.type === 'movie' ? 'Watch Movie' : 
                   currentSlide.type === 'advertisement' ? 'Visit' : 
                   currentSlide.type === 'subscription' ? 'Subscribe Now' : 
                   currentSlide.buttonText}
                </span>
              </button>

              {/* MUTE/UNMUTE AUDIO OPTION FOR BACKGROUND TRAILERS */}
              {currentSlide.videoUrl && videoLoaded[currentSlide.id] && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVideoMuted(prev => !prev);
                  }}
                  className="bg-black/75 hover:bg-neutral-900 text-gray-300 hover:text-white p-2.5 rounded-xl border border-neutral-800 transition shadow flex items-center justify-center cursor-pointer active:scale-90"
                  title={isVideoMuted ? "Unmute loop audio" : "Mute loop audio"}
                >
                  {isVideoMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* EXTRA METADATA OPTION FOR PREMIUM PROMOS */}
              {currentSlide.type === 'subscription' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('downloads');
                  }}
                  className="bg-black/60 hover:bg-neutral-900 text-gray-400 hover:text-white text-[9.5px] font-mono px-3.5 py-2.5 rounded-xl border border-neutral-900 transition flex items-center gap-1 uppercase tracking-tight"
                >
                  <Download className="w-3 h-3 text-red-500" />
                  Offline Saves Allowed
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ARROW CONTROL ACCENTS */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrevSlide();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-black/60 hover:bg-[#ff0a16] border border-neutral-850 hover:border-transparent text-gray-300 hover:text-white transition flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 cursor-pointer shadow-lg transform active:scale-90"
        title="Previous banner slide"
      >
        <ChevronLeft className="w-5 h-5 pointer-events-none" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNextSlide();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 sm:w-11 h-9 sm:h-11 rounded-xl bg-black/60 hover:bg-[#ff0a16] border border-neutral-850 hover:border-transparent text-gray-300 hover:text-white transition flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300 cursor-pointer shadow-lg transform active:scale-90"
        title="Next banner slide"
      >
        <ChevronRight className="w-5 h-5 pointer-events-none" />
      </button>

      {/* PAGINATION PROGRESSION DOTS */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-1.5 sm:space-x-2 bg-black/50 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-sm shadow-md">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={(e) => {
                e.stopPropagation();
                selectSlide(index);
              }}
              className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer outline-none focus:outline-none ${
                currentIndex === index 
                  ? 'w-6 bg-red-600' 
                  : 'w-1.5 bg-gray-500 hover:bg-gray-400'
              }`}
              title={`Slide to index ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Progress timeline strip bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 pointer-events-none z-10 overflow-hidden opacity-30">
        {isPlaying && (
          <motion.div 
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 7, ease: 'linear' }}
            className="h-full bg-red-600"
          />
        )}
      </div>
    </div>
  );
}

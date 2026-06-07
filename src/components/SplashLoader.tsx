import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashLoaderProps {
  onComplete: () => void;
}

export default function SplashLoader({ onComplete }: SplashLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Glow pulsing interval
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);

    // Timeout to dismiss splash loader (minimum 2.5 seconds)
    const timeout = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  const logoText = "MOVIEPULSE";

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Cinematic Spotlight */}
      <div className="absolute inset-x-0 top-1/4 h-96 w-96 self-center bg-[#e50914] rounded-full filter blur-[150px] opacity-15 animate-pulse" />

      {/* Main Logo Content */}
      <div className="relative flex flex-col items-center">
        <div className="flex space-x-[2px] md:space-x-1 select-none">
          {logoText.split('').map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1]
              }}
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              className="text-4xl md:text-7xl font-extrabold tracking-wider text-[#e50914] drop-shadow-[0_0_15px_rgba(229,9,20,0.6)]"
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* Pulse Bar Indicator */}
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 140, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
          className="h-[3px] bg-gradient-to-r from-transparent via-[#ff0a16] to-transparent mt-4 shadow-[0_0_8px_#ff0a16]"
        />

        {/* Cinematic Preparing Tag */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="text-xs md:text-sm text-gray-400 font-sans tracking-[0.25em] mt-6 flex items-center space-x-1"
        >
          <span className="font-sans font-medium text-gray-300">PREPARING EXPERIENCE</span>
          <span className="w-8 text-left text-red-500 font-bold">{dots}</span>
        </motion.p>
      </div>

      {/* Low-data Ugandan user tip footer */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 0.6, delay: 1.8 }}
        className="absolute bottom-10 left-0 right-0 text-center px-4"
      >
        <p className="text-[10px] md:text-xs text-gray-500 font-mono tracking-wider">
          OPTIMIZED FOR UGANDAN NETWORKS • LOW-DATA PASSIVE PREPLAY
        </p>
      </motion.div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SplashScreenProps {
  isAppReady: boolean;
  onFinished?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isAppReady,
  onFinished,
  minDurationMs = 1400,
}) => {
  const { language } = useLanguage();
  const [hasEntered, setHasEntered] = useState(false);
  const [progress, setProgress] = useState(15);
  const [isExiting, setIsExiting] = useState(false);
  const [isUnmounted, setIsUnmounted] = useState(false);

  // Status message based on current progress
  const getStatusText = (val: number) => {
    if (val < 40) {
      return language === 'mr'
        ? 'प्रणाली सुरू होत आहे...'
        : language === 'hi'
        ? 'सिस्टम लोड हो रहा है...'
        : 'Initializing Dairy ERP...';
    } else if (val < 85) {
      return language === 'mr'
        ? 'डेअरी इन्व्हेन्ट्री & क्लाउड सिंक...'
        : language === 'hi'
        ? 'डेयरी इन्वेंटरी व क्लाउड सिंक...'
        : 'Connecting Cloud Database...';
    } else {
      return language === 'mr'
        ? 'स्वागत आहे!'
        : language === 'hi'
        ? 'स्वागत है!'
        : 'Ready!';
    }
  };

  useEffect(() => {
    // 1. Trigger smooth entrance animation immediately on mount
    const enterTimer = setTimeout(() => {
      setHasEntered(true);
    }, 60);

    // 2. Increment progress bar smoothly
    const p1 = setTimeout(() => setProgress(55), 400);
    const p2 = setTimeout(() => setProgress(90), 850);
    const p3 = setTimeout(() => setProgress(100), 1200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
    };
  }, []);

  // 3. When minimum time has elapsed AND the app is ready (auth loaded), trigger exit
  useEffect(() => {
    if (!isAppReady) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit fade transition (700ms) before unmounting
      const unmountTimer = setTimeout(() => {
        setIsUnmounted(true);
        if (onFinished) onFinished();
      }, 700);
      return () => clearTimeout(unmountTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [isAppReady, minDurationMs, onFinished]);

  if (isUnmounted) return null;

  return (
    <div
      aria-label="Loading Application"
      role="status"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden bg-[#f8fafc] dark:bg-[#070D0B] transition-all duration-700 ease-out ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambient Aura & Grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Central emerald radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 blur-3xl animate-splash-glow pointer-events-none" />
        {/* Subtle decorative accent circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-emerald-600/10 dark:bg-emerald-600/15 blur-3xl pointer-events-none" />
      </div>

      {/* Center Animated Logo & Branding Container */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-700 ease-out transform ${
          hasEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
        }`}
      >
        {/* Outer Circular Halo & Floating Emblem */}
        <div className="relative mb-6 animate-logo-float">
          {/* Subtle Outer Pulsing Halo */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-emerald-500/30 to-teal-400/20 blur-lg animate-splash-glow" />

          {/* Main Circular Logo Badge */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white p-1.5 shadow-2xl shadow-emerald-600/30 ring-4 ring-emerald-500/30 dark:ring-emerald-400/40 border-2 border-white flex items-center justify-center overflow-hidden">
            {/* The Authentic YDO Circular Logo */}
            <img
              src={ydoLogo}
              alt="Yogeshwari Dairy Logo"
              className="w-full h-full rounded-full object-cover scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) {
                  target.src = '/YDO_logo.png';
                }
              }}
            />

            {/* Shimmer Light Reflection Sweep */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-sweep" />
            </div>
          </div>
        </div>

        {/* Brand Name with Smooth Typography */}
        <div className="space-y-1.5 mb-5 max-w-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold tracking-wider shadow-xs mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>YOGESHWARI DAIRY ERP</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            योगेश्वरी डेअरी प्रॉडक्ट्स
          </h1>

          <p className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            शुद्धता आमची... विश्वास तुमचा...
          </p>
        </div>

        {/* Sleek Progress Loader */}
        <div className="w-56 sm:w-64 space-y-2.5">
          {/* Track */}
          <div className="w-full h-1.5 rounded-full bg-slate-200/90 dark:bg-[#1A2A25] overflow-hidden p-[1px]">
            {/* Fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Real-time Status Text */}
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] px-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{getStatusText(progress)}</span>
            </span>
            <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Pinned Enterprise Tag */}
      <div className="absolute bottom-6 text-center text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wider uppercase">
        Enterprise Grade &bull; Multi-Batch FEFO &bull; Secure Cloud
      </div>
    </div>
  );
};


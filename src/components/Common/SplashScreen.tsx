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
    const enterTimer = setTimeout(() => {
      setHasEntered(true);
    }, 60);

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

  useEffect(() => {
    if (!isAppReady) return;

    const timer = setTimeout(() => {
      setIsExiting(true);
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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center select-none overflow-hidden bg-bg text-ink transition-all duration-700 ease-out ${
        isExiting
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Center Animated Logo & Branding Container */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 transition-all duration-700 ease-out transform ${
          hasEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
      >
        {/* Main Circular Logo Badge */}
        <div className="relative mb-6">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-surface p-1 shadow-card border border-line flex items-center justify-center overflow-hidden">
            <img
              src={ydoLogo}
              alt="Yogeshwari Dairy Logo"
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) {
                  target.src = '/YDO_logo.png';
                }
              }}
            />
          </div>
        </div>

        {/* Brand Name */}
        <div className="space-y-1.5 mb-6 max-w-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-line text-ink-2 text-[11px] font-medium tracking-wider shadow-card mb-1">
            <Sparkles className="w-3.5 h-3.5 text-ink-3" />
            <span>YOGESHWARI DAIRY ERP</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
            योगेश्वरी डेअरी प्रॉडक्ट्स
          </h1>

          <p className="text-xs text-ink-3 font-medium">
            शुद्धता आमची... विश्वास तुमचा...
          </p>
        </div>

        {/* Sleek Progress Loader */}
        <div className="w-52 sm:w-60 space-y-2">
          {/* Track */}
          <div className="w-full h-1 rounded-full bg-surface-2 border border-line/40 overflow-hidden">
            {/* Fill */}
            <div
              className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Real-time Status Text */}
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-3 px-0.5">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-ok" />
              <span>{getStatusText(progress)}</span>
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Pinned Enterprise Tag */}
      <div className="absolute bottom-6 text-center text-[10px] text-ink-3 font-medium tracking-wider uppercase">
        Enterprise Grade &bull; Multi-Batch FEFO &bull; Secure Cloud
      </div>
    </div>
  );
};

export default SplashScreen;

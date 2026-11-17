import { useState, useEffect, useCallback } from 'react';

export type MotionTier = 'full' | 'reduced' | 'none';
export type MotionSetting = 'auto' | 'on' | 'off'; // on = force reduced, off = force full, auto = detect

const STORAGE_KEY = 'yd_motion_setting';

/**
 * Detect hardware tier and accessibility preferences
 */
function evaluateMotionTier(userSetting: MotionSetting): MotionTier {
  if (typeof window === 'undefined') return 'full';

  // 1. Explicit user override
  if (userSetting === 'on') return 'none'; // User explicitly turned on "Reduce animations"
  if (userSetting === 'off') return 'full';

  // 2. Accessibility OS setting: prefers-reduced-motion
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mediaQuery.matches) {
    return 'none';
  }

  // 3. Low-end device & Data-Saver detection
  const nav = navigator as any;
  const isLowCpu = typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4;
  const isLowRam = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
  const isSaveData = Boolean(nav.connection && nav.connection.saveData === true);

  if (isLowCpu || isLowRam || isSaveData) {
    return 'reduced';
  }

  return 'full';
}

/**
 * Global Motion Tier Controller Hook
 */
export function useMotionTier(): {
  tier: MotionTier;
  setting: MotionSetting;
  setSetting: (newSetting: MotionSetting) => void;
  isAnimated: boolean;
} {
  const [setting, setSettingState] = useState<MotionSetting>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'auto' || saved === 'on' || saved === 'off') {
        return saved;
      }
    }
    return 'auto';
  });

  const [tier, setTier] = useState<MotionTier>(() => evaluateMotionTier(setting));

  const updateTier = useCallback((currentSetting: MotionSetting) => {
    const calculated = evaluateMotionTier(currentSetting);
    setTier(calculated);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-motion', calculated);
    }
  }, []);

  const setSetting = useCallback((newSetting: MotionSetting) => {
    setSettingState(newSetting);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newSetting);
    }
    updateTier(newSetting);
  }, [updateTier]);

  useEffect(() => {
    updateTier(setting);

    // Listen to prefers-reduced-motion changes dynamically
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMediaChange = () => {
      updateTier(setting);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [setting, updateTier]);

  return {
    tier,
    setting,
    setSetting,
    isAnimated: tier !== 'none'
  };
}

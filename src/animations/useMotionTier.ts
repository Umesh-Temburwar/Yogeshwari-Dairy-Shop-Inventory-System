/**
 * useMotionTier — detects device capability + user preference
 * Returns 'full' | 'reduced' | 'none'
 * Sets data-motion attribute on <html> for CSS-driven tiers.
 */
import { useState, useEffect, useCallback } from 'react';
import type { MotionTier } from './tokens';

const STORAGE_KEY = 'yd_motion_pref';

function detectTier(): MotionTier {
  if (typeof window === 'undefined') return 'full';

  // 1. User explicitly saved preference
  const saved = localStorage.getItem(STORAGE_KEY) as MotionTier | null;
  if (saved === 'none' || saved === 'reduced' || saved === 'full') return saved;

  // 2. OS-level prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';

  // 3. Low-end device signals
  const nav = navigator as unknown as {
    hardwareConcurrency?: number;
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 1) ||
    nav.connection?.saveData === true ||
    nav.connection?.effectiveType === 'slow-2g'
  ) {
    return 'reduced';
  }

  return 'full';
}

export function useMotionTier() {
  const [tier, setTierState] = useState<MotionTier>(detectTier);

  // Apply tier to <html> data attribute for CSS rules
  useEffect(() => {
    document.documentElement.setAttribute('data-motion', tier);
  }, [tier]);

  // Listen for OS prefers-reduced-motion changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => {
      const saved = localStorage.getItem(STORAGE_KEY) as MotionTier | null;
      if (!saved) setTierState(detectTier());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setSetting = useCallback((pref: MotionTier | 'auto') => {
    if (pref === 'auto') {
      localStorage.removeItem(STORAGE_KEY);
      setTierState(detectTier());
    } else {
      localStorage.setItem(STORAGE_KEY, pref);
      setTierState(pref);
    }
  }, []);

  return { tier, setSetting };
}

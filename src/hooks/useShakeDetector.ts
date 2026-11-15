import { useEffect, useRef, useState, useCallback } from 'react';

export interface ShakeDetectorOptions {
  /** Whether shake detection is currently enabled */
  enabled?: boolean;
  /** Motion sensitivity threshold in m/s^2 (default: 20) */
  threshold?: number;
  /** Time window in ms for 2 reversal peaks to form 1 physical shake snap (default: 450ms) */
  peakWindowMs?: number;
  /** Time window in ms to accumulate successive shakes into double/triple gesture (default: 650ms) */
  gestureWindowMs?: number;
  /** Cooldown in ms after successful gesture trigger before next detection (default: 1800ms) */
  cooldownMs?: number;
  /** Callback fired for legacy single-shake handlers */
  onShake?: () => void;
  /** Callback fired when a classified gesture occurs: 1 (Single), 2 (Double), or 3 (Triple) */
  onGesture?: (count: 1 | 2 | 3) => void;
}

/**
 * Checks if the current client is a mobile device with accelerometer capabilities
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

/**
 * Requests iOS DeviceMotionEvent permission if required (iOS 13+)
 */
export async function requestMotionPermission(): Promise<boolean> {
  if (
    typeof window !== 'undefined' &&
    typeof (DeviceMotionEvent as any)?.requestPermission === 'function'
  ) {
    try {
      const response = await (DeviceMotionEvent as any).requestPermission();
      return response === 'granted';
    } catch (err) {
      console.warn('[useShakeDetector] iOS motion permission error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Production-Ready Multi-Shake Gesture Classifier Hook
 * 
 * Classifies physical phone shakes into 3 distinct gestures:
 * - 1 Shake -> Single Shake (Billing Scanner)
 * - 2 Shakes -> Double Shake (Stock-In Scanner)
 * - 3 Shakes -> Triple Shake (Stock Edit Scanner)
 * 
 * Features:
 * - Euclidean directional acceleration delta magnitude tracking
 * - 2-peak directional reversal filtering per shake (eliminates drops, walking, bumps)
 * - Accumulation window with immediate trigger on 3rd shake
 * - Strict 1800ms cooldown to avoid bounce/duplicate triggers
 * - Haptic pulse feedback matching gesture count
 * - Safe passive event listener with automatic cleanup
 */
export function useShakeDetector({
  enabled = true,
  threshold = 20,
  peakWindowMs = 450,
  gestureWindowMs = 650,
  cooldownMs = 1800,
  onShake,
  onGesture
}: ShakeDetectorOptions) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastZ = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);
  const peakTimestamps = useRef<number[]>([]);
  const shakeCount = useRef<number>(0);
  const gestureTimer = useRef<any>(null);
  const lastTriggerTime = useRef<number>(0);

  const onShakeRef = useRef(onShake);
  const onGestureRef = useRef(onGesture);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

  // Check hardware support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      setIsSupported(true);
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        setPermissionGranted(false);
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  // Request permission explicitly (for iOS or UI button)
  const askPermission = useCallback(async () => {
    const granted = await requestMotionPermission();
    setPermissionGranted(granted);
    return granted;
  }, []);

  useEffect(() => {
    if (!enabled || !isSupported) return;

    const triggerGesture = (count: number) => {
      if (gestureTimer.current) {
        clearTimeout(gestureTimer.current);
        gestureTimer.current = null;
      }
      shakeCount.current = 0;
      peakTimestamps.current = [];
      lastTriggerTime.current = Date.now();

      const normalizedCount = (Math.min(Math.max(count, 1), 3)) as 1 | 2 | 3;

      // Haptic feedback matching gesture count
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          if (normalizedCount === 1) {
            navigator.vibrate([80]);
          } else if (normalizedCount === 2) {
            navigator.vibrate([60, 40, 80]);
          } else {
            navigator.vibrate([60, 40, 60, 40, 100]);
          }
        } catch {}
      }

      if (onGestureRef.current) {
        onGestureRef.current(normalizedCount);
      }
      if (normalizedCount === 1 && onShakeRef.current) {
        onShakeRef.current();
      }
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = Date.now();
      if (current - lastTriggerTime.current < cooldownMs) return;

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const timeDiff = current - lastUpdate.current;
      // Rate limiter: sample every 25ms (~40Hz)
      if (timeDiff < 25) return;

      if (lastX.current !== null && lastY.current !== null && lastZ.current !== null) {
        const deltaX = Math.abs(acc.x - lastX.current);
        const deltaY = Math.abs(acc.y - lastY.current);
        const deltaZ = Math.abs(acc.z - lastZ.current);

        const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

        if (deltaMag > threshold) {
          peakTimestamps.current.push(current);
          peakTimestamps.current = peakTimestamps.current.filter(
            (t) => current - t <= peakWindowMs
          );

          // 2 directional acceleration peaks constitute 1 deliberate shake snap
          if (peakTimestamps.current.length >= 2) {
            peakTimestamps.current = [];
            shakeCount.current += 1;

            if (shakeCount.current >= 3) {
              // 3rd shake reached -> execute Triple Shake immediately
              triggerGesture(3);
              return;
            }

            // Accumulate within gesture window (e.g. wait for double or triple shake)
            if (gestureTimer.current) {
              clearTimeout(gestureTimer.current);
            }
            gestureTimer.current = setTimeout(() => {
              const count = shakeCount.current;
              if (count > 0) {
                triggerGesture(count);
              }
            }, gestureWindowMs);
          }
        }
      }

      lastX.current = acc.x;
      lastY.current = acc.y;
      lastZ.current = acc.z;
      lastUpdate.current = current;
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      if (gestureTimer.current) {
        clearTimeout(gestureTimer.current);
        gestureTimer.current = null;
      }
      lastX.current = null;
      lastY.current = null;
      lastZ.current = null;
      lastUpdate.current = 0;
      peakTimestamps.current = [];
      shakeCount.current = 0;
    };
  }, [enabled, isSupported, threshold, peakWindowMs, gestureWindowMs, cooldownMs]);

  return {
    isSupported,
    permissionGranted,
    askPermission
  };
}

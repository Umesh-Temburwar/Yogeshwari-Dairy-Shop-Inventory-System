import { useEffect, useRef, useState, useCallback } from 'react';

export interface ShakeDetectorOptions {
  /** Whether shake detection is currently enabled */
  enabled?: boolean;
  /** Motion sensitivity threshold in m/s^2 (default: 20) */
  threshold?: number;
  /** Minimum direction peaks required in time window to qualify as a shake (default: 2) */
  minPeaks?: number;
  /** Time window in ms to accumulate motion peaks (default: 750ms) */
  timeWindowMs?: number;
  /** Cooldown in ms after successful shake before next detection (default: 1800ms) */
  cooldownMs?: number;
  /** Callback fired when deliberate shake is confirmed */
  onShake: () => void;
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
 * Custom React Hook for detecting physical device shaking (Shake-to-Scan)
 * Features:
 * - Euclidean directional acceleration delta magnitude tracking
 * - Multi-peak threshold validation (filters out walking, handling, and pocket movements)
 * - Strict 1800ms cooldown (prevents duplicate scanner launches)
 * - Safe automatic cleanup of window event listeners on unmount
 * - Haptic vibration feedback on successful detection
 */
export function useShakeDetector({
  enabled = true,
  threshold = 20,
  minPeaks = 2,
  timeWindowMs = 750,
  cooldownMs = 1800,
  onShake
}: ShakeDetectorOptions) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const lastX = useRef<number | null>(null);
  const lastY = useRef<number | null>(null);
  const lastZ = useRef<number | null>(null);
  const lastUpdate = useRef<number>(0);
  const peakTimestamps = useRef<number[]>([]);
  const lastTriggerTime = useRef<number>(0);

  const onShakeRef = useRef(onShake);
  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  // Check hardware support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      setIsSupported(true);
      // Check if iOS permission function exists
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

    const handleMotion = (event: DeviceMotionEvent) => {
      const current = Date.now();
      const inCooldown = (current - lastTriggerTime.current < cooldownMs);

      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const timeDiff = current - lastUpdate.current;
      // Rate limiter: sample every 25ms (~40Hz) to prevent excessive CPU consumption
      if (timeDiff < 25) return;

      if (lastX.current !== null && lastY.current !== null && lastZ.current !== null && !inCooldown) {
        const deltaX = Math.abs(acc.x - lastX.current);
        const deltaY = Math.abs(acc.y - lastY.current);
        const deltaZ = Math.abs(acc.z - lastZ.current);

        // Vector magnitude of 3-axis acceleration delta in m/s^2
        const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

        if (deltaMag > threshold) {
          // Register peak
          peakTimestamps.current.push(current);

          // Prune peaks outside the active time window
          peakTimestamps.current = peakTimestamps.current.filter(
            (t) => current - t <= timeWindowMs
          );

          // If required number of rapid peaks occurred within window -> Confirm Shake!
          if (peakTimestamps.current.length >= minPeaks) {
            peakTimestamps.current = [];
            lastTriggerTime.current = current;

            // Haptic vibration feedback (short double-buzz)
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([60, 40, 80]);
              } catch {}
            }

            // Trigger action callback
            onShakeRef.current();
          }
        }
      }

      // Always update position vectors to ensure next delta calculation is accurate
      lastX.current = acc.x;
      lastY.current = acc.y;
      lastZ.current = acc.z;
      lastUpdate.current = current;
    };

    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      lastX.current = null;
      lastY.current = null;
      lastZ.current = null;
      lastUpdate.current = 0;
      peakTimestamps.current = [];
    };
  }, [enabled, isSupported, threshold, minPeaks, timeWindowMs, cooldownMs]);

  return {
    isSupported,
    permissionGranted,
    askPermission
  };
}

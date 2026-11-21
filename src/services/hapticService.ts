/**
 * Universal Customizable Haptic & Vibration Service
 * Supports Off, Light, Medium, Strong, and Custom durations
 */

export type HapticMode = 'off' | 'light' | 'medium' | 'strong' | 'custom';

export interface HapticSettings {
  enabled: boolean;
  mode: HapticMode;
  customDurationMs: number;
}

const HAPTIC_ENABLED_KEY = 'yd_haptic_enabled';
const HAPTIC_MODE_KEY = 'yd_haptic_mode';
const HAPTIC_DURATION_KEY = 'yd_haptic_duration';

export const getHapticSettings = (): HapticSettings => {
  if (typeof window === 'undefined') {
    return { enabled: true, mode: 'light', customDurationMs: 12 };
  }
  const enabledStr = localStorage.getItem(HAPTIC_ENABLED_KEY);
  const modeStr = localStorage.getItem(HAPTIC_MODE_KEY) as HapticMode | null;
  const durStr = localStorage.getItem(HAPTIC_DURATION_KEY);

  const enabled = enabledStr !== null ? enabledStr === 'true' : true;
  const mode: HapticMode = modeStr && ['off', 'light', 'medium', 'strong', 'custom'].includes(modeStr) ? modeStr : 'light';
  const customDurationMs = durStr ? Math.max(5, Math.min(200, parseInt(durStr, 10) || 15)) : 15;

  return { enabled, mode, customDurationMs };
};

export const saveHapticSettings = (settings: Partial<HapticSettings>): HapticSettings => {
  const current = getHapticSettings();
  const next: HapticSettings = { ...current, ...settings };

  if (typeof window !== 'undefined') {
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(next.enabled));
    localStorage.setItem(HAPTIC_MODE_KEY, next.mode);
    localStorage.setItem(HAPTIC_DURATION_KEY, String(next.customDurationMs));
  }
  return next;
};

export const triggerHaptic = (type: 'tap' | 'light' | 'medium' | 'strong' | 'success' | 'warning' | 'error' | 'scan' = 'tap'): void => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  const config = getHapticSettings();
  if (!config.enabled || config.mode === 'off') return;

  try {
    let pattern: number | number[] = 12;

    if (config.mode === 'custom') {
      pattern = config.customDurationMs;
    } else if (config.mode === 'strong') {
      switch (type) {
        case 'success': pattern = [40, 60, 40]; break;
        case 'warning': pattern = [60, 80, 60]; break;
        case 'error': pattern = [80, 80, 80]; break;
        case 'scan': pattern = 50; break;
        default: pattern = 35; break;
      }
    } else if (config.mode === 'medium') {
      switch (type) {
        case 'success': pattern = [20, 50, 20]; break;
        case 'warning': pattern = [40, 60, 40]; break;
        case 'error': pattern = [50, 50, 50]; break;
        case 'scan': pattern = 30; break;
        default: pattern = 22; break;
      }
    } else {
      // Light (default)
      switch (type) {
        case 'success': pattern = [12, 40, 12]; break;
        case 'warning': pattern = [25, 40, 25]; break;
        case 'error': pattern = [35, 40, 35]; break;
        case 'scan': pattern = 20; break;
        default: pattern = 12; break;
      }
    }

    navigator.vibrate(pattern);
  } catch {
    // Non-blocking fallback for unsupported browsers
  }
};

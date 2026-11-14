import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Universal tactile haptic feedback for POS counter and actions.
 * Safely works on Capacitor native Android/iOS and falls back to
 * navigator.vibrate() on mobile web browsers without errors.
 */

export const hapticSuccess = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 40, 20]);
    }
  }
};

export const hapticLight = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
};

export const hapticMedium = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }
};

export const hapticWarning = async () => {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([25, 30, 25]);
    }
  }
};


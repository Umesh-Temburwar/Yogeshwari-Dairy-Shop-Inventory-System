/**
 * Web Audio API synthesizer for incoming online order chimes.
 * Handles browser autoplay restrictions by unlocking on the first user interaction.
 * Zero external mp3/wav asset dependencies (100% resilient).
 */

let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;
let hasUserInteracted = false;

const SOUND_ENABLED_KEY = 'yd_sound_alerts_enabled';

/**
 * Returns whether user has interacted with the document at least once.
 */
export const hasUserGesture = (): boolean => hasUserInteracted;

/**
 * Safe wrapper around navigator.vibrate to respect browser intervention policies.
 * Only calls navigator.vibrate if user has tapped/clicked/keyed the document.
 */
export const safeVibrate = (pattern: number | number[]): void => {
  if (!hasUserInteracted) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error on unsupported or policy-blocked browsers
    }
  }
};

/**
 * Returns whether sound alerts are enabled by the user in settings.
 */
export const isSoundAlertsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored !== 'false'; // Default to enabled
};

/**
 * Toggle sound alerts in localStorage.
 */
export const setSoundAlertsEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
};

/**
 * Lazily obtains or creates an AudioContext.
 */
const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  return sharedAudioContext;
};

/**
 * Unlocks AudioContext upon user gesture (click/keydown).
 */
export const unlockAudio = (): void => {
  hasUserInteracted = true;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      isAudioUnlocked = true;
    }).catch(() => {
      // Browser still blocking
    });
  } else if (ctx.state === 'running') {
    isAudioUnlocked = true;
  }
};

// Automatically listen for first user interaction to unlock audio and vibration permissions
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    hasUserInteracted = true;
    unlockAudio();
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('touchstart', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
    window.removeEventListener('click', handleFirstInteraction);
  };
  window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
  window.addEventListener('click', handleFirstInteraction, { passive: true });
}

let alarmIntervalTimer: ReturnType<typeof setInterval> | null = null;
let isCurrentlyRinging = false;
let currentAlarmReason = '';

/**
 * Returns whether the continuous Blinkit order alarm is currently ringing.
 */
export const isBlinkitAlarmRinging = (): boolean => {
  return isCurrentlyRinging;
};

/**
 * Synthesizes the authentic Blinkit Dark-Store Order Tone (1 cycle)
 * High-urgency energetic 4-note ascending arpeggio followed by double ping + vibration.
 */
export const playBlinkitAlertTone = (): void => {
  if (!isSoundAlertsEnabled()) return;

  // 1. Phone Vibration (Blinkit rhythm: vibrate-pause-vibrate)
  safeVibrate([400, 150, 400, 150, 400, 600]);

  // 2. Web Audio Synthesizer (Blinkit 4-step chime + high bell ping)
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTone = (
      freq: number,
      startDelay: number,
      duration: number,
      peakGain: number,
      type: OscillatorType = 'triangle'
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startDelay);

      // Fast punchy attack & musical decay
      gain.gain.setValueAtTime(0.001, now + startDelay);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + startDelay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startDelay);
      osc.stop(now + startDelay + duration);
    };

    // Part A: Rapid ascending melodic hook (G5 -> C6 -> E6 -> G6)
    playTone(784.0, 0.0, 0.16, 0.45, 'triangle');   // G5
    playTone(1046.5, 0.14, 0.16, 0.50, 'triangle');  // C6
    playTone(1318.5, 0.28, 0.18, 0.55, 'triangle');  // E6
    playTone(1567.98, 0.42, 0.24, 0.60, 'triangle'); // G6

    // Part B: Urgent signature high double chime
    playTone(1567.98, 0.65, 0.22, 0.65, 'sine');     // G6 high ping
    playTone(2093.00, 0.88, 0.48, 0.75, 'triangle'); // C7 resonant brass bell
  } catch (err) {
    console.warn('Blinkit chime error:', err);
  }
};

/**
 * Starts continuous Blinkit siren/alarm loop (repeats every 2.8s)
 * Keeps ringing UNTIL staff accepts the order or explicitly mutes it!
 */
export const startBlinkitOrderAlarm = (reason = 'New Online Order'): void => {
  if (!isSoundAlertsEnabled()) return;

  currentAlarmReason = reason;

  if (isCurrentlyRinging) return; // Already actively ringing
  isCurrentlyRinging = true;

  // Play immediate first chime
  playBlinkitAlertTone();

  // Clear any stale interval
  if (alarmIntervalTimer) {
    clearInterval(alarmIntervalTimer);
  }

  // Loop every 2800ms
  alarmIntervalTimer = setInterval(() => {
    if (!isCurrentlyRinging || !isSoundAlertsEnabled()) {
      stopBlinkitOrderAlarm();
      return;
    }
    playBlinkitAlertTone();
  }, 2800);

  // Dispatch global event for UI badges/buttons
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('yd_order_alarm_state_changed', {
        detail: { isRinging: true, reason },
      })
    );
  }
};

/**
 * Stops the continuous alarm immediately (e.g. when order is accepted/confirmed or muted).
 */
export const stopBlinkitOrderAlarm = (): void => {
  if (alarmIntervalTimer) {
    clearInterval(alarmIntervalTimer);
    alarmIntervalTimer = null;
  }
  isCurrentlyRinging = false;

  // Cancel any active device vibration
  safeVibrate(0);

  // Dispatch global event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('yd_order_alarm_state_changed', {
        detail: { isRinging: false },
      })
    );
  }
};

/**
 * Hook or subscriber for components to react to alarm ringing state.
 */
export const subscribeToBlinkitAlarmState = (
  callback: (isRinging: boolean, reason?: string) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: any) => {
    callback(Boolean(e.detail?.isRinging), e.detail?.reason);
  };

  window.addEventListener('yd_order_alarm_state_changed', handler);
  // Initial callback
  callback(isCurrentlyRinging, currentAlarmReason);

  return () => {
    window.removeEventListener('yd_order_alarm_state_changed', handler);
  };
};

/**
 * Plays a pleasant 2-tone doorbell chime (880Hz A5 -> 1046.5Hz C6).
 */
export const playNewOrderChime = (): void => {
  if (!isSoundAlertsEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTone = (freq: number, startDelay: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startDelay);

      // Smooth attack & exponential decay
      gain.gain.setValueAtTime(0.001, now + startDelay);
      gain.gain.exponentialRampToValueAtTime(gainVal, now + startDelay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startDelay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + startDelay);
      osc.stop(now + startDelay + duration);
    };

    // Tone 1: High note (880Hz)
    playTone(880, 0, 0.35, 0.25);
    // Tone 2: Harmonious fifth (1046.5Hz)
    playTone(1046.5, 0.22, 0.55, 0.3);
  } catch (err) {
    console.warn('Could not play order chime:', err);
  }
};

/**
 * User-initiated test chime from Settings/UI.
 */
export const testOrderChime = (): boolean => {
  unlockAudio();
  playNewOrderChime();
  return isAudioUnlocked;
};

/**
 * High-pitch double ding when a product barcode is successfully scanned and matched (1320Hz -> 1760Hz).
 */
export const playScanSuccessChime = (): void => {
  if (!isSoundAlertsEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur);
    };

    playNote(1318.5, 0, 0.12);
    playNote(1760.0, 0.08, 0.18);
  } catch (err) {
    console.warn('Scan chime failed:', err);
  }
};

/**
 * Low double buzz when an unknown/wrong barcode is scanned (220Hz -> 180Hz).
 */
export const playScanErrorChime = (): void => {
  if (!isSoundAlertsEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch (err) {
    console.warn('Scan error chime failed:', err);
  }
};

/**
 * Triumphant 3-note celebration chime when all items in an order are 100% verified (C5 -> E5 -> G5).
 */
export const playScanCompleteChime = (): void => {
  if (!isSoundAlertsEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.35);
    });
  } catch (err) {
    console.warn('Scan complete chime failed:', err);
  }
};

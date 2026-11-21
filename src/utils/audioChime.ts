/**
 * Web Audio API synthesizer for incoming online order chimes.
 * Handles browser autoplay restrictions by unlocking on the first user interaction.
 * Zero external mp3/wav asset dependencies (100% resilient).
 */

let sharedAudioContext: AudioContext | null = null;
let isAudioUnlocked = false;

const SOUND_ENABLED_KEY = 'yd_sound_alerts_enabled';

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

// Automatically listen for first user interaction to unlock audio
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', handleFirstInteraction);
    window.removeEventListener('keydown', handleFirstInteraction);
  };
  window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
  window.addEventListener('keydown', handleFirstInteraction, { passive: true });
}

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

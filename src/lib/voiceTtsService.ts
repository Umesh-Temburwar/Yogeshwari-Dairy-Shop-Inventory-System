/**
 * Text-to-Speech (TTS) Service using Web SpeechSynthesis API
 * Provides spoken voice guidance in Marathi, Hindi, and Indian English with graceful fallback.
 */

export type TtsLanguage = 'mr-IN' | 'hi-IN' | 'en-IN';

class VoiceTtsService {
  private isMuted: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ydo_voice_tts_muted');
        this.isMuted = saved === 'true';
      } catch {}
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ydo_voice_tts_muted', String(muted));
      } catch {}
    }
    if (muted) {
      this.stop();
    }
  }

  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentUtterance = null;
  }

  /**
   * Speaks the given text in the requested language.
   * Resolves when speaking finishes or if TTS is disabled/muted.
   */
  public speak(text: string, lang: TtsLanguage = 'mr-IN', rate: number = 0.95): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported() || this.isMuted || !text.trim()) {
        resolve();
        return;
      }

      try {
        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text.trim());
        this.currentUtterance = utterance;

        utterance.lang = lang;
        utterance.rate = rate; // Natural speaking pace
        utterance.pitch = 1.0;

        // Try to pick an authentic regional voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => {
          if (lang === 'mr-IN') {
            return v.lang.includes('mr') || v.name.toLowerCase().includes('marathi');
          }
          if (lang === 'hi-IN') {
            return v.lang.includes('hi') || v.name.toLowerCase().includes('hindi');
          }
          return v.lang.includes('en-IN') || v.lang.includes('en_IN') || v.name.toLowerCase().includes('india');
        });

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (e) => {
          // Ignore cancelled speech errors
          this.currentUtterance = null;
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis error:', err);
        resolve();
      }
    });
  }
}

export const ttsService = new VoiceTtsService();

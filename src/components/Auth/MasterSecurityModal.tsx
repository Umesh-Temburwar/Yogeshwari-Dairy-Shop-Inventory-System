import React, { useState, useEffect, useRef, useCallback } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  LogOut,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  KeyRound,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { authenticateUserFingerprint, isBiometricSupported } from '../../lib/biometricAuth';
import { MAX_PASSCODE_LENGTH } from '../../lib/security';

interface MasterSecurityModalProps {
  isOpen: boolean;
  onVerified?: () => void;
}

const triggerHaptic = (pattern: number | number[] = 14) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported or blocked vibration calls
    }
  }
};

export const MasterSecurityModal: React.FC<MasterSecurityModalProps> = ({ isOpen, onVerified }) => {
  const {
    user,
    role,
    unlockSecurity,
    unlockSecurityWithBiometrics,
    signOut,
    avatarUrl,
    unlockMethod
  } = useAuth();

  const isAdminUser =
    role === 'Admin' ||
    user?.email?.toLowerCase().includes('nilu') ||
    user?.email?.toLowerCase().includes('nilesh');

  const userName =
    typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : isAdminUser
      ? 'Nilesh Sakhare'
      : 'Nikhil Sakhare';

  const roleTitle = role === 'Owner' ? 'Owner' : 'Admin';

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);
  const [isShake, setIsShake] = useState(false);
  const [isErrorFlash, setIsErrorFlash] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const isVerifyingRef = useRef(false);
  const hasAutoTriggeredBioRef = useRef(false);
  const biometricUnlockRef = useRef<(isAuto?: boolean) => Promise<void>>(async () => {});

  // Detect platform fingerprint / Touch ID capability
  useEffect(() => {
    let active = true;
    isBiometricSupported()
      .then((supported) => {
        if (active) setBiometricAvailable(supported);
      })
      .catch(() => {
        if (active) setBiometricAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Flexible SHA-256 verification (supports digits, text, symbols, emojis — any length)
  const executeVerification = useCallback(
    async (pinToVerify: string) => {
      const trimmed = pinToVerify.trim();
      if (isVerifyingRef.current || isVerifying || lockoutRemainingSec > 0 || isSuccess) return;
      if (!trimmed) {
        triggerHaptic([35, 45, 35]);
        setErrorMsg('Please enter your master password.');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 420);
        return;
      }

      isVerifyingRef.current = true;
      setIsVerifying(true);
      setErrorMsg(null);
      setIsErrorFlash(false);

      try {
        const res = await unlockSecurity(trimmed, Boolean(onVerified));
        if (res.success) {
          triggerHaptic([20, 40, 45]);
          setIsSuccess(true);
          if (onVerified) {
            onVerified();
          }
          setTimeout(() => {
            setPasscode('');
          }, 320);
        } else {
          triggerHaptic([40, 50, 40]);
          setIsShake(true);
          setIsErrorFlash(true);
          setTimeout(() => setIsShake(false), 420);
          setTimeout(() => setIsErrorFlash(false), 650);

          if (res.error === 'SECURITY_LOCKED' && res.lockedUntil) {
            const secs = Math.ceil((res.lockedUntil - Date.now()) / 1000);
            setLockoutRemainingSec(Math.max(1, secs));
            setErrorMsg('Too many failed attempts. Locked for 5 minutes.');
          } else {
            setAttemptsLeft(res.attemptsLeft);
            setErrorMsg('Wrong master password. Try again.');
          }
          setPasscode('');
        }
      } catch {
        triggerHaptic([40, 50, 40]);
        setIsShake(true);
        setIsErrorFlash(true);
        setTimeout(() => setIsShake(false), 420);
        setTimeout(() => setIsErrorFlash(false), 650);
        setErrorMsg('Verification error. Please try again.');
        setPasscode('');
      } finally {
        setIsVerifying(false);
        isVerifyingRef.current = false;
      }
    },
    [unlockSecurity, onVerified, lockoutRemainingSec, isVerifying, isSuccess]
  );

  // Mobile Fingerprint Unlock for ANY authenticated user (Owner or Admin)
  const handleBiometricUnlock = useCallback(
    async (isAuto = false) => {
      if (lockoutRemainingSec > 0 || isVerifying || isBiometricScanning || isSuccess) return;
      setIsBiometricScanning(true);
      if (!isAuto) setErrorMsg(null);

      try {
        const res = await authenticateUserFingerprint({
          email: user?.email,
          displayName: `${userName} (${roleTitle})`
        });
        if (res.success) {
          const granted = await unlockSecurityWithBiometrics(Boolean(onVerified));
          if (granted) {
            triggerHaptic([20, 40, 45]);
            setIsSuccess(true);
            if (onVerified) {
              onVerified();
            }
            setPasscode('');
          } else {
            triggerHaptic([40, 50, 40]);
            setErrorMsg('Security token issuance failed. Please use master password.');
          }
        } else if (res.error && !isAuto) {
          triggerHaptic([40, 50, 40]);
          setErrorMsg(res.error);
          setIsShake(true);
          setTimeout(() => setIsShake(false), 420);
        }
      } catch {
        if (!isAuto) {
          triggerHaptic([40, 50, 40]);
          setErrorMsg('Fingerprint scan failed. Please try again or use master password.');
        }
      } finally {
        setIsBiometricScanning(false);
      }
    },
    [
      lockoutRemainingSec,
      isVerifying,
      isBiometricScanning,
      isSuccess,
      user?.email,
      userName,
      roleTitle,
      unlockSecurityWithBiometrics,
      onVerified
    ]
  );

  useEffect(() => {
    biometricUnlockRef.current = handleBiometricUnlock;
  }, [handleBiometricUnlock]);

  // Lifecycle reset + optional biometric auto-trigger when Fingerprint Only mode is active
  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setAttemptsLeft(null);
      setIsSuccess(false);
      setIsErrorFlash(false);
      setShowPasswordFallback(false);

      if (unlockMethod === 'fingerprint' && !hasAutoTriggeredBioRef.current) {
        hasAutoTriggeredBioRef.current = true;
        const timer = setTimeout(() => {
          void biometricUnlockRef.current(true);
        }, 250);
        return () => clearTimeout(timer);
      }
    } else {
      hasAutoTriggeredBioRef.current = false;
      setIsSuccess(false);
    }
  }, [isOpen, unlockMethod]);

  // Lockout Countdown Timer
  useEffect(() => {
    if (lockoutRemainingSec <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemainingSec]);

  if (!isOpen) return null;

  const formatLockoutTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isInputBlocked = lockoutRemainingSec > 0 || isVerifying || isSuccess;
  const allowFingerprint = unlockMethod === 'both' || unlockMethod === 'fingerprint';
  const showPasswordForm =
    unlockMethod === 'password' ||
    unlockMethod === 'both' ||
    showPasswordFallback ||
    !biometricAvailable;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeVerification(passcode);
  };

  return (
    <div
      className="fixed inset-0 z-[9998] min-h-[100dvh] w-full flex flex-col justify-between touch-manipulation overflow-y-auto text-white"
      style={{
        background: 'linear-gradient(180deg, #020a07 0%, #061a12 100%)'
      }}
    >
      {/* Subtle Ambient Radial Emerald Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[320px] h-[240px] rounded-full opacity-35 motion-reduce:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.32) 0%, rgba(16,185,129,0) 70%)'
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] mx-auto flex-1 flex flex-col justify-between px-4 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        {/* 1. Top Branding & Verified Role Pill */}
        <header className="flex flex-col items-center text-center">
          <div className="w-[68px] h-[68px] rounded-full bg-white p-0.5 ring-2 ring-emerald-500/60 shadow-[0_0_32px_rgba(16,185,129,0.28)] overflow-hidden shrink-0">
            <img
              src={ydoLogo}
              alt="Yogeshwari Dairy"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.endsWith('/YDO_logo.png')) {
                  target.src = '/YDO_logo.png';
                }
              }}
            />
          </div>

          <h1 className="mt-3 text-xl font-bold text-white tracking-tight leading-tight">
            Yogeshwari Dairy
          </h1>
          <p className="mt-0.5 text-sm text-slate-400 leading-tight">
            POS Security Gate
          </p>

          {/* Compact Verified Profile Pill */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-3 py-1">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-800 shrink-0">
              <img
                src={avatarUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-semibold text-white">{userName}</span>
            <span className="text-[10px] font-bold text-emerald-300/90 uppercase tracking-wider">
              {roleTitle}
            </span>
            <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          </div>
        </header>

        {/* 2. Main Unlock Card (Flexible Password & Mobile Fingerprint) */}
        <section
          className={`w-full my-auto py-6 space-y-4 ${
            isShake ? 'motion-safe:animate-subtle-shake' : ''
          }`}
        >
          {/* Fingerprint-Primary Hero Card when Fingerprint Only mode is selected */}
          {unlockMethod === 'fingerprint' && !showPasswordFallback && (
            <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 flex flex-col items-center text-center space-y-4">
              <button
                type="button"
                disabled={isInputBlocked || isBiometricScanning}
                onClick={() => {
                  triggerHaptic(16);
                  void handleBiometricUnlock(false);
                }}
                aria-label="Unlock with mobile fingerprint"
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  isSuccess
                    ? 'bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_32px_rgba(16,185,129,0.4)]'
                    : isBiometricScanning
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 animate-pulse'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-2 border-emerald-500/60 text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
                }`}
              >
                {isBiometricScanning ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : (
                  <Fingerprint className="w-12 h-12" />
                )}
              </button>

              <div className="space-y-1">
                <p className="text-base font-bold text-white">
                  {isBiometricScanning
                    ? 'Scanning fingerprint...'
                    : isSuccess
                    ? 'Unlocked!'
                    : 'Touch Fingerprint Sensor'}
                </p>
                <p className="text-xs text-slate-400">
                  Tap above to verify with your phone fingerprint
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(12);
                  setShowPasswordFallback(true);
                  setErrorMsg(null);
                  setTimeout(() => inputRef.current?.focus(), 60);
                }}
                className="text-xs font-semibold text-slate-300 hover:text-emerald-300 inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Use Master Password instead</span>
              </button>
            </div>
          )}

          {/* Flexible Password Form (Digits, Letters, Symbols, Emojis — Any Length) */}
          {showPasswordForm && (
            <form
              onSubmit={handleFormSubmit}
              className="rounded-3xl bg-white/[0.04] border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="master-security-password"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 min-w-0"
                >
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="truncate">Enter Master Password</span>
                </label>
                <span className="text-[11px] text-slate-400 shrink-0">
                  Digits, text or emoji
                </span>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="master-security-password"
                  name="master_security_password"
                  type={showPasscode ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={MAX_PASSCODE_LENGTH}
                  disabled={isInputBlocked}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg(null);
                    setAttemptsLeft(null);
                    setIsErrorFlash(false);
                  }}
                  placeholder="Enter master password..."
                  className={`w-full h-12 pl-4 pr-12 rounded-2xl text-[16px] font-semibold tracking-wide text-white placeholder:text-slate-500 bg-white/[0.07] border transition focus:outline-none focus:ring-2 ${
                    isSuccess
                      ? 'border-emerald-400 focus:ring-emerald-400/40 bg-emerald-500/15'
                      : isErrorFlash || errorMsg
                      ? 'border-rose-500 focus:ring-rose-500/40 bg-rose-500/10'
                      : 'border-white/15 focus:border-emerald-400 focus:ring-emerald-500/30'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(12);
                    setShowPasscode((prev) => !prev);
                  }}
                  aria-label="Show or hide password"
                  aria-pressed={showPasscode}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-white active:bg-white/10 transition cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isInputBlocked || !passcode.trim()}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 inline-flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Unlocked</span>
                  </>
                ) : (
                  <>
                    <span>Unlock POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Fingerprint Button when Both mode (or returning from fallback) */}
              {allowFingerprint && (
                <button
                  type="button"
                  disabled={isInputBlocked || isBiometricScanning}
                  onClick={() => {
                    triggerHaptic(14);
                    void handleBiometricUnlock(false);
                  }}
                  className="w-full h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.11] border border-emerald-500/35 text-emerald-300 font-semibold text-xs inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-45 cursor-pointer"
                >
                  {isBiometricScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scanning fingerprint...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>Unlock with Mobile Fingerprint</span>
                    </>
                  )}
                </button>
              )}
            </form>
          )}

          {/* Error / Attempts / Lockout / Verifying Status */}
          <div
            role="status"
            aria-live="polite"
            className="min-h-[24px] flex flex-col items-center justify-center text-center px-2"
          >
            {isSuccess ? (
              <span className="text-xs font-semibold text-emerald-400">
                Access Granted • Unlocked
              </span>
            ) : lockoutRemainingSec > 0 ? (
              <span className="text-xs font-semibold text-rose-400">
                Locked for security: {formatLockoutTime(lockoutRemainingSec)}
              </span>
            ) : errorMsg ? (
              <span className="text-xs font-medium text-rose-400 leading-snug">
                {errorMsg}
                {attemptsLeft !== null && attemptsLeft > 0
                  ? ` (${attemptsLeft} attempts left)`
                  : ''}
              </span>
            ) : null}
          </div>
        </section>

        {/* 3. Bottom Pinned Footer */}
        <footer className="pt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(14);
              void signOut();
            }}
            aria-label="Sign Out"
            className="min-h-[44px] px-1 inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white active:scale-95 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>SHA-256 encrypted</span>
          </span>
        </footer>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Eye,
  EyeOff,
  Delete,
  LogOut,
  ShieldCheck,
  BadgeCheck,
  Fingerprint,
  ArrowRight
} from 'lucide-react';
import { authenticateUserFingerprint } from '../../lib/biometricAuth';
import {
  MAX_PASSCODE_LENGTH,
  testMasterPasscodeSilently,
  getMasterPasscodeLength
} from '../../lib/security';

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
    user?.email?.toLowerCase().includes('nilesh') ||
    (typeof user?.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name.toLowerCase().includes('nilesh'));

  const userName =
    typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : isAdminUser
      ? 'Nilesh Sakhare'
      : 'Nikhil Sakhare';

  const roleTitle = role === 'Owner' ? 'Owner' : 'Admin';
  const allowFingerprint = unlockMethod === 'both' || unlockMethod === 'fingerprint';

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);
  const [isShake, setIsShake] = useState(false);
  const [isErrorFlash, setIsErrorFlash] = useState(false);

  const isVerifyingRef = useRef(false);
  const passcodeRef = useRef('');
  const hasAutoTriggeredBioRef = useRef(false);
  const biometricUnlockRef = useRef<(isAuto?: boolean) => Promise<void>>(async () => {});

  // Any-length numeric SHA-256 verification (1 to 16 digits)
  const executeVerification = useCallback(
    async (pinToVerify: string) => {
      if (isVerifyingRef.current || isVerifying || lockoutRemainingSec > 0 || isSuccess) return;
      if (pinToVerify.length === 0) return;

      isVerifyingRef.current = true;
      setIsVerifying(true);
      setErrorMsg(null);
      setIsErrorFlash(false);

      try {
        const res = await unlockSecurity(pinToVerify, Boolean(onVerified));
        if (res.success) {
          triggerHaptic([20, 40, 45]);
          setIsSuccess(true);
          if (onVerified) {
            onVerified();
          }
          setTimeout(() => {
            passcodeRef.current = '';
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
            setErrorMsg('Wrong passcode. Try again.');
          }
          passcodeRef.current = '';
          setPasscode('');
        }
      } catch {
        triggerHaptic([40, 50, 40]);
        setIsShake(true);
        setIsErrorFlash(true);
        setTimeout(() => setIsShake(false), 420);
        setTimeout(() => setIsErrorFlash(false), 650);
        setErrorMsg('Verification error. Please try again.');
        passcodeRef.current = '';
        setPasscode('');
      } finally {
        setIsVerifying(false);
        isVerifyingRef.current = false;
      }
    },
    [unlockSecurity, onVerified, lockoutRemainingSec, isVerifying, isSuccess]
  );

  // Automatic verification on typing: opens immediately without pressing Enter or Unlock button
  const checkAutoUnlock = useCallback(
    async (candidate: string) => {
      if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess) return;
      if (!candidate || candidate.length === 0) return;

      // 1. Silent check: If candidate matches the master passcode, unlock immediately!
      const isMatch = await testMasterPasscodeSilently(candidate);
      if (isMatch) {
        void executeVerification(candidate);
        return;
      }

      // 2. If expected length is known and candidate has reached that length without matching,
      // trigger verification so incorrect passcode is reported and cleared immediately
      const expectedLen = getMasterPasscodeLength();
      if (expectedLen && candidate.length === expectedLen) {
        void executeVerification(candidate);
      }
    },
    [lockoutRemainingSec, isSuccess, executeVerification]
  );

  // Keypad Handlers (any length 1 to 16 digits)
  const handleDigitPress = useCallback(
    (digit: string) => {
      if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess) return;
      const current = passcodeRef.current;
      if (current.length < MAX_PASSCODE_LENGTH) {
        triggerHaptic(14);
        const next = current + digit;
        passcodeRef.current = next;
        setPasscode(next);
        setErrorMsg(null);
        setAttemptsLeft(null);
        setIsErrorFlash(false);

        void checkAutoUnlock(next);
      }
    },
    [lockoutRemainingSec, isSuccess, checkAutoUnlock]
  );

  const handleBackspace = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess || passcodeRef.current.length === 0) return;
    triggerHaptic(14);
    const next = passcodeRef.current.slice(0, -1);
    passcodeRef.current = next;
    setPasscode(next);
    setErrorMsg(null);
    setIsErrorFlash(false);
  }, [lockoutRemainingSec, isSuccess]);

  const handleClear = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess || passcodeRef.current.length === 0) return;
    triggerHaptic(18);
    passcodeRef.current = '';
    setPasscode('');
    setErrorMsg(null);
    setIsErrorFlash(false);
  }, [lockoutRemainingSec, isSuccess]);

  // Physical keyboard & paste support (0-9, Backspace, Enter, Escape, Delete, Paste)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (passcodeRef.current.length > 0) {
          e.preventDefault();
          void executeVerification(passcodeRef.current);
        }
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (lockoutRemainingSec > 0 || isVerifyingRef.current || isSuccess) return;
      const text = e.clipboardData?.getData('text') || '';
      const digits = text.replace(/\D/g, '').slice(0, MAX_PASSCODE_LENGTH);
      if (digits) {
        e.preventDefault();
        passcodeRef.current = digits;
        setPasscode(digits);
        setErrorMsg(null);
        setAttemptsLeft(null);
        setIsErrorFlash(false);
        void checkAutoUnlock(digits);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [
    isOpen,
    lockoutRemainingSec,
    isSuccess,
    handleDigitPress,
    handleBackspace,
    handleClear,
    executeVerification,
    checkAutoUnlock
  ]);

  // Mobile Biometric Unlock for Owner & Admin
  const handleBiometricUnlock = useCallback(
    async (isAuto = false) => {
      if (!allowFingerprint || lockoutRemainingSec > 0 || isVerifying || isBiometricScanning || isSuccess) return;
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
            setErrorMsg('Security token issuance failed. Please use passcode.');
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
          setErrorMsg('Fingerprint scan error. Please use passcode.');
        }
      } finally {
        setIsBiometricScanning(false);
      }
    },
    [
      allowFingerprint,
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

  // Lifecycle & Biometric Auto-Trigger (auto-prompts in Fingerprint mode or legacy Admin with Both mode)
  useEffect(() => {
    if (isOpen) {
      passcodeRef.current = '';
      setPasscode('');
      setErrorMsg(null);
      setAttemptsLeft(null);
      setIsSuccess(false);
      setIsErrorFlash(false);

      const shouldAutoPrompt =
        unlockMethod === 'fingerprint' || (unlockMethod === 'both' && isAdminUser);

      if (shouldAutoPrompt && !hasAutoTriggeredBioRef.current) {
        hasAutoTriggeredBioRef.current = true;
        const timer = setTimeout(() => {
          void biometricUnlockRef.current(true);
        }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      hasAutoTriggeredBioRef.current = false;
      setIsSuccess(false);
    }
  }, [isOpen, unlockMethod, isAdminUser]);

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
  const isClearDisabled = isInputBlocked || passcode.length === 0;

  return (
    <div
      className="fixed inset-0 z-[9998] min-h-[100dvh] w-full flex flex-col justify-between select-none touch-manipulation overflow-hidden text-white"
      style={{
        background: 'linear-gradient(180deg, #020a07 0%, #061a12 100%)'
      }}
    >
      {/* Subtle Ambient Radial Emerald Glow Behind Logo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[320px] h-[240px] rounded-full opacity-35 motion-reduce:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.32) 0%, rgba(16,185,129,0) 70%)'
        }}
      />

      <div className="relative z-10 w-full max-w-[400px] mx-auto flex-1 flex flex-col justify-between px-4 sm:px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        {/* 1. Top Branding & Verified Role Pill */}
        <header className="flex flex-col items-center text-center">
          <div className="w-[clamp(56px,10.5dvh,72px)] h-[clamp(56px,10.5dvh,72px)] rounded-full bg-white p-0.5 ring-2 ring-emerald-500/60 shadow-[0_0_32px_rgba(16,185,129,0.28)] motion-reduce:shadow-none overflow-hidden shrink-0">
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

          <h1 className="mt-2.5 text-xl font-bold text-white tracking-tight leading-tight">
            Yogeshwari Dairy
          </h1>
          <p className="mt-0.5 text-sm text-slate-400 leading-tight">
            POS Security Gate
          </p>

          {/* Compact Verified Profile Pill */}
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-3 py-1">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-800 shrink-0">
              <img
                src={avatarUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs font-semibold text-white">{roleTitle}</span>
            <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          </div>
        </header>

        {/* 2. Passcode Instruction, 4 + 4 Boxes & Error/Status */}
        <section className="w-full my-auto py-3 space-y-3">
          {/* Instruction Row + 44px Eye Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm text-slate-300 min-w-0">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Enter your numeric master passcode
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                setShowPasscode((prev) => !prev);
              }}
              aria-label="Show or hide passcode"
              aria-pressed={showPasscode}
              className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-300 hover:text-white active:scale-95 active:bg-white/10 transition shrink-0 cursor-pointer"
            >
              {showPasscode ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Flexible Numeric Passcode Display + Unlock Trigger (supports any number of digits) */}
          <div
            role="group"
            aria-label="Numeric master passcode"
            className={`w-full flex items-center gap-2 ${
              isShake ? 'motion-safe:animate-subtle-shake' : ''
            }`}
          >
            <div
              className={`flex-1 min-w-0 h-[clamp(48px,7.4dvh,54px)] px-3.5 rounded-2xl flex items-center justify-center gap-2 overflow-x-auto no-scrollbar transition-all duration-150 ${
                isSuccess
                  ? 'border border-emerald-400 bg-emerald-500/20'
                  : isVerifying
                    ? 'border border-emerald-400/70 bg-emerald-500/15 motion-safe:animate-pulse'
                    : isErrorFlash || errorMsg
                      ? 'border border-rose-500 bg-rose-500/15'
                      : passcode.length > 0
                        ? 'border border-emerald-500/60 bg-white/[0.08] shadow-[0_0_16px_rgba(16,185,129,0.22)]'
                        : 'border border-white/15 bg-white/5'
              }`}
            >
              {passcode.length === 0 ? (
                <span className="text-xs font-medium text-slate-400 tracking-wide">
                  Tap digits below...
                </span>
              ) : showPasscode ? (
                <span className="text-white font-bold text-xl tracking-[0.22em] tabular-nums leading-none">
                  {passcode}
                </span>
              ) : (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {Array.from({ length: passcode.length }).map((_, idx) => (
                    <span
                      key={idx}
                      className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isInputBlocked || passcode.length === 0}
              onClick={() => {
                triggerHaptic(16);
                void executeVerification(passcode);
              }}
              aria-label="Unlock POS"
              className="h-[clamp(48px,7.4dvh,54px)] px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition shrink-0 cursor-pointer"
            >
              <span>Unlock</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Error / Attempts / Lockout / Fingerprint Action Row */}
          <div
            role="status"
            aria-live="polite"
            className="min-h-[26px] flex flex-col items-center justify-center text-center px-1 gap-1"
          >
            {isVerifying ? (
              <span className="text-xs font-medium text-emerald-400">
                Verifying passcode...
              </span>
            ) : isSuccess ? (
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

            {allowFingerprint && !isSuccess && lockoutRemainingSec === 0 && (
              <button
                type="button"
                disabled={isInputBlocked || isBiometricScanning}
                onClick={() => {
                  triggerHaptic(14);
                  void handleBiometricUnlock(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40 py-0.5 px-2.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isBiometricScanning ? 'Scanning fingerprint...' : 'Use Fingerprint'}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* 3. Thumb-Zone 3x4 Numeric Keypad */}
        <section aria-label="Numeric keypad" className="w-full space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={isInputBlocked}
                onClick={() => handleDigitPress(digit)}
                aria-label={digit}
                className="h-[clamp(50px,8.2dvh,64px)] rounded-2xl bg-white/5 border border-white/10 text-2xl font-medium text-white flex items-center justify-center transition-all duration-100 select-none touch-manipulation active:scale-95 active:bg-emerald-500/20 active:border-emerald-400/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {digit}
              </button>
            ))}

            {/* Clear Key */}
            <button
              type="button"
              disabled={isClearDisabled}
              onClick={handleClear}
              aria-label="Clear passcode"
              className="h-[clamp(50px,8.2dvh,64px)] rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-center transition-all duration-100 select-none touch-manipulation active:scale-95 active:bg-emerald-500/20 active:border-emerald-400/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Clear
            </button>

            {/* Digit 0 */}
            <button
              type="button"
              disabled={isInputBlocked}
              onClick={() => handleDigitPress('0')}
              aria-label="0"
              className="h-[clamp(50px,8.2dvh,64px)] rounded-2xl bg-white/5 border border-white/10 text-2xl font-medium text-white flex items-center justify-center transition-all duration-100 select-none touch-manipulation active:scale-95 active:bg-emerald-500/20 active:border-emerald-400/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              0
            </button>

            {/* Backspace Key */}
            <button
              type="button"
              disabled={isClearDisabled}
              onClick={handleBackspace}
              aria-label="Backspace"
              className="h-[clamp(50px,8.2dvh,64px)] rounded-2xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center transition-all duration-100 select-none touch-manipulation active:scale-95 active:bg-emerald-500/20 active:border-emerald-400/50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Delete className="w-[22px] h-[22px]" aria-hidden="true" />
            </button>
          </div>

          {/* 4. Bottom Pinned Footer */}
          <footer className="pt-1 flex items-center justify-between gap-3">
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
        </section>
      </div>
    </div>
  );
};

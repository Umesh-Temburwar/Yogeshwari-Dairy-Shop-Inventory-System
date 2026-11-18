import React, { useState, useEffect, useRef, useCallback } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Lock,
  Eye,
  EyeOff,
  Delete,
  LogOut,
  ShieldCheck,
  BadgeCheck
} from 'lucide-react';
import { authenticateNileshFingerprint } from '../../lib/biometricAuth';

interface MasterSecurityModalProps {
  isOpen: boolean;
  onVerified?: () => void;
}

const PASSCODE_LENGTH = 8;

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
  const { user, role, unlockSecurity, unlockSecurityWithBiometrics, signOut } = useAuth();
  const { language } = useLanguage();

  // Check if active profile is Nilesh Sakhare (Admin)
  const isNilesh =
    role === 'Admin' ||
    user?.email?.toLowerCase().includes('nilu') ||
    user?.email?.toLowerCase().includes('nilesh') ||
    (typeof user?.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name.toLowerCase().includes('nilesh'));

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
  const hasAutoTriggeredBioRef = useRef(false);
  const biometricUnlockRef = useRef<(isAuto?: boolean) => Promise<void>>(async () => {});

  // Verification execution (unchanged SHA-256 / AuthContext flow)
  const executeVerification = useCallback(async (pinToVerify: string) => {
    if (isVerifyingRef.current || isVerifying || lockoutRemainingSec > 0 || isSuccess) return;
    if (pinToVerify.length !== PASSCODE_LENGTH) return;

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
          setErrorMsg(
            language === 'mr'
              ? 'अनेक अयशस्वी प्रयत्न! सुरक्षा खातर ५ मिनिटांसाठी लॉक केले गेले आहे.'
              : language === 'hi'
                ? 'कई असफल प्रयास! सुरक्षा कारणों से ५ मिनट के लिए लॉक किया गया है।'
                : 'Too many failed attempts. Locked for 5 minutes.'
          );
        } else {
          setAttemptsLeft(res.attemptsLeft);
          setErrorMsg(
            language === 'mr'
              ? `चुकीचा पासवर्ड. पुन्हा प्रयत्न करा. (${res.attemptsLeft} प्रयत्न शिल्लक)`
              : language === 'hi'
                ? `गलत पासवर्ड। पुनः प्रयास करें। (${res.attemptsLeft} प्रयास शेष)`
                : 'Wrong passcode. Try again.'
          );
        }
        setPasscode('');
      }
    } catch {
      triggerHaptic([40, 50, 40]);
      setIsShake(true);
      setIsErrorFlash(true);
      setTimeout(() => setIsShake(false), 420);
      setTimeout(() => setIsErrorFlash(false), 650);
      setErrorMsg(
        language === 'mr'
          ? 'पडताळणीमध्ये त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
          : language === 'hi'
            ? 'सत्यापन में त्रुटि आई। कृपया पुनः प्रयास करें।'
            : 'Verification error. Please try again.'
      );
      setPasscode('');
    } finally {
      setIsVerifying(false);
      isVerifyingRef.current = false;
    }
  }, [unlockSecurity, onVerified, language, lockoutRemainingSec, isVerifying, isSuccess]);

  // Keypad Handlers
  const handleDigitPress = useCallback((digit: string) => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess) return;
    if (passcode.length < PASSCODE_LENGTH) {
      triggerHaptic(14);
      const next = passcode + digit;
      setPasscode(next);
      setErrorMsg(null);
      setAttemptsLeft(null);
      setIsErrorFlash(false);

      // Auto-submit when the 8th digit is entered
      if (next.length === PASSCODE_LENGTH) {
        void executeVerification(next);
      }
    }
  }, [passcode, isVerifying, isSuccess, lockoutRemainingSec, executeVerification]);

  const handleBackspace = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess || passcode.length === 0) return;
    triggerHaptic(14);
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
    setIsErrorFlash(false);
  }, [lockoutRemainingSec, isVerifying, isSuccess, passcode.length]);

  const handleClear = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess || passcode.length === 0) return;
    triggerHaptic(18);
    setPasscode('');
    setErrorMsg(null);
    setIsErrorFlash(false);
  }, [lockoutRemainingSec, isVerifying, isSuccess, passcode.length]);

  // Physical keyboard support (0-9, Backspace, Enter, Escape, Delete)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutRemainingSec > 0 || isVerifying || isSuccess) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (passcode.length === PASSCODE_LENGTH) {
          e.preventDefault();
          void executeVerification(passcode);
        }
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    lockoutRemainingSec,
    isVerifying,
    isSuccess,
    passcode,
    handleDigitPress,
    handleBackspace,
    handleClear,
    executeVerification
  ]);

  // Biometric Unlock for Nilesh Sakhare (unchanged logic)
  const handleBiometricUnlock = useCallback(async (isAuto = false) => {
    if (lockoutRemainingSec > 0 || isVerifying || isBiometricScanning || isSuccess) return;
    setIsBiometricScanning(true);
    if (!isAuto) setErrorMsg(null);

    try {
      const res = await authenticateNileshFingerprint();
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
          setErrorMsg(
            language === 'mr'
              ? 'सुरक्षा टोकन जारी करता आले नाही. कृपया पासवर्ड वापरा.'
              : language === 'hi'
                ? 'सुरक्षा टोकन जारी नहीं हो सका। कृपया पासवर्ड का उपयोग करें।'
                : 'Security token issuance failed. Please use passcode.'
          );
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
        setErrorMsg(
          language === 'mr'
            ? 'फिंगरप्रिंट स्कॅनमध्ये त्रुटी आली. कृपया पासवर्ड वापरा.'
            : language === 'hi'
              ? 'फिंगरप्रिंट स्कैन में त्रुटि। कृपया पासवर्ड का उपयोग करें।'
              : 'Fingerprint scan error. Please use passcode.'
        );
      }
    } finally {
      setIsBiometricScanning(false);
    }
  }, [lockoutRemainingSec, isVerifying, isBiometricScanning, isSuccess, unlockSecurityWithBiometrics, onVerified, language]);

  useEffect(() => {
    biometricUnlockRef.current = handleBiometricUnlock;
  }, [handleBiometricUnlock]);

  // Lifecycle & Biometric Auto-Trigger (runs ONLY when modal opens/closes — never wipes errorMsg mid-verification)
  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setAttemptsLeft(null);
      setIsSuccess(false);
      setIsErrorFlash(false);

      if (isNilesh && !hasAutoTriggeredBioRef.current) {
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
  }, [isOpen, isNilesh]);

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

  const userName = isNilesh ? 'Nilesh Sakhare' : 'Nikhil Sakhare';
  const roleTitle = role === 'Owner'
    ? (language === 'mr' ? 'मालक' : language === 'hi' ? 'मालिक' : 'Owner')
    : (language === 'mr' ? 'ॲडमिन' : language === 'hi' ? 'एडमिन' : 'Admin');

  const isInputBlocked = lockoutRemainingSec > 0 || isVerifying || isSuccess;
  const isClearDisabled = isInputBlocked || passcode.length === 0;

  const renderPasscodeBox = (idx: number) => {
    const isFilled = idx < passcode.length;
    const isCurrent = idx === passcode.length && !isInputBlocked;
    const digitChar = showPasscode && isFilled ? passcode[idx] : '';

    return (
      <div
        key={idx}
        className={`flex-1 max-w-[40px] h-[clamp(44px,7.4dvh,52px)] rounded-xl flex items-center justify-center transition-all duration-150 select-none ${
          isSuccess
            ? 'border border-emerald-400 bg-emerald-500/20'
            : isVerifying
              ? 'border border-emerald-400/70 bg-emerald-500/15 motion-safe:animate-pulse'
              : isErrorFlash || errorMsg
                ? 'border border-rose-500 bg-rose-500/15'
                : isCurrent
                  ? 'border border-emerald-500 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.28)] motion-reduce:shadow-none'
                  : isFilled
                    ? 'border border-emerald-500/50 bg-white/[0.08]'
                    : 'border border-white/10 bg-white/5'
        }`}
      >
        {isFilled ? (
          showPasscode ? (
            <span className="text-white font-semibold text-lg leading-none tabular-nums">
              {digitChar}
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          )
        ) : isCurrent ? (
          <span
            aria-hidden="true"
            className="w-0.5 h-5 rounded-full bg-emerald-400 motion-safe:animate-passcode-caret"
          />
        ) : null}
      </div>
    );
  };

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
            {language === 'mr'
              ? 'मास्टर सुरक्षा लॉक'
              : language === 'hi'
                ? 'मास्टर सुरक्षा लॉक'
                : 'POS Security Gate'}
          </p>

          {/* Compact Verified Profile Pill */}
          <div className="mt-2.5 inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 pl-1.5 pr-3 py-1">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-emerald-500/40 bg-slate-800 shrink-0">
              <img
                src={nikhilAvatar}
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
                {language === 'mr'
                  ? '८-अंकी मास्टर पासवर्ड टाका'
                  : language === 'hi'
                    ? '८-अंकीय मास्टर पासवर्ड दर्ज करें'
                    : 'Enter your 8-digit master passcode'}
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

          {/* 8 Boxes in ONE Row (4 + 4 Split with Wider Center Gap, No Dot) */}
          <div
            role="group"
            aria-label="8-digit master passcode"
            className={`w-full flex items-center justify-center gap-3.5 ${
              isShake ? 'motion-safe:animate-subtle-shake' : ''
            }`}
          >
            <div className="flex-1 flex items-center justify-end gap-1.5">
              {[0, 1, 2, 3].map(renderPasscodeBox)}
            </div>
            <div className="flex-1 flex items-center justify-start gap-1.5">
              {[4, 5, 6, 7].map(renderPasscodeBox)}
            </div>
          </div>

          {/* Error / Attempts / Lockout / Verifying Status */}
          <div
            role="status"
            aria-live="polite"
            className="min-h-[22px] flex flex-col items-center justify-center text-center px-1"
          >
            {isVerifying ? (
              <span className="text-xs font-medium text-emerald-400">
                {language === 'mr'
                  ? 'पासवर्ड पडताळणी सुरू आहे...'
                  : language === 'hi'
                    ? 'सत्यापन हो रहा है...'
                    : 'Verifying passcode...'}
              </span>
            ) : isSuccess ? (
              <span className="text-xs font-semibold text-emerald-400">
                {language === 'mr'
                  ? 'प्रवेश मंजूर • दुकान अनलॉक झाले'
                  : language === 'hi'
                    ? 'प्रवेश स्वीकृत • दुकान अनलॉक हुआ'
                    : 'Access Granted • Unlocked'}
              </span>
            ) : lockoutRemainingSec > 0 ? (
              <span className="text-xs font-semibold text-rose-400">
                {language === 'mr'
                  ? 'सुरक्षा लॉक सक्रिय:'
                  : language === 'hi'
                    ? 'सुरक्षा लॉक सक्रिय:'
                    : 'Locked for security:'}{' '}
                {formatLockoutTime(lockoutRemainingSec)}
              </span>
            ) : errorMsg ? (
              <span className="text-xs font-medium text-rose-400 leading-snug">
                {errorMsg}
                {language === 'en' && attemptsLeft !== null && attemptsLeft > 0
                  ? ` (${attemptsLeft} attempts left)`
                  : ''}
              </span>
            ) : isNilesh ? (
              <button
                type="button"
                disabled={isInputBlocked || isBiometricScanning}
                onClick={() => {
                  triggerHaptic(14);
                  void handleBiometricUnlock(false);
                }}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-40 py-0.5 transition cursor-pointer"
              >
                {isBiometricScanning
                  ? language === 'mr'
                    ? 'फिंगरप्रिंट स्कॅनिंग...'
                    : language === 'hi'
                      ? 'फिंगरप्रिंट स्कैनिंग...'
                      : 'Scanning fingerprint...'
                  : language === 'mr'
                    ? 'फिंगरप्रिंट वापरा'
                    : language === 'hi'
                      ? 'फिंगरप्रिंट उपयोग करें'
                      : 'Use Fingerprint'}
              </button>
            ) : null}
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
              {language === 'mr' ? 'साफ' : language === 'hi' ? 'साफ' : 'Clear'}
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
              <span>
                {language === 'mr' ? 'बाहेर पडा' : language === 'hi' ? 'साइन आउट' : 'Sign Out'}
              </span>
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

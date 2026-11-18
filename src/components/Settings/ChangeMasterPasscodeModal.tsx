import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  CloudCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  verifyCurrentMasterPasscodeForChange,
  changeMasterPasscode,
  getLockoutTimestamp,
  isValidMasterPasscodeFormat,
  MAX_PASSCODE_LENGTH
} from '../../lib/security';

interface ChangeMasterPasscodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const triggerHaptic = (pattern: number | number[] = 18) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported vibration calls
    }
  }
};

export const ChangeMasterPasscodeModal: React.FC<ChangeMasterPasscodeModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, role, lockSecurity, masterLockEnabled, setMasterLockEnabled } = useAuth();

  const [step, setStep] = useState<'verify' | 'new' | 'success'>('verify');
  const [currentPin, setCurrentPin] = useState('');
  const [verifiedCurrentPin, setVerifiedCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState(0);
  const [cloudSynced, setCloudSynced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('verify');
      setCurrentPin('');
      setVerifiedCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setIsSubmitting(false);
      setErrorMsg(null);
      setCloudSynced(false);

      const lockUntil = getLockoutTimestamp();
      if (lockUntil && lockUntil > Date.now()) {
        setLockoutRemainingSec(Math.ceil((lockUntil - Date.now()) / 1000));
      } else {
        setLockoutRemainingSec(0);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (lockoutRemainingSec <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev <= 1) {
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemainingSec]);

  if (!isOpen) return null;

  const formatLockout = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const countChars = (val: string) => Array.from(val.trim()).length;

  // Step 1: Verify current master password (supports any digits, text, symbols, emojis)
  const handleVerifyCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || lockoutRemainingSec > 0) return;

    const cleanCurrent = currentPin.trim();
    if (!isValidMasterPasscodeFormat(cleanCurrent)) {
      triggerHaptic([40, 45, 40]);
      setErrorMsg('Please enter your current master password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await verifyCurrentMasterPasscodeForChange(cleanCurrent);
      if (res.success) {
        triggerHaptic([20, 35, 45]);
        setVerifiedCurrentPin(cleanCurrent);
        setCurrentPin('');
        setStep('new');
      } else {
        triggerHaptic([45, 55, 45]);
        if (res.error === 'SECURITY_LOCKED' && res.lockedUntil) {
          const secs = Math.max(1, Math.ceil((res.lockedUntil - Date.now()) / 1000));
          setLockoutRemainingSec(secs);
          setErrorMsg('Too many failed attempts. Locked for 5 minutes.');
        } else {
          setErrorMsg(`Incorrect current password. ${res.attemptsLeft} attempts remaining.`);
        }
        setCurrentPin('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Save new flexible master password (any digits, text, symbols, emojis)
  const handleSaveNewPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!isValidMasterPasscodeFormat(cleanNew)) {
      triggerHaptic([40, 45, 40]);
      setErrorMsg(`New password must be 1 to ${MAX_PASSCODE_LENGTH} characters (digits, text, symbols, or emojis).`);
      return;
    }

    if (cleanNew !== cleanConfirm) {
      triggerHaptic([40, 45, 40]);
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (cleanNew === verifiedCurrentPin) {
      triggerHaptic([40, 45, 40]);
      setErrorMsg('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await changeMasterPasscode(verifiedCurrentPin, cleanNew, cleanConfirm, {
        name:
          (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
          (role === 'Owner' ? 'Nikhil Sakhare' : 'Nilesh Sakhare'),
        email: user?.email || undefined,
        role
      });

      if (res.success) {
        triggerHaptic([25, 45, 55]);
        setCloudSynced(Boolean(res.cloudSynced));
        setVerifiedCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setStep('success');
      } else {
        triggerHaptic([45, 55, 45]);
        if (res.error === 'INVALID_CURRENT_PASSCODE' || res.error === 'SECURITY_LOCKED') {
          setStep('verify');
          setVerifiedCurrentPin('');
          if (res.lockedUntil) {
            setLockoutRemainingSec(Math.max(1, Math.ceil((res.lockedUntil - Date.now()) / 1000)));
          }
        }
        setErrorMsg('Could not update password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const newPinTrimmed = newPin.trim();
  const confirmPinTrimmed = confirmPin.trim();
  const canSaveNew =
    isValidMasterPasscodeFormat(newPinTrimmed) &&
    confirmPinTrimmed.length > 0 &&
    newPinTrimmed === confirmPinTrimmed &&
    !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-passcode-title"
    >
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-slate-200/90 dark:border-[#24352F] rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-[#24352F]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="change-passcode-title"
                className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate"
              >
                Change Master Password
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                Digits, text, symbols or emojis (any length)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* 2-Step Security Indicator */}
          {step !== 'success' && (
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  step === 'verify'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-[#1A2A25] border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  {step === 'new' ? '✓' : '1'}
                </span>
                <span className="truncate text-[11px]">Current Password</span>
              </div>

              <div
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                  step === 'new'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-400 dark:text-[#6E857B]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                    step === 'new'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-[#24352F] text-slate-500 dark:text-[#8FA69C]'
                  }`}
                >
                  2
                </span>
                <span className="truncate text-[11px]">New Password</span>
              </div>
            </div>
          )}

          {/* Error / Lockout Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {lockoutRemainingSec > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Security Cooldown Active</span>
              </span>
              <span className="font-mono">{formatLockout(lockoutRemainingSec)}</span>
            </div>
          )}

          {/* STEP 1: VERIFY CURRENT MASTER PASSWORD */}
          {step === 'verify' && (
            <form onSubmit={handleVerifyCurrent} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] text-xs text-slate-600 dark:text-[#9DB5AA] leading-relaxed">
                For security, verify your current master password before setting a new one.
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="current-master-pin"
                    className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
                  >
                    Current Master Password
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {countChars(currentPin)} chars
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="current-master-pin"
                    name="current_master_password"
                    type={showCurrent ? 'text' : 'password'}
                    maxLength={MAX_PASSCODE_LENGTH}
                    autoComplete="current-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoFocus
                    disabled={lockoutRemainingSec > 0 || isSubmitting}
                    value={currentPin}
                    onChange={(e) => {
                      setCurrentPin(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Enter current master password"
                    className="w-full h-12 pl-4 pr-11 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-[16px] font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#22352E] text-slate-700 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValidMasterPasscodeFormat(currentPin) || lockoutRemainingSec > 0 || isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER & CONFIRM NEW MASTER PASSWORD */}
          {step === 'new' && (
            <form onSubmit={handleSaveNewPasscode} className="space-y-4">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Verified! Set any digits, text, symbols, or emoji password.</span>
              </div>

              {/* New Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="new-master-pin"
                    className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
                  >
                    New Master Password
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {countChars(newPin)}/{MAX_PASSCODE_LENGTH}
                  </span>
                </div>

                <div className="relative">
                  <input
                    id="new-master-pin"
                    name="new_master_password"
                    type={showNew ? 'text' : 'password'}
                    maxLength={MAX_PASSCODE_LENGTH}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoFocus
                    disabled={isSubmitting}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="e.g. 1234, Dairy@2026, 🥛99"
                    className="w-full h-12 pl-4 pr-11 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-[16px] font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="confirm-master-pin"
                    className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
                  >
                    Confirm New Password
                  </label>
                  {confirmPinTrimmed.length > 0 && (
                    <span
                      className={`text-[11px] font-bold ${
                        confirmPinTrimmed === newPinTrimmed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {confirmPinTrimmed === newPinTrimmed ? 'Matched ✓' : 'Mismatch'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="confirm-master-pin"
                    name="confirm_master_password"
                    type={showConfirm ? 'text' : 'password'}
                    maxLength={MAX_PASSCODE_LENGTH}
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    disabled={isSubmitting}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Re-enter new master password"
                    className="w-full h-12 pl-4 pr-11 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-[16px] font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('verify');
                    setVerifiedCurrentPin('');
                    setNewPin('');
                    setConfirmPin('');
                    setErrorMsg(null);
                  }}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#22352E] text-slate-700 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] font-bold text-xs transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!canSaveNew}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Save New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && (
            <div className="py-3 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-700/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Master Password Updated!
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C] leading-relaxed">
                  Use your new master password the next time you unlock the POS counter.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-[11px] font-semibold text-slate-600 dark:text-[#8FA69C]">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {cloudSynced
                    ? 'SHA-256 encrypted • Synced to cloud & device'
                    : 'SHA-256 encrypted • Active immediately on this device'}
                </span>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!masterLockEnabled) {
                      setMasterLockEnabled(true);
                    }
                    onClose();
                    lockSecurity();
                  }}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 hover:bg-amber-100 dark:hover:bg-amber-900/45 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock & Test</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

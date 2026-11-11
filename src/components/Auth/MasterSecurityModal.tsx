import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  LogOut, 
  KeyRound, 
  CheckCircle2, 
  Loader2, 
  Delete, 
  Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MasterSecurityModalProps {
  isOpen: boolean;
}

export const MasterSecurityModal: React.FC<MasterSecurityModalProps> = ({ isOpen }) => {
  const { role, unlockSecurity, signOut } = useAuth();
  const { language } = useLanguage();

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);
  const [isShake, setIsShake] = useState(false);

  // Focus input automatically
  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setAttemptsLeft(null);
    }
  }, [isOpen]);

  // Lockout countdown timer
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

  const handleDigitPress = (digit: string) => {
    if (lockoutRemainingSec > 0 || isVerifying) return;
    if (passcode.length < 12) {
      setPasscode((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    if (lockoutRemainingSec > 0 || isVerifying) return;
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    if (lockoutRemainingSec > 0 || isVerifying) return;
    setPasscode('');
    setErrorMsg(null);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passcode.trim() || isVerifying || lockoutRemainingSec > 0) return;

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await unlockSecurity(passcode.trim());
      if (res.success) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setPasscode('');
      } else {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);

        if (res.error === 'SECURITY_LOCKED' && res.lockedUntil) {
          const secs = Math.ceil((res.lockedUntil - Date.now()) / 1000);
          setLockoutRemainingSec(Math.max(1, secs));
          setErrorMsg(
            language === 'mr'
              ? 'अनेक अयशस्वी प्रयत्न! सुरक्षा खातर ५ मिनिटांसाठी लॉक केले गेले आहे.'
              : language === 'hi'
              ? 'कई असफल प्रयास! सुरक्षा कारणों से ५ मिनट के लिए लॉक किया गया है।'
              : 'Too many failed attempts! Locked for 5 minutes for security.'
          );
        } else {
          setAttemptsLeft(res.attemptsLeft);
          setErrorMsg(
            language === 'mr'
              ? `अवैध सुरक्षा पासवर्ड! आणखी ${res.attemptsLeft} प्रयत्न शिल्लक आहेत.`
              : language === 'hi'
              ? `अमान्य सुरक्षा पासवर्ड! केवल ${res.attemptsLeft} प्रयास शेष हैं।`
              : `Invalid Master Passcode! ${res.attemptsLeft} attempts remaining.`
          );
        }
        setPasscode('');
      }
    } catch {
      setErrorMsg('Verification error. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  const formatLockoutTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05120D]/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 select-none overflow-y-auto">
      <div 
        className={`bg-white dark:bg-[#131F1B] border border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-7 relative overflow-y-auto max-h-[95dvh] my-auto transition-transform ${
          isShake ? 'animate-shake' : ''
        }`}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 bg-gradient-to-b from-emerald-500/25 to-teal-500/0 rounded-full blur-2xl pointer-events-none" />

        {/* Header: Logo + Title */}
        <div className="text-center relative z-10 space-y-2">
          <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-xl flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-white p-0.5 overflow-hidden flex items-center justify-center">
              <img 
                src="/YDO_logo.jpg" 
                alt="Yogeshwari Dairy" 
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md border-2 border-white dark:border-[#131F1B]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/50 text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>
                {role === 'Owner'
                  ? (language === 'mr' ? '👑 मालक पडताळणी (Owner Mode)' : language === 'hi' ? '👑 मालिक सत्यापन (Owner Mode)' : '👑 Owner Verified Profile')
                  : (language === 'mr' ? '🛡️ ॲडमिन पडताळणी (Admin Mode)' : language === 'hi' ? '🛡️ एडमिन सत्यापन (Admin Mode)' : '🛡️ Admin Verified Profile')
                }
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-[#E7F0EC] tracking-tight">
              {language === 'mr'
                ? 'द्वितीय स्तर सुरक्षा पासवर्ड'
                : language === 'hi'
                ? 'द्वितीय स्तर सुरक्षा पासवर्ड'
                : 'Two-Step Master Security Passcode'}
            </h3>

            <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5 max-w-xs mx-auto">
              {language === 'mr'
                ? 'दुकान व खात्याच्या सुरक्षिततेसाठी एन्क्रिप्टेड मास्टर पासवर्ड प्रविष्ट करा.'
                : language === 'hi'
                ? 'दुकान व खातों की सुरक्षा के लिए एन्क्रिप्टेड मास्टर पासवर्ड दर्ज करें।'
                : 'Enter your encrypted master passcode to access shop data & POS counter.'}
            </p>
          </div>
        </div>

        {/* Passcode Form */}
        <form onSubmit={handleVerify} className="mt-5 space-y-4 relative z-10">
          {/* Input field with dots and toggle */}
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>

            <input
              type={showPasscode ? 'text' : 'password'}
              autoFocus
              disabled={lockoutRemainingSec > 0 || isVerifying}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setErrorMsg(null);
              }}
              placeholder={language === 'mr' ? 'मास्टर पासवर्ड टाइप करा' : language === 'hi' ? 'मास्टर पासवर्ड दर्ज करें' : 'Enter 8-digit master passcode'}
              className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-2xl text-slate-900 dark:text-white text-center font-mono font-black text-lg tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 transition-all shadow-inner"
            />

            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white p-1"
              aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error / Lockout Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          {/* Lockout countdown timer display */}
          {lockoutRemainingSec > 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-center space-y-1">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                {language === 'mr' ? 'सुरक्षा लॉक सक्रिय (Cooldown)' : language === 'hi' ? 'सुरक्षा लॉक सक्रिय' : 'Security Lock Active'}
              </span>
              <span className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 block">
                {formatLockoutTime(lockoutRemainingSec)}
              </span>
            </div>
          )}

          {/* On-Screen Touch Numeric Keypad (Ideal for POS Touch Counter & Tablet) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={lockoutRemainingSec > 0 || isVerifying}
                onClick={() => handleDigitPress(digit)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] font-black text-base transition-all active:scale-95 disabled:opacity-40 border border-slate-200/60 dark:border-[#24352F] shadow-2xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || passcode.length === 0}
              onClick={handleClear}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-rose-100 dark:bg-[#1A2A25] dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 dark:text-[#8FA69C] dark:hover:text-rose-400 font-bold text-xs transition-all active:scale-95 disabled:opacity-40 border border-slate-200/60 dark:border-[#24352F]"
            >
              {language === 'mr' ? 'साफ' : language === 'hi' ? 'साफ' : 'Clear'}
            </button>
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying}
              onClick={() => handleDigitPress('0')}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] font-black text-base transition-all active:scale-95 disabled:opacity-40 border border-slate-200/60 dark:border-[#24352F] shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || passcode.length === 0}
              onClick={handleBackspace}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-700 dark:text-[#E7F0EC] font-bold text-sm transition-all active:scale-95 disabled:opacity-40 border border-slate-200/60 dark:border-[#24352F] flex items-center justify-center"
              aria-label="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons: Unlock & Sign Out */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={!passcode.trim() || isVerifying || lockoutRemainingSec > 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white font-black text-sm shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {language === 'mr' ? 'पडताळणी सुरू आहे...' : language === 'hi' ? 'सत्यापन हो रहा है...' : 'Verifying Encrypted Passcode...'}
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>
                    {language === 'mr' ? 'सुरक्षा अनलॉक करा' : language === 'hi' ? 'सुरक्षा अनलॉक करें' : 'Unlock Counter'}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-2.5 px-3 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-500 hover:text-rose-600 dark:text-[#8FA69C] dark:hover:text-rose-400 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {language === 'mr' ? 'बाहेर पडा (Sign Out)' : language === 'hi' ? 'साइन आउट करें' : 'Sign Out'}
              </span>
            </button>
          </div>
        </form>

        {/* Cryptographic Encryption Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#24352F] text-center">
          <p className="text-[10px] text-slate-400 dark:text-[#8FA69C] font-mono flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span>SHA-256 Salted Cryptographic Zero-Knowledge Hash</span>
          </p>
        </div>
      </div>
    </div>
  );
};


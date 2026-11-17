import React, { useState, useEffect, useRef, useCallback } from 'react';
import ydoLogo from '../../assets/YDO_logo.png';
import ydpShopBg from '../../assets/YDP.jpg';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  LogOut, 
  CheckCircle2, 
  Loader2, 
  Delete, 
  AlertTriangle,
  Fingerprint,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { authenticateNileshFingerprint } from '../../lib/biometricAuth';

interface MasterSecurityModalProps {
  isOpen: boolean;
}

const PASSCODE_LENGTH = 8;

// Haptic feedback trigger for mobile touch devices
const triggerHaptic = (type: 'tap' | 'clear' | 'error' | 'success' = 'tap') => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'tap') {
        navigator.vibrate(28); // Crisp tactile click on digit entry
      } else if (type === 'clear') {
        navigator.vibrate(36);
      } else if (type === 'error') {
        navigator.vibrate([45, 60, 45]); // Double buzz on incorrect pin
      } else if (type === 'success') {
        navigator.vibrate([50, 70, 110]); // Festive pulse on access granted
      }
    } catch {}
  }
};

// Official Yogeshwari Dairy Products for background poster collage
const DAIRY_POSTER_ITEMS = [
  { name: 'ताजे म्हशीचे दूध', sub: 'Fresh Buffalo Milk', tag: '100% Pure & Thick', icon: '🥛', color: 'from-blue-600/20 to-emerald-600/20' },
  { name: 'शुद्ध साजूक तूप', sub: 'Pure Desi Ghee', tag: 'Aromatic & Golden', icon: '🧈', color: 'from-amber-600/20 to-yellow-600/20' },
  { name: 'स्पेशल मलाई पनीर', sub: 'Fresh Malai Paneer', tag: 'Super Soft & Fresh', icon: '🧀', color: 'from-emerald-600/20 to-teal-600/20' },
  { name: 'घट्ट मलई दही', sub: 'Thick Fresh Dahi', tag: 'Rich & Creamy Curd', icon: '🥣', color: 'from-cyan-600/20 to-blue-600/20' },
  { name: 'मसाला ताक', sub: 'Spiced Buttermilk', tag: 'Cool & Digestive', icon: '🥤', color: 'from-teal-600/20 to-emerald-600/20' },
  { name: 'केसर श्रीखंड', sub: 'Kesar Shrikhand', tag: 'Royal Festive Sweet', icon: '🍯', color: 'from-yellow-600/20 to-amber-600/20' },
  { name: 'ताजे गावरान लोणी', sub: 'Fresh White Butter', tag: 'Traditional Taste', icon: '🧈', color: 'from-emerald-600/20 to-lime-600/20' },
  { name: 'शुद्ध खवा / मावा', sub: 'Pure Dairy Khawa', tag: 'Rich Mawa Base', icon: '🥮', color: 'from-amber-600/20 to-orange-600/20' },
  { name: 'मलाई पेढा', sub: 'Fresh Malai Peda', tag: 'Signature Sweet', icon: '🍬', color: 'from-yellow-600/20 to-amber-600/20' },
  { name: 'दूध पाऊच व शीतपेये', sub: 'Daily Milk Pouches', tag: 'Cold Storage Fresh', icon: '🥛', color: 'from-blue-600/20 to-indigo-600/20' },
  { name: 'ताजी बासुंदी', sub: 'Creamy Basundi', tag: 'Rich Milk Treat', icon: '🍨', color: 'from-amber-600/20 to-yellow-600/20' },
  { name: 'मलाई लस्सी', sub: 'Sweet Malai Lassi', tag: 'Chilled Dairy Drink', icon: '🥤', color: 'from-teal-600/20 to-cyan-600/20' },
];

export const MasterSecurityModal: React.FC<MasterSecurityModalProps> = ({ isOpen }) => {
  const { user, role, unlockSecurity, unlockSecurityWithBiometrics, signOut } = useAuth();
  const { language } = useLanguage();

  // Check if active profile is Nilesh Sakhare (Admin)
  const isNilesh = 
    role === 'Admin' ||
    user?.email?.toLowerCase().includes('nilu') ||
    user?.email?.toLowerCase().includes('nilesh') ||
    user?.user_metadata?.full_name?.toLowerCase().includes('nilesh');

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBiometricScanning, setIsBiometricScanning] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);
  const [isShake, setIsShake] = useState(false);

  const isVerifyingRef = useRef(false);
  const hasAutoTriggeredBioRef = useRef(false);

  // Verification execution
  const executeVerification = useCallback(async (pinToVerify: string) => {
    if (isVerifyingRef.current || isVerifying || lockoutRemainingSec > 0 || isSuccess) return;
    if (pinToVerify.length !== PASSCODE_LENGTH) return;

    isVerifyingRef.current = true;
    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await unlockSecurity(pinToVerify);
      if (res.success) {
        setIsSuccess(true);
        triggerHaptic('success');
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch {}
        setTimeout(() => {
          setPasscode('');
        }, 300);
      } else {
        setIsShake(true);
        triggerHaptic('error');
        setTimeout(() => setIsShake(false), 450);

        if (res.error === 'SECURITY_LOCKED' && res.lockedUntil) {
          const secs = Math.ceil((res.lockedUntil - Date.now()) / 1000);
          setLockoutRemainingSec(Math.max(1, secs));
          setErrorMsg(
            language === 'mr'
              ? 'अनेक अयशस्वी प्रयत्न! सुरक्षा खातर ५ मिनिटांसाठी लॉक केले गेले आहे.'
              : language === 'hi'
              ? 'कई असफल प्रयास! सुरक्षा कारणों से ५ मिनट के लिए लॉक किया गया है।'
              : 'Too many failed attempts. Locked for 5 minutes for security.'
          );
        } else {
          setAttemptsLeft(res.attemptsLeft);
          setErrorMsg(
            language === 'mr'
              ? `अवैध पासवर्ड! आणखी ${res.attemptsLeft} प्रयत्न शिल्लक आहेत.`
              : language === 'hi'
              ? `अमान्य पासवर्ड! केवल ${res.attemptsLeft} प्रयास शेष हैं।`
              : `Incorrect passcode. ${res.attemptsLeft} attempts remaining.`
          );
        }
        setPasscode('');
      }
    } catch {
      triggerHaptic('error');
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
  }, [unlockSecurity, language, lockoutRemainingSec, isVerifying, isSuccess]);

  // Keypad Handlers with Haptic Vibration
  const handleDigitPress = useCallback((digit: string) => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess) return;
    if (passcode.length < PASSCODE_LENGTH) {
      triggerHaptic('tap');
      const next = passcode + digit;
      setPasscode(next);
      setErrorMsg(null);
      setAttemptsLeft(null);

      // Automatic Trigger when exactly 8 digits are entered
      if (next.length === PASSCODE_LENGTH) {
        executeVerification(next);
      }
    }
  }, [passcode, isVerifying, isSuccess, lockoutRemainingSec, executeVerification]);

  const handleBackspace = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess) return;
    triggerHaptic('tap');
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  }, [lockoutRemainingSec, isVerifying, isSuccess]);

  const handleClear = useCallback(() => {
    if (lockoutRemainingSec > 0 || isVerifying || isSuccess) return;
    triggerHaptic('clear');
    setPasscode('');
    setErrorMsg(null);
  }, [lockoutRemainingSec, isVerifying, isSuccess]);

  // Hardware keyboard listener for Desktop PC / POS Terminals
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
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lockoutRemainingSec, isVerifying, isSuccess, handleDigitPress, handleBackspace, handleClear]);

  // Biometric Unlock for Nilesh Sakhare
  const handleBiometricUnlock = useCallback(async (isAuto = false) => {
    if (lockoutRemainingSec > 0 || isVerifying || isBiometricScanning || isSuccess) return;
    setIsBiometricScanning(true);
    if (!isAuto) setErrorMsg(null);

    try {
      const res = await authenticateNileshFingerprint();
      if (res.success) {
        const granted = await unlockSecurityWithBiometrics();
        if (granted) {
          setIsSuccess(true);
          triggerHaptic('success');
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          } catch {}
          setPasscode('');
        } else {
          setErrorMsg(
            language === 'mr'
              ? 'सुरक्षा टोकन जारी करता आले नाही. कृपया पासवर्ड वापरा.'
              : language === 'hi'
              ? 'सुरक्षा टोकन जारी नहीं हो सका। कृपया पासवर्ड का उपयोग करें।'
              : 'Security token issuance failed. Please use passcode.'
          );
        }
      } else if (res.error && !isAuto) {
        triggerHaptic('error');
        setErrorMsg(res.error);
        setIsShake(true);
        setTimeout(() => setIsShake(false), 450);
      }
    } catch {
      if (!isAuto) {
        triggerHaptic('error');
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
  }, [lockoutRemainingSec, isVerifying, isBiometricScanning, isSuccess, unlockSecurityWithBiometrics, language]);

  // Lifecycle & Biometric Auto-Trigger
  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
      setAttemptsLeft(null);
      setIsSuccess(false);

      if (isNilesh && !hasAutoTriggeredBioRef.current) {
        hasAutoTriggeredBioRef.current = true;
        const timer = setTimeout(() => {
          handleBiometricUnlock(true);
        }, 200);
        return () => clearTimeout(timer);
      }
    } else {
      hasAutoTriggeredBioRef.current = false;
      setIsSuccess(false);
    }
  }, [isOpen, isNilesh, handleBiometricUnlock]);

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

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-[#050D0A] overflow-hidden flex items-center justify-center p-3 sm:p-4 select-none"
      style={{ touchAction: 'manipulation' }}
    >
      {/* ══════════════════════════════════════════════════════════════
          BACKGROUND LAYER 1: Authentic Retail Store Photo (YDP.jpg)
          ══════════════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img 
          src={ydpShopBg} 
          alt="Yogeshwari Dairy Store"
          className="w-full h-full object-cover object-center filter blur-[3px] scale-105 opacity-25"
        />
        {/* Dark forest green protective gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050E0A]/95 via-[#081711]/90 to-[#040A07]/96" />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BACKGROUND LAYER 2: Official Dairy Products Poster Collage Grid
          ══════════════════════════════════════════════════════════════ */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none p-3 sm:p-6 opacity-35 dark:opacity-30 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 content-center"
        aria-hidden="true"
      >
        {DAIRY_POSTER_ITEMS.map((item, idx) => (
          <div 
            key={idx}
            className={`p-3 rounded-2xl bg-gradient-to-br ${item.color} border border-emerald-500/15 backdrop-blur-xs flex items-center gap-2.5 shadow-sm`}
          >
            <span className="text-2xl shrink-0 select-none">{item.icon}</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-emerald-100 truncate">{item.name}</div>
              <div className="text-[10px] text-emerald-300/80 truncate">{item.sub}</div>
              <div className="text-[9px] font-semibold text-amber-300/90 tracking-wide mt-0.5 truncate">★ {item.tag}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          BACKGROUND LAYER 3: Large Center Logo Watermark
          ══════════════════════════════════════════════════════════════ */}
      <div 
        className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        {/* Luminous emerald ambient halo */}
        <div className="w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-emerald-500/10 blur-3xl absolute" />
        
        {/* Prominent circular watermark logo */}
        <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-emerald-500/20 p-2 opacity-20 flex items-center justify-center shadow-2xl">
          <img 
            src={ydoLogo} 
            alt="Yogeshwari Dairy Watermark"
            className="w-full h-full object-cover rounded-full filter contrast-125 saturate-125"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/YDO_logo.png')) {
                target.src = '/YDO_logo.png';
              }
            }}
          />
        </div>

        {/* Branded Watermark Typography */}
        <div className="mt-3 text-center opacity-25">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-emerald-300 block">
            योगेश्वरी डेअरी प्रॉडक्ट्स
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 block mt-0.5 tracking-wider">
            Purity is Our Identity • Fresh Daily Products
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FOREGROUND: Master Passcode Security Card (Clean & Focused)
          ══════════════════════════════════════════════════════════════ */}
      <div 
        className="relative z-10 w-full max-w-[380px] bg-[#0E1A16]/96 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-md flex flex-col justify-between my-auto"
      >
        {/* Top Header: Shop Branding & Verified Profile */}
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-[#1E2E28]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-emerald-500/40 overflow-hidden shrink-0 shadow-xs">
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
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                  Yogeshwari Dairy
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-[#8FA69C] leading-none mt-0.5 truncate">
                  {language === 'mr' ? 'मास्टर सुरक्षा लॉक' : language === 'hi' ? 'मास्टर सुरक्षा लॉक' : 'POS Security Gate'}
                </p>
              </div>
            </div>

            {/* Profile Badge */}
            <div className="flex items-center gap-1.5 pl-2 shrink-0">
              <div className="w-8 h-8 rounded-full border border-emerald-500/40 p-0.5 overflow-hidden bg-slate-800 shrink-0">
                <img 
                  src={nikhilAvatar} 
                  alt={userName} 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div className="text-right">
                <span className="block text-[11px] font-bold text-emerald-400 leading-none">
                  {roleTitle}
                </span>
                <span className="block text-[10px] text-slate-400 leading-none mt-0.5">
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Status Banner & Passcode Cells */}
        <div className="py-4 space-y-3.5">
          {/* Dynamic Authentication State Display */}
          <div className="text-center min-h-[22px] flex items-center justify-center">
            {isVerifying ? (
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>
                  {language === 'mr' ? 'पासवर्ड पडताळणी सुरू आहे...' : language === 'hi' ? 'सत्यापन हो रहा है...' : 'Verifying passcode...'}
                </span>
              </div>
            ) : isSuccess ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {language === 'mr' ? 'प्रवेश मंजूर • दुकान अनलॉक झाले' : language === 'hi' ? 'प्रवेश स्वीकृत • दुकान अनलॉक हुआ' : 'Access Granted • Unlocked'}
                </span>
              </div>
            ) : errorMsg ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 leading-tight px-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : lockoutRemainingSec > 0 ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {language === 'mr' ? 'सुरक्षा लॉक सक्रिय:' : language === 'hi' ? 'सुरक्षा लॉक सक्रिय:' : 'Cooldown Active:'} {formatLockoutTime(lockoutRemainingSec)}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-500/80" />
                <span>
                  {language === 'mr' 
                    ? '८-अंकी मास्टर पासवर्ड टाका' 
                    : language === 'hi' 
                    ? '८-अंकीय मास्टर पासवर्ड दर्ज करें' 
                    : 'Enter your 8-digit master passcode'}
                </span>
              </div>
            )}
          </div>

          {/* 8-Digit Passcode Cells (4 + 4 layout) — Pure visual display, NO mobile keyboard */}
          <div 
            className={`flex items-center justify-center gap-1.5 sm:gap-2 ${isShake ? 'animate-subtle-shake' : ''}`}
            aria-label="Passcode digits display"
            role="group"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
              const isFilled = idx < passcode.length;
              const isCurrent = idx === passcode.length && !isVerifying && !isSuccess && lockoutRemainingSec <= 0;
              const digitChar = passcode[idx] || '';

              return (
                <React.Fragment key={idx}>
                  {idx === 4 && (
                    <span className="text-slate-600 font-bold px-0.5 select-none text-xs">
                      •
                    </span>
                  )}
                  <div
                    className={`w-8 h-10 sm:w-9 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-150 select-none ${
                      isSuccess
                        ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : errorMsg
                        ? 'border border-rose-500/60 bg-rose-950/25 text-rose-300'
                        : isCurrent
                        ? 'border border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500/40'
                        : isFilled
                        ? 'border border-emerald-600/60 bg-[#14231E]'
                        : 'border border-[#23352E] bg-[#0B1411]'
                    }`}
                  >
                    {isFilled ? (
                      showPasscode ? (
                        <span className="text-white font-mono font-bold text-base sm:text-lg">
                          {digitChar}
                        </span>
                      ) : (
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 shadow-xs" />
                      )
                    ) : isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60" />
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Visibility & Biometric Options */}
          <div className="flex items-center justify-between px-1 pt-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setShowPasscode(!showPasscode);
              }}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
              aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
            >
              {showPasscode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{language === 'mr' ? 'लपवा' : language === 'hi' ? 'छिपाएं' : 'Hide'}</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{language === 'mr' ? 'दाखवा' : language === 'hi' ? 'दिखाएं' : 'Show'}</span>
                </>
              )}
            </button>

            {isNilesh && (
              <button
                type="button"
                disabled={lockoutRemainingSec > 0 || isVerifying || isBiometricScanning || isSuccess}
                onClick={() => {
                  triggerHaptic('tap');
                  handleBiometricUnlock(false);
                }}
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors py-1 cursor-pointer"
              >
                <Fingerprint className={`w-3.5 h-3.5 ${isBiometricScanning ? 'animate-spin' : ''}`} />
                <span className="text-[11px] font-medium">
                  {isBiometricScanning
                    ? (language === 'mr' ? 'स्कॅनिंग...' : 'Scanning...')
                    : (language === 'mr' ? 'फिंगरप्रिंट वापरा' : language === 'hi' ? 'फिंगरप्रिंट उपयोग करें' : 'Fingerprint')}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Section: Custom 3-Column Numeric Keypad */}
        <div className="pt-1 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={lockoutRemainingSec > 0 || isVerifying || isSuccess}
                onClick={() => handleDigitPress(digit)}
                className="h-12 sm:h-13 rounded-xl bg-[#15231F] hover:bg-[#1B2D27] active:bg-[#223831] active:scale-[0.98] text-white font-mono font-semibold text-lg sm:text-xl border border-[#243730] transition-all select-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center shadow-2xs cursor-pointer"
                aria-label={`Digit ${digit}`}
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || isSuccess || passcode.length === 0}
              onClick={handleClear}
              className="h-12 sm:h-13 rounded-xl bg-[#15231F] hover:bg-rose-950/40 active:bg-rose-900/50 active:scale-[0.98] text-slate-400 hover:text-rose-400 font-semibold text-xs transition-all select-none disabled:opacity-30 disabled:pointer-events-none border border-[#243730] flex items-center justify-center uppercase tracking-wider cursor-pointer"
              aria-label="Clear passcode"
            >
              {language === 'mr' ? 'साफ' : language === 'hi' ? 'साफ' : 'Clear'}
            </button>

            {/* Digit 0 */}
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || isSuccess}
              onClick={() => handleDigitPress('0')}
              className="h-12 sm:h-13 rounded-xl bg-[#15231F] hover:bg-[#1B2D27] active:bg-[#223831] active:scale-[0.98] text-white font-mono font-semibold text-lg sm:text-xl border border-[#243730] transition-all select-none disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center shadow-2xs cursor-pointer"
              aria-label="Digit 0"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || isSuccess || passcode.length === 0}
              onClick={handleBackspace}
              className="h-12 sm:h-13 rounded-xl bg-[#15231F] hover:bg-[#1B2D27] active:bg-[#223831] active:scale-[0.98] text-slate-400 hover:text-white transition-all select-none disabled:opacity-30 disabled:pointer-events-none border border-[#243730] flex items-center justify-center cursor-pointer"
              aria-label="Backspace"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Footer: Sign Out Link & Cryptographic Notice */}
          <div className="pt-2 border-t border-[#1E2E28] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors py-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'बाहेर पडा' : language === 'hi' ? 'साइन आउट' : 'Sign Out'}</span>
            </button>

            <span className="text-[10px] text-slate-500 font-mono inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500/70" />
              <span>SHA-256</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

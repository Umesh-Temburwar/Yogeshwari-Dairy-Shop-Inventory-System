import React, { useState, useEffect } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  LogOut, 
  KeyRound, 
  Delete, 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../ui';

interface MasterSecurityModalProps {
  isOpen: boolean;
}

export const MasterSecurityModal: React.FC<MasterSecurityModalProps> = ({ isOpen }) => {
  const { unlockSecurity, signOut } = useAuth();
  const { language } = useLanguage();

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);
  const [isShake, setIsShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasscode('');
      setErrorMsg(null);
    }
  }, [isOpen]);

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
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        setPasscode('');
      } else {
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);

        if (res.error === 'SECURITY_LOCKED' && res.lockedUntil) {
          const secs = Math.ceil((res.lockedUntil - Date.now()) / 1000);
          setLockoutRemainingSec(Math.max(1, secs));
          setErrorMsg(
            language === 'mr'
              ? `सुरक्षा लॉक सक्रिय. कृपया ${secs} सेकंद प्रतीक्षा करा.`
              : `Security locked. Please wait ${secs}s.`
          );
        } else {
          setErrorMsg(
            language === 'mr'
              ? 'अवैध पासवर्ड. कृपया पुन्हा प्रयत्न करा.'
              : 'Invalid passcode. Please try again.'
          );
        }
      }
    } catch {
      setErrorMsg(
        language === 'mr' ? 'पडताळणी करताना त्रुटी आली.' : 'Verification error.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Security Card */}
      <div 
        className={`relative z-10 w-full max-w-sm rounded-2xl bg-surface border border-line shadow-pop p-6 flex flex-col transition-all select-none ${
          isShake ? 'animate-bounce' : ''
        }`}
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-surface-2 border border-line flex items-center justify-center shadow-card overflow-hidden">
            <img src={ydoLogo} alt="Logo" className="w-full h-full object-cover" />
          </div>

          <h3 className="text-base font-semibold text-ink tracking-tight">
            {language === 'mr' ? 'सुरक्षा पासवर्ड' : 'Master Security Passcode'}
          </h3>

          <p className="text-xs text-ink-3">
            {language === 'mr'
              ? 'दुकान व खात्याच्या सुरक्षिततेसाठी पासवर्ड प्रविष्ट करा.'
              : 'Enter master passcode to unlock POS counter.'}
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleVerify} className="mt-4 space-y-3">
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              type={showPasscode ? 'text' : 'password'}
              autoFocus
              disabled={lockoutRemainingSec > 0 || isVerifying}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-surface-2 border border-line rounded-xl text-ink text-center font-mono font-semibold text-base tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-ink/15"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink p-1"
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Large Neutral Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 place-items-center">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={lockoutRemainingSec > 0 || isVerifying}
                onClick={() => handleDigitPress(digit)}
                className="w-12 h-12 rounded-full bg-surface-2 hover:bg-line text-ink font-semibold text-base transition-all active:scale-95 disabled:opacity-40 border border-line/40 grid place-items-center shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || passcode.length === 0}
              onClick={handleClear}
              className="w-12 h-12 rounded-full bg-surface-2 hover:bg-danger/15 text-ink-3 hover:text-danger font-medium text-xs transition-all active:scale-95 disabled:opacity-40 border border-line/40 grid place-items-center"
            >
              C
            </button>
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying}
              onClick={() => handleDigitPress('0')}
              className="w-12 h-12 rounded-full bg-surface-2 hover:bg-line text-ink font-semibold text-base transition-all active:scale-95 disabled:opacity-40 border border-line/40 grid place-items-center shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              disabled={lockoutRemainingSec > 0 || isVerifying || passcode.length === 0}
              onClick={handleBackspace}
              className="w-12 h-12 rounded-full bg-surface-2 hover:bg-line text-ink-2 font-medium transition-all active:scale-95 disabled:opacity-40 border border-line/40 grid place-items-center"
              aria-label="Backspace"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!passcode.trim() || isVerifying || lockoutRemainingSec > 0}
              isLoading={isVerifying}
              className="w-full h-11"
            >
              <Unlock className="w-4 h-4" />
              <span>{language === 'mr' ? 'सुरक्षा अनलॉक करा' : 'Unlock Counter'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => signOut()}
              className="w-full text-danger hover:text-danger hover:bg-danger/10"
            >
              <LogOut className="w-4 h-4" />
              <span>{language === 'mr' ? 'बाहेर पडा (Sign Out)' : 'Sign Out'}</span>
            </Button>
          </div>
        </form>

        <div className="mt-3 pt-2 border-t border-line/40 text-center">
          <p className="text-[10px] text-ink-3 font-mono flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-ok" />
            <span>SHA-256 Salted Zero-Knowledge Protection</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterSecurityModal;

import React, { useState, useEffect } from 'react';
import ydoLogo from '../../assets/YDO_logo.jpg';
import { useLanguage } from '../../context/LanguageContext';
import { 
  Download, 
  Smartphone, 
  Zap, 
  WifiOff, 
  ShieldCheck, 
  Bell, 
  X, 
  CheckCircle2, 
} from 'lucide-react';
import { Button } from '../ui';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setTimeout(() => onClose(), 1600);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowManualGuide(true);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-surface rounded-t-3xl sm:rounded-2xl border border-line shadow-pop overflow-hidden transition-all max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 w-8 h-8 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 grid place-items-center transition z-20"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface p-0.5 border border-line shadow-card shrink-0 overflow-hidden flex items-center justify-center">
              <img 
                src={ydoLogo} 
                alt="Yogeshwari Dairy Logo" 
                className="w-full h-full rounded-lg object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/YDO_logo.png')) target.src = '/YDO_logo.png';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 text-[10px] font-medium text-ink-2 mb-1">
                <Smartphone className="w-3 h-3 text-ink-2" />
                <span>{language === 'mr' ? 'मोबाईल ॲप (PWA)' : 'Mobile App'}</span>
              </span>
              <h2 className="text-base font-semibold text-ink tracking-tight leading-tight">
                {language === 'mr' ? 'योगेश्वरी डेअरी मोबाईल ॲप' : 'Yogeshwari Dairy App'}
              </h2>
              <p className="text-xs text-ink-3 mt-0.5 truncate">
                {language === 'mr' ? 'जलद बिलिंग व ऑफलाइन कॅश मोड' : 'Instant billing & offline cash sync'}
              </p>
            </div>
          </div>

          {isInstalled && (
            <div className="p-3 rounded-xl bg-ok/10 border border-ok/20 flex items-center gap-2 text-xs font-medium text-ok">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{language === 'mr' ? 'ॲप यशस्वीरित्या इन्स्टॉल झाले!' : 'App installed successfully!'}</span>
            </div>
          )}

          {/* Key Benefits Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-surface-2 border border-line/30 space-y-0.5">
              <div className="flex items-center gap-1.5 text-ink font-medium text-xs">
                <Zap className="w-3.5 h-3.5 text-ink-3" />
                <span>{language === 'mr' ? '१ सेकंद बिलिंग' : 'Fast POS'}</span>
              </div>
              <p className="text-[11px] text-ink-3">
                {language === 'mr' ? 'थेट होम स्क्रीनवरून सुरू' : 'Direct home screen launch'}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-2 border border-line/30 space-y-0.5">
              <div className="flex items-center gap-1.5 text-ink font-medium text-xs">
                <WifiOff className="w-3.5 h-3.5 text-ink-3" />
                <span>{language === 'mr' ? 'ऑफलाइन मोड' : 'Offline Ready'}</span>
              </div>
              <p className="text-[11px] text-ink-3">
                {language === 'mr' ? 'नेट नसतानाही कॅश विक्री' : 'Sell without internet'}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-2 border border-line/30 space-y-0.5">
              <div className="flex items-center gap-1.5 text-ink font-medium text-xs">
                <Bell className="w-3.5 h-3.5 text-ink-3" />
                <span>{language === 'mr' ? 'स्मार्ट सूचना' : 'Smart Alerts'}</span>
              </div>
              <p className="text-[11px] text-ink-3">
                {language === 'mr' ? 'कमी साठा व एक्सपायरी' : 'Expiry & low stock'}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-2 border border-line/30 space-y-0.5">
              <div className="flex items-center gap-1.5 text-ink font-medium text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-ink-3" />
                <span>{language === 'mr' ? 'फुल स्क्रीन' : 'Full Screen'}</span>
              </div>
              <p className="text-[11px] text-ink-3">
                {language === 'mr' ? 'ब्राउझर बारशिवाय ॲप' : 'Native app display'}
              </p>
            </div>
          </div>

          {/* Step-by-step Guide */}
          {showManualGuide && (
            <div className="p-3 rounded-xl bg-surface-2 border border-line text-xs space-y-1.5">
              <span className="font-semibold text-ink block">
                {language === 'mr' ? 'होम स्क्रीनवर ॲप कसे जोडायचे?' : 'How to install manually?'}
              </span>
              {isIOS ? (
                <ol className="list-decimal pl-4 space-y-0.5 text-ink-2 text-[11px]">
                  <li>Safari च्या खालील शेअर बटणावर (⎋) टॅप करा.</li>
                  <li>"Add to Home Screen" (⊞) निवडा.</li>
                  <li>"Add" दाबा. ॲप स्थापित होईल!</li>
                </ol>
              ) : (
                <ol className="list-decimal pl-4 space-y-0.5 text-ink-2 text-[11px]">
                  <li>Chrome वरील तीन डॉट्स (⋮) दाबा.</li>
                  <li>"Install App" किंवा "Add to Home screen" निवडा.</li>
                  <li>"Install" पुष्टी करा!</li>
                </ol>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-surface-2 border-t border-line/50 flex flex-col sm:flex-row gap-2 shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={handleInstallClick}
            className="flex-1"
          >
            <Download className="w-4 h-4" />
            <span>
              {language === 'mr' ? '📲 मोबाईल ॲप इन्स्टॉल करा' : '📲 Install Mobile App'}
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            {language === 'mr' ? 'वेबसाइटवर सुरू ठेवा' : 'Continue on Web'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default AppDownloadModal;

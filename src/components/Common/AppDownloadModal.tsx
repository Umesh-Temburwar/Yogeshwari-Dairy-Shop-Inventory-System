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
  Share2, 
  PlusSquare, 
  MoreVertical,
  ExternalLink
} from 'lucide-react';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // Detect platform
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detect if already installed
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
      // If browser doesn't support automatic prompt, show step-by-step 1-tap guide
      setShowManualGuide(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal / Bottom Sheet Card */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#121F1B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden transition-all max-h-[90vh] flex flex-col">
        
        {/* Top Decorative Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#253932] transition z-20"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-emerald-500/50 shadow-md ring-4 ring-emerald-500/10 shrink-0 overflow-hidden flex items-center justify-center">
              <img 
                src={ydoLogo} 
                alt="Yogeshwari Dairy Logo" 
                className="w-full h-full rounded-xl object-cover scale-105"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/YDO_logo.png')) {
                    target.src = '/YDO_logo.png';
                  }
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 mb-1">
                <Smartphone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'mr' ? 'अधिकृत मोबाईल ॲप' : language === 'hi' ? 'ऑफिशियल मोबाइल ऐप' : 'Official Mobile App'}</span>
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {language === 'mr' ? 'योगेश्वरी डेअरी मोबाईल ॲप' : language === 'hi' ? 'योगेश्वरी डेयरी मोबाइल ऐप' : 'Yogeshwari Dairy Mobile App'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5 font-medium line-clamp-1">
                {language === 'mr' ? 'जलद बिलिंग, ऑफलाइन कॅश आणि फुल स्क्रीन अनुभव' : language === 'hi' ? 'तेज बिलिंग, ऑफलाइन रोकड़ और फुल स्क्रीन अनुभव' : 'Instant billing, offline cash sync & full screen mode'}
              </p>
            </div>
          </div>

          {/* Success banner if installed */}
          {isInstalled && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{language === 'mr' ? 'ॲप यशस्वीरित्या इन्स्टॉल झाले! आता थेट होम स्क्रीनवरून वापरा.' : language === 'hi' ? 'ऐप सफलतापूर्वक इंस्टॉल हुआ! अब होम स्क्रीन से सीधे इस्तेमाल करें।' : 'App successfully installed! You can now launch it directly from your home screen.'}</span>
            </div>
          )}

          {/* App Key Benefits Grid (4 points) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            
            {/* 1. Fast POS */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25]/60 border border-slate-200/80 dark:border-[#24352F] flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {language === 'mr' ? '१ सेकंदात बिलिंग' : language === 'hi' ? '१ सेकंड में बिलिंग' : '1-Second Billing'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 leading-snug">
                  {language === 'mr' ? 'थेट होम स्क्रीनवरून त्वरित काऊंटर विक्री सुरू' : language === 'hi' ? 'होम स्क्रीन से तुरंत काउंटर बिक्री शुरू' : 'Launch counter billing in 1 tap from home screen'}
                </p>
              </div>
            </div>

            {/* 2. Offline Mode */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25]/60 border border-slate-200/80 dark:border-[#24352F] flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {language === 'mr' ? 'ऑफलाइन सपोर्ट' : language === 'hi' ? 'ऑफलाइन सपोर्ट' : 'Offline Ready'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 leading-snug">
                  {language === 'mr' ? 'इंटरनेट नसतानाही अखंड कॅश बिलिंग चालू राहते' : language === 'hi' ? 'इंटरनेट न होने पर भी रोकड़ बिलिंग चालू रहती है' : 'Keep selling smoothly even without internet connection'}
                </p>
              </div>
            </div>

            {/* 3. Alerts */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25]/60 border border-slate-200/80 dark:border-[#24352F] flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {language === 'mr' ? 'एक्सपायरी व स्टॉक अलर्ट्स' : language === 'hi' ? 'एक्सपायरी व स्टॉक अलर्ट्स' : 'Smart Alerts'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 leading-snug">
                  {language === 'mr' ? 'कमी साठा आणि मुदत संपण्यापूर्वी तत्काळ सूचना' : language === 'hi' ? 'कम स्टॉक और एक्सपायरी से पहले तुरंत सूचना' : 'Real-time low stock & FEFO expiry notifications'}
                </p>
              </div>
            </div>

            {/* 4. Full screen & Security */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25]/60 border border-slate-200/80 dark:border-[#24352F] flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  {language === 'mr' ? 'फुल स्क्रीन व सुरक्षितता' : language === 'hi' ? 'फुल स्क्रीन व सुरक्षा' : 'Full Screen & Secure'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 leading-snug">
                  {language === 'mr' ? 'ब्राउझर बारशिवाय ॲपसारखा मोठा डिस्प्ले व लॉक' : language === 'hi' ? 'ब्राउज़र बार के बिना बड़ा डिस्प्ले और सुरक्षित लॉक' : 'Native app experience without browser address bar'}
                </p>
              </div>
            </div>

          </div>

          {/* Manual Install Instruction Box (If browser prompt is not native) */}
          {showManualGuide && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-2 animate-fadeIn">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                <Smartphone className="w-4 h-4" />
                <span>{language === 'mr' ? 'होम स्क्रीनवर ॲप कसे जोडायचे?' : language === 'hi' ? 'होम स्क्रीन पर ऐप कैसे जोड़ें?' : 'How to add to Home Screen?'}</span>
              </div>
              {isIOS ? (
                <ol className="list-decimal pl-4 space-y-1 font-medium text-[11px]">
                  <li>{language === 'mr' ? 'Safari ब्राउझरच्या खालील शेअर बटणावर (⎋ Share) टॅप करा.' : language === 'hi' ? 'Safari ब्राउज़र के नीचे शेयर बटन (⎋ Share) दबाएं।' : 'Tap the Share button (⎋) at the bottom of Safari.'}</li>
                  <li>{language === 'mr' ? 'पर्यायांमध्ये "Add to Home Screen" (⊞) निवडा.' : language === 'hi' ? 'विकल्पों में "Add to Home Screen" (⊞) चुनें।' : 'Select "Add to Home Screen" (⊞).'}</li>
                  <li>{language === 'mr' ? 'वरील "Add" दाबा. ॲप होम स्क्रीनवर तयार होईल!' : language === 'hi' ? 'ऊपर "Add" दबाएं। ऐप होम स्क्रीन पर आ जाएगा!' : 'Tap "Add" at top right to install!'}</li>
                </ol>
              ) : (
                <ol className="list-decimal pl-4 space-y-1 font-medium text-[11px]">
                  <li>{language === 'mr' ? 'Chrome ब्राउझरच्या वर उजव्या कोपऱ्यातील तीन ठिपके (⋮) दाबा.' : language === 'hi' ? 'Chrome ब्राउज़र में ऊपर दाईं ओर तीन डॉट्स (⋮) दबाएं।' : 'Tap the three dots menu (⋮) in your Chrome browser.'}</li>
                  <li>{language === 'mr' ? '"Install App" किंवा "Add to Home screen" वर टॅप करा.' : language === 'hi' ? '"Install App" या "Add to Home screen" चुनें।' : 'Tap "Install App" or "Add to Home screen".'}</li>
                  <li>{language === 'mr' ? '"Install" वर पुष्टी करा. ॲप थेट मोबाईलवर स्थापित होईल!' : language === 'hi' ? '"Install" पर पुष्टि करें। ऐप सीधे मोबाइल पर आ जाएगा!' : 'Confirm "Install" to complete installation!'}</li>
                </ol>
              )}
            </div>
          )}

        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#15231F] border-t border-slate-200 dark:border-[#24352F] flex flex-col sm:flex-row gap-2.5 shrink-0">
          
          {/* Primary Install / Download Button */}
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {language === 'mr' ? '📲 मोबाईल ॲप इन्स्टॉल करा' : language === 'hi' ? '📲 मोबाइल ऐप इंस्टॉल करें' : '📲 Install Mobile App'}
            </span>
          </button>

          {/* Secondary Dismiss Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200/70 dark:hover:bg-[#1A2A25] transition text-center"
          >
            {language === 'mr' ? 'वेबसाइटवर सुरू ठेवा' : language === 'hi' ? 'वेबसाइट पर जारी रखें' : 'Continue on Web'}
          </button>

        </div>

      </div>
    </div>
  );
};

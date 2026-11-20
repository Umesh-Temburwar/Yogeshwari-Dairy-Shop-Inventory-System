import React, { useState } from 'react';
import { 
  Rocket, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  X, 
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { AppUpdateInfo, CURRENT_APP_VERSION, CURRENT_BUILD_NUMBER } from '../../config/appVersion';
import { startAppUpdate } from '../../services/appUpdateService';
import { isNativePlatform } from '../../services/capacitorService';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: (snooze?: boolean) => void;
  updateInfo: AppUpdateInfo | null;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
}) => {
  const [hasStartedDownload, setHasStartedDownload] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !updateInfo) return null;

  const isForced = !!updateInfo.forceUpdate;
  const isNative = isNativePlatform();

  const handleUpdateClick = () => {
    setHasStartedDownload(true);
    startAppUpdate(updateInfo.apkUrl);
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(updateInfo.apkUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => !isForced && onClose(true)}
      />

      {/* Modal Sheet / Dialog */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#121F1B] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden transition-all max-h-[92vh] flex flex-col animate-view-enter">
        
        {/* Top Gradient Banner */}
        <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shrink-0" />

        {/* Close Button (only if not forced update) */}
        {!isForced && (
          <button
            type="button"
            onClick={() => onClose(true)}
            aria-label="Close update popup"
            className="absolute right-3.5 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#253932] transition z-20 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
          
          {/* Header with Version Comparison */}
          <div className="flex items-start gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#121F1B] flex items-center justify-center">
                <Rocket className="w-6 h-6 text-emerald-400 animate-bounce" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 mb-1">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{'New Version Available'}</span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {updateInfo.title || 'नवीन अपडेट उपलब्ध आहे!'}
              </h2>

              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5 font-medium">
                {'Yogeshwari Dairy Shop ERP & POS Inventory'}
              </p>
            </div>
          </div>

          {/* Version Upgrade Pill Tag */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#172520] border border-slate-200/90 dark:border-[#24352F] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C]">
                {'Current:'}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-white dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] font-mono">
                v{CURRENT_APP_VERSION}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {'New Version:'}
              </span>
              <span className="font-black text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 font-mono shadow-xs">
                v{updateInfo.versionName}
              </span>
            </div>
          </div>

          {/* Guarantee / In-Place Upgrade Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/60 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <h4 className="font-extrabold text-emerald-900 dark:text-emerald-200">
                {'जुन्या ॲपवरच डायरेक्ट अपडेट होईल (No Data Loss)'}
              </h4>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                {isNative
                  ? 'तुम्हाला जुने ॲप अनइन्स्टॉल करण्याची गरज नाही. अपडेट केल्यानंतरही तुमचे सर्व प्रॉडक्ट्स, लॉगिन आणि ऑफलाइन डेटा 100% सुरक्षित राहील.'
                  : 'You do not need to uninstall the old app. All login sessions, products, and sales records remain completely intact.'}
              </p>
            </div>
          </div>

          {/* What's New Highlights */}
          {updateInfo.highlights && updateInfo.highlights.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-[#8FA69C] flex items-center gap-1.5">
                <span>{'What\'s New in this update:'}</span>
              </h3>
              <ul className="space-y-2">
                {updateInfo.highlights.map((item, idx) => (
                  <li 
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25]/50 border border-slate-200/70 dark:border-[#24352F] text-xs font-medium text-slate-800 dark:text-[#D1E0D9] flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Download In Progress / Installation Guidance */}
          {hasStartedDownload && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 animate-fadeIn">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
                <Download className="w-4 h-4 animate-bounce" />
                <span>{'APK डाऊनलोड सुरू झाली आहे!'}</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] font-medium leading-relaxed">
                <li>{'वरच्या Notification bar मध्ये डाऊनलोड पूर्ण झाल्यावर त्यावर टॅप करा.'}</li>
                <li>{'Android विचारेल: "Do you want to update this app?".'}</li>
                <li>{'फक्त "Update" वर क्लिक करा. काही सेकंदात नवे व्हर्जन सुरू होईल!'}</li>
              </ol>
            </div>
          )}

          {/* Manual Link Copy Option */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8FA69C]">
            <span>{'Direct APK Download Link:'}</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#15231F] border-t border-slate-200 dark:border-[#24352F] flex flex-col sm:flex-row gap-2.5 shrink-0">
          
          {/* Main "Update Now" Action Button */}
          <button
            type="button"
            onClick={handleUpdateClick}
            className="w-full flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>
              {hasStartedDownload ? '📲 Download Again / पुन्हा डाऊनलोड' : '📲 Update App Now (आत्ताच अपडेट करा)'}
            </span>
          </button>

          {/* Secondary Dismiss Button (if not forced update) */}
          {!isForced && (
            <button
              type="button"
              onClick={() => onClose(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200/70 dark:hover:bg-[#1A2A25] transition text-center cursor-pointer"
            >
              {'Later (नंतर)'}
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

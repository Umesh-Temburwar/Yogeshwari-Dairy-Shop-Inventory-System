import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ExpiryStatus } from '../../types';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface BatchExpiryAlertBannerProps {
  selectedStatusFilter?: ExpiryStatus | 'ALL';
  onSelectStatusFilter?: (status: ExpiryStatus | 'ALL') => void;
  onOpenBatchModalForProduct?: () => void;
}

export const BatchExpiryAlertBanner: React.FC<BatchExpiryAlertBannerProps> = ({
  selectedStatusFilter = 'ALL',
  onSelectStatusFilter
}) => {
  const { metrics, batches, setActiveView } = useStore();
  const { language } = useLanguage();

  const {
    expiredBatchesCount,
    expiringTodayBatchesCount,
    expiringTomorrowBatchesCount,
    expiring3DaysBatchesCount,
    freshBatchesCount,
    totalActiveBatches
  } = metrics;

  const hasUrgentAlerts = expiredBatchesCount > 0 || expiringTodayBatchesCount > 0;

  return (
    <div className="space-y-3">
      {/* Critical Banner for Expired / Expiring Today items */}
      {hasUrgentAlerts && (
        <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
          expiredBatchesCount > 0 
            ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-200' 
            : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              expiredBatchesCount > 0 
                ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300' 
                : 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
            }`}>
              {expiredBatchesCount > 0 ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="font-black text-sm flex flex-wrap items-center gap-2">
                <span>
                  {expiredBatchesCount > 0 
                    ? (language === 'mr' ? '⚠️ सावधान: मुदत संपलेला माल आढळला!' : language === 'hi' ? '⚠️ सावधान: एक्सपायर्ड माल मिला!' : '⚠️ Alert: Expired Batches Detected!')
                    : (language === 'mr' ? '⏳ आजच मुदत संपणारा माल!' : language === 'hi' ? '⏳ आज ही एक्सपायर होने वाला माल!' : '⏳ Batches Expiring Today!')}
                </span>
                {expiredBatchesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-600 text-white font-bold">
                    {expiredBatchesCount} {language === 'mr' ? 'बॅच कालबाह्य (विक्री बंद)' : language === 'hi' ? 'बैच एक्सपायर (बिलिंग ब्लॉक)' : 'Expired (Blocked)'}
                  </span>
                )}
                {expiringTodayBatchesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-600 text-white font-bold">
                    {expiringTodayBatchesCount} {language === 'mr' ? 'बॅच आज संपणार' : language === 'hi' ? 'बैच आज एक्सपायर' : 'Expiring Today'}
                  </span>
                )}
              </div>

              <p className="text-xs opacity-90 mt-0.5 font-medium">
                {expiredBatchesCount > 0 
                  ? (language === 'mr' 
                      ? 'मुदत संपलेल्या मालाची बिलावर विक्री बंद आहे. हा माल त्वरित नासलेला / खराब माल (Damages) मध्ये नोंदवा.'
                      : language === 'hi'
                      ? 'एक्सपायर्ड माल बिलिंग में नहीं जुड़ेगा। इसे तुरंत खराब/डैमेज माल में दर्ज करें।'
                      : 'Expired batches cannot be billed to customers. Write them off in Damages/Spoilage.')
                  : (language === 'mr'
                      ? 'FEFO नियमानुसार हे आधी विका किंवा दूध उकळून पनीर/खवा तयार करा.'
                      : language === 'hi'
                      ? 'FEFO नियम से इसे पहले बेचें या दूध उबालकर पनीर/खोया बनाएं।'
                      : 'Prioritize these batches first on counter billing or convert milk to paneer/chhana.')}
              </p>
            </div>
          </div>

          {expiredBatchesCount > 0 && (
            <button
              onClick={() => setActiveView('damages')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 shadow-xs transition-colors"
            >
              {language === 'mr' ? 'खराब माल नोंदवा' : language === 'hi' ? 'डैमेज दर्ज करें' : 'Record Damage'}
            </button>
          )}
        </div>
      )}

      {/* Multi-tier Batch Expiry Filter Pills */}
      <div className="bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-wrap items-center justify-between gap-2 transition-colors">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none w-full sm:w-auto">
          <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] shrink-0 mr-1 uppercase tracking-wider">
            {language === 'mr' ? 'बॅच अलर्ट:' : language === 'hi' ? 'बैच अलर्ट:' : 'Batch Expiry:'}
          </span>

          {/* ALL */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedStatusFilter === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
            }`}
          >
            <span>{language === 'mr' ? 'सर्व बॅचेस' : language === 'hi' ? 'सभी बैच' : 'All Batches'}</span>
            <span className="text-[10px] opacity-80 px-1 py-0.2 bg-black/10 dark:bg-black/20 rounded">
              {totalActiveBatches}
            </span>
          </button>

          {/* EXPIRED */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRED')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRED'
                ? 'bg-rose-600 text-white shadow-xs'
                : expiredBatchesCount > 0
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60'
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] opacity-70'
            }`}
          >
            <span>🔴 {language === 'mr' ? 'कालबाह्य' : language === 'hi' ? 'एक्सपायर्ड' : 'Expired'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 rounded-full font-black">
              {expiredBatchesCount}
            </span>
          </button>

          {/* EXPIRING TODAY */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_TODAY')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_TODAY'
                ? 'bg-amber-600 text-white shadow-xs'
                : expiringTodayBatchesCount > 0
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-900/60'
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] opacity-70'
            }`}
          >
            <span>🟠 {language === 'mr' ? 'आज संपणार' : language === 'hi' ? 'आज एक्सपायर' : 'Today'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-200 rounded-full font-black">
              {expiringTodayBatchesCount}
            </span>
          </button>

          {/* EXPIRING TOMORROW */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_TOMORROW')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_TOMORROW'
                ? 'bg-yellow-600 text-white shadow-xs'
                : expiringTomorrowBatchesCount > 0
                ? 'bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-900/60'
                : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 dark:text-[#8FA69C] opacity-70'
            }`}
          >
            <span>🟡 {language === 'mr' ? 'उद्या संपणार' : language === 'hi' ? 'कल एक्सपायर' : 'Tomorrow'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-yellow-200 dark:bg-yellow-900/80 text-yellow-950 dark:text-yellow-200 rounded-full font-black">
              {expiringTomorrowBatchesCount}
            </span>
          </button>

          {/* EXPIRING IN 3 DAYS */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_IN_3_DAYS')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_IN_3_DAYS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <span>🟢 {language === 'mr' ? '३ दिवसांत' : language === 'hi' ? '3 दिन में' : 'In 3 Days'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-200 rounded-full font-black">
              {expiring3DaysBatchesCount}
            </span>
          </button>

          {/* FRESH */}
          <button
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('FRESH')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'FRESH'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400'
            }`}
          >
            <span>🔵 {language === 'mr' ? 'ताजा माल' : language === 'hi' ? 'ताज़ा माल' : 'Fresh'}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-teal-200 dark:bg-teal-900/80 text-teal-950 dark:text-teal-200 rounded-full font-black">
              {freshBatchesCount}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] hidden md:flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === 'mr' ? 'FEFO पद्धत: जुनी मुदत आधी खपते' : language === 'hi' ? 'FEFO नियम: पहले एक्सपायरी वाला माल पहले बिकेगा' : 'FEFO Active: Earliest expiry sold first'}</span>
        </div>
      </div>
    </div>
  );
};


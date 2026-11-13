import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ExpiryStatus } from '../../types';
import { 
  AlertTriangle, 
  Clock, 
  ShieldAlert
} from 'lucide-react';
import { Card, Button, StatusBadge } from '../ui';

interface BatchExpiryAlertBannerProps {
  selectedStatusFilter?: ExpiryStatus | 'ALL';
  onSelectStatusFilter?: (status: ExpiryStatus | 'ALL') => void;
  onOpenBatchModalForProduct?: () => void;
}

export const BatchExpiryAlertBanner: React.FC<BatchExpiryAlertBannerProps> = ({
  selectedStatusFilter = 'ALL',
  onSelectStatusFilter
}) => {
  const { metrics, setActiveView } = useStore();
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
        <Card className={`p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          expiredBatchesCount > 0 
            ? 'border-danger/30 bg-danger/5 text-ink' 
            : 'border-warn/30 bg-warn/5 text-ink'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              expiredBatchesCount > 0 
                ? 'bg-danger/10 text-danger' 
                : 'bg-warn/10 text-warn'
            }`}>
              {expiredBatchesCount > 0 ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="font-semibold text-sm flex flex-wrap items-center gap-2 text-ink">
                <span>
                  {expiredBatchesCount > 0 
                    ? (language === 'mr' ? 'सावधान: मुदत संपलेला माल आढळला!' : language === 'hi' ? 'सावधान: एक्सपायर्ड माल मिला!' : 'Alert: Expired Batches Detected!')
                    : (language === 'mr' ? 'आजच मुदत संपणारा माल!' : language === 'hi' ? 'आज ही एक्सपायर होने वाला माल!' : 'Batches Expiring Today!')}
                </span>
                {expiredBatchesCount > 0 && (
                  <StatusBadge status="danger">
                    {expiredBatchesCount} {language === 'mr' ? 'बॅच कालबाह्य (विक्री बंद)' : language === 'hi' ? 'बैच एक्सपायर' : 'Expired'}
                  </StatusBadge>
                )}
                {expiringTodayBatchesCount > 0 && (
                  <StatusBadge status="warn">
                    {expiringTodayBatchesCount} {language === 'mr' ? 'बॅच आज संपणार' : language === 'hi' ? 'बैच आज एक्सपायर' : 'Today'}
                  </StatusBadge>
                )}
              </div>

              <p className="text-xs text-ink-3 mt-0.5 font-medium">
                {expiredBatchesCount > 0 
                  ? (language === 'mr' 
                      ? 'मुदत संपलेल्या मालाची बिलावर विक्री बंद आहे. हा माल त्वरित नासलेला / खराब माल मध्ये नोंदवा.'
                      : language === 'hi'
                      ? 'एक्सपायर्ड माल बिलिंग में नहीं जुड़ेगा। इसे तुरंत खराब माल में दर्ज करें।'
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
            <Button
              variant="danger"
              size="sm"
              onClick={() => setActiveView('damages')}
              className="shrink-0"
            >
              {language === 'mr' ? 'खराब माल नोंदवा' : language === 'hi' ? 'डैमेज दर्ज करें' : 'Record Damage'}
            </Button>
          )}
        </Card>
      )}

      {/* Multi-tier Batch Expiry Filter Pills */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar w-full sm:w-auto">
          <span className="text-[11px] font-medium text-ink-3 shrink-0 mr-1 uppercase tracking-wider">
            {language === 'mr' ? 'बॅच अलर्ट:' : language === 'hi' ? 'बैच अलर्ट:' : 'Batch Expiry:'}
          </span>

          {/* ALL */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'ALL'
                ? 'bg-accent text-accent-fg font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span>{language === 'mr' ? 'सर्व बॅचेस' : language === 'hi' ? 'सभी बैच' : 'All Batches'}</span>
            <span className="text-[10px] tabular-nums px-1.5 py-0.2 rounded bg-surface/40">
              {totalActiveBatches}
            </span>
          </button>

          {/* EXPIRED */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRED'
                ? 'bg-danger text-white font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
            <span>{language === 'mr' ? 'कालबाह्य' : language === 'hi' ? 'एक्सपायर्ड' : 'Expired'}</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {expiredBatchesCount}
            </span>
          </button>

          {/* EXPIRING TODAY */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_TODAY'
                ? 'bg-warn text-white font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warn shrink-0" />
            <span>{language === 'mr' ? 'आज संपणार' : language === 'hi' ? 'आज एक्सपायर' : 'Today'}</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {expiringTodayBatchesCount}
            </span>
          </button>

          {/* EXPIRING TOMORROW */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_TOMORROW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_TOMORROW'
                ? 'bg-accent text-accent-fg font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warn/70 shrink-0" />
            <span>{language === 'mr' ? 'उद्या संपणार' : language === 'hi' ? 'कल एक्सपायर' : 'Tomorrow'}</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {expiringTomorrowBatchesCount}
            </span>
          </button>

          {/* EXPIRING IN 3 DAYS */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('EXPIRING_IN_3_DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'EXPIRING_IN_3_DAYS'
                ? 'bg-accent text-accent-fg font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ok shrink-0" />
            <span>{language === 'mr' ? '३ दिवसांत' : language === 'hi' ? '3 दिन में' : 'In 3 Days'}</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {expiring3DaysBatchesCount}
            </span>
          </button>

          {/* FRESH */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter && onSelectStatusFilter('FRESH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatusFilter === 'FRESH'
                ? 'bg-accent text-accent-fg font-semibold shadow-card'
                : 'bg-surface-2 text-ink-2 hover:text-ink'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ok shrink-0" />
            <span>{language === 'mr' ? 'ताजा माल' : language === 'hi' ? 'ताज़ा माल' : 'Fresh'}</span>
            <span className="text-[10px] tabular-nums font-semibold">
              {freshBatchesCount}
            </span>
          </button>
        </div>

        <div className="text-[11px] font-medium text-ink-3 hidden md:flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-ink-3" />
          <span>{language === 'mr' ? 'FEFO पद्धत: जुनी मुदत आधी खपते' : language === 'hi' ? 'FEFO नियम: पहले एक्सपायरी वाला माल पहले बिकेगा' : 'FEFO Active: Earliest expiry sold first'}</span>
        </div>
      </Card>
    </div>
  );
};

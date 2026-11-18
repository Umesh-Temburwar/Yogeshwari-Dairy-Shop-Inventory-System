import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  TrendingUp, 
  Banknote, 
  Smartphone, 
  ShoppingBag, 
  AlertTriangle, 
  BookOpen, 
  PackageX, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const MetricsOverview: React.FC = () => {
  const { metrics, setActiveView, timeFilter } = useStore();
  const { t, language } = useLanguage();

  const timeLabel = t(timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'thisWeek' : timeFilter === 'month' ? 'thisMonth' : timeFilter === 'year' ? 'thisYear' : 'allTime');

  const cards = [
    {
      title: `${timeLabel} ${t('totalSales')}`,
      numericValue: metrics.totalSalesRevenue,
      prefix: '₹',
      subtitle: 'Counter & delivery sales',
      icon: TrendingUp,
      iconBoxClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      action: () => setActiveView('sales'),
      isProfit: false
    },
    {
      title: `${timeLabel} ${t('cashCollected')}`,
      numericValue: metrics.cashCollected,
      prefix: '₹',
      subtitle: `${((metrics.cashCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${'Cash share'}`,
      icon: Banknote,
      iconBoxClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      action: () => setActiveView('sales'),
      isProfit: false
    },
    {
      title: `${timeLabel} ${t('onlineCollected')}`,
      numericValue: metrics.onlineCollected,
      prefix: '₹',
      subtitle: `${((metrics.onlineCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${'PhonePe, GPay, QR'}`,
      icon: Smartphone,
      iconBoxClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      action: () => setActiveView('sales'),
      isProfit: false
    },
    {
      title: `${timeLabel} ${t('totalPurchases')}`,
      numericValue: metrics.totalPurchasesAmount,
      prefix: '₹',
      subtitle: 'Milk & raw materials cost',
      icon: ShoppingBag,
      iconBoxClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
      action: () => setActiveView('purchases'),
      isProfit: false
    },
    {
      title: `${timeLabel} ${t('netProfit')}`,
      numericValue: metrics.netProfit,
      prefix: '₹',
      subtitle: `${'Gross'} ₹${metrics.grossProfit.toLocaleString('en-IN')} ${'after expenses'}`,
      icon: Sparkles,
      iconBoxClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      action: () => setActiveView('analytics'),
      isProfit: true // Subtle accent ring applied
    },
    {
      title: t('totalUdharDue'),
      numericValue: metrics.totalOutstandingUdhar,
      prefix: '₹',
      subtitle: 'Customer credit receivable',
      icon: BookOpen,
      iconBoxClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      action: () => setActiveView('udhar'),
      isProfit: false
    },
    {
      title: `${timeLabel} ${t('damageLoss')}`,
      numericValue: metrics.totalDamagesLoss,
      prefix: '₹',
      subtitle: 'Curdled milk & leakage loss',
      icon: PackageX,
      iconBoxClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400',
      action: () => setActiveView('damages'),
      isProfit: false
    },
    {
      title: t('lowStockAlert'),
      numericValue: metrics.lowStockCount,
      suffix: ` ${'items'}`,
      subtitle: (metrics.expiredBatchesCount > 0 || metrics.expiringTodayBatchesCount > 0)
        ? (`⚠️ ${metrics.expiredBatchesCount} expired • ${metrics.expiringTodayBatchesCount} exp. today`)
        : metrics.lowStockCount > 0 
        ? ('Reorder needed now')
        : ('Stock level is healthy'),
      icon: AlertTriangle,
      iconBoxClass: (metrics.expiredBatchesCount > 0) 
        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' 
        : 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
      action: () => setActiveView('inventory'),
      isProfit: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={card.action}
            className={`p-5 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] shadow-xs hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full cursor-pointer group ${
              card.isProfit ? 'ring-1 ring-amber-500/30 dark:ring-amber-400/20 shadow-amber-500/5' : ''
            }`}
          >
            {/* Top row: 2-line clamp title + fixed 40px icon box */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] line-clamp-2 min-w-0 flex-1 leading-snug">
                {card.title}
              </span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.iconBoxClass} group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            {/* Big Value: with tabular-nums */}
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#E7F0EC] tracking-tight tabular-nums my-1">
              {card.prefix || ''}{typeof card.numericValue === 'number' ? card.numericValue.toLocaleString('en-IN') : card.numericValue}{card.suffix || ''}
            </div>

            {/* Helper Text */}
            <div className="text-xs text-slate-500 dark:text-[#8FA69C] line-clamp-1 mb-3">
              {card.subtitle}
            </div>

            {/* Footer "View Details" link */}
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-[#8FA69C] font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {t('viewDetails')}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#8FA69C] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  TrendingUp, 
  TrendingDown,
  Wallet, 
  Smartphone, 
  Truck, 
  AlertTriangle, 
  BookOpen, 
  ChevronRight,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

const formatINR = (val: number): string => {
  const abs = Math.abs(val).toLocaleString('en-IN');
  if (val < 0) return `-₹${abs}`;
  return `₹${abs}`;
};

export const MetricsOverview: React.FC = () => {
  const { metrics, products, setActiveView, timeFilter, isSyncing } = useStore();
  const { language } = useLanguage();

  const isLoss = metrics.netProfit < 0;

  const marginPercentage = useMemo(() => {
    if (!metrics.totalSalesRevenue || metrics.totalSalesRevenue <= 0) return '—';
    return `${((metrics.netProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%`;
  }, [metrics.netProfit, metrics.totalSalesRevenue]);

  const periodLabels: Record<string, string> = {
    all: 'All Time',
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year'
  };

  const periodLabel = periodLabels[timeFilter] || 'This Period';

  // 6 KPI cards for the 2-column grid
  const kpiCards = [
    {
      id: 'sales',
      label: 'Total Sales',
      value: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
      caption: 'Counter & delivery',
      icon: TrendingUp,
      tintBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      action: () => setActiveView('sales')
    },
    {
      id: 'cash',
      label: 'Cash Inflow',
      value: `₹${metrics.cashCollected.toLocaleString('en-IN')}`,
      caption: `${metrics.totalSalesRevenue > 0 ? ((metrics.cashCollected / metrics.totalSalesRevenue) * 100).toFixed(0) : 0}% Cash share`,
      icon: Wallet,
      tintBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      action: () => setActiveView('sales')
    },
    {
      id: 'online',
      label: 'Online UPI & QR',
      value: `₹${metrics.onlineCollected.toLocaleString('en-IN')}`,
      caption: 'PhonePe, GPay, QR',
      icon: Smartphone,
      tintBg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      action: () => setActiveView('sales')
    },
    {
      id: 'purchases',
      label: 'Purchases',
      value: `₹${metrics.totalPurchasesAmount.toLocaleString('en-IN')}`,
      caption: 'Milk & raw materials',
      icon: Truck,
      tintBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      action: () => setActiveView('purchases')
    },
    {
      id: 'spoilage',
      label: 'Spoilage Loss',
      value: `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`,
      caption: 'Curdled & damaged',
      icon: ShieldAlert,
      tintBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      action: () => setActiveView('damages')
    },
    {
      id: 'credit',
      label: 'Market Credit Due',
      value: `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`,
      caption: 'Customer receivables',
      icon: BookOpen,
      tintBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      action: () => setActiveView('udhar')
    }
  ];

  const hasAlerts = (metrics.lowStockCount || 0) > 0 || (metrics.expiredBatchesCount || 0) > 0 || (metrics.expiringTodayBatchesCount || 0) > 0;

  const topLowStockProducts = useMemo(() => {
    return products
      .filter(p => p.stock_quantity <= p.min_stock_alert)
      .slice(0, 3);
  }, [products]);

  const isLoading = isSyncing && metrics.totalSalesRevenue === 0 && metrics.netProfit === 0;

  return (
    <div className="space-y-3 sm:space-y-4">

      {/* 3. HERO CARD: NET PROFIT (Large gradient card, opens analytics) */}
      {isLoading ? (
        <div className="h-44 rounded-2xl sm:rounded-3xl bg-slate-200/60 dark:bg-[#1A2A25] animate-pulse border border-slate-200/60 dark:border-[#24352F]" />
      ) : (
        <div
          onClick={() => setActiveView('analytics')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveView('analytics');
            }
          }}
          className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border transition-all cursor-pointer active:scale-[0.99] group ${
            isLoss
              ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-700 border-red-500/30 text-white'
              : 'bg-gradient-to-br from-emerald-700 via-emerald-700 to-emerald-600 border-emerald-600/30 text-white'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                {isLoss ? (
                  <TrendingDown className="w-4 h-4 text-red-100" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-emerald-100" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                  {isLoss ? 'Net Pocket Loss' : 'Net Pocket Profit'}
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5">
                Gross/Net earnings after all expenses & spoilage
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-xs text-white border border-white/20 shrink-0">
                {periodLabel}
              </span>
              <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
              {formatINR(metrics.netProfit)}
            </div>
          </div>

          {/* 3 mini stats in a row: Total Sales, Purchases, Margin % */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/15 text-center">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 border border-white/15">
              <span className="text-[10px] sm:text-[11px] font-medium text-white/80 block">
                Total Sales
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums block truncate">
                ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 border border-white/15">
              <span className="text-[10px] sm:text-[11px] font-medium text-white/80 block">
                Purchases
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums block truncate">
                ₹{metrics.totalPurchasesAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 border border-white/15">
              <span className="text-[10px] sm:text-[11px] font-medium text-white/80 block">
                Margin %
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums block truncate">
                {marginPercentage}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. KPI GRID (2 columns on mobile, gap-3, each card = one tappable card) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return isLoading ? (
            <div
              key={card.id}
              className="h-28 rounded-2xl bg-slate-100 dark:bg-[#1A2A25] animate-pulse border border-slate-200/60 dark:border-[#24352F]"
            />
          ) : (
            <div
              key={card.id}
              onClick={card.action}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  card.action();
                }
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${card.tintBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-[#24352F] group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>

              <div className="mt-2.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block truncate">
                  {card.label}
                </span>
                <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight tabular-nums mt-0.5">
                  {card.value}
                </div>
                <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-[#8FA69C] truncate block mt-0.5">
                  {card.caption}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. ATTENTION CARD (Priority alerts, full width) */}
      {hasAlerts ? (
        <div
          onClick={() => setActiveView('reorder')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setActiveView('reorder');
            }
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/40 shadow-xs cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all active:scale-[0.99] space-y-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
                  {metrics.lowStockCount} items need restock
                </span>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 block truncate">
                  Inventory below minimum alert threshold
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveView('reorder');
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shrink-0 shadow-xs transition-transform cursor-pointer"
            >
              Restock
            </button>
          </div>

          {/* Chips: Top 3 product names + Expiry alert chip if applicable */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {topLowStockProducts.map(p => {
              const displayName = (language === 'mr' && p.marathi_name)
                ? p.marathi_name
                : (language === 'hi' && p.hindi_name)
                ? p.hindi_name
                : p.name.split(' (')[0];

              return (
                <span
                  key={p.id}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-[#131F1B] text-slate-700 dark:text-slate-200 border border-amber-200 dark:border-amber-900/60 truncate max-w-[140px]"
                >
                  {displayName}
                </span>
              );
            })}
            {metrics.expiredBatchesCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60">
                {metrics.expiredBatchesCount} expired
              </span>
            )}
            {metrics.expiringTodayBatchesCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60">
                {metrics.expiringTodayBatchesCount} exp. today
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>All good — Inventory stock levels are healthy & no batches expiring soon</span>
        </div>
      )}

    </div>
  );
};

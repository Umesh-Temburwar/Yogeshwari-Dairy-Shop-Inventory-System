import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeRangeFilter } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  Sparkles,
  Trophy,
  ShoppingBag,
  Printer,
  Users,
  TrendingUp,
  TrendingDown,
  Heart,
  FileText,
  Download,
  Eye,
  Info,
  ChevronDown,
  MoreVertical,
  X
} from 'lucide-react';

const formatINR = (val: number, showPlus = false): string => {
  const abs = Math.abs(val).toLocaleString('en-IN');
  if (val < 0) return `-₹${abs}`;
  if (val > 0 && showPlus) return `+₹${abs}`;
  return `₹${abs}`;
};

export const ProfitReport: React.FC = () => {
  const { filteredSales, metrics, timeFilter, setTimeFilter, isSyncing } = useStore();
  const { t, language } = useLanguage();

  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [topProductsTab, setTopProductsTab] = useState<'revenue' | 'quantity'>('revenue');
  const [showAllWhoBuysWhat, setShowAllWhoBuysWhat] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const pillRowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active filter pill into view
  useEffect(() => {
    const container = pillRowRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [timeFilter]);

  // Aggregate product performance
  const productPerformance = useMemo(() => {
    const map: Record<string, {
      name: string;
      quantity: number;
      unit: string;
      revenue: number;
      cost: number;
      profit: number;
    }> = {};

    filteredSales.forEach(s => {
      s.items?.forEach(i => {
        if (!map[i.product_name]) {
          map[i.product_name] = {
            name: i.product_name,
            quantity: 0,
            unit: i.unit,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        const itemRevenue = i.total_price;
        const itemCost = (i.purchase_cost || 0) * (i.quantity || 0);
        map[i.product_name].quantity += i.quantity;
        map[i.product_name].revenue += itemRevenue;
        map[i.product_name].cost += itemCost;
        map[i.product_name].profit += (itemRevenue - itemCost);
      });
    });

    return Object.values(map);
  }, [filteredSales]);

  // Top products lists for the two tabs
  const productsByRevenue = useMemo(() => {
    return [...productPerformance].sort((a, b) => b.revenue - a.revenue);
  }, [productPerformance]);

  const productsByQuantity = useMemo(() => {
    return [...productPerformance].sort((a, b) => b.quantity - a.quantity);
  }, [productPerformance]);

  const displayedTopProducts = topProductsTab === 'revenue' ? productsByRevenue : productsByQuantity;

  // Aggregate customer demographic insights
  const demographicStats = useMemo(() => {
    let totalSalesCount = 0;
    let totalRevenue = 0;

    const genderStats: Record<string, { count: number; revenue: number; qty: number }> = {
      Male: { count: 0, revenue: 0, qty: 0 },
      Female: { count: 0, revenue: 0, qty: 0 },
      Other: { count: 0, revenue: 0, qty: 0 }
    };

    const ageGroupStats: Record<string, { count: number; revenue: number; qty: number }> = {
      'Kids (<18)': { count: 0, revenue: 0, qty: 0 },
      'Youth (18-25)': { count: 0, revenue: 0, qty: 0 },
      'Adults (26-45)': { count: 0, revenue: 0, qty: 0 },
      'Senior (45+)': { count: 0, revenue: 0, qty: 0 }
    };

    // Product-level demographic affinities
    const productDemographics: Record<string, {
      productName: string;
      totalRevenue: number;
      totalQty: number;
      unit: string;
      byGender: Record<string, { qty: number; revenue: number }>;
      byAge: Record<string, { qty: number; revenue: number }>;
    }> = {};

    filteredSales.forEach(s => {
      const gender = s.customer_gender || 'Male';
      const ageGroup = s.customer_age_group || 'Adults (26-45)';

      totalSalesCount += 1;
      totalRevenue += s.net_amount;

      if (!genderStats[gender]) {
        genderStats[gender] = { count: 0, revenue: 0, qty: 0 };
      }
      genderStats[gender].count += 1;
      genderStats[gender].revenue += s.net_amount;

      if (!ageGroupStats[ageGroup]) {
        ageGroupStats[ageGroup] = { count: 0, revenue: 0, qty: 0 };
      }
      ageGroupStats[ageGroup].count += 1;
      ageGroupStats[ageGroup].revenue += s.net_amount;

      s.items?.forEach(item => {
        genderStats[gender].qty += item.quantity;
        ageGroupStats[ageGroup].qty += item.quantity;

        if (!productDemographics[item.product_name]) {
          productDemographics[item.product_name] = {
            productName: item.product_name,
            totalRevenue: 0,
            totalQty: 0,
            unit: item.unit,
            byGender: {
              Male: { qty: 0, revenue: 0 },
              Female: { qty: 0, revenue: 0 },
              Other: { qty: 0, revenue: 0 }
            },
            byAge: {
              'Kids (<18)': { qty: 0, revenue: 0 },
              'Youth (18-25)': { qty: 0, revenue: 0 },
              'Adults (26-45)': { qty: 0, revenue: 0 },
              'Senior (45+)': { qty: 0, revenue: 0 }
            }
          };
        }

        const pd = productDemographics[item.product_name];
        pd.totalRevenue += item.total_price;
        pd.totalQty += item.quantity;

        if (!pd.byGender[gender]) pd.byGender[gender] = { qty: 0, revenue: 0 };
        pd.byGender[gender].qty += item.quantity;
        pd.byGender[gender].revenue += item.total_price;

        if (!pd.byAge[ageGroup]) pd.byAge[ageGroup] = { qty: 0, revenue: 0 };
        pd.byAge[ageGroup].qty += item.quantity;
        pd.byAge[ageGroup].revenue += item.total_price;
      });
    });

    const productAffinityList = Object.values(productDemographics).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Compute top Age Group only when revenue > 0
    let maxAgeRev = 0;
    let topAgeName = '';
    Object.entries(ageGroupStats).forEach(([grp, data]) => {
      if (data.revenue > maxAgeRev) {
        maxAgeRev = data.revenue;
        topAgeName = grp;
      }
    });

    // Top Product for Youth (18-25)
    const youthTopProduct = [...productAffinityList].sort((a, b) => {
      const qA = a.byAge['Youth (18-25)']?.qty || 0;
      const qB = b.byAge['Youth (18-25)']?.qty || 0;
      return qB - qA;
    }).find(p => (p.byAge['Youth (18-25)']?.qty || 0) > 0);

    // Top Product for Senior (45+)
    const seniorsTopProduct = [...productAffinityList].sort((a, b) => {
      const qA = a.byAge['Senior (45+)']?.qty || 0;
      const qB = b.byAge['Senior (45+)']?.qty || 0;
      return qB - qA;
    }).find(p => (p.byAge['Senior (45+)']?.qty || 0) > 0);

    return {
      totalSalesCount,
      totalRevenue,
      genderStats,
      ageGroupStats,
      productAffinityList,
      topAgeGroup: {
        name: topAgeName,
        revenue: maxAgeRev,
        percentage: totalRevenue > 0 ? Math.round((maxAgeRev / totalRevenue) * 100) : 0
      },
      hasRealAgeData: maxAgeRev > 0,
      youthTopProduct,
      seniorsTopProduct
    };
  }, [filteredSales]);

  const hasCustomerData = demographicStats.totalSalesCount > 0;
  const [userToggledInsights, setUserToggledInsights] = useState<boolean | null>(null);
  const isInsightsOpen = userToggledInsights ?? hasCustomerData;

  const maleShare = demographicStats.totalRevenue > 0
    ? Math.round(((demographicStats.genderStats['Male']?.revenue || 0) / demographicStats.totalRevenue) * 100)
    : 0;
  const femaleShare = demographicStats.totalRevenue > 0
    ? Math.round(((demographicStats.genderStats['Female']?.revenue || 0) / demographicStats.totalRevenue) * 100)
    : 0;

  // Total all expenses = COGS + Operating Expenses + Spoilage + Returns
  const totalAllExpenses = useMemo(() => {
    return (
      (metrics.cogs || 0) +
      (metrics.operatingExpenses || 0) +
      (metrics.totalDamagesLoss || 0) +
      (metrics.totalRefundAmount || 0)
    );
  }, [metrics.cogs, metrics.operatingExpenses, metrics.totalDamagesLoss, metrics.totalRefundAmount]);

  const isLoss = metrics.netProfit < 0;

  const marginPercentage = useMemo(() => {
    if (!metrics.totalSalesRevenue || metrics.totalSalesRevenue <= 0) return '—';
    return `${((metrics.netProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%`;
  }, [metrics.netProfit, metrics.totalSalesRevenue]);

  const periodLabels: Record<TimeRangeFilter, string> = {
    all: 'All Time',
    today: t('today') || 'Today',
    week: t('thisWeek') || 'This Week',
    month: t('thisMonth') || 'This Month',
    year: t('thisYear') || 'This Year'
  };

  const filterOptions: Array<{ id: TimeRangeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' }
  ];

  const getPLReportPayload = () => {
    return {
      title: 'Dairy Profit & Loss Statement & Sales Intelligence Report',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: periodLabels[timeFilter] || 'Period Financial Statement',
      language,
      kpis: [
        { label: 'Revenue', value: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: 'Gross Profit', value: formatINR(metrics.grossProfit), color: metrics.grossProfit >= 0 ? 'emerald' : 'rose' },
        { label: 'Total Expenses', value: `₹${totalAllExpenses.toLocaleString('en-IN')}`, color: 'rose' },
        { label: isLoss ? 'Net Loss' : 'Net Profit', value: formatINR(metrics.netProfit), color: isLoss ? 'rose' : 'emerald' }
      ],
      tables: [
        {
          heading: '1. Profit & Loss Summary Breakdown',
          data: {
            headers: ['Financial Line Item', 'Amount (₹)', 'Share / Ratio'],
            alignments: ['left', 'right', 'right'] as ('left' | 'right')[],
            rows: [
              ['Total Sales Revenue', `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, '100.0%'],
              ['(-) Cost of Goods Sold (COGS)', `₹${metrics.totalCOGS.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalCOGS / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(=) Gross Profit', formatINR(metrics.grossProfit), metrics.totalSalesRevenue > 0 ? `${((metrics.grossProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(-) Operating Expenses', `₹${metrics.operatingExpenses.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.operatingExpenses / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(-) Damages & Spoilage Loss', `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalDamagesLoss / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(-) Customer Returns Refund', `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${(((metrics.totalRefundAmount || 0) / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(+) Supplier Refund Received', `+₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`, '—'],
              ['(=) Net Profit', formatINR(metrics.netProfit), marginPercentage !== '—' ? marginPercentage : '0%']
            ]
          }
        },
        {
          heading: '2. Product Performance & Margins',
          data: {
            headers: ['Product Name', 'Sold Qty', 'Revenue (₹)', 'Cost (₹)', 'Profit (₹)', 'Margin %'],
            alignments: ['left', 'right', 'right', 'right', 'right', 'right'] as ('left' | 'right')[],
            rows: productsByRevenue.map(p => [
              p.name,
              `${p.quantity} ${p.unit}`,
              `₹${p.revenue.toLocaleString('en-IN')}`,
              `₹${Math.round(p.cost).toLocaleString('en-IN')}`,
              `₹${Math.round(p.profit).toLocaleString('en-IN')}`,
              p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%'
            ]),
            summaryRow: [
              'Total',
              `${productPerformance.length} Products`,
              `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
              `₹${metrics.totalCOGS.toLocaleString('en-IN')}`,
              formatINR(metrics.grossProfit),
              marginPercentage !== '—' ? marginPercentage : '0%'
            ]
          }
        }
      ],
      notes: 'Yogeshwari Dairy official financial audit statement. Valid for accounting and taxation.'
    };
  };

  const handleViewPLPDF = () => {
    setIsMoreOpen(false);
    viewReportPDF(getPLReportPayload());
  };

  const handlePrintPLPDF = () => {
    setIsMoreOpen(false);
    printReport(getPLReportPayload());
  };

  const handleDownloadPLPDF = () => {
    setIsMoreOpen(false);
    downloadReportPDF(getPLReportPayload());
  };

  const topRankVal = displayedTopProducts[0]
    ? (topProductsTab === 'revenue' ? displayedTopProducts[0].revenue : displayedTopProducts[0].quantity)
    : 0;

  const whoBuysWhatItems = showAllWhoBuysWhat
    ? demographicStats.productAffinityList
    : demographicStats.productAffinityList.slice(0, 5);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-28 lg:pb-8">

      {/* 1. STICKY TOP BAR & FILTER */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#24352F] -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2.5 pb-2.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                {t('plStatement') || 'Profit & Loss'}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                Net Profit analysis & financial performance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPLPDF}
              aria-label="Download Official P&L Statement PDF"
              className="h-9 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-label="More P&L actions"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-600 dark:text-[#C4D4CE] flex items-center justify-center transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="max-w-5xl mx-auto">
          <div
            ref={pillRowRef}
            role="tablist"
            aria-label="Time period filter"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-0.5"
          >
            {filterOptions.map((opt) => {
              const isActive = timeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTimeFilter(opt.id)}
                  className={`snap-center shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                      : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F] hover:border-emerald-600/40'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. HERO SUMMARY CARD (The ONLY place Net Profit is big) */}
      {isSyncing && metrics.totalSalesRevenue === 0 && metrics.netProfit === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl p-5 bg-slate-100 dark:bg-[#1A2A25] animate-pulse h-40 border border-slate-200/60 dark:border-[#24352F]" />
      ) : (
        <div
          className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm border transition-all ${
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
                After all expenses, wholesale costs, and spoilage
              </p>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-xs text-white border border-white/20 shrink-0">
              {periodLabels[timeFilter] || 'This Period'}
            </span>
          </div>

          <div className="mt-3.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight">
              {formatINR(metrics.netProfit)}
            </div>
          </div>

          {/* 3 mini stat chips in a row: Revenue, Expenses, Margin % */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-white/15 text-center">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 border border-white/15">
              <span className="text-[10px] sm:text-[11px] font-medium text-white/80 block">
                Revenue
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums block truncate">
                ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2 sm:p-2.5 border border-white/15">
              <span className="text-[10px] sm:text-[11px] font-medium text-white/80 block">
                Expenses
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white tabular-nums block truncate">
                ₹{totalAllExpenses.toLocaleString('en-IN')}
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

      {/* 3. P&L STATEMENT CARD (ONE clean white card, no nested colored boxes) */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#24352F]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Profit & Loss Statement
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaInfo(!showFormulaInfo)}
            aria-label="Toggle formula explanation"
            aria-expanded={showFormulaInfo}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Formula Expander */}
        {showFormulaInfo && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] text-xs text-slate-600 dark:text-[#C4D4CE] space-y-1">
            <p className="font-semibold text-slate-800 dark:text-white">Formula Breakdown:</p>
            <p className="text-[11px] leading-relaxed">
              Net Profit = Total Sales Revenue - COGS - Operating Expenses - Spoilage & Damaged Goods - Customer Returns + Supplier Refunds
            </p>
          </div>
        )}

        {/* Clean Row Layout with divide-y */}
        <div className="divide-y divide-slate-100 dark:divide-[#24352F] text-xs sm:text-sm">

          {/* 1. Total Sales Revenue */}
          <div className="py-2.5">
            <div className="min-h-[44px] flex items-center justify-between">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                1. Total Sales Revenue
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums text-sm sm:text-base">
                ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Sub-rows */}
            <div className="pl-4 space-y-1 pt-1 pb-1">
              <div className="min-h-[30px] flex items-center justify-between text-xs text-slate-500 dark:text-[#8FA69C]">
                <span>&bull; Cash Collected</span>
                <span className="font-medium text-slate-700 dark:text-[#C4D4CE] tabular-nums">
                  ₹{metrics.cashCollected.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="min-h-[30px] flex items-center justify-between text-xs text-slate-500 dark:text-[#8FA69C]">
                <span>&bull; Online UPI Collected</span>
                <span className="font-medium text-slate-700 dark:text-[#C4D4CE] tabular-nums">
                  ₹{metrics.onlineCollected.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Cost of Goods Sold (COGS) */}
          <div className="min-h-[44px] flex items-center justify-between py-2.5">
            <span className="font-medium text-slate-700 dark:text-[#C4D4CE]">
              2. Cost of Goods Sold (COGS)
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              -₹{metrics.cogs.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Gross Profit (bold, subtle emerald-50 background) */}
          <div className="min-h-[44px] flex items-center justify-between px-3 py-2.5 -mx-1 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 font-bold">
            <span className="text-slate-900 dark:text-white">
              = Gross Profit
            </span>
            <span className="text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums text-sm sm:text-base">
              {formatINR(metrics.grossProfit)}
            </span>
          </div>

          {/* 3. Operating Expenses */}
          <div className="min-h-[44px] flex items-center justify-between py-2.5">
            <span className="font-medium text-slate-700 dark:text-[#C4D4CE]">
              3. Operating Expenses
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              -₹{metrics.operatingExpenses.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 4. Spoilage & Damaged Goods Loss */}
          <div className="min-h-[44px] flex items-center justify-between py-2.5">
            <span className="font-medium text-slate-700 dark:text-[#C4D4CE]">
              4. Spoilage & Damaged Goods Loss
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              -₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 5. Customer Returns & Refunds */}
          <div className="min-h-[44px] flex items-center justify-between py-2.5">
            <span className="font-medium text-slate-700 dark:text-[#C4D4CE]">
              5. Customer Returns & Refunds
            </span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              -₹{(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          {/* 6. Supplier Refunds Received */}
          {(metrics.totalSupplierRefundReceived || 0) > 0 && (
            <div className="min-h-[44px] flex items-center justify-between py-2.5">
              <span className="font-medium text-slate-700 dark:text-[#C4D4CE]">
                6. Supplier Refunds & Compensations
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +₹{metrics.totalSupplierRefundReceived.toLocaleString('en-IN')}
              </span>
            </div>
          )}

          {/* Net Pocket Profit / Loss (bold, top border-2, colour by sign) */}
          <div className="min-h-[44px] flex items-center justify-between pt-3 pb-1 border-t-2 border-slate-200 dark:border-[#24352F] font-bold">
            <span className="text-slate-900 dark:text-white text-sm sm:text-base">
              {isLoss ? 'Net Pocket Loss' : 'Net Pocket Profit'}
            </span>
            <span
              className={`font-black tabular-nums text-base sm:text-lg ${
                isLoss
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatINR(metrics.netProfit)}
            </span>
          </div>

        </div>
      </div>

      {/* 4. TOP PRODUCTS (Merged into ONE card with 2 tabs: By Revenue and Best Sellers) */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-[#24352F]">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Top Products
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                Ranked performance for selected period
              </p>
            </div>
          </div>

          {/* 2 Tabs: By Revenue & Best Sellers */}
          <div
            role="tablist"
            aria-label="Top products view"
            className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#1A2A25] self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={topProductsTab === 'revenue'}
              onClick={() => setTopProductsTab('revenue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                topProductsTab === 'revenue'
                  ? 'bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              By Revenue
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={topProductsTab === 'quantity'}
              onClick={() => setTopProductsTab('quantity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                topProductsTab === 'quantity'
                  ? 'bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Best Sellers
            </button>
          </div>
        </div>

        {displayedTopProducts.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-[#C4D4CE]">
              No sales in this period
            </p>
            <p className="text-[11px] text-slate-400 dark:text-[#8FA69C]">
              Select a different date filter above to see top products
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTopProducts.slice(0, 5).map((prod, idx) => {
              const currentVal = topProductsTab === 'revenue' ? prod.revenue : prod.quantity;
              const relativePercent = topRankVal > 0 ? Math.min(100, Math.round((currentVal / topRankVal) * 100)) : 0;

              return (
                <div
                  key={prod.name}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#1A2A25] border border-slate-100 dark:border-[#24352F] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200'
                            : idx === 1
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            : idx === 2
                            ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300'
                            : 'bg-white dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block truncate">
                          {prod.name}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#8FA69C] block">
                          Sold: {prod.quantity.toFixed(1)} {prod.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm block tabular-nums">
                        {topProductsTab === 'revenue'
                          ? `₹${prod.revenue.toLocaleString('en-IN')}`
                          : `${prod.quantity.toFixed(1)} ${prod.unit}`}
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block tabular-nums">
                        {topProductsTab === 'revenue'
                          ? `Profit: +₹${Math.round(prod.profit).toLocaleString('en-IN')}`
                          : `₹${prod.revenue.toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal progress bar relative to #1 */}
                  <div className="w-full bg-slate-200/80 dark:bg-[#131F1B] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full animate-data-bar ${
                        topProductsTab === 'revenue' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${relativePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] text-[11px] text-slate-500 dark:text-[#8FA69C] flex items-center justify-between">
              <span>
                Total products sold: <b className="text-slate-800 dark:text-white">{productPerformance.length}</b>
              </span>
              {displayedTopProducts.length > 0 && (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">
                  #1: {displayedTopProducts[0].name.split(' (')[0]}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. CUSTOMER INSIGHTS (Collapsible, collapsed by default when no data) */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden">
        {/* Collapsible Accordion Header */}
        <button
          type="button"
          onClick={() => setUserToggledInsights(!isInsightsOpen)}
          aria-expanded={isInsightsOpen}
          className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 dark:hover:bg-[#1A2A25]/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-teal-100/80 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Customer Insights
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] truncate">
                Gender, age groups, and product affinity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/70 dark:border-teal-800/40">
              {demographicStats.totalSalesCount} Customer Bills
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isInsightsOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Collapsible Content */}
        {isInsightsOpen && (
          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-[#24352F] space-y-5">
            {!hasCustomerData ? (
              <div className="py-8 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-[#C4D4CE]">
                  No sales in this period
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#8FA69C]">
                  Change the date filter above to view customer demographic data
                </p>
              </div>
            ) : (
              <>
                {/* Gender Split: Slim Two-Colour Bar with labels & icons */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-white">
                    <span>Gender Distribution</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                      Male {maleShare}% &middot; Female {femaleShare}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-[#131F1B] rounded-full h-2 flex overflow-hidden">
                    <div className="bg-blue-500 h-full animate-data-bar" style={{ width: `${maleShare}%` }} />
                    <div className="bg-pink-500 h-full animate-data-bar" style={{ width: `${femaleShare}%` }} />
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex justify-between pt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      Male: ₹{(demographicStats.genderStats['Male']?.revenue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-pink-600 dark:text-pink-400 font-semibold">
                      Female: ₹{(demographicStats.genderStats['Female']?.revenue || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Age Groups: Horizontal Chips with % each & Highlight on Top Group */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Age Group Breakdown
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(demographicStats.ageGroupStats).map(([grp, data]) => {
                      const isTop = demographicStats.hasRealAgeData && grp === demographicStats.topAgeGroup.name;
                      const grpPercent = demographicStats.totalRevenue > 0
                        ? Math.round((data.revenue / demographicStats.totalRevenue) * 100)
                        : 0;

                      return (
                        <div
                          key={grp}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${
                            isTop
                              ? 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700/60 ring-1 ring-teal-400/30'
                              : 'bg-slate-50/70 dark:bg-[#1A2A25] border-slate-200/80 dark:border-[#24352F]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8FA69C]">
                            <span className="font-semibold truncate">{grp}</span>
                            {isTop && (
                              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-1 rounded">
                                Top
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                            {grpPercent}%
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-[#8FA69C] tabular-nums">
                            ₹{data.revenue.toLocaleString('en-IN')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Real Insights Cards (Rendered ONLY when real data exists) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {demographicStats.hasRealAgeData && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
                        <span>Top Age Group</span>
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {demographicStats.topAgeGroup.name}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        {demographicStats.topAgeGroup.percentage}% of sales (₹{demographicStats.topAgeGroup.revenue.toLocaleString('en-IN')})
                      </div>
                    </div>
                  )}

                  {demographicStats.youthTopProduct && (
                    <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                        <span>Youth Favorites (18-25)</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="text-sm font-black text-amber-950 dark:text-amber-100 truncate">
                        {demographicStats.youthTopProduct.productName}
                      </div>
                      <div className="text-xs text-amber-700 dark:text-amber-400 font-bold tabular-nums">
                        {demographicStats.youthTopProduct.byAge['Youth (18-25)']?.qty || 0} {demographicStats.youthTopProduct.unit} (₹{(demographicStats.youthTopProduct.byAge['Youth (18-25)']?.revenue || 0).toLocaleString('en-IN')})
                      </div>
                    </div>
                  )}

                  {demographicStats.seniorsTopProduct && (
                    <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-teal-800 dark:text-teal-300">
                        <span>Seniors Favorites (45+)</span>
                        <Heart className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                      <div className="text-sm font-black text-teal-950 dark:text-teal-100 truncate">
                        {demographicStats.seniorsTopProduct.productName}
                      </div>
                      <div className="text-xs text-teal-700 dark:text-teal-400 font-bold tabular-nums">
                        {demographicStats.seniorsTopProduct.byAge['Senior (45+)']?.qty || 0} {demographicStats.seniorsTopProduct.unit} (₹{(demographicStats.seniorsTopProduct.byAge['Senior (45+)']?.revenue || 0).toLocaleString('en-IN')})
                      </div>
                    </div>
                  )}
                </div>

                {/* Who Buys What: Compact List Item Cards (NO horizontal overflow) */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        Who Buys What?
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                        Demographic profile per product
                      </p>
                    </div>

                    {demographicStats.productAffinityList.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllWhoBuysWhat(!showAllWhoBuysWhat)}
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {showAllWhoBuysWhat
                          ? 'Show Top 5'
                          : `View All (${demographicStats.productAffinityList.length})`}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {whoBuysWhatItems.map((item) => {
                      const mQty = item.byGender['Male']?.qty || 0;
                      const fQty = item.byGender['Female']?.qty || 0;
                      const totalGQty = mQty + fQty;
                      const mPercent = totalGQty > 0 ? Math.round((mQty / totalGQty) * 100) : 0;
                      const fPercent = totalGQty > 0 ? Math.round((fQty / totalGQty) * 100) : 0;

                      let maxAgeGroup = 'Adults';
                      let maxAgeVal = -1;
                      Object.entries(item.byAge).forEach(([grp, data]) => {
                        if (data.qty > maxAgeVal) {
                          maxAgeVal = data.qty;
                          maxAgeGroup = grp.includes('<18') ? 'Kids' : grp.includes('18-25') ? 'Youth' : grp.includes('26-45') ? 'Adults' : 'Seniors';
                        }
                      });

                      return (
                        <div
                          key={item.productName}
                          className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#1A2A25] border border-slate-100 dark:border-[#24352F] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block truncate">
                                {item.productName}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                                {item.totalQty.toFixed(1)} {item.unit} sold
                              </span>
                            </div>

                            <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm tabular-nums shrink-0">
                              ₹{item.totalRevenue.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-[#24352F]/60">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-[#8FA69C]">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">M {mPercent}%</span>
                                {' · '}
                                <span className="text-pink-600 dark:text-pink-400 font-bold">F {fPercent}%</span>
                              </span>
                              <div className="w-16 bg-slate-200 dark:bg-[#131F1B] rounded-full h-1.5 flex overflow-hidden">
                                <div className="bg-blue-500 h-full animate-data-bar" style={{ width: `${mPercent}%` }} />
                                <div className="bg-pink-500 h-full animate-data-bar" style={{ width: `${fPercent}%` }} />
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 shrink-0">
                              {maxAgeGroup}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Overflow Bottom Sheet / Modal for More PDF Actions */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#131F1B] rounded-t-3xl sm:rounded-3xl p-5 border border-slate-200 dark:border-[#24352F] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Report Actions & Export
              </h4>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDownloadPLPDF}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-[#24352F] flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    Download PDF
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    Save official P&L statement to device
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleViewPLPDF}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-[#24352F] flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    Preview Statement
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    Open interactive printable preview
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePrintPLPDF}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/80 dark:border-[#24352F] flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm block">
                    Print Statement
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    Send formatted P&L document to thermal or A4 printer
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

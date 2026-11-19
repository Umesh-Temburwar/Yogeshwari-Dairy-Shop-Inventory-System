import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { computeExpiryStatus, ExpiryStatus } from '../../lib/shelfLifeUtils';
import { Product, ProductBatch, DamageReason } from '../../types';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { ProductImage } from '../Common/ProductImage';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { InventoryViewMode } from '../Inventory/InventoryMoreSheet';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Printer,
  Copy,
  Check,
  Search,
  ShieldAlert,
  Calendar,
  Download,
  X,
  Eye,
  MoreVertical,
  LayoutGrid,
  List,
  Table2,
  Tag
} from 'lucide-react';

interface EnrichedExpiryBatch extends ProductBatch {
  product?: Product;
  expiryStatus: ExpiryStatus;
  daysToExpiry: number;
  costValue: number;
  retailValue: number;
}

const formatCompactUnit = (unit?: string): string => {
  if (!unit) return '';
  if (unit === 'Packet (500ml)') return '500ml';
  if (unit === 'Packet (1L)') return '1L Pkt';
  return unit;
};

export const ExpiryDashboard: React.FC = () => {
  const { batches, products, recordDamage } = useStore();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<ExpiryStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<InventoryViewMode>('cards');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [copiedAlert, setCopiedAlert] = useState(false);
  const [riskBannerDismissed, setRiskBannerDismissed] = useState(false);
  const [previewImageProduct, setPreviewImageProduct] = useState<Product | null>(null);

  // Write-Off Modal State
  const [writeOffBatch, setWriteOffBatch] = useState<EnrichedExpiryBatch | null>(null);
  const [writeOffQty, setWriteOffQty] = useState<number>(0);
  const [writeOffReason, setWriteOffReason] = useState<DamageReason>('Expiry Date Over');
  const [writeOffNotes, setWriteOffNotes] = useState('');
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false);

  // Close More sheet on Escape
  useEffect(() => {
    if (!showMoreSheet) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMoreSheet(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showMoreSheet]);

  // Enrich batches with product info and dynamic expiry
  const enrichedBatches = useMemo<EnrichedExpiryBatch[]>(() => {
    const productById = new Map<string, Product>();
    products.forEach((p) => productById.set(p.id, p));

    return batches
      .filter((b) => b.qty_remaining > 0)
      .map((b) => {
        const prod = productById.get(b.product_id);
        const { status, daysToExpiry } = computeExpiryStatus(b.expiry_date);
        const costValue = Number((b.qty_remaining * b.purchase_price).toFixed(2));
        const retailValue = Number(
          (b.qty_remaining * (b.selling_price || prod?.selling_price || 0)).toFixed(2)
        );

        return {
          ...b,
          product: prod,
          expiryStatus: status,
          daysToExpiry,
          costValue,
          retailValue
        };
      })
      .sort((a, b) => {
        if (a.expiryStatus === 'EXPIRED' && b.expiryStatus !== 'EXPIRED') return -1;
        if (a.expiryStatus !== 'EXPIRED' && b.expiryStatus === 'EXPIRED') return 1;
        return a.daysToExpiry - b.daysToExpiry;
      });
  }, [batches, products]);

  // Tab Counts & Financial KPIs
  const kpis = useMemo(() => {
    let expiredCount = 0;
    let expiredCostLoss = 0;
    let todayCount = 0;
    let todayAtRiskValue = 0;
    let tomorrowCount = 0;
    let tomorrowAtRiskValue = 0;
    let threeDaysCount = 0;
    let threeDaysAtRiskValue = 0;
    let sevenDaysCount = 0;
    let freshCount = 0;
    let totalStockCost = 0;

    enrichedBatches.forEach((b) => {
      totalStockCost += b.costValue;
      if (b.expiryStatus === 'EXPIRED') {
        expiredCount += 1;
        expiredCostLoss += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_TODAY') {
        todayCount += 1;
        todayAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_TOMORROW') {
        tomorrowCount += 1;
        tomorrowAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_IN_3_DAYS') {
        threeDaysCount += 1;
        threeDaysAtRiskValue += b.costValue;
      } else if (b.expiryStatus === 'EXPIRING_IN_7_DAYS') {
        sevenDaysCount += 1;
      } else {
        freshCount += 1;
      }
    });

    return {
      expiredCount,
      expiredCostLoss,
      todayCount,
      todayAtRiskValue,
      tomorrowCount,
      tomorrowAtRiskValue,
      threeDaysCount,
      threeDaysAtRiskValue,
      atRiskCount: todayCount + tomorrowCount + threeDaysCount,
      nearExpiryRiskTotal: todayAtRiskValue + tomorrowAtRiskValue + threeDaysAtRiskValue,
      sevenDaysCount,
      freshCount,
      totalStockCost,
      totalActiveBatches: enrichedBatches.length
    };
  }, [enrichedBatches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedBatches.filter((b) => {
      const prodName = b.product?.name || b.product_name || '';
      const batchNo = b.batch_no || '';
      const supplier = b.supplier_name || '';
      const category = b.product?.category || '';

      const matchesSearch =
        !q ||
        prodName.toLowerCase().includes(q) ||
        batchNo.toLowerCase().includes(q) ||
        supplier.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All' || b.product?.category === selectedCategory;
      const matchesTab = activeTab === 'ALL' || b.expiryStatus === activeTab;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [enrichedBatches, searchQuery, selectedCategory, activeTab]);

  const categories = useMemo(
    () => [
      { id: 'All', label: 'All Categories' },
      { id: 'Milk', label: t('catMilk') },
      { id: 'Paneer & Butter', label: t('catPaneer') },
      { id: 'Curd & Chaas', label: t('catCurd') },
      { id: 'Ghee', label: t('catGhee') },
      { id: 'Sweets/Mithai', label: t('catSweets') },
      { id: 'Bakery & Extras', label: t('catBakery') }
    ],
    [t]
  );

  const filterChips: Array<{ id: ExpiryStatus | 'ALL'; label: string; count: number }> = [
    { id: 'ALL', label: 'All', count: enrichedBatches.length },
    { id: 'EXPIRED', label: 'Expired', count: kpis.expiredCount },
    { id: 'EXPIRING_TODAY', label: 'Today', count: kpis.todayCount },
    { id: 'EXPIRING_TOMORROW', label: 'Tomorrow', count: kpis.tomorrowCount },
    { id: 'EXPIRING_IN_3_DAYS', label: '3 Days', count: kpis.threeDaysCount },
    { id: 'EXPIRING_IN_7_DAYS', label: '7 Days', count: kpis.sevenDaysCount },
    { id: 'FRESH', label: 'Fresh', count: kpis.freshCount }
  ];

  const getProductDisplayName = (batch: EnrichedExpiryBatch) => {
    return batch.product?.name || batch.product_name || 'Product';
  };

  const getStatusMeta = (batch: EnrichedExpiryBatch) => {
    if (batch.expiryStatus === 'EXPIRED') {
      return {
        shortLabel: 'Expired',
        fullLabel: 'Expired (Blocked)',
        daysText: `${Math.abs(batch.daysToExpiry)}d ago`,
        badgeClass: 'bg-rose-600 text-white',
        cardBorder: 'border-rose-200/90 dark:border-rose-900/50',
        qtyTextClass: 'text-rose-600 dark:text-rose-400',
        dotClass: 'bg-rose-500',
        isUrgent: true
      };
    }
    if (batch.expiryStatus === 'EXPIRING_TODAY') {
      return {
        shortLabel: 'Today',
        fullLabel: 'Expiring Today',
        daysText: 'Today',
        badgeClass: 'bg-orange-600 text-white',
        cardBorder: 'border-orange-200/90 dark:border-orange-800/50',
        qtyTextClass: 'text-orange-600 dark:text-orange-400',
        dotClass: 'bg-orange-500',
        isUrgent: true
      };
    }
    if (batch.expiryStatus === 'EXPIRING_TOMORROW') {
      return {
        shortLabel: '1 Day',
        fullLabel: 'Expiring Tomorrow',
        daysText: 'Tomorrow',
        badgeClass: 'bg-amber-500 text-slate-950',
        cardBorder: 'border-amber-200/90 dark:border-amber-800/50',
        qtyTextClass: 'text-amber-700 dark:text-amber-400',
        dotClass: 'bg-amber-500',
        isUrgent: false
      };
    }
    if (batch.expiryStatus === 'EXPIRING_IN_3_DAYS') {
      return {
        shortLabel: '3 Days',
        fullLabel: 'In 3 Days',
        daysText: `${batch.daysToExpiry}d left`,
        badgeClass: 'bg-blue-600 text-white',
        cardBorder: 'border-blue-200/80 dark:border-blue-900/50',
        qtyTextClass: 'text-slate-900 dark:text-white',
        dotClass: 'bg-blue-500',
        isUrgent: false
      };
    }
    if (batch.expiryStatus === 'EXPIRING_IN_7_DAYS') {
      return {
        shortLabel: '7 Days',
        fullLabel: 'In 7 Days',
        daysText: `${batch.daysToExpiry}d left`,
        badgeClass: 'bg-purple-600 text-white',
        cardBorder: 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/70',
        qtyTextClass: 'text-slate-900 dark:text-white',
        dotClass: 'bg-purple-500',
        isUrgent: false
      };
    }
    return {
      shortLabel: 'Fresh',
      fullLabel: 'Safe Stock',
      daysText: `${batch.daysToExpiry}d left`,
      badgeClass: 'bg-emerald-600 text-white',
      cardBorder: 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/70',
      qtyTextClass: 'text-slate-900 dark:text-white',
      dotClass: 'bg-emerald-500',
      isUrgent: false
    };
  };

  // WhatsApp Alert for Near-Expiry & Expired Lots
  const handleCopyWhatsAppAlert = () => {
    const dateStr = new Date().toLocaleDateString('en-IN');
    const urgentItems = enrichedBatches.filter(
      (b) =>
        b.expiryStatus === 'EXPIRED' ||
        b.expiryStatus === 'EXPIRING_TODAY' ||
        b.expiryStatus === 'EXPIRING_TOMORROW'
    );

    let text = `🚨 *Yogeshwari Dairy Farm - Urgent Expiry Alert* 🚨\nDate: ${dateStr}\n\n`;
    urgentItems.forEach((it, idx) => {
      const statusText =
        it.expiryStatus === 'EXPIRED'
          ? 'EXPIRED'
          : it.expiryStatus === 'EXPIRING_TODAY'
          ? 'EXPIRING TODAY'
          : 'EXPIRING TOMORROW';
      text += `${idx + 1}. *${it.product?.name || it.product_name}* (Batch: ${it.batch_no})\n   Qty: *${it.qty_remaining} ${it.product?.unit || ''}* | Status: ${statusText}\n   Cost Value: ₹${it.costValue}\n\n`;
    });
    text += `Total Value at Risk: ₹${(kpis.nearExpiryRiskTotal + kpis.expiredCostLoss).toLocaleString('en-IN')}\nAction required. Thank you!`;

    navigator.clipboard.writeText(text);
    setCopiedAlert(true);
    setTimeout(() => setCopiedAlert(false), 2500);
  };

  // Open Write-Off Modal
  const openWriteOff = (batch: EnrichedExpiryBatch) => {
    setWriteOffBatch(batch);
    setWriteOffQty(batch.qty_remaining);
    setWriteOffReason(batch.expiryStatus === 'EXPIRED' ? 'Expiry Date Over' : 'Handling Spoilage');
    setWriteOffNotes(`Batch ${batch.batch_no} written off due to expiry/spoilage`);
  };

  // Execute Write-off
  const handleConfirmWriteOff = async () => {
    if (!writeOffBatch || writeOffQty <= 0) return;
    setIsSubmittingWriteOff(true);
    try {
      const lossAmount = Number((writeOffQty * writeOffBatch.purchase_price).toFixed(2));
      await recordDamage({
        product_id: writeOffBatch.product_id,
        product_name: writeOffBatch.product?.name || writeOffBatch.product_name,
        quantity: writeOffQty,
        unit: writeOffBatch.product?.unit || 'Piece',
        estimated_loss_amount: lossAmount,
        reason: writeOffReason,
        damage_date: new Date().toISOString().split('T')[0],
        notes: writeOffNotes
      });
      setWriteOffBatch(null);
    } catch (err) {
      console.error('Error writing off expired batch:', err);
    } finally {
      setIsSubmittingWriteOff(false);
    }
  };

  const getExpiryReportPayload = () => {
    return {
      title: 'Expiry Management & Risk Assessment Report',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Active Batches Expiry Audit',
      language,
      kpis: [
        { label: 'Expired Stock Loss', value: `₹${kpis.expiredCostLoss.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'Expiring Today', value: `₹${kpis.todayAtRiskValue.toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'Expiring in 3 Days', value: `₹${kpis.nearExpiryRiskTotal.toLocaleString('en-IN')}`, color: 'amber' },
        { label: 'Active Stock Valuation', value: `₹${kpis.totalStockCost.toLocaleString('en-IN')}`, color: 'emerald' }
      ],
      table: {
        headers: ['Product Name', 'Batch No.', 'Remaining Qty', 'Purchase Rate (₹)', 'Selling Rate (₹)', 'Expiry Date', 'Status', 'Risk Value (₹)'],
        alignments: ['left', 'center', 'right', 'right', 'right', 'center', 'center', 'right'] as ('left' | 'center' | 'right' | 'right' | 'right' | 'center' | 'center' | 'right')[],
        rows: filteredBatches.map((b) => [
          getProductDisplayName(b),
          b.batch_no || '—',
          `${b.qty_remaining} ${b.product?.unit || ''}`,
          `₹${b.purchase_price}`,
          `₹${b.selling_price || b.product?.selling_price || 0}`,
          b.expiry_date,
          b.daysToExpiry < 0
            ? `Expired (${Math.abs(b.daysToExpiry)}d ago)`
            : b.daysToExpiry === 0
            ? 'Expiring Today'
            : b.daysToExpiry === 1
            ? 'Expiring Tomorrow'
            : `${b.daysToExpiry} days left`,
          `₹${b.costValue.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          'Total',
          `${filteredBatches.length} Batches`,
          '',
          '',
          '',
          '',
          '',
          `₹${filteredBatches.reduce((sum, b) => sum + b.costValue, 0).toLocaleString('en-IN')}`
        ]
      },
      notes: 'Strictly enforce FEFO (First-Expired, First-Out). Do not dispense expired dairy goods for retail sale.'
    };
  };

  const handleViewExpiryPDF = () => viewReportPDF(getExpiryReportPayload());
  const handlePrintExpiryPDF = () => printReport(getExpiryReportPayload());
  const handleDownloadExpiryPDF = () => downloadReportPDF(getExpiryReportPayload());

  const hasSecondaryFilters = selectedCategory !== 'All';
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setActiveTab('ALL');
  };

  const totalValueAtRisk = kpis.expiredCostLoss + kpis.nearExpiryRiskTotal;

  return (
    <div className="max-w-7xl mx-auto pb-28 lg:pb-10 space-y-2">
      {/* 1. COMPACT SCROLL-AWAY HEADER (Exact Stock Page Layout) */}
      <div className="space-y-1.5">
        {/* Row 1: Icon + Title + More (⋮) + Round Primary CTA */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100/90 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <h1 className="text-[16px] sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              Expiry Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreSheet(true)}
              aria-label="More expiry options"
              title="View, Filters & Exports"
              className="relative w-9 h-9 rounded-full bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] flex items-center justify-center active:scale-[0.97] transition-transform cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
              {hasSecondaryFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppAlert}
              aria-label="Copy WhatsApp Expiry Risk Alert"
              className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-transform cursor-pointer"
            >
              {copiedAlert ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAlert ? 'Copied!' : 'Alert'}</span>
            </button>
          </div>
        </div>

        {/* Slim 3-Stat Clickable Summary Strip */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('EXPIRED')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              Expired
            </span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {kpis.expiredCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                kpis.todayCount > 0
                  ? 'EXPIRING_TODAY'
                  : kpis.tomorrowCount > 0
                  ? 'EXPIRING_TOMORROW'
                  : 'EXPIRING_IN_3_DAYS'
              )
            }
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              At Risk
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {kpis.atRiskCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FRESH')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              Fresh
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {kpis.freshCount}
            </span>
          </button>
        </div>

        {/* Dismissible 1-Line Risk Value Alert Banner */}
        {totalValueAtRisk > 0 && !riskBannerDismissed && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200/90 dark:border-rose-800/50 text-rose-900 dark:text-rose-300 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="truncate">
                ₹{totalValueAtRisk.toLocaleString('en-IN')} stock at expiry risk ({kpis.expiredCount} expired, {kpis.atRiskCount} expiring soon)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab(kpis.expiredCount > 0 ? 'EXPIRED' : 'EXPIRING_TODAY')}
                className="font-bold underline text-rose-800 dark:text-rose-300 cursor-pointer"
              >
                View
              </button>
              <button
                type="button"
                aria-label="Dismiss expiry alert"
                onClick={() => setRiskBannerDismissed(true)}
                className="p-0.5 rounded hover:bg-rose-200/50 dark:hover:bg-rose-900/40 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. STICKY SEARCH + ONE-ROW SNAP FILTER CHIPS (Exact Stock Page Sticky Bar) */}
      <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 pt-1 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28] space-y-1.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
          <input
            id="expiry-search-input"
            name="expirySearch"
            type="text"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product, batch no., or supplier..."
            aria-label="Search expiry batches"
            className="w-full h-10 pl-9 pr-10 rounded-xl border border-slate-300/90 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-[#6F877D] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="w-7 h-7 absolute right-1.5 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Single Horizontal Snap-Scroll Filter Chip Row */}
        <div className="relative">
          <div
            role="tablist"
            aria-label="Expiry status filters"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5"
          >
            {filterChips.map((chip) => {
              const isActive = activeTab === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(chip.id)}
                  className={`snap-start shrink-0 h-8 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors duration-150 active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F] hover:border-emerald-500/50'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-[#1E2E28] text-slate-600 dark:text-[#8FA69C]'
                    }`}
                  >
                    {chip.count.toLocaleString('en-IN')}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
        </div>

        {/* Active Secondary Filter Indicator */}
        {hasSecondaryFilters && (
          <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 font-semibold">
              <span>{selectedCategory}</span>
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                aria-label="Clear category filter"
                className="cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline shrink-0 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 3. BATCHES DISPLAY: CARDS (2-COL MOBILE / 3 TABLET / 4-5 DESKTOP), LIST, OR TABLE */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-8 sm:p-12 border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-11 h-11 text-emerald-500/70 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#E7F0EC]">
            No batches match
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 mb-4 max-w-xs">
            All stock in this view is safe and fresh, or try clearing your filters.
          </p>
          {(searchQuery || hasSecondaryFilters || activeTab !== 'ALL') && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pt-0.5">
          {filteredBatches.map((batch) => {
            const meta = getStatusMeta(batch);
            const displayName = getProductDisplayName(batch);

            return (
              <div
                key={batch.id}
                className={`group relative bg-white dark:bg-[#131F1B] rounded-2xl p-2 border transition-all duration-200 ease-out flex flex-col justify-between shadow-2xs hover:shadow-sm ${meta.cardBorder}`}
              >
                {/* Top: Square White Image Box (Stock & POS size) + Status Pill */}
                <div>
                  <div className="relative mb-1.5">
                    <button
                      type="button"
                      onClick={() => batch.product && setPreviewImageProduct(batch.product)}
                      aria-label={`View photo for ${displayName}`}
                      title="Click photo to view"
                      className="relative w-full aspect-square rounded-2xl bg-white border border-slate-200/80 dark:border-[#24352F] hover:border-emerald-400/70 overflow-hidden flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                    >
                      <ProductImage
                        src={batch.product?.image_url}
                        alt={displayName}
                        category={batch.product?.category}
                        fill
                        className="group-hover:scale-[1.03] transition-transform duration-200 motion-reduce:transition-none"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none bg-slate-900/75 text-white tabular-nums shadow-2xs">
                        {meta.daysText}
                      </span>
                    </button>

                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none tracking-tight shadow-2xs pointer-events-none ${meta.badgeClass}`}
                      >
                        {meta.shortLabel}
                      </span>
                    </div>
                  </div>

                  {/* Product Name (max 2 lines) + Batch & Expiry Meta */}
                  <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug line-clamp-2 min-h-[2.1rem]">
                    {displayName}
                  </h3>
                  <div className="flex items-center justify-between gap-1 mt-0.5 text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    <span className="font-mono truncate">{batch.batch_no}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{batch.expiry_date}</span>
                  </div>
                </div>

                {/* Bottom: Remaining Qty + Cost Value & Write-Off Action */}
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-1 px-1 py-0.5">
                    <div className="min-w-0 truncate">
                      <span className={`text-[18px] sm:text-[20px] font-bold tabular-nums leading-none ${meta.qtyTextClass}`}>
                        {batch.qty_remaining}
                      </span>
                      <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                        {formatCompactUnit(batch.product?.unit)}
                      </span>
                    </div>
                    <span className="text-[13px] sm:text-[14px] font-bold text-slate-800 dark:text-[#E7F0EC] tabular-nums shrink-0">
                      ₹{batch.costValue.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openWriteOff(batch)}
                    aria-label={`Log loss for ${displayName}`}
                    className={`w-full min-h-[44px] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] transition cursor-pointer ${
                      meta.isUrgent
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                        : 'bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Log Loss</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2 pt-0.5">
          {filteredBatches.map((batch) => {
            const meta = getStatusMeta(batch);
            const displayName = getProductDisplayName(batch);

            return (
              <div
                key={batch.id}
                className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#131F1B] border transition-colors ${meta.cardBorder}`}
              >
                <button
                  type="button"
                  onClick={() => batch.product && setPreviewImageProduct(batch.product)}
                  aria-label={`View photo for ${displayName}`}
                  className="relative w-14 h-14 shrink-0 aspect-square rounded-xl bg-white border border-slate-200/80 dark:border-[#24352F] hover:border-emerald-400/70 overflow-hidden cursor-pointer transition-colors shadow-2xs"
                >
                  <ProductImage
                    src={batch.product?.image_url}
                    alt={displayName}
                    category={batch.product?.category}
                    fill
                  />
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white ${meta.dotClass}`}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] truncate">
                      {displayName}
                    </h3>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${meta.badgeClass}`}>
                      {meta.shortLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                    {batch.batch_no} &bull; Exp: {batch.expiry_date} ({meta.daysText})
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2.5">
                    <span className={`text-[15px] font-bold tabular-nums ${meta.qtyTextClass}`}>
                      {batch.qty_remaining}{' '}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                        {formatCompactUnit(batch.product?.unit)}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      ₹{batch.costValue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWriteOff(batch)}
                  className={`h-10 px-3 rounded-xl text-xs font-bold inline-flex items-center gap-1 shrink-0 active:scale-[0.97] transition cursor-pointer ${
                    meta.isUrgent
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Loss</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">Batch No.</th>
                  <th className="px-3 py-3">Supplier</th>
                  <th className="px-3 py-3 text-center">Stock Left</th>
                  <th className="px-3 py-3 text-right">Total Cost</th>
                  <th className="px-3 py-3">Expiry Date</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredBatches.map((batch) => {
                  const meta = getStatusMeta(batch);
                  const displayName = getProductDisplayName(batch);

                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => batch.product && setPreviewImageProduct(batch.product)}
                            aria-label={`Preview photo for ${displayName}`}
                            className="shrink-0 rounded-xl overflow-hidden cursor-pointer"
                          >
                            <ProductImage
                              src={batch.product?.image_url}
                              alt={displayName}
                              category={batch.product?.category}
                              size="xs"
                            />
                          </button>
                          <div className="min-w-0">
                            <div className="truncate font-bold">{displayName}</div>
                            <span className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                              {batch.product?.category || ''}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]">
                          {batch.batch_no}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-[#8FA69C]">
                        {batch.supplier_name || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums">
                        <span className={`font-bold text-sm ${meta.qtyTextClass}`}>
                          {batch.qty_remaining}
                        </span>{' '}
                        <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                          {formatCompactUnit(batch.product?.unit)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                        ₹{batch.costValue.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800 dark:text-[#E7F0EC] tabular-nums">
                            {batch.expiry_date}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold block mt-0.5 ${meta.qtyTextClass}`}>
                          {meta.daysText}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${meta.badgeClass}`}>
                          {meta.fullLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openWriteOff(batch)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Log Loss</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MORE OPTIONS BOTTOM SHEET (Exact Stock Page More Sheet) */}
      {showMoreSheet && (
        <div
          className="fixed inset-0 z-[105] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowMoreSheet(false)}
          role="dialog"
          aria-modal="true"
          aria-label="More expiry options"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border-t sm:border border-slate-200 dark:border-[#24352F] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
              <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#2C4139]" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F] shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                View, Filters & Exports
              </h2>
              <button
                type="button"
                onClick={() => setShowMoreSheet(false)}
                aria-label="Close options"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto overscroll-contain">
              {/* Layout View */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                  Layout View
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'cards', label: 'Cards', icon: LayoutGrid },
                      { id: 'list', label: 'List', icon: List },
                      { id: 'table', label: 'Table', icon: Table2 }
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = viewMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setViewMode(item.id);
                          setShowMoreSheet(false);
                        }}
                        className={`min-h-[44px] rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#E7F0EC] border-slate-200 dark:border-[#24352F]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C] inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Category</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const active = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] border-slate-200 dark:border-[#24352F]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reports & Exports */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                  Reports & Tools
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handleDownloadExpiryPDF();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>Expiry PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handlePrintExpiryPDF();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handleViewExpiryPDF();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
                    <span>View PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handleCopyWhatsAppAlert();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>WhatsApp Alert</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WRITE-OFF MODAL DIALOG */}
      {writeOffBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#131F1B] max-w-md w-full rounded-2xl border border-slate-200 dark:border-[#24352F] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Write Off Expired / Spoiled Stock
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWriteOffBatch(null)}
                aria-label="Close write-off modal"
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl border border-slate-200/80 dark:border-[#24352F] space-y-1">
              <div className="text-xs text-slate-500 dark:text-[#8FA69C]">Product:</div>
              <div className="font-bold text-slate-900 dark:text-white text-sm">
                {getProductDisplayName(writeOffBatch)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-[#8FA69C] pt-1">
                <span>
                  Batch No:{' '}
                  <span className="font-mono font-bold text-slate-800 dark:text-white">
                    {writeOffBatch.batch_no}
                  </span>
                </span>
                <span>
                  Available:{' '}
                  <span className="font-bold text-rose-600">
                    {writeOffBatch.qty_remaining} {writeOffBatch.product?.unit}
                  </span>
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="writeoff-qty-input"
                className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1"
              >
                Quantity to Remove:
              </label>
              <input
                id="writeoff-qty-input"
                type="number"
                step="0.1"
                min="0.1"
                max={writeOffBatch.qty_remaining}
                value={writeOffQty}
                onChange={(e) => setWriteOffQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label
                htmlFor="writeoff-reason-select"
                className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1"
              >
                Reason:
              </label>
              <select
                id="writeoff-reason-select"
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value as DamageReason)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Expiry Date Over">Expiry Date Over</option>
                <option value="Doodh Fat Gya (Curdled)">Curdled Milk</option>
                <option value="Theli Phat Gayi (Leaked)">Leaked / Torn Pouch</option>
                <option value="Handling Spoilage">Handling Spoilage</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Direct Financial Loss:
              </span>
              <span className="text-base font-black text-rose-700 dark:text-rose-400 tabular-nums">
                ₹{(writeOffQty * writeOffBatch.purchase_price).toFixed(2)}
              </span>
            </div>

            <div>
              <label
                htmlFor="writeoff-notes-input"
                className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1"
              >
                Notes / Details:
              </label>
              <textarea
                id="writeoff-notes-input"
                rows={2}
                value={writeOffNotes}
                onChange={(e) => setWriteOffNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWriteOffBatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingWriteOff || writeOffQty <= 0}
                onClick={handleConfirmWriteOff}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingWriteOff ? 'Recording...' : 'Record Loss & Deduct Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Photo Preview Modal */}
      <ProductImagePreviewModal
        product={previewImageProduct}
        onClose={() => setPreviewImageProduct(null)}
      />
    </div>
  );
};

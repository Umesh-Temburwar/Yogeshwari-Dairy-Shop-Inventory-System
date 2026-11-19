import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import {
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Truck,
  CheckCircle2,
  Download,
  Eye,
  Search,
  X,
  MoreVertical,
  LayoutGrid,
  List,
  Table2,
  Tag,
  Plus
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import { ProductImage } from '../Common/ProductImage';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { HoldableImageBox } from '../Common/HoldableImageBox';
import { ActiveOperatorBar } from '../Common/ActiveOperatorBar';
import { InventoryViewMode } from './InventoryMoreSheet';

type ReorderFilterTab = 'ALL' | 'CRITICAL' | 'LOW' | 'FAST_MOVER';

interface RestockProductItem extends Product {
  recommendedOrderQty: number;
  estimatedCost: number;
  isCritical: boolean;
  totalSold: number;
  totalReturned: number;
  vendorReturnedQty: number;
  vendorPendingRefund: number;
  hasNearExpiryBatch: boolean;
  isFastMover: boolean;
}

const formatCompactUnit = (unit?: string): string => {
  if (!unit) return '';
  if (unit === 'Packet (500ml)') return '500ml';
  if (unit === 'Packet (1L)') return '1L Pkt';
  return unit;
};

export const ReorderNeedsView: React.FC = () => {
  const { products, batches, sales, returns, supplierReturns, metrics, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<ReorderFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<InventoryViewMode>('cards');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImageProduct, setPreviewImageProduct] = useState<Product | null>(null);

  // Close More sheet on Escape
  useEffect(() => {
    if (!showMoreSheet) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMoreSheet(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showMoreSheet]);

  // Analyze inventory based on sales velocity, customer returns, supplier defects, and shelf life
  const itemsNeedingRestock = useMemo<RestockProductItem[]>(() => {
    const salesByProduct = new Map<string, number>();
    sales.forEach((s) => {
      s.items?.forEach((it) => {
        salesByProduct.set(it.product_id, (salesByProduct.get(it.product_id) || 0) + it.quantity);
      });
    });

    const returnsByProduct = new Map<string, number>();
    returns.forEach((r) => {
      returnsByProduct.set(r.product_id, (returnsByProduct.get(r.product_id) || 0) + r.quantity);
    });

    const supplierReturnsByProduct = new Map<string, { qty: number; pendingRefund: number }>();
    supplierReturns.forEach((sr) => {
      const curr = supplierReturnsByProduct.get(sr.product_id) || { qty: 0, pendingRefund: 0 };
      curr.qty += sr.quantity;
      if (sr.refund_status === 'Pending') {
        curr.pendingRefund += sr.total_refund_amount;
      }
      supplierReturnsByProduct.set(sr.product_id, curr);
    });

    const nearExpiryProducts = new Set<string>();
    batches.forEach((b) => {
      if (
        b.qty_remaining > 0 &&
        ['EXPIRING_TODAY', 'EXPIRING_TOMORROW'].includes(computeExpiryStatus(b.expiry_date).status)
      ) {
        nearExpiryProducts.add(b.product_id);
      }
    });

    return products
      .filter((p) => {
        const isTrackedShopProduct =
          p.stock_quantity > 0 || (salesByProduct.get(p.id) || 0) > 0 || p.source === 'SHOP';
        return isTrackedShopProduct && p.stock_quantity <= p.min_stock_alert;
      })
      .map((p) => {
        const totalSold = salesByProduct.get(p.id) || 0;
        const totalReturned = returnsByProduct.get(p.id) || 0;
        const supplierInfo = supplierReturnsByProduct.get(p.id);
        const vendorReturnedQty = supplierInfo?.qty || 0;
        const vendorPendingRefund = supplierInfo?.pendingRefund || 0;
        const hasNearExpiryBatch = nearExpiryProducts.has(p.id);

        const demandBuffer =
          totalSold > 0
            ? Math.max(p.min_stock_alert * 1.5, totalSold * 1.2)
            : p.min_stock_alert * 2.5;
        const recommendedOrderQty = Math.max(
          p.min_stock_alert,
          Number((demandBuffer - p.stock_quantity).toFixed(1))
        );
        const estimatedCost = Number((recommendedOrderQty * p.purchase_price).toFixed(2));

        return {
          ...p,
          recommendedOrderQty,
          estimatedCost,
          isCritical: p.stock_quantity <= 0,
          totalSold,
          totalReturned,
          vendorReturnedQty,
          vendorPendingRefund,
          hasNearExpiryBatch,
          isFastMover: totalSold >= p.min_stock_alert * 2
        };
      })
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [products, batches, sales, returns, supplierReturns]);

  const criticalCount = useMemo(
    () => itemsNeedingRestock.filter((i) => i.isCritical).length,
    [itemsNeedingRestock]
  );
  const lowOnlyCount = itemsNeedingRestock.length - criticalCount;
  const fastMoverCount = useMemo(
    () => itemsNeedingRestock.filter((i) => i.isFastMover).length,
    [itemsNeedingRestock]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return itemsNeedingRestock.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.brand || '').toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.barcode || '').toLowerCase().includes(q);

      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

      const matchesTab =
        activeTab === 'ALL'
          ? true
          : activeTab === 'CRITICAL'
          ? item.isCritical
          : activeTab === 'LOW'
          ? !item.isCritical
          : item.isFastMover;

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [itemsNeedingRestock, searchQuery, selectedCategory, activeTab]);

  const totalEstimatedCost = useMemo(
    () => itemsNeedingRestock.reduce((acc, it) => acc + it.estimatedCost, 0),
    [itemsNeedingRestock]
  );

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

  const filterChips: Array<{ id: ReorderFilterTab; label: string; count: number }> = [
    { id: 'ALL', label: 'All Needed', count: itemsNeedingRestock.length },
    { id: 'CRITICAL', label: 'Out of Stock', count: criticalCount },
    { id: 'LOW', label: 'Low Stock', count: lowOnlyCount },
    { id: 'FAST_MOVER', label: 'Fast Movers', count: fastMoverCount }
  ];

  // Copy WhatsApp format procurement list
  const handleCopyWhatsAppList = () => {
    const dateStr = new Date().toLocaleDateString('en-IN');

    let text = `🥛 *Yogeshwari Dairy Farm - Reorder Requirement Sheet* 🥛\nDate: ${dateStr}\n\n`;
    itemsNeedingRestock.forEach((it, idx) => {
      text += `${idx + 1}. *${it.name}*\n   👉 Reorder Quantity: *${it.recommendedOrderQty} ${it.unit}* (Current Stock: ${it.stock_quantity})\n\n`;
    });
    text += `Total Estimated Cost: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nPlease deliver as early as possible. Thank you!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const getReorderPayload = () => {
    return {
      title: 'Procurement & Reorder Requirements Sheet',
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: 'Immediate Restock Requirements',
      language,
      kpis: [
        { label: 'Total Items Needed', value: `${itemsNeedingRestock.length}`, color: 'rose' },
        { label: 'Out of Stock Items', value: `${criticalCount}`, color: 'rose' },
        { label: 'Estimated Restock Budget', value: `₹${totalEstimatedCost.toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: ['Sr.No.', 'Product Name', 'Category', 'Current Stock', 'Min Alert', 'Order Qty', 'Unit Price (₹)', 'Est. Total (₹)'],
        alignments: ['center', 'left', 'center', 'right', 'right', 'right', 'right', 'right'] as ('center' | 'left' | 'center' | 'right' | 'right' | 'right' | 'right' | 'right')[],
        rows:
          itemsNeedingRestock.length > 0
            ? itemsNeedingRestock.map((it, idx) => [
                idx + 1,
                it.name,
                it.category,
                `${it.stock_quantity} ${it.unit}`,
                `${it.min_stock_alert} ${it.unit}`,
                `${it.recommendedOrderQty} ${it.unit}`,
                `₹${it.purchase_price}`,
                `₹${it.estimatedCost.toLocaleString('en-IN')}`
              ])
            : [[1, 'All products are sufficiently stocked (Safe inventory)', '—', '—', '—', '—', '—', '₹0']],
        summaryRow: [
          'Total',
          `${itemsNeedingRestock.length} Products`,
          '',
          '',
          '',
          '',
          '',
          `₹${totalEstimatedCost.toLocaleString('en-IN')}`
        ]
      },
      notes:
        itemsNeedingRestock.length > 0
          ? 'Please issue purchase orders for these items to suppliers promptly.'
          : 'All dairy inventory is currently at safe stock levels. No immediate procurement needed.'
    };
  };

  const handleViewReorderPDF = () => viewReportPDF(getReorderPayload());
  const handlePrintReorderPDF = () => printReport(getReorderPayload());
  const handleDownloadReorderPDF = () => downloadReportPDF(getReorderPayload());

  const hasSecondaryFilters = selectedCategory !== 'All';
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setActiveTab('ALL');
  };

  return (
    <div className="max-w-7xl mx-auto pb-28 lg:pb-10 space-y-2">
      {/* 0. POS-STYLE ACTIVE OPERATOR & STORE BADGE BAR */}
      <ActiveOperatorBar
        locationName="Stock Need & Reorder Procurement"
        pulseColor="amber"
        className="mb-1"
      />

      {/* 1. COMPACT SCROLL-AWAY HEADER (Exact Stock Page Layout) */}
      <div className="space-y-1.5">
        {/* Row 1: Icon + Title + More (⋮) + Round "+ Purchase" Button */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-100/90 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-[16px] sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              {t('reorderTitle')}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreSheet(true)}
              aria-label="More reorder options"
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
              onClick={() => setActiveView('purchases')}
              aria-label="Record Purchase"
              className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Purchase</span>
            </button>
          </div>
        </div>

        {/* Slim 3-Stat Clickable Summary Strip */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('CRITICAL')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              Out
            </span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {criticalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOW')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              Low
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {lowOnlyCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              Budget
            </span>
            <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums truncate">
              ₹{totalEstimatedCost.toLocaleString('en-IN')}
            </span>
          </button>
        </div>

        {/* Pending Supplier Refund Compact Alert Banner */}
        {metrics.pendingSupplierRefundAmount > 0 && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200/90 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                Pending Supplier Refund: ₹{metrics.pendingSupplierRefundAmount.toLocaleString('en-IN')} — deduct from next bill
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('returns')}
              className="font-bold underline text-amber-800 dark:text-amber-300 shrink-0 cursor-pointer"
            >
              Ledger
            </button>
          </div>
        )}
      </div>

      {/* 2. STICKY SEARCH + CATEGORY CHIPS + STATUS TABS (POS DNA) */}
      <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 pt-1 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28] space-y-1.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
          <input
            id="reorder-search-input"
            name="reorderSearch"
            type="text"
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search low stock products or category..."
            aria-label="Search low stock products"
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

        {/* Category Filter Chips Snap-Scroller (POS DNA) */}
        <div className="relative">
          <div
            role="tablist"
            aria-label="Product categories"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center shrink-0 snap-start transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-[#131F1B] border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#A3B8AF] hover:border-slate-300 dark:hover:border-[#324A42]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
        </div>

        {/* Status Filter Chips Row */}
        <div className="relative">
          <div
            role="tablist"
            aria-label="Stock alert filters"
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
                  className={`snap-start shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-colors duration-150 active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-700 dark:border-emerald-700 shadow-xs'
                      : 'bg-white/90 dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border-slate-200/90 dark:border-[#24352F] hover:border-slate-300'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
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

      {/* 3. RESTOCK DISPLAY: CARDS (2-COL MOBILE / 3 TABLET / 4-5 DESKTOP), LIST, OR TABLE */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-8 sm:p-12 border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-11 h-11 text-emerald-600 dark:text-emerald-400 mb-2.5" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {itemsNeedingRestock.length === 0
              ? 'All dairy items are well stocked!'
              : 'No matching reorder items'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 mb-4 max-w-xs">
            {itemsNeedingRestock.length === 0
              ? 'Fresh milk, paneer, curd, ghee, and sweets are available in sufficient quantities.'
              : 'Try clearing your search or category filter.'}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 pt-0.5">
          {filteredItems.map((item) => {
            const isOut = item.isCritical;
            const statusBadgeClass = isOut
              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300';

            return (
              <div
                key={item.id}
                className={`group relative bg-white dark:bg-[#131F1B] rounded-2xl p-3 sm:p-3.5 border transition-all duration-150 flex flex-col justify-between select-none shadow-2xs hover:shadow-md ${
                  isOut
                    ? 'border-rose-200/90 dark:border-rose-900/50'
                    : 'border-amber-200/90 dark:border-amber-800/50'
                }`}
              >
                {/* Top: Unit badge (left) + Urgency Status Pill with colored dot (right) */}
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] uppercase truncate max-w-[85px]">
                      {formatCompactUnit(item.unit)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${statusBadgeClass}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                      <span>{isOut ? 'Out of Stock' : 'Low Stock'}</span>
                    </span>
                  </div>

                  {/* Standardized 1:1 Aspect-Square Product Image Showcase (POS DNA) */}
                  <HoldableImageBox
                    onHold={() => setPreviewImageProduct(item)}
                    title="Hold image to view & update URL"
                    className="group/posimg relative w-full aspect-square flex justify-center items-center mb-2.5 bg-white rounded-2xl border border-slate-200/80 dark:border-[#24352F] overflow-hidden shadow-2xs cursor-pointer"
                    onTap={(e) => {
                      e.stopPropagation();
                      setPreviewImageProduct(item);
                    }}
                  >
                    <ProductImage
                      src={item.image_url}
                      alt={item.name}
                      category={item.category}
                      fill
                      className="group-hover/posimg:scale-[1.03] transition-transform duration-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageProduct(item);
                      }}
                      title="Edit image URL"
                      className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 hover:bg-emerald-700 text-white text-[9px] font-bold opacity-85 sm:opacity-0 sm:group-hover/posimg:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Eye className="w-2.5 h-2.5" />
                      <span>URL</span>
                    </button>

                    {item.isFastMover && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold leading-none bg-orange-600 text-white shadow-xs">
                        Fast Mover
                      </span>
                    )}
                  </HoldableImageBox>

                  {/* Product Title (2-line clamp, bold) */}
                  <div className="mb-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-[#E7F0EC] text-xs sm:text-sm leading-snug line-clamp-2 min-h-[2.2rem]">
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-[#8FA69C] mt-0.5">
                      <span className="truncate">{item.category}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        Min {item.min_stock_alert}
                      </span>
                    </div>

                    {(item.hasNearExpiryBatch || item.vendorReturnedQty > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.hasNearExpiryBatch && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            Sell batch 1st
                          </span>
                        )}
                        {item.vendorReturnedQty > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                            Defect ({item.vendorReturnedQty})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Remaining Stock + Order Need & Buy CTA Button */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 dark:text-[#8FA69C] block leading-none font-semibold">
                      Stock: {item.stock_quantity} {formatCompactUnit(item.unit)}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400 leading-tight block mt-0.5">
                      Order: {item.recommendedOrderQty}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveView('purchases')}
                    aria-label={`Order ${item.recommendedOrderQty} ${item.unit} of ${item.name}`}
                    className="h-8 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1 shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Purchase</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2 pt-0.5">
          {filteredItems.map((item) => {
            const isOut = item.isCritical;
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#131F1B] border transition-colors ${
                  isOut
                    ? 'border-rose-200/90 dark:border-rose-900/50'
                    : 'border-amber-200/90 dark:border-amber-800/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreviewImageProduct(item)}
                  aria-label={`View photo for ${item.name}`}
                  className="relative w-14 h-14 shrink-0 aspect-square rounded-xl bg-white border border-slate-100 dark:border-[#24352F] overflow-hidden cursor-pointer"
                >
                  <ProductImage
                    src={item.image_url}
                    alt={item.name}
                    category={item.category}
                    fill
                  />
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white ${
                      isOut ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] truncate">
                      {item.name}
                    </h3>
                    {item.isFastMover && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 shrink-0">
                        Fast
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                    {item.category} &bull; Min Alert: {item.min_stock_alert} {formatCompactUnit(item.unit)}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2.5">
                    <span
                      className={`text-[15px] font-bold tabular-nums ${
                        isOut
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {item.stock_quantity}{' '}
                      <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                        {formatCompactUnit(item.unit)}
                      </span>
                    </span>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{item.recommendedOrderQty} • ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('purchases')}
                  className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0 active:scale-[0.97] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Buy</span>
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
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">Min Alert</th>
                  <th className="px-3 py-3 text-center">{t('recommendedOrderQty')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">Est. Cost</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setPreviewImageProduct(item)}
                          aria-label={`Preview photo for ${item.name}`}
                          className="shrink-0 rounded-xl overflow-hidden cursor-pointer"
                        >
                          <ProductImage
                            src={item.image_url}
                            alt={item.name}
                            category={item.category}
                            size="xs"
                          />
                        </button>
                        <div className="min-w-0">
                          <div className="font-bold truncate">{item.name}</div>
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {item.isFastMover && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                                Fast Mover
                              </span>
                            )}
                            {item.hasNearExpiryBatch && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Sell batch first
                              </span>
                            )}
                            {item.vendorReturnedQty > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                Supplier Defect ({item.vendorReturnedQty})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-[#8FA69C]">{item.category}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                          item.isCritical
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {item.stock_quantity} {formatCompactUnit(item.unit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500 dark:text-[#8FA69C] tabular-nums">
                      {item.min_stock_alert} {formatCompactUnit(item.unit)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs tabular-nums">
                        +{item.recommendedOrderQty} {formatCompactUnit(item.unit)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600 dark:text-[#8FA69C] tabular-nums">
                      ₹{item.purchase_price}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                      ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveView('purchases')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                      >
                        + Buy Stock
                      </button>
                    </td>
                  </tr>
                ))}
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
          aria-label="More reorder options"
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
                      handleCopyWhatsAppList();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    <span>{copied ? 'Copied!' : 'WhatsApp Order'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handleDownloadReorderPDF();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Order PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false);
                      handleViewReorderPDF();
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
                      handlePrintReorderPDF();
                    }}
                    className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
                    <span>Print Sheet</span>
                  </button>
                </div>
              </div>
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

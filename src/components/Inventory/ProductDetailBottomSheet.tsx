import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Layers,
  Edit3,
  Trash2,
  Clock,
  Barcode,
  Image as ImageIcon,
  PackagePlus,
  Check
} from 'lucide-react';
import { Product, ProductBatch } from '../../types';
import { ProductImage } from '../Common/ProductImage';
import {
  computeExpiryStatus,
  generateBatchNumber,
  getShelfLifeDays,
  getSuggestedExpiryDate
} from '../../lib/shelfLifeUtils';

interface StockBatchInput {
  batch_no: string;
  mfg_date: string;
  expiry_date: string;
}

interface ProductDetailBottomSheetProps {
  product: Product | null;
  displayName: string;
  initialMode: 'in' | 'out';
  batches: ProductBatch[];
  language: 'mr' | 'hi' | 'en';
  onClose: () => void;
  onConfirmAdjust: (product: Product, delta: number, batchInfo?: StockBatchInput) => void;
  onOpenFullStockIn: (product: Product) => void;
  onOpenBatches: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onPreviewImage: (product: Product) => void;
}

export const ProductDetailBottomSheet: React.FC<ProductDetailBottomSheetProps> = ({
  product,
  displayName,
  initialMode,
  batches,
  language,
  onClose,
  onConfirmAdjust,
  onOpenFullStockIn,
  onOpenBatches,
  onEdit,
  onDelete,
  onPreviewImage
}) => {
  const [mode, setMode] = useState<'in' | 'out'>(initialMode);
  const [qty, setQty] = useState<number>(1);
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (!product) return;
    setMode(initialMode === 'out' && product.stock_quantity <= 0 ? 'in' : initialMode);
    setQty(1);
    const todayStr = new Date().toISOString().split('T')[0];
    setBatchNo(generateBatchNumber(product.name, todayStr));
    setExpiryDate(getSuggestedExpiryDate(todayStr, getShelfLifeDays(product.category, product.name)));
  }, [product, initialMode]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const isOut = product.stock_quantity <= 0;
  const isLow = product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert;
  const activeBatches = batches.filter((b) => b.product_id === product.id && b.qty_remaining > 0);
  const expiringCount = activeBatches.filter((b) => {
    const st = computeExpiryStatus(b.expiry_date).status;
    return st === 'EXPIRED' || st === 'EXPIRING_TODAY' || st === 'EXPIRING_TOMORROW' || st === 'EXPIRING_IN_3_DAYS';
  }).length;

  const maxOut = Math.max(0, product.stock_quantity);
  const safeQty = mode === 'out' ? Math.min(qty, maxOut) : qty;
  const resultingStock =
    mode === 'in'
      ? Number((product.stock_quantity + safeQty).toFixed(2))
      : Math.max(0, Number((product.stock_quantity - safeQty).toFixed(2)));

  const handleApplyQuickAdd = (increment: number) => {
    setQty((prev) => {
      const next = prev + increment;
      return mode === 'out' ? Math.min(next, maxOut) : next;
    });
  };

  const handleConfirm = () => {
    if (safeQty <= 0) return;
    const delta = mode === 'in' ? safeQty : -safeQty;
    const todayStr = new Date().toISOString().split('T')[0];
    const batchInfo: StockBatchInput | undefined =
      mode === 'in'
        ? {
            batch_no: batchNo.trim() || generateBatchNumber(product.name, todayStr),
            mfg_date: todayStr,
            expiry_date:
              expiryDate ||
              getSuggestedExpiryDate(todayStr, getShelfLifeDays(product.category, product.name))
          }
        : undefined;

    onConfirmAdjust(product, delta, batchInfo);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[105] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 motion-reduce:animate-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={displayName}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border-t sm:border border-slate-200 dark:border-[#24352F] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ease-out motion-reduce:animate-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Drag Handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#2C4139]" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-[#24352F] shrink-0">
          <button
            type="button"
            onClick={() => onPreviewImage(product)}
            aria-label="Open full product image and URL editor"
            className="w-16 h-16 shrink-0 aspect-square rounded-2xl bg-white border border-slate-200 dark:border-[#24352F] overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <ProductImage
              src={product.image_url}
              alt={product.name}
              category={product.category}
              fill
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isOut
                    ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                    : isLow
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                {product.category}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug mt-0.5 line-clamp-2">
              {displayName}
            </h2>
            {product.barcode && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-[#8FA69C]">
                <Barcode className="w-3 h-3" />
                <span>{product.barcode}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto overscroll-contain">
          {/* Key Numbers: Stock, Selling Rate, Cost Price */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/70 dark:border-[#24352F]">
              <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] block">Stock</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                {product.stock_quantity}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] ml-1">
                {product.unit}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/70 dark:border-[#24352F]">
              <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] block">Selling Rate</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                ₹{product.selling_price}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/70 dark:border-[#24352F]">
              <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] block">Cost Price</span>
              <span className="text-lg font-bold text-slate-700 dark:text-[#E7F0EC] tabular-nums">
                ₹{product.purchase_price}
              </span>
            </div>
          </div>

          {/* Batches & Expiry Row */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/70 dark:border-[#24352F]">
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeBatches.length} Active {activeBatches.length === 1 ? 'Batch' : 'Batches'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  {expiringCount > 0 ? `${expiringCount} expiring soon` : 'Expiry tracked automatically'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBatches(product);
              }}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#223630] shrink-0 cursor-pointer"
            >
              View Batches
            </button>
          </div>

          {/* Stock In / Stock Out Stepper Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-3">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/70 dark:bg-[#131F1B]">
              <button
                type="button"
                onClick={() => setMode('in')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  mode === 'in'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#8FA69C]'
                }`}
              >
                + {language === 'mr' ? 'माल आला (In)' : language === 'hi' ? 'स्टॉक इन (+)' : 'Stock In'}
              </button>
              <button
                type="button"
                disabled={isOut}
                onClick={() => setMode('out')}
                className={`py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 cursor-pointer ${
                  mode === 'out'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-[#8FA69C]'
                }`}
              >
                − {language === 'mr' ? 'माल गेला (Out)' : language === 'hi' ? 'स्टॉक आउट (−)' : 'Stock Out'}
              </button>
            </div>

            {/* Stepper Row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                aria-label="Decrease quantity"
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-white active:scale-[0.97] cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={qty}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setQty(Number.isNaN(v) ? 0 : Math.max(0, v));
                }}
                aria-label="Stock adjustment quantity"
                className="flex-1 h-11 text-center rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-500/70 text-lg font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleApplyQuickAdd(1)}
                aria-label="Increase quantity"
                className="w-11 h-11 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] flex items-center justify-center text-slate-700 dark:text-white active:scale-[0.97] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Chips (+1, +5, +10) */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleApplyQuickAdd(chip)}
                  className="py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-emerald-50 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC] active:scale-[0.97] transition-transform cursor-pointer"
                >
                  +{chip}
                </button>
              ))}
            </div>

            {/* Optional Expiry Date for Stock In */}
            {mode === 'in' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block mb-1">
                    Batch No
                  </label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] flex items-center gap-1 mb-1">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <span>Expiry Date</span>
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Confirm CTA */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500 dark:text-[#8FA69C]">New Stock:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {resultingStock} {product.unit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeQty <= 0}
                onClick={handleConfirm}
                className={`flex-1 min-h-[44px] rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform disabled:opacity-40 cursor-pointer ${
                  mode === 'in'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {mode === 'in' ? `Add +${safeQty} ${product.unit}` : `Remove −${safeQty} ${product.unit}`}
                </span>
              </button>

              {mode === 'in' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullStockIn(product);
                  }}
                  title="Open full Stock Inward with supplier & purchase pricing"
                  aria-label="Open full stock inward modal"
                  className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-emerald-700 dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>Full Inward</span>
                </button>
              )}
            </div>
          </div>

          {/* Admin Secondary Actions (Edit, Photo/URL, Delete) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onPreviewImage(product)}
              className="min-h-[44px] rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Photo/URL</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const msg =
                  language === 'mr'
                    ? `तुम्हाला "${displayName}" हटवायचे आहे का?`
                    : language === 'hi'
                    ? `क्या आप "${displayName}" को हटाना चाहते हैं?`
                    : `Delete "${displayName}"?`;
                if (window.confirm(msg)) {
                  onClose();
                  onDelete(product);
                }
              }}
              className="min-h-[44px] rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.97] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

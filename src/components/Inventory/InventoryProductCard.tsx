import React from 'react';
import { Plus, Minus, Pencil } from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../Common/ProductImage';

export interface InventoryCardItemProps {
  product: Product;
  displayName: string;
  sellingPrice: number;
  hasExpiringSoon: boolean;
  isFlashing: boolean;
  onOpenDetail: (product: Product, initialMode?: 'in' | 'out') => void;
  onPreviewImage: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
}

const getStockStatus = (product: Product): 'out' | 'low' | 'in' => {
  if (product.stock_quantity <= 0) return 'out';
  if (product.stock_quantity <= product.min_stock_alert) return 'low';
  return 'in';
};

const formatCompactUnit = (unit: string): string => {
  if (unit === 'Packet (500ml)') return '500ml';
  if (unit === 'Packet (1L)') return '1L Pkt';
  return unit;
};

/**
 * Compact Mobile-First Product Card (~195-210px tall on 360px 2-col grid)
 * - Fixed square white image showcase (object-contain, cached, hold-to-edit URL)
 * - Subtle corner status badge (In / Low / Out)
 * - Name (max 2 lines), muted category, prominent stock + selling rate
 * - Bottom 44x44 touch-target "+" Stock In (filled) and "−" Stock Out (outlined)
 * - Tap card to open full detail bottom sheet (batches, cost price, edit, delete, stepper)
 */
export const InventoryProductCard: React.FC<InventoryCardItemProps> = React.memo(
  ({
    product,
    displayName,
    sellingPrice,
    hasExpiringSoon,
    isFlashing,
    onOpenDetail,
    onPreviewImage,
    onEditProduct
  }) => {
    const { tr } = useLanguage();
    const status = getStockStatus(product);
    const isOut = status === 'out';
    const isLow = status === 'low';

    const statusBadgeClass = isOut
      ? 'bg-rose-600 text-white'
      : isLow
      ? 'bg-amber-500 text-slate-950'
      : 'bg-emerald-600 text-white';

    const statusDotLabel = isOut
      ? 'Out'
      : isLow
      ? 'Low'
      : 'In';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail(product);
          }
        }}
        className={`group relative bg-white dark:bg-[#131F1B] rounded-2xl p-2 border transition-all duration-200 ease-out motion-reduce:transition-none flex flex-col justify-between shadow-2xs hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isOut
            ? 'border-rose-200/90 dark:border-rose-900/50'
            : isLow
            ? 'border-amber-200/90 dark:border-amber-800/50'
            : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/70'
        }`}
      >
        {/* Top Section: One-Click Square White Image Box (POS Size) + Status Pill & Quick Edit Button */}
        <div>
          <div className="relative mb-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewImage(product);
              }}
              aria-label={`View or upload photo for ${displayName}`}
              title={'Click photo to view, crop, or upload'}
              className="relative w-full aspect-square rounded-2xl bg-white border border-slate-200/80 dark:border-[#24352F] hover:border-emerald-400/70 overflow-hidden flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            >
              <ProductImage
                src={product.image_url}
                alt={product.name}
                category={product.category}
                fill
                className="group-hover:scale-[1.03] transition-transform duration-200 motion-reduce:transition-none"
              />

              {hasExpiringSoon && (
                <span
                  className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white"
                  title="Expiring soon"
                  aria-label="Expiring soon"
                />
              )}
            </button>

            {/* Quick Edit Button + In/Low/Out Status Pill */}
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
              {onEditProduct && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProduct(product);
                  }}
                  aria-label={`Edit ${displayName}`}
                  title="Edit Product Details"
                  className="w-6 h-6 rounded-full bg-white/95 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/90 shadow-xs flex items-center justify-center active:scale-90 transition cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none tracking-tight shadow-2xs pointer-events-none ${statusBadgeClass}`}
              >
                {statusDotLabel}
              </span>
            </div>
          </div>

          {/* Name (14px semibold, max 2 lines) + Muted Category (11px) */}
          <h3 className="text-[13px] sm:text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug line-clamp-2 min-h-[2.1rem]">
            {displayName}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate leading-tight mt-0.5">
            {product.category}
          </p>
        </div>

        {/* Bottom Section: Stock Count + Rate & Action Buttons */}
        <div className="mt-1.5 space-y-1.5">
          <div
            className={`flex items-baseline justify-between gap-1 rounded-lg px-1 py-0.5 transition-colors duration-200 ${
              isFlashing ? 'bg-emerald-500/20' : ''
            }`}
          >
            <div className="min-w-0 truncate">
              <span
                className={`text-[18px] sm:text-[20px] font-bold tabular-nums leading-none ${
                  isOut
                    ? 'text-rose-600 dark:text-rose-400'
                    : isLow
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {product.stock_quantity}
              </span>
              <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                {formatCompactUnit(product.unit)}
              </span>
            </div>
            <span className="text-[13px] sm:text-[14px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
              ₹{sellingPrice}
            </span>
          </div>

          {/* 44x44 Min Touch Target Stock Out (−) on Left & Stock In (+) on Right */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={isOut}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(product, 'out');
              }}
              aria-label={`Stock out ${displayName}`}
              title="Stock Out (−)"
              className="min-h-[44px] rounded-xl bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.97] text-slate-700 dark:text-[#E7F0EC] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-300 dark:border-[#2C4139] flex items-center justify-center transition-transform duration-150 ease-out motion-reduce:transition-none disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(product, 'in');
              }}
              aria-label={`Stock in ${displayName}`}
              title="Stock In (+)"
              className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white flex items-center justify-center transition-transform duration-150 ease-out motion-reduce:transition-none shadow-2xs cursor-pointer"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

InventoryProductCard.displayName = 'InventoryProductCard';

/**
 * Compact Dense List Row (for users who toggle List view)
 */
export const InventoryListRow: React.FC<InventoryCardItemProps> = React.memo(
  ({
    product,
    displayName,
    sellingPrice,
    hasExpiringSoon,
    isFlashing,
    onOpenDetail,
    onPreviewImage,
    onEditProduct
  }) => {
    const status = getStockStatus(product);
    const isOut = status === 'out';
    const isLow = status === 'low';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenDetail(product);
          }
        }}
        className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white dark:bg-[#131F1B] border transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isFlashing
            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
            : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/60'
        }`}
      >
        {/* One-Click Square Thumbnail */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreviewImage(product);
          }}
          aria-label={`View or upload photo for ${displayName}`}
          className="relative w-14 h-14 shrink-0 aspect-square rounded-xl bg-white border border-slate-100 dark:border-[#24352F] hover:border-emerald-400/70 overflow-hidden cursor-pointer transition-colors"
        >
          <ProductImage
            src={product.image_url}
            alt={product.name}
            category={product.category}
            fill
          />
          <span
            className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white ${
              isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </button>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-slate-900 dark:text-[#E7F0EC] truncate">
              {displayName}
            </h3>
            {hasExpiringSoon && (
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Expiring soon" />
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
            {product.category}
          </p>
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span
              className={`text-[15px] font-bold tabular-nums ${
                isOut
                  ? 'text-rose-600 dark:text-rose-400'
                  : isLow
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {product.stock_quantity}{' '}
              <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                {formatCompactUnit(product.unit)}
              </span>
            </span>
            <span className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              ₹{sellingPrice}
            </span>
          </div>
        </div>

        {/* 44x44 Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onEditProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditProduct(product);
              }}
              aria-label={`Edit ${displayName}`}
              title="Edit Product Details"
              className="w-10 h-11 rounded-xl border border-slate-200 dark:border-[#2C4139] bg-slate-50 dark:bg-[#1A2A25] text-slate-600 dark:text-[#C4D6CE] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-[0.97] flex items-center justify-center transition cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            disabled={isOut}
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product, 'out');
            }}
            aria-label={`Stock out ${displayName}`}
            className="w-11 h-11 rounded-xl border border-slate-300 dark:border-[#2C4139] text-slate-700 dark:text-[#E7F0EC] hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-[0.97] flex items-center justify-center transition-transform duration-150 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            <Minus className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product, 'in');
            }}
            aria-label={`Stock in ${displayName}`}
            className="w-11 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white flex items-center justify-center transition-transform duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }
);

InventoryListRow.displayName = 'InventoryListRow';

/** Shimmer Skeleton Card for smooth loading transitions */
export const InventorySkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-2 border border-slate-200/80 dark:border-[#24352F] space-y-2 animate-pulse">
    <div className="w-full aspect-square rounded-2xl bg-slate-200 dark:bg-[#1A2A25]" />
    <div className="space-y-1.5">
      <div className="h-3.5 w-4/5 rounded bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-[#1A2A25]" />
    </div>
    <div className="flex items-center justify-between pt-1">
      <div className="h-5 w-14 rounded bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="h-4 w-10 rounded bg-slate-200 dark:bg-[#1A2A25]" />
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      <div className="h-11 rounded-xl bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="h-11 rounded-xl bg-slate-100 dark:bg-[#1A2A25]" />
    </div>
  </div>
);

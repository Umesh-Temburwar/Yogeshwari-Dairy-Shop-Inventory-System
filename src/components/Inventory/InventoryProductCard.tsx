import React from 'react';
import { Plus, Minus, Pencil, Eye, Clock } from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../Common/ProductImage';
import { HoldableImageBox } from '../Common/HoldableImageBox';

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
 * Standardized POS-Style Product Card for Stock & Inventory
 * - Identical visual architecture to POS `BillingCounter` cards:
 *   - Top row: Compact Unit badge (left) + Stock Status badge with colored dot (right)
 *   - Center: 1:1 Aspect-Square White Image Showcase (`HoldableImageBox` + hover scale + URL overlay)
 *   - Title: Bold 2-line clamped product title + muted category subtitle
 *   - Expiry alert warning pill if expiring soon
 *   - Bottom row: `Rate` bold price + purchase cost + Action row: Quick Edit pencil, Stock Out (−), and Stock In (+)
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
        className={`relative bg-white dark:bg-[#131F1B] rounded-2xl p-3 sm:p-3.5 border transition-all duration-150 flex flex-col justify-between group select-none shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isFlashing
            ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20'
            : isOut
            ? 'border-rose-200/90 dark:border-rose-900/50 opacity-80 bg-slate-50/50 dark:bg-[#16221E]'
            : isLow
            ? 'border-amber-200/90 dark:border-amber-800/50 hover:border-amber-500 shadow-2xs'
            : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:shadow-md'
        }`}
      >
        <div>
          {/* Top Badges: Unit Pill on Left, Stock Status Pill with colored dot on Right (POS DNA) */}
          <div className="flex items-start justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] uppercase truncate max-w-[85px]">
              {formatCompactUnit(product.unit)}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                isOut
                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                  : isLow
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
              <span>
                {isOut
                  ? 'Out of Stock'
                  : `${product.stock_quantity} in stock`}
              </span>
            </span>
          </div>

          {/* Standardized 1:1 Aspect-Square Product Image Showcase (POS DNA) */}
          <HoldableImageBox
            onHold={() => onPreviewImage(product)}
            title="Hold image to view & update URL"
            className="group/posimg relative w-full aspect-square flex justify-center items-center mb-2.5 bg-white rounded-2xl border border-slate-200/80 dark:border-[#24352F] overflow-hidden shadow-2xs cursor-pointer"
            onTap={(e) => {
              e.stopPropagation();
              onPreviewImage(product);
            }}
          >
            <ProductImage
              src={product.image_url}
              alt={product.name}
              category={product.category}
              fill
              className="group-hover/posimg:scale-[1.03] transition-transform duration-200"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreviewImage(product);
              }}
              title="Edit image URL"
              className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 hover:bg-emerald-700 text-white text-[9px] font-bold opacity-85 sm:opacity-0 sm:group-hover/posimg:opacity-100 transition-opacity cursor-pointer"
            >
              <Eye className="w-2.5 h-2.5" />
              <span>URL</span>
            </button>

            {hasExpiringSoon && (
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[10px] font-extrabold text-orange-700 dark:text-orange-400 bg-orange-50/95 dark:bg-orange-950/90 px-1.5 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/50 shadow-xs">
                <Clock className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="truncate">Exp. Soon</span>
              </div>
            )}
          </HoldableImageBox>

          {/* Product Title (2-line clamp, bold leading-snug) */}
          <div className="mb-1">
            <h4 className="font-extrabold text-slate-900 dark:text-[#E7F0EC] text-xs sm:text-sm leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 min-h-[2.2rem]">
              {displayName}
            </h4>
            {product.name !== displayName && (
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium truncate mt-0.5">
                {product.name}
              </p>
            )}
            <p className="text-[11px] text-slate-400 dark:text-[#6F877D] truncate mt-0.5 font-medium">
              {product.category}
            </p>
          </div>
        </div>

        {/* Bottom Row: Rate + Action Buttons (Stock Out − / Stock In + / Quick Edit Pencil) */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-1">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 dark:text-[#8FA69C] block leading-none font-semibold">
              Rate
            </span>
            <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 leading-tight">
              ₹{sellingPrice}
            </span>
            {product.purchase_price > 0 && (
              <span className="text-[9px] text-slate-400 dark:text-[#8FA69C] font-medium block leading-none truncate">
                Cost: ₹{product.purchase_price}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Edit Pencil */}
            {onEditProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProduct(product);
                }}
                title="Edit Product Details"
                aria-label={`Edit ${displayName}`}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] text-slate-700 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Stock Out Button (−) */}
            <button
              type="button"
              disabled={isOut}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(product, 'out');
              }}
              aria-label={`Stock out ${displayName}`}
              title="Stock Out (−)"
              className="w-8 h-8 rounded-xl bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-[#E7F0EC] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-[#2C4139] flex items-center justify-center transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* Stock In Button (+) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(product, 'in');
              }}
              aria-label={`Stock in ${displayName}`}
              title="Stock In (+)"
              className="h-8 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline">In</span>
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
        className={`flex items-center gap-2.5 p-2 sm:p-3 rounded-2xl bg-white dark:bg-[#131F1B] border transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs ${
          isFlashing
            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
            : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/60'
        }`}
      >
        {/* 1:1 Aspect-Square Thumbnail */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreviewImage(product);
          }}
          aria-label={`View or upload photo for ${displayName}`}
          className="relative w-14 h-14 shrink-0 aspect-square rounded-xl bg-white border border-slate-200/80 dark:border-[#24352F] hover:border-emerald-400/70 overflow-hidden cursor-pointer transition-colors"
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
            <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
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
              className={`text-[14px] sm:text-[15px] font-black tabular-nums ${
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
            <span className="text-[13px] sm:text-[14px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
              ₹{sellingPrice}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
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
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-[#2C4139] bg-slate-50 dark:bg-[#1A2A25] text-slate-600 dark:text-[#C4D6CE] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-95 flex items-center justify-center transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
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
            title="Stock Out (−)"
            className="w-9 h-9 rounded-xl border border-slate-300 dark:border-[#2C4139] text-slate-700 dark:text-[#E7F0EC] hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 flex items-center justify-center transition-transform duration-150 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(product, 'in');
            }}
            aria-label={`Stock in ${displayName}`}
            title="Stock In (+)"
            className="h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-transform duration-150 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">In</span>
          </button>
        </div>
      </div>
    );
  }
);

InventoryListRow.displayName = 'InventoryListRow';

/** Shimmer Skeleton Card for smooth loading transitions (POS 1:1 Aspect-Square DNA) */
export const InventorySkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-3 sm:p-3.5 border border-slate-200/80 dark:border-[#24352F] space-y-2.5 animate-pulse shadow-2xs">
    <div className="flex items-center justify-between">
      <div className="h-4 w-12 rounded bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="h-4 w-16 rounded bg-slate-200 dark:bg-[#1A2A25]" />
    </div>
    <div className="w-full aspect-square rounded-2xl bg-slate-200 dark:bg-[#1A2A25]" />
    <div className="space-y-1.5">
      <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-[#1A2A25]" />
    </div>
    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#24352F]">
      <div className="h-6 w-16 rounded bg-slate-200 dark:bg-[#1A2A25]" />
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#1A2A25]" />
        <div className="w-12 h-8 rounded-xl bg-slate-200 dark:bg-[#1A2A25]" />
      </div>
    </div>
  </div>
);

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Pencil, Trash2, MoreVertical, Layers } from 'lucide-react';
import { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../Common/ProductImage';
import { StatusBadge } from '../Common/UI';

export interface InventoryCardItemProps {
  product: Product;
  displayName: string;
  sellingPrice: number;
  hasExpiringSoon: boolean;
  isFlashing: boolean;
  onOpenDetail: (product: Product, initialMode?: 'in' | 'out') => void;
  onPreviewImage: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
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
 * Redesigned Mobile-First Inventory Product Card (2-Col Grid)
 * - Top row ABOVE image: status badge left, "⋮" menu button right (Edit, Adjust stock, Delete)
 * - Image: aspect-square object-contain p-3 with NO overlapping icons; clean letter placeholder if no image
 * - Below image: name (2-line clamp), category, stock (colored by status) + price (or "Set price" if ₹0)
 * - Bottom: compact stepper (- +) h-10
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
    onEditProduct,
    onDeleteProduct
  }) => {
    const { tr } = useLanguage();
    const status = getStockStatus(product);
    const isOut = status === 'out';
    const isLow = status === 'low';
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowMenu(false);
        }
      };
      if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showMenu]);

    const statusTone = isOut ? 'rose' : isLow ? 'amber' : 'emerald';
    const statusLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';

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
        className={`group relative bg-white dark:bg-[#131F1B] rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 ease-out flex flex-col justify-between shadow-2xs hover:shadow-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isFlashing
            ? 'ring-2 ring-emerald-500 bg-emerald-50/30'
            : isOut
            ? 'border-rose-200/90 dark:border-rose-900/50'
            : isLow
            ? 'border-amber-200/90 dark:border-amber-800/50'
            : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500/70'
        }`}
      >
        <div>
          {/* Top Row ABOVE Image: Stock Status Badge (Left) + "⋮" Menu Button (Right) */}
          <div className="flex items-center justify-between gap-1 mb-2">
            <StatusBadge
              label={statusLabel}
              tone={statusTone}
              size="sm"
            />

            {/* Menu Popover Container */}
            <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                aria-label={`Actions for ${displayName}`}
                title="More Actions"
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1E2E28] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Small Action Menu */}
              {showMenu && (
                <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-[#1A2A25] rounded-xl shadow-lg border border-slate-200 dark:border-[#2C4139] py-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {onEditProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEditProduct(product);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-[#20322B] text-slate-700 dark:text-[#E7F0EC] font-medium cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                      <span>Edit Product</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenDetail(product, 'in');
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-[#20322B] text-slate-700 dark:text-[#E7F0EC] font-medium cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Adjust Stock</span>
                  </button>
                  {onDeleteProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        if (window.confirm(`Delete "${displayName}"? This action cannot be undone.`)) {
                          onDeleteProduct(product);
                        }
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium cursor-pointer border-t border-slate-100 dark:border-[#24352F]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Square Image Box (object-contain p-3, NEVER crop, NO overlapping icons) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPreviewImage(product);
            }}
            title="Click photo to view or upload"
            className="relative w-full aspect-square rounded-xl bg-slate-50 dark:bg-[#16231E] border border-slate-200/80 dark:border-[#24352F] overflow-hidden flex items-center justify-center p-3 mb-2 cursor-pointer shadow-2xs group/img"
          >
            {product.image_url ? (
              <ProductImage
                src={product.image_url}
                alt={product.name}
                category={product.category}
                fill
                className={`object-contain transition-transform duration-200 ${
                  isOut ? 'grayscale opacity-60' : 'group-hover/img:scale-[1.03]'
                }`}
              />
            ) : (
              /* Clean Placeholder with first letter */
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xl flex items-center justify-center select-none shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            {hasExpiringSoon && (
              <span
                className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white"
                title="Expiring soon"
                aria-label="Expiring soon"
              />
            )}
          </div>

          {/* Name (2-line clamp) + Category in slate-500 */}
          <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#E7F0EC] leading-snug line-clamp-2 min-h-[2.1rem]">
            {displayName}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate leading-tight mt-0.5">
            {product.category}
          </p>
        </div>

        {/* Row: Stock on Left (bold, colored by status) and Price on Right */}
        <div className="mt-2 space-y-2">
          <div className="flex items-baseline justify-between gap-1 pt-1 border-t border-slate-100 dark:border-[#24352F]">
            <div className="min-w-0 truncate">
              <span
                className={`text-sm sm:text-base font-extrabold tabular-nums leading-none ${
                  isOut
                    ? 'text-rose-600 dark:text-rose-400'
                    : isLow
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {product.stock_quantity}
              </span>
              <span className="ml-1 text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                {formatCompactUnit(product.unit)}
              </span>
            </div>

            {/* Price or "Set price" badge if ₹0 */}
            {sellingPrice <= 0 ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEditProduct) onEditProduct(product);
                }}
                className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-bold cursor-pointer"
              >
                Set price
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                ₹{sellingPrice}
              </span>
            )}
          </div>

          {/* Bottom Compact Stepper (- +) h-10 */}
          <div className="grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isOut}
              onClick={() => onOpenDetail(product, 'out')}
              aria-label={`Stock out ${displayName}`}
              title="Stock Out (−)"
              className="h-10 rounded-xl bg-slate-100 dark:bg-[#1E2E28] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-[#E7F0EC] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200/80 dark:border-[#2A3E37] flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(product, 'in')}
              aria-label={`Stock in ${displayName}`}
              title="Stock In (+)"
              className="h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white flex items-center justify-center transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
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
    onEditProduct,
    onDeleteProduct
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
          {onDeleteProduct && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${displayName}"?`)) {
                  onDeleteProduct(product);
                }
              }}
              aria-label={`Delete ${displayName}`}
              title="Delete Product"
              className="w-10 h-11 rounded-xl border border-slate-200 dark:border-[#2C4139] bg-slate-50 dark:bg-[#1A2A25] text-slate-400 dark:text-[#8FA69C] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 hover:border-rose-300 active:scale-[0.97] flex items-center justify-center transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
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

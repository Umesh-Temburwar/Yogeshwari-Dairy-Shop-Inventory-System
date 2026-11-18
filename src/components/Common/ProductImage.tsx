import React, { useState, useEffect, useRef } from 'react';
import { Package, Milk, Coffee, Cookie } from 'lucide-react';

// Global in-memory caches across component mounts, tab switches & scroll virtualizations:
// - loadedUrls: once loaded once, renders instantaneously with zero shimmer flash
// - failedUrls: prevents repeated broken-URL retries on scroll
const loadedUrls = new Set<string>();
const failedUrls = new Set<string>();

/** Clear a URL from the broken-image cache after an admin updates or replaces it */
export const clearFailedImageUrl = (url?: string | null): void => {
  if (url) {
    failedUrls.delete(url.trim());
  }
};

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  loading?: 'lazy' | 'eager';
  /** Fill parent container cleanly (use inside aspect-square wrappers) */
  fill?: boolean;
}

const getProductInitial = (alt: string): string => {
  const cleaned = alt.trim();
  if (!cleaned) return 'P';
  const match = cleaned.match(/[A-Za-z0-9\u0900-\u097F]/);
  return (match ? match[0] : cleaned[0]).toUpperCase();
};

/**
 * Standardized Square Product Image Component with Zero-Reload In-Memory + SW Cache
 *
 * Features:
 * - Fixed 1:1 aspect-square white showcase box with object-contain + padding (never cropped/stretched)
 * - In-memory `loadedUrls` + `img.complete` check eliminates shimmer flashes on tab switch / re-mount
 * - Paired with persistent Cache-First Service Worker (`public/sw.js`) for instant disk-cached loads
 * - Native lazy loading + async decoding + skeleton shimmer on first load only
 * - onError / missing fallback: neutral icon + product initial on emerald-tinted background
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  category = '',
  size = 'md',
  loading = 'lazy',
  fill = false
}) => {
  const normalizedSrc = src?.trim() || '';
  const imgRef = useRef<HTMLImageElement | null>(null);

  const isPreFailed = Boolean(normalizedSrc && failedUrls.has(normalizedSrc));
  const isPreLoaded = Boolean(normalizedSrc && loadedUrls.has(normalizedSrc));

  const [hasError, setHasError] = useState<boolean>(isPreFailed);
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(normalizedSrc) && !isPreFailed && !isPreLoaded
  );

  // Sync state when src changes dynamically — never re-flash shimmer if already cached in memory or browser
  useEffect(() => {
    if (!normalizedSrc) {
      setHasError(false);
      setIsLoading(false);
      return;
    }
    if (failedUrls.has(normalizedSrc)) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    if (loadedUrls.has(normalizedSrc)) {
      setHasError(false);
      setIsLoading(false);
      return;
    }
    // Check if the browser / Service Worker disk cache already resolved the image synchronously
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      loadedUrls.add(normalizedSrc);
      setHasError(false);
      setIsLoading(false);
      return;
    }
    setHasError(false);
    setIsLoading(true);
  }, [normalizedSrc]);

  const sizeClasses = fill
    ? 'w-full h-full'
    : {
        xs: 'w-12 h-12 rounded-xl',
        sm: 'w-20 h-20 sm:w-24 sm:h-24 rounded-xl',
        md: 'w-28 h-28 sm:w-32 sm:h-32 rounded-2xl',
        lg: 'w-36 h-36 sm:w-44 sm:h-44 rounded-2xl',
        xl: 'w-48 h-48 sm:w-56 sm:h-56 rounded-3xl',
        '2xl': 'w-64 h-64 sm:w-80 sm:h-80 rounded-3xl'
      }[size];

  const isCompact = !fill && size === 'xs';
  const initial = getProductInitial(alt);

  const renderNeutralIcon = (): React.ReactNode => {
    const iconClass = isCompact
      ? 'w-3.5 h-3.5 text-emerald-700/80 dark:text-emerald-300/80'
      : 'w-6 h-6 sm:w-7 sm:h-7 text-emerald-700/75 dark:text-emerald-300/75';
    const cat = (category || '').toLowerCase();
    if (
      cat.includes('milk') ||
      cat.includes('दूध') ||
      cat.includes('dairy') ||
      cat.includes('डेअरी') ||
      cat.includes('paneer') ||
      cat.includes('ghee') ||
      cat.includes('dahi')
    ) {
      return <Milk className={iconClass} aria-hidden="true" />;
    }
    if (
      cat.includes('beverage') ||
      cat.includes('drink') ||
      cat.includes('juice') ||
      cat.includes('tea') ||
      cat.includes('coffee')
    ) {
      return <Coffee className={iconClass} aria-hidden="true" />;
    }
    if (
      cat.includes('snack') ||
      cat.includes('biscuit') ||
      cat.includes('wafer') ||
      cat.includes('cookie') ||
      cat.includes('namkeen')
    ) {
      return <Cookie className={iconClass} aria-hidden="true" />;
    }
    return <Package className={iconClass} aria-hidden="true" />;
  };

  if (!normalizedSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        title={alt}
        className={`flex flex-col items-center justify-center shrink-0 overflow-hidden select-none bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/50 ${
          fill ? 'w-full h-full gap-1.5 p-3' : `aspect-square shadow-2xs ${sizeClasses} ${isCompact ? 'gap-0' : 'gap-1 p-2'}`
        } ${className}`}
      >
        <div
          className={`flex items-center justify-center rounded-full bg-emerald-100/90 dark:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-700/50 ${
            isCompact ? 'w-7 h-7' : 'w-11 h-11 sm:w-12 sm:h-12'
          }`}
        >
          {renderNeutralIcon()}
        </div>
        {!isCompact && (
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-white/90 dark:bg-[#131F1B]/90 border border-emerald-200/90 dark:border-emerald-800/60 text-xs font-black tracking-tight text-emerald-800 dark:text-emerald-300 shadow-2xs">
            {initial}
          </span>
        )}
      </div>
    );
  }

  const paddingClass = fill ? 'p-2 sm:p-2.5' : size === 'xs' ? 'p-1' : 'p-2';

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center bg-white ${
        fill
          ? 'w-full h-full'
          : `aspect-square border border-slate-200/70 dark:border-[#24352F] shadow-2xs ${sizeClasses}`
      } ${className}`}
    >
      {isLoading && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 overflow-hidden bg-slate-100 dark:bg-slate-800/80"
        >
          <div className="w-full h-full animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800" />
        </div>
      )}
      <img
        ref={imgRef}
        src={normalizedSrc}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onLoad={() => {
          loadedUrls.add(normalizedSrc);
          failedUrls.delete(normalizedSrc);
          setIsLoading(false);
        }}
        onError={() => {
          failedUrls.add(normalizedSrc);
          loadedUrls.delete(normalizedSrc);
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-contain ${paddingClass} ${
          isPreLoaded ? '' : 'transition-opacity duration-200'
        } ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

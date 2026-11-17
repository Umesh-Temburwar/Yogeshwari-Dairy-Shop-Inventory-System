import React, { useState, useEffect } from 'react';
import { Package, Milk, Coffee, Cookie, Sparkles } from 'lucide-react';

// Global cache for broken/unreachable image URLs across component mounts and scroll virtualizations
const failedUrls = new Set<string>();

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  loading?: 'lazy' | 'eager';
  /** Fill parent container cleanly (use inside aspect-[4/3] or custom ratio wrappers) */
  fill?: boolean;
}

/**
 * Reusable, High-Performance Product Image Component
 * 
 * Features:
 * - Module-level failedUrls cache to prevent repeated 404 retries on scroll
 * - Neutral referrerPolicy="no-referrer" without crossOrigin to allow unblocked hotlinks
 * - Low fetch priority for background/grid images
 * - Native async decoding and responsive lazy loading
 * - Category-aware graceful SVG placeholders
 * - Zero layout shift (strict aspect-square or fill sizing)
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
  const isPreFailed = Boolean(src && failedUrls.has(src));
  const [hasError, setHasError] = useState(isPreFailed);
  const [isLoading, setIsLoading] = useState(Boolean(src) && !isPreFailed);

  // Sync state when src changes dynamically (e.g. after Supabase fetch or virtual list scroll)
  useEffect(() => {
    if (src && failedUrls.has(src)) {
      setHasError(true);
      setIsLoading(false);
    } else {
      setHasError(false);
      setIsLoading(Boolean(src));
    }
  }, [src]);

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

  const getCategoryFallback = () => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('milk') || cat.includes('दूध') || cat.includes('dairy') || cat.includes('डेअरी') || cat.includes('paneer') || cat.includes('ghee') || cat.includes('dahi')) {
      return {
        icon: <Milk className="w-1/2 h-1/2 text-emerald-600 dark:text-emerald-400" />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'
      };
    }
    if (cat.includes('beverage') || cat.includes('drink') || cat.includes('juice') || cat.includes('tea') || cat.includes('coffee')) {
      return {
        icon: <Coffee className="w-1/2 h-1/2 text-cyan-600 dark:text-cyan-400" />,
        bg: 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40'
      };
    }
    if (cat.includes('snack') || cat.includes('biscuit') || cat.includes('wafer') || cat.includes('cookie') || cat.includes('namkeen')) {
      return {
        icon: <Cookie className="w-1/2 h-1/2 text-amber-600 dark:text-amber-400" />,
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'
      };
    }
    return {
      icon: <Package className="w-1/2 h-1/2 text-slate-500 dark:text-slate-400" />,
      bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50'
    };
  };

  const fallback = getCategoryFallback();

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 overflow-hidden transition-all ${
          fill ? 'w-full h-full' : `aspect-square border shadow-2xs ${sizeClasses}`
        } ${fallback.bg} ${className}`}
        title={alt}
      >
        {fallback.icon}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center ${
        fill
          ? 'w-full h-full bg-white'
          : `aspect-square border border-slate-200/70 dark:border-slate-700/60 bg-white shadow-2xs ${sizeClasses}`
      } ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center z-10">
          <Sparkles className="w-4 h-4 text-slate-400 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        {...({ fetchPriority: loading === 'eager' ? 'high' : 'low' } as any)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          if (src) failedUrls.add(src);
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-contain ${fill ? 'p-1.5' : 'p-1'} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

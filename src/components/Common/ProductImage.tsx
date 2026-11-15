import React, { useState, useEffect } from 'react';
import { Package, Milk, Coffee, Cookie, Sparkles, AlertCircle } from 'lucide-react';

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  loading?: 'lazy' | 'eager';
}

/**
 * Reusable, High-Performance Product Image Component
 * 
 * Features:
 * - Generous, high-visibility sizing optimized for mobile & desktop POS
 * - Reactive state synchronization when src prop updates asynchronously
 * - Neutral referrerPolicy="no-referrer" to prevent third-party CDN hotlink blocking
 * - Lazy loading and async image decoding
 * - Seamless error fallback on 404, CORS, or broken URLs
 * - Category-aware graceful SVG placeholders
 * - Shimmer placeholder while loading
 * - No layout shift (consistent aspect-square)
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  category = '',
  size = 'md',
  loading = 'lazy'
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(src));

  // Sync state when src changes dynamically (e.g. after Supabase fetch or virtual list scroll)
  useEffect(() => {
    setHasError(false);
    setIsLoading(Boolean(src));
  }, [src]);

  const sizeClasses = {
    xs: 'w-10 h-10 rounded-xl',
    sm: 'w-16 h-16 sm:w-20 sm:h-20 rounded-xl',
    md: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl',
    lg: 'w-32 h-32 sm:w-40 sm:h-40 rounded-2xl',
    xl: 'w-44 h-44 sm:w-52 sm:h-52 rounded-3xl',
    '2xl': 'w-60 h-60 sm:w-72 sm:h-72 rounded-3xl'
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
        className={`flex items-center justify-center shrink-0 aspect-square border shadow-2xs overflow-hidden transition-all ${sizeClasses} ${fallback.bg} ${className}`}
        title={alt}
      >
        {fallback.icon}
      </div>
    );
  }

  return (
    <div className={`relative shrink-0 aspect-square overflow-hidden border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-center ${sizeClasses} ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center z-10">
          <Sparkles className="w-3.5 h-3.5 text-slate-400 animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={`w-full h-full object-contain p-0.5 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

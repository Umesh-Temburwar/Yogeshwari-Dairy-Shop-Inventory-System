import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div className={`relative overflow-hidden bg-slate-200/80 dark:bg-[#1A2A25] rounded-xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />
    </div>
  );
};

export const KpiCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
};

export const TableRowSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-[#24352F] gap-4">
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-6 w-20 rounded-lg" />
    </div>
  );
};

export const ViewFallbackSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-2 sm:p-4">
      {/* Banner Skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* KPI Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
        <KpiCardSkeleton />
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
        <Skeleton className="h-80 lg:col-span-1 rounded-2xl" />
      </div>
    </div>
  );
};


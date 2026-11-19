import React, { useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { TimeRangeFilter } from '../../types';

export const PeriodFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useStore();
  const pillRowRef = useRef<HTMLDivElement>(null);

  const options: Array<{ id: TimeRangeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' }
  ];

  // Auto-scroll active pill into view
  useEffect(() => {
    const container = pillRowRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [timeFilter]);

  return (
    <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 py-2 bg-[#f8fafc]/95 dark:bg-[#0B1210]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-[#1E2E28]">
      <div className="max-w-7xl mx-auto">
        <div
          ref={pillRowRef}
          role="tablist"
          aria-label="Time period filter"
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-0.5"
        >
          {options.map((opt) => {
            const isActive = timeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTimeFilter(opt.id)}
                className={`snap-center shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold border transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F] hover:border-emerald-600/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeRangeFilter } from '../../types';
import { Calendar } from 'lucide-react';

export const PeriodFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useStore();
  const { t } = useLanguage();

  const options: Array<{ id: TimeRangeFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'today', label: t('today') },
    { id: 'week', label: t('thisWeek') },
    { id: 'month', label: t('thisMonth') },
    { id: 'year', label: t('thisYear') }
  ];

  return (
    <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 py-1.5 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28]">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        <div className="hidden sm:flex items-center gap-1.5 text-slate-500 dark:text-[#8FA69C] text-[11px] font-bold uppercase tracking-wider shrink-0">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{t('timePeriodSelect')}</span>
        </div>

        <div className="relative flex-1 sm:flex-initial min-w-0">
          <div
            role="tablist"
            aria-label="Time period filter"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5"
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
                  className={`snap-start shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F] hover:border-emerald-500/50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-7 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent sm:hidden"
          />
        </div>
      </div>
    </div>
  );
};

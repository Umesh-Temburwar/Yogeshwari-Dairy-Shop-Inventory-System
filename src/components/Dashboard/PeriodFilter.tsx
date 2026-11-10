import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeRangeFilter } from '../../types';
import { Calendar } from 'lucide-react';

export const PeriodFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useStore();
  const { t } = useLanguage();

  const options: Array<{ id: TimeRangeFilter; key: string }> = [
    { id: 'today', key: 'today' },
    { id: 'week', key: 'thisWeek' },
    { id: 'month', key: 'thisMonth' },
    { id: 'year', key: 'thisYear' },
    { id: 'all', key: 'allTime' },
  ];

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md p-2 rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-xs transition-colors duration-150">
      <div className="hidden sm:flex items-center gap-2 px-2 text-slate-500 dark:text-[#8FA69C] text-xs font-semibold uppercase tracking-wider shrink-0">
        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>{t('timePeriodSelect')}</span>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
        {options.map((opt) => {
          const isActive = timeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTimeFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-[#E7F0EC] hover:bg-slate-200/60 dark:hover:bg-[#24352F]'
              }`}
            >
              {t(opt.key)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

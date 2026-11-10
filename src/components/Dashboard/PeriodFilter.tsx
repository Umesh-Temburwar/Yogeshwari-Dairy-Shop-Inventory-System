import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeRangeFilter } from '../../types';
import { Calendar } from 'lucide-react';

export const PeriodFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useStore();
  const { t, language } = useLanguage();

  const options: Array<{ id: TimeRangeFilter; key: string }> = [
    { id: 'today', key: 'today' },
    { id: 'week', key: 'thisWeek' },
    { id: 'month', key: 'thisMonth' },
    { id: 'year', key: 'thisYear' },
    { id: 'all', key: 'allTime' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-2 px-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
        <Calendar className="w-4 h-4 text-emerald-600" />
        <span>{t('timePeriodSelect')}</span>
      </div>

      <div className="flex items-center bg-slate-100 p-1 rounded-xl">
        {options.map((opt) => {
          const isActive = timeFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTimeFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
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

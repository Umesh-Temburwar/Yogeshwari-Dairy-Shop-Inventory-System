import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeRangeFilter } from '../../types';
import { Calendar } from 'lucide-react';
import { SegmentedControl } from '../ui';

export const PeriodFilter: React.FC = () => {
  const { timeFilter, setTimeFilter } = useStore();
  const { t } = useLanguage();

  const options: Array<{ value: TimeRangeFilter; label: string }> = [
    { value: 'today', label: t('today') },
    { value: 'week', label: t('thisWeek') },
    { value: 'month', label: t('thisMonth') },
    { value: 'year', label: t('thisYear') },
    { value: 'all', label: t('allTime') },
  ];

  return (
    <div className="flex items-center justify-between gap-3 bg-surface p-2 rounded-2xl border border-line shadow-card transition-colors">
      <div className="hidden sm:flex items-center gap-2 px-2 text-ink-3 text-xs font-medium uppercase tracking-wider shrink-0">
        <Calendar className="w-4 h-4 text-ink-3" />
        <span>{t('timePeriodSelect')}</span>
      </div>

      <div className="w-full sm:w-auto overflow-x-auto no-scrollbar">
        <SegmentedControl
          options={options}
          value={timeFilter}
          onChange={(val) => setTimeFilter(val as TimeRangeFilter)}
          size="sm"
        />
      </div>
    </div>
  );
};

export default PeriodFilter;

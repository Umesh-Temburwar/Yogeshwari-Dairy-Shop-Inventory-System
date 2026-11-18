import React from 'react';
import { History, Loader2 } from 'lucide-react';
import { useStore, HistoryEntity } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';

interface LoadOlderHistoryButtonProps {
  entity: HistoryEntity;
  className?: string;
}

export const LoadOlderHistoryButton: React.FC<LoadOlderHistoryButtonProps> = ({
  entity,
  className = ''
}) => {
  const { historyPagination, loadOlderHistory } = useStore();
  const { tr } = useLanguage();
  const meta = historyPagination[entity];

  if (!meta?.hasMore) return null;

  return (
    <div className={`flex justify-center pt-3 pb-1 ${className}`}>
      <button
        type="button"
        disabled={meta.isLoading}
        onClick={() => void loadOlderHistory(entity)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] hover:bg-emerald-50 dark:hover:bg-[#1A2A25] text-xs font-bold text-slate-700 dark:text-[#E7F0EC] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-60 cursor-pointer shadow-sm"
      >
        {meta.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        ) : (
          <History className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
        <span>
          {meta.isLoading
            ? tr('Loading older records...', 'पुराने रिकॉर्ड लोड हो रहे हैं...', 'जुने रेकॉर्ड लोड होत आहेत...')
            : tr(
                `Load Older Records (${meta.offset} loaded)`,
                `पुराने रिकॉर्ड लोड करें (${meta.offset} लोड)`,
                `जुने रेकॉर्ड लोड करा (${meta.offset} लोड)`
              )}
        </span>
      </button>
    </div>
  );
};

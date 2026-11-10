import React from 'react';
import { useStore } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { ShoppingCart, PlusCircle, BookOpen } from 'lucide-react';

interface MobileActionBarProps {
  onOpenAddProduct: () => void;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({ onOpenAddProduct }) => {
  const { setActiveView } = useStore();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden flex items-center justify-around gap-2 p-2 bg-white/95 dark:bg-[#131F1B]/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-xl">
      <button
        onClick={() => setActiveView('pos')}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm active:scale-95 transition"
      >
        <ShoppingCart className="w-4 h-4" />
        <span className="text-[10px] truncate">{t('openBillingCounter')}</span>
      </button>

      <button
        onClick={onOpenAddProduct}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] text-slate-800 dark:text-[#E7F0EC] font-semibold text-xs active:scale-95 transition border border-slate-200/60 dark:border-[#24352F]"
      >
        <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] truncate">{t('addNewMaal')}</span>
      </button>

      <button
        onClick={() => setActiveView('udhar')}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-50 dark:bg-[#1A2A25] hover:bg-amber-100 dark:hover:bg-[#223630] text-amber-900 dark:text-amber-300 font-semibold text-xs active:scale-95 transition border border-amber-200/60 dark:border-amber-500/30"
      >
        <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-[10px] truncate">{t('openKhata')}</span>
      </button>
    </div>
  );
};


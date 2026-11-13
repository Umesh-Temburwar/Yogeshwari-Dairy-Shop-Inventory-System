import React from 'react';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BookOpen, 
  Menu
} from 'lucide-react';

interface MobileActionBarProps {
  onOpenAddProduct?: () => void;
  onOpenMobileSidebar: () => void;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({ 
  onOpenMobileSidebar 
}) => {
  const { activeView, setActiveView, metrics } = useStore();
  const { language } = useLanguage();

  const tabs: Array<{
    id: AppView | 'menu';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAction?: boolean;
    badgeCount?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: language === 'mr' ? 'डॅशबोर्ड' : language === 'hi' ? 'डैशबोर्ड' : 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'inventory',
      label: language === 'mr' ? 'स्टॉक' : language === 'hi' ? 'स्टॉक' : 'Stock',
      icon: Package,
      badgeCount: metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'pos',
      label: language === 'mr' ? 'बिलिंग' : language === 'hi' ? 'बिलिंग' : 'POS',
      icon: ShoppingCart,
      isAction: true,
    },
    {
      id: 'udhar',
      label: language === 'mr' ? 'खातेवही' : language === 'hi' ? 'खाताबही' : 'Khata',
      icon: BookOpen,
    },
    {
      id: 'menu',
      label: language === 'mr' ? 'मेनू' : language === 'hi' ? 'मेनू' : 'Menu',
      icon: Menu,
      badgeCount: metrics.expiredBatchesCount > 0 ? metrics.expiredBatchesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0F1A17]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-[#24352F] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] pt-1 transition-colors"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-end h-[56px] px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          // Special Center Prominent POS Button
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView('pos')}
                className="flex flex-col items-center justify-end h-full relative -top-3 group focus:outline-none select-none active:scale-95 transition-transform"
                title={tab.label}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/35 ring-4 ring-white dark:ring-[#0F1A17]'
                    : 'bg-emerald-600 text-white shadow-emerald-600/25 ring-3 ring-white dark:ring-[#0F1A17] hover:bg-emerald-500'
                }`}>
                  <Icon className="w-6 h-6 shrink-0" />
                </div>
                <span className={`text-[10px] font-black mt-1 leading-none tracking-tight ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-600 dark:text-[#8FA69C]'
                }`}>
                  {tab.label}
                </span>
                <span className="w-1.5 h-1 mt-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 opacity-0" />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'menu') {
                  onOpenMobileSidebar();
                } else {
                  setActiveView(tab.id as AppView);
                }
              }}
              className={`flex flex-col items-center justify-end h-full py-1 relative select-none transition-all active:scale-95 focus:outline-none ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-6">
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110 stroke-[2.25]' : 'stroke-[1.75]'}`} />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className={`absolute -top-1 -right-2 min-w-[15px] h-3.5 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center shadow-xs pointer-events-none ${tab.badgeColor}`}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 leading-none tracking-tight truncate max-w-[58px] ${
                isActive ? 'font-black' : 'font-semibold'
              }`}>
                {tab.label}
              </span>
              <span className={`w-1.5 h-1 mt-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400 transition-opacity duration-150 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

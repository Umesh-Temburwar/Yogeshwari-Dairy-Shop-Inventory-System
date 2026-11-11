import React from 'react';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BookOpen, 
  Menu,
  AlertCircle
} from 'lucide-react';

interface MobileActionBarProps {
  onOpenAddProduct: () => void;
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
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0F1A17]/95 backdrop-blur-xl border-t border-slate-200 dark:border-[#24352F] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-1.5 transition-colors"
    >
      <div className="max-w-md mx-auto px-2 flex items-center justify-around">
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
                className="relative -top-3 flex flex-col items-center group focus:outline-none"
              >
                <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/30 ring-4 ring-white dark:ring-[#0F1A17]'
                    : 'bg-emerald-600 text-white shadow-emerald-600/25 ring-2 ring-white dark:ring-[#0F1A17] hover:bg-emerald-500'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[10px] font-black mt-1 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-[#8FA69C]'
                }`}>
                  {tab.label}
                </span>
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
              className={`flex-1 py-1 px-1 flex flex-col items-center justify-center relative transition-all active:scale-95 focus:outline-none ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs ${tab.badgeColor}`}>
                    {tab.badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none truncate max-w-[56px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

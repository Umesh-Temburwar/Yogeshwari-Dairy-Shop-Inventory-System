import React from 'react';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  House, 
  Package, 
  ShoppingCart, 
  BookOpen, 
  Grid2X2 
} from 'lucide-react';

interface MobileActionBarProps {
  onOpenAddProduct?: () => void;
  onOpenMobileSidebar: () => void;
  isMobileSidebarOpen?: boolean;
}

export const MobileActionBar: React.FC<MobileActionBarProps> = ({ 
  onOpenMobileSidebar,
  isMobileSidebarOpen = false,
}) => {
  const { activeView, setActiveView, metrics } = useStore();
  const { language } = useLanguage();

  const isTabActive = (tabId: string) => {
    if (tabId === 'dashboard') {
      return activeView === 'dashboard';
    }
    if (tabId === 'inventory') {
      return activeView === 'inventory' || activeView === 'expiry' || activeView === 'reorder';
    }
    if (tabId === 'pos') {
      return activeView === 'pos' || activeView === 'sales';
    }
    if (tabId === 'udhar') {
      return activeView === 'udhar';
    }
    if (tabId === 'menu') {
      return isMobileSidebarOpen || ['purchases', 'damages', 'expenses', 'analytics', 'returns'].includes(activeView);
    }
    return false;
  };

  const tabs: Array<{
    id: AppView | 'menu';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeCount?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: language === 'mr' ? 'होम' : language === 'hi' ? 'होम' : 'Home',
      icon: House,
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
      label: language === 'mr' ? 'POS बिलिंग' : language === 'hi' ? 'POS बिलिंग' : 'POS',
      icon: ShoppingCart,
    },
    {
      id: 'udhar',
      label: language === 'mr' ? 'खातेवही' : language === 'hi' ? 'खाताबही' : 'Khata',
      icon: BookOpen,
    },
    {
      id: 'menu',
      label: language === 'mr' ? 'मेनू' : language === 'hi' ? 'मेनू' : 'Menu',
      icon: Grid2X2,
      badgeCount: metrics.expiredBatchesCount > 0 ? metrics.expiredBatchesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/98 dark:bg-[#0F1A17]/98 border-t border-slate-200/90 dark:border-[#24352F] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] pt-1.5 transition-all duration-200 ${
        isMobileSidebarOpen ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-[58px] px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab.id);

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
              className="group relative flex flex-col items-center justify-center h-full py-1 px-0.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-xl transition-all duration-200 active:scale-95 motion-reduce:transition-none cursor-pointer"
              title={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Premium Icon Capsule with Subtle Active Background & Spring Lift */}
              <div 
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-200 ease-out motion-reduce:transition-none ${
                  isActive
                    ? 'w-11 h-8 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300/80 dark:border-emerald-700/80 shadow-2xs -translate-y-1 scale-105'
                    : 'w-10 h-8 text-slate-400 dark:text-[#8FA69C] hover:text-slate-700 dark:hover:text-slate-200 translate-y-0 scale-100 bg-transparent border border-transparent'
                }`}
              >
                <Icon 
                  className={`w-5 h-5 transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    isActive 
                      ? 'scale-110 stroke-[2.25] text-emerald-600 dark:text-emerald-400' 
                      : 'scale-100 stroke-[1.85]'
                  }`} 
                />

                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span 
                    className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center shadow-xs pointer-events-none transition-all duration-200 ${tab.badgeColor} ${
                      isActive ? 'ring-2 ring-white dark:ring-[#0F1A17] scale-105' : ''
                    }`}
                  >
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </span>
                )}
              </div>

              {/* Clean Readable Label */}
              <span 
                className={`text-[10px] leading-tight tracking-tight truncate max-w-[62px] transition-all duration-200 ease-out motion-reduce:transition-none mt-0.5 ${
                  isActive 
                    ? 'font-bold text-emerald-700 dark:text-emerald-400 -translate-y-0.5' 
                    : 'font-medium text-slate-500 dark:text-[#8FA69C] translate-y-0'
                }`}
              >
                {tab.label}
              </span>

              {/* Active Green Indicator Bar */}
              <span 
                className={`w-3 h-0.5 rounded-full transition-all duration-200 ease-out motion-reduce:transition-none mt-0.5 ${
                  isActive 
                    ? 'bg-emerald-600 dark:bg-emerald-400 opacity-100 scale-100' 
                    : 'bg-transparent opacity-0 scale-50'
                }`} 
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

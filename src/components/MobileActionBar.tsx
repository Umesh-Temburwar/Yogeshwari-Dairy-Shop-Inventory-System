import React from 'react';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Home, 
  Boxes, 
  ReceiptIndianRupee, 
  BookUser, 
  LayoutGrid
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
    isAction?: boolean;
    badgeCount?: number;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: language === 'mr' ? 'होम' : language === 'hi' ? 'होम' : 'Home',
      icon: Home,
    },
    {
      id: 'inventory',
      label: language === 'mr' ? 'स्टॉक' : language === 'hi' ? 'स्टॉक' : 'Stock',
      icon: Boxes,
      badgeCount: metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'pos',
      label: language === 'mr' ? 'POS बिलिंग' : language === 'hi' ? 'POS बिलिंग' : 'POS',
      icon: ReceiptIndianRupee,
      isAction: true,
    },
    {
      id: 'udhar',
      label: language === 'mr' ? 'खातेवही' : language === 'hi' ? 'खाताबही' : 'Khata',
      icon: BookUser,
    },
    {
      id: 'menu',
      label: language === 'mr' ? 'मेनू' : language === 'hi' ? 'मेनू' : 'Menu',
      icon: LayoutGrid,
      badgeCount: metrics.expiredBatchesCount > 0 ? metrics.expiredBatchesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#0F1A17]/95 backdrop-blur-xl border-t border-slate-200/90 dark:border-[#24352F] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] pt-1.5 transition-all duration-300 ${
        isMobileSidebarOpen ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-end h-[58px] px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab.id);

          // Center Prominent POS Button with Spring Lift-Up Animation & Rupee Receipt Icon
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView('pos')}
                className="flex flex-col items-center justify-end h-full relative group focus:outline-none select-none active:scale-95 transition-transform"
                title={tab.label}
              >
                {/* Floating Icon Box */}
                <div 
                  className={`rounded-2xl flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    isActive
                      ? '-translate-y-4 w-12 h-12 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-xl shadow-emerald-600/40 ring-4 ring-white dark:ring-[#0F1A17] scale-110'
                      : '-translate-y-2 w-11 h-11 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-3 ring-white dark:ring-[#0F1A17] hover:bg-emerald-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.25]' : 'stroke-[2]'}`} />
                </div>

                {/* Animated Label */}
                <span 
                  className={`text-[10px] leading-none tracking-tight transition-all duration-300 truncate max-w-[62px] ${
                    isActive 
                      ? '-translate-y-2 text-emerald-700 dark:text-emerald-400 font-black scale-105' 
                      : '-translate-y-0.5 text-slate-600 dark:text-[#8FA69C] font-bold'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Active Indicator Dot */}
                <span 
                  className={`w-2 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300 ${
                    isActive ? 'opacity-100 -translate-y-1 scale-100' : 'opacity-0 scale-50'
                  }`} 
                />
              </button>
            );
          }

          // Standard Mobile Nav Tabs (Home, Stock, Khata, Menu) with Smooth Upward Floating Spring Animation
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
              className="flex flex-col items-center justify-end h-full py-1 relative select-none focus:outline-none active:scale-95 transition-transform"
              title={tab.label}
            >
              {/* Animated Floating Elevated Icon Pod */}
              <div 
                className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isActive
                    ? '-translate-y-3 w-11 h-11 bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white shadow-lg shadow-emerald-600/35 ring-4 ring-white dark:ring-[#0F1A17] scale-105'
                    : 'translate-y-0 w-8 h-8 text-slate-500 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon 
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isActive ? 'scale-110 stroke-[2.25]' : 'scale-100 stroke-[1.75]'
                  }`} 
                />

                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span 
                    className={`absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[8.5px] font-black flex items-center justify-center shadow-xs pointer-events-none ${tab.badgeColor} ${
                      isActive ? 'ring-2 ring-white dark:ring-[#0F1A17]' : ''
                    }`}
                  >
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </span>
                )}
              </div>

              {/* Animated Label */}
              <span 
                className={`text-[10px] leading-none tracking-tight truncate max-w-[58px] transition-all duration-300 ${
                  isActive 
                    ? '-translate-y-1.5 font-black text-emerald-700 dark:text-emerald-400 scale-105' 
                    : 'translate-y-0 font-semibold text-slate-500 dark:text-[#8FA69C]'
                }`}
              >
                {tab.label}
              </span>

              {/* Animated Active Indicator Pill */}
              <span 
                className={`w-2 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 transition-all duration-300 ${
                  isActive 
                    ? 'opacity-100 -translate-y-0.5 scale-100' 
                    : 'opacity-0 translate-y-1 scale-0'
                }`} 
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

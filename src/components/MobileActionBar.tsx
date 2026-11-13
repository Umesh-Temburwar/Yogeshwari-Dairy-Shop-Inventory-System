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
    badgeType?: 'danger' | 'warn';
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
      badgeType: 'warn',
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
      badgeType: 'danger',
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface/90 backdrop-blur-xl border-t border-line shadow-card pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] pt-1 transition-colors select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-end h-[56px] px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          // Flat Monochrome Center Hero POS Button (No glowing ring, no gradients)
          if (tab.isAction) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView('pos')}
                className="flex flex-col items-center justify-end h-full relative -top-2 focus:outline-none select-none active:scale-95 transition-transform"
                title={tab.label}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-card ${
                  isActive
                    ? 'bg-accent text-accent-fg ring-2 ring-line'
                    : 'bg-surface-2 text-ink hover:bg-line border border-line'
                }`}>
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className={`text-[10px] font-semibold mt-1 leading-none tracking-tight ${
                  isActive ? 'text-ink font-bold' : 'text-ink-3'
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
              className={`flex flex-col items-center justify-end h-full py-1 relative select-none transition-all active:scale-95 focus:outline-none ${
                isActive ? 'text-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <div className="relative flex items-center justify-center w-7 h-6">
                <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'stroke-[2.25] text-ink' : 'stroke-[1.75]'}`} />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className={`absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 rounded-full text-[9px] font-semibold flex items-center justify-center ${
                    tab.badgeType === 'danger' ? 'bg-danger text-white' : 'bg-warn text-white'
                  }`}>
                    {tab.badgeCount > 99 ? '99+' : tab.badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 leading-none tracking-tight truncate max-w-[58px] ${
                isActive ? 'font-semibold text-ink' : 'font-medium text-ink-3'
              }`}>
                {tab.label}
              </span>
              <span className={`w-1 h-1 mt-0.5 rounded-full bg-ink transition-opacity duration-150 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`} />
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileActionBar;

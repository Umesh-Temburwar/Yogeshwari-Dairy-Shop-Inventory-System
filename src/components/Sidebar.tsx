import React from 'react';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  AlertCircle, 
  ReceiptIndianRupee, 
  Truck, 
  PackageX, 
  BookOpen, 
  Fuel, 
  TrendingUp, 
  Sparkles,
  X
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  section: 'main' | 'inventory' | 'accounts';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { activeView, setActiveView, metrics, products } = useStore();
  const { t, language } = useLanguage();

  const navItems: NavItem[] = [
    // Section 1: Main / Operations
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      icon: LayoutDashboard,
      section: 'main'
    },
    {
      id: 'pos',
      labelKey: 'quickPos',
      icon: ShoppingCart,
      badge: 'F2',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold',
      section: 'main'
    },
    {
      id: 'sales',
      labelKey: 'dailySalesNav',
      icon: ReceiptIndianRupee,
      section: 'main'
    },

    // Section 2: Inventory & Supply
    {
      id: 'inventory',
      labelKey: 'inventoryNav',
      icon: Package,
      badge: products.length,
      badgeColor: 'bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] font-semibold',
      section: 'inventory'
    },
    {
      id: 'reorder',
      labelKey: 'stockNeedNav',
      icon: AlertCircle,
      badge: metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined,
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold',
      section: 'inventory'
    },
    {
      id: 'purchases',
      labelKey: 'purchasesNav',
      icon: Truck,
      section: 'inventory'
    },
    {
      id: 'damages',
      labelKey: 'damagesNav',
      icon: PackageX,
      badge: metrics.totalDamagesLoss > 0 ? `₹${metrics.totalDamagesLoss}` : undefined,
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
      section: 'inventory'
    },

    // Section 3: Accounts & Reports
    {
      id: 'udhar',
      labelKey: 'udharNav',
      icon: BookOpen,
      badge: metrics.totalOutstandingUdhar > 0 ? `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}` : undefined,
      badgeColor: 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 font-bold',
      section: 'accounts'
    },
    {
      id: 'expenses',
      labelKey: 'expensesNav',
      icon: Fuel,
      section: 'accounts'
    },
    {
      id: 'analytics',
      labelKey: 'analyticsNav',
      icon: TrendingUp,
      section: 'accounts'
    }
  ];

  const renderSection = (sectionKey: 'main' | 'inventory' | 'accounts', titleKey: string) => {
    const items = navItems.filter(item => item.section === sectionKey);
    return (
      <div key={sectionKey} className="space-y-1 mb-3">
        {!isCollapsed && (
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-[#8FA69C]">
            {t(titleKey)}
          </div>
        )}
        {isCollapsed && <div className="h-px bg-slate-200 dark:bg-[#24352F] my-2 mx-2" />}

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const label = t(item.labelKey);

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                onCloseMobile();
              }}
              title={label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-left transition-all duration-150 group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold' 
                  : 'text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#1A2A25] hover:text-slate-900 dark:hover:text-[#E7F0EC] font-medium'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'} flex-1`}>
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-500 dark:text-[#8FA69C] group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                }`} />
                
                {!isCollapsed && (
                  <span className="text-sm truncate leading-tight font-medium">
                    {label}
                  </span>
                )}
              </div>

              {!isCollapsed && item.badge !== undefined && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ml-2 font-medium ${
                  isActive ? 'bg-white/20 text-white' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container: w-[264px] or w-[72px] on desktop, fixed drawer on mobile */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 lg:static flex flex-col justify-between bg-white dark:bg-[#0F1A17] border-r border-slate-200 dark:border-[#24352F] shrink-0 h-full overflow-hidden transition-all duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-[264px] shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[264px]'}`}
      >
        {/* Mobile Header Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-[#24352F] lg:hidden">
          <span className="font-extrabold text-sm text-slate-900 dark:text-[#E7F0EC]">
            {t('shopName')}
          </span>
          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          {renderSection('main', 'navSectionMain')}
          {renderSection('inventory', 'navSectionInventory')}
          {renderSection('accounts', 'navSectionAccounts')}
        </div>

        {/* Pinned "Daily Business Summary" Card at Bottom */}
        <div className="p-3 border-t border-slate-100 dark:border-[#24352F] mt-auto">
          {!isCollapsed ? (
            <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-[#131F1B] dark:to-[#1A2A25] border border-emerald-200/60 dark:border-[#24352F] rounded-xl shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{t('dailySummaryTitle')}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#8FA69C] mb-1">
                <span className="truncate">{t('todayNetProfit')}</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                  ₹{metrics.netProfit.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-[#8FA69C]">
                <span className="truncate">{t('totalDueCredit')}</span>
                <span className="font-extrabold text-amber-700 dark:text-amber-400 tabular-nums shrink-0">
                  ₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ) : (
            <div 
              title={`${t('todayNetProfit')} ₹${metrics.netProfit.toLocaleString('en-IN')}`}
              className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 dark:bg-[#1A2A25] text-emerald-600 dark:text-emerald-400 flex items-center justify-center cursor-pointer border border-emerald-200/60 dark:border-[#24352F]"
            >
              <Sparkles className="w-5 h-5" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

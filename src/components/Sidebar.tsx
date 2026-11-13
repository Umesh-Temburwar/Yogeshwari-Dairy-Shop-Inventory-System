import React from 'react';
import ydoLogo from '../assets/YDO_logo.jpg';
import { useStore, AppView } from '../context/StoreContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  AlertCircle, 
  ReceiptIndianRupee, 
  Truck, 
  PackageX, 
  RotateCcw,
  BookOpen, 
  Fuel, 
  TrendingUp, 
  ShieldAlert,
  X,
  Smartphone,
} from 'lucide-react';
import { Kbd } from './ui';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAppDownload?: () => void;
}

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeType?: 'neutral' | 'danger' | 'warn' | 'ok';
  shortcut?: string;
  section: 'main' | 'inventory' | 'accounts';
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onOpenAppDownload,
}) => {
  const { activeView, setActiveView, metrics, products } = useStore();
  const { t, language } = useLanguage();
  const { user, role } = useAuth();

  const currentUserName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil Sakhare'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh Sakhare'
      : (user?.user_metadata?.full_name || 'Nikhil Sakhare');

  const navItems: NavItem[] = [
    // Main Section
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
      shortcut: 'F2',
      section: 'main'
    },
    {
      id: 'sales',
      labelKey: 'dailySalesNav',
      icon: ReceiptIndianRupee,
      section: 'main'
    },

    // Inventory Section
    {
      id: 'inventory',
      labelKey: 'inventoryNav',
      icon: Package,
      badge: products.length,
      badgeType: 'neutral',
      section: 'inventory'
    },
    {
      id: 'expiry',
      labelKey: 'expiryNav',
      icon: ShieldAlert,
      badge: metrics.expiredBatchesCount > 0 
        ? metrics.expiredBatchesCount 
        : metrics.expiringTodayBatchesCount > 0 
        ? metrics.expiringTodayBatchesCount 
        : undefined,
      badgeType: metrics.expiredBatchesCount > 0 ? 'danger' : 'warn',
      section: 'inventory'
    },
    {
      id: 'reorder',
      labelKey: 'stockNeedNav',
      icon: AlertCircle,
      badge: metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined,
      badgeType: 'warn',
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
      badgeType: 'danger',
      section: 'inventory'
    },
    {
      id: 'returns',
      labelKey: 'returnsNav',
      icon: RotateCcw,
      badge: (metrics.totalReturnsCount + (metrics.totalSupplierReturnsCount || 0)) > 0 
        ? (metrics.totalReturnsCount + (metrics.totalSupplierReturnsCount || 0)) 
        : undefined,
      badgeType: 'neutral',
      section: 'inventory'
    },

    // Accounts Section
    {
      id: 'udhar',
      labelKey: 'udharNav',
      icon: BookOpen,
      badge: metrics.totalOutstandingUdhar > 0 ? `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}` : undefined,
      badgeType: 'warn',
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
      <div key={sectionKey} className="space-y-0.5 mb-2">
        {!isCollapsed && (
          <div className="px-3 pt-4 pb-1.5 text-[11px] font-medium tracking-wider uppercase text-ink-3">
            {t(titleKey)}
          </div>
        )}
        {isCollapsed && <div className="h-px bg-line/60 my-2 mx-2" />}

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
              className={`w-full flex items-center ${isCollapsed ? 'justify-center h-9 px-0' : 'justify-between h-9 px-3'} rounded-lg text-left transition-all duration-150 select-none ${
                isActive 
                  ? 'bg-surface shadow-card text-ink font-semibold border border-line/40' 
                  : 'text-ink-2 hover:bg-surface-2 hover:text-ink font-medium'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 min-w-0'} flex-1`}>
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-ink' : 'text-ink-3'
                }`} />
                
                {!isCollapsed && (
                  <span className="text-sm truncate leading-tight">
                    {label}
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {item.shortcut && <Kbd>{item.shortcut}</Kbd>}
                  {item.badge !== undefined && (
                    <span className={`text-[11px] tabular-nums font-medium ${
                      item.badgeType === 'danger'
                        ? 'text-danger'
                        : item.badgeType === 'warn'
                        ? 'text-warn'
                        : 'text-ink-3'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <aside
      className={`h-full flex flex-col justify-between bg-bg border-r border-line p-3 transition-all duration-200 select-none ${
        isCollapsed ? 'w-[68px]' : 'w-[248px]'
      }`}
    >
      {/* Navigation Links Scrollable Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
        {renderSection('main', 'operationsSection')}
        {renderSection('inventory', 'inventorySection')}
        {renderSection('accounts', 'accountsSection')}
      </div>

      {/* Footer Area */}
      <div className="pt-3 border-t border-line/60 space-y-2 shrink-0">
        {!isCollapsed && onOpenAppDownload && (
          <button
            type="button"
            onClick={onOpenAppDownload}
            className="w-full h-8 px-2.5 rounded-lg bg-surface text-ink hover:bg-surface-2 border border-line/60 text-xs font-medium flex items-center justify-between transition shadow-card"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Smartphone className="w-3.5 h-3.5 text-ink-3" />
              <span className="truncate">{language === 'mr' ? 'मोबाईल ॲप' : language === 'hi' ? 'मोबाइल ऐप' : 'Mobile App'}</span>
            </span>
            <span className="text-[10px] text-ink-3">PWA</span>
          </button>
        )}

        {/* Compact Daily Business Summary */}
        {!isCollapsed && (
          <div className="p-2.5 rounded-xl bg-surface border border-line/50 shadow-card space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-3 font-medium">{language === 'mr' ? 'नफा' : 'Net Profit'}</span>
              <span className="tabular-nums font-semibold text-ok">
                ₹{metrics.todayNetProfit.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-ink-3 font-medium">{language === 'mr' ? 'उधारी बाकी' : 'Udhar Due'}</span>
              <span className="tabular-nums font-semibold text-warn">
                ₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        )}

        {/* User Card */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'gap-2.5 p-2'} rounded-xl bg-surface-2 border border-line/30`}>
          <div className="w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center text-xs shrink-0 shadow-card">
            {role === 'Owner' ? '👑' : '🛡️'}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 truncate">
              <p className="text-xs font-semibold text-ink leading-tight truncate">
                {currentUserName}
              </p>
              <p className="text-[10px] text-ink-3 leading-tight truncate">
                {role === 'Owner' ? 'Shop Owner' : 'Admin'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar (Permanent Rail) */}
      <div className="hidden lg:block h-[calc(100dvh-3.5rem)] sticky top-14 shrink-0 z-20">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile} 
          />
          <div className="relative w-[260px] max-w-[80vw] h-full bg-bg z-10 shadow-pop flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-surface p-0.5 shadow-card border border-line flex items-center justify-center shrink-0">
                  <img src={ydoLogo} alt="Logo" className="w-full h-full rounded-full object-cover" />
                </div>
                <span className="text-sm font-semibold text-ink">{t('shopName')}</span>
              </div>
              <button 
                type="button" 
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 grid place-items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;

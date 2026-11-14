import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { drawerLeftVariants, overlayVariants } from '../lib/motion';
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
  Sparkles,
  ShieldAlert,
  X,
  Smartphone,
  Download
} from 'lucide-react';

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
  badgeColor?: string;
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
      id: 'expiry',
      labelKey: 'expiryNav',
      icon: ShieldAlert,
      badge: metrics.expiredBatchesCount > 0 
        ? `${metrics.expiredBatchesCount} ⚠️` 
        : metrics.expiringTodayBatchesCount > 0 
        ? `${metrics.expiringTodayBatchesCount} ${language === 'en' ? 'Today' : 'आज'}` 
        : undefined,
      badgeColor: metrics.expiredBatchesCount > 0
        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-extrabold animate-pulse'
        : 'bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-extrabold',
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
    {
      id: 'returns',
      labelKey: 'returnsNav',
      icon: RotateCcw,
      badge: metrics.pendingSupplierRefundAmount > 0 
        ? `₹${metrics.pendingSupplierRefundAmount.toFixed(0)} ⏳` 
        : (metrics.totalReturnsCount + (metrics.totalSupplierReturnsCount || 0)) > 0 
        ? (metrics.totalReturnsCount + (metrics.totalSupplierReturnsCount || 0)) 
        : undefined,
      badgeColor: metrics.pendingSupplierRefundAmount > 0 
        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-extrabold animate-pulse'
        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold',
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
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-left transition-all duration-150 group tap-press ${
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

  const renderSidebarInner = (isMobileDrawer = false) => {
    const isActuallyCollapsed = isMobileDrawer ? false : isCollapsed;
    return (
      <>
        {/* Mobile Header Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-[#24352F] lg:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white p-0.5 shadow-xs border-2 border-emerald-500/40 shrink-0 overflow-hidden flex items-center justify-center">
              <img 
                src={ydoLogo} 
                alt="Logo" 
                className="w-full h-full rounded-full object-cover scale-105"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/YDO_logo.png')) {
                    target.src = '/YDO_logo.png';
                  }
                }}
              />
            </div>
            <span className="font-extrabold text-sm text-slate-900 dark:text-[#E7F0EC] truncate">
              {t('shopName')}
            </span>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25] tap-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
          {renderSection('main', 'navSectionMain')}
          {renderSection('inventory', 'navSectionInventory')}
          {renderSection('accounts', 'navSectionAccounts')}
          {onOpenAppDownload && (
            <div className="pt-3 px-1">
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenAppDownload();
                }}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs transition shadow-2xs tap-press ${isActuallyCollapsed ? "justify-center" : "justify-between"}`}
                title={language === 'mr' ? 'मोबाईल ॲप इन्स्टॉल करा' : language === 'hi' ? 'मोबाइल ऐप इंस्टॉल करें' : 'Install Mobile App'}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {!isActuallyCollapsed && (
                    <span className="truncate">
                      {language === 'mr' ? 'मोबाईल ॲप इन्स्टॉल' : language === 'hi' ? 'मोबाइल ऐप इंस्टॉल' : 'Install App'}
                    </span>
                  )}
                </div>
                {!isActuallyCollapsed && (
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Pinned "Daily Business Summary" Card at Bottom */}
        <div className="p-3 border-t border-slate-100 dark:border-[#24352F] mt-auto">
          {!isActuallyCollapsed ? (
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
              className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 dark:bg-[#1A2A25] text-emerald-600 dark:text-emerald-400 flex items-center justify-center cursor-pointer border border-emerald-200/60 dark:border-[#24352F] tap-press"
            >
              <Sparkles className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Pinned User Profile at the Very Last of Menu */}
        <div className="p-3 pt-0 pb-3">
          {!isActuallyCollapsed ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${role === "Owner" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                  {role === 'Owner' ? '👑' : '🛡️'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
                    {currentUserName}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-[#8FA69C] truncate leading-tight mt-0.5">
                    {role === 'Owner' ? 'Shop Owner' : 'Counter 1 (Admin)'}
                  </p>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" title="Online" />
            </div>
          ) : (
            <div 
              title={currentUserName}
              className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-black border border-slate-200/80 dark:border-[#24352F] ${role === "Owner" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"}`}
            >
              {role === 'Owner' ? '👑' : '🛡️'}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay with AnimatePresence */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onCloseMobile}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop Static / Collapsible Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col justify-between bg-white dark:bg-[#0F1A17] border-r border-slate-200 dark:border-[#24352F] shrink-0 h-full overflow-hidden transition-[width] duration-200 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {renderSidebarInner(false)}
      </aside>

      {/* Mobile Animated Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            variants={drawerLeftVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-y-0 left-0 z-50 flex flex-col justify-between bg-white dark:bg-[#0F1A17] border-r border-slate-200 dark:border-[#24352F] w-[264px] h-full shadow-2xl overflow-hidden lg:hidden"
          >
            {renderSidebarInner(true)}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

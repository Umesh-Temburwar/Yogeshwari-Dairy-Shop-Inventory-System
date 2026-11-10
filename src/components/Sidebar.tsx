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
  Sparkles 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView, metrics, products } = useStore();
  const { t, language } = useLanguage();

  const navItems: Array<{
    id: AppView;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
  }> = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      sublabel: t('dashboardSub'),
      icon: LayoutDashboard,
    },
    {
      id: 'pos',
      label: t('quickPos'),
      sublabel: t('quickPosSub'),
      icon: ShoppingCart,
      badge: 'F2',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'sales',
      label: t('dailySalesNav'),
      sublabel: t('dailySalesSub'),
      icon: ReceiptIndianRupee,
    },
    {
      id: 'inventory',
      label: t('inventoryNav'),
      sublabel: t('inventorySub'),
      icon: Package,
      badge: products.length,
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'reorder',
      label: t('stockNeedNav'),
      sublabel: t('stockNeedSub'),
      icon: AlertCircle,
      badge: metrics.lowStockCount > 0 ? `${metrics.lowStockCount} ${language === 'mr' ? 'कमी' : language === 'hi' ? 'कम' : 'Low'}` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 font-bold'
    },
    {
      id: 'purchases',
      label: t('purchasesNav'),
      sublabel: t('purchasesSub'),
      icon: Truck,
    },
    {
      id: 'damages',
      label: t('damagesNav'),
      sublabel: t('damagesSub'),
      icon: PackageX,
      badge: metrics.totalDamagesLoss > 0 ? `₹${metrics.totalDamagesLoss}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'udhar',
      label: t('udharNav'),
      sublabel: t('udharSub'),
      icon: BookOpen,
      badge: metrics.totalOutstandingUdhar > 0 ? `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800 font-bold'
    },
    {
      id: 'expenses',
      label: t('expensesNav'),
      sublabel: t('expensesSub'),
      icon: Fuel,
    },
    {
      id: 'analytics',
      label: t('analyticsNav'),
      sublabel: t('analyticsSub'),
      icon: TrendingUp,
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
          {language === 'mr' ? 'डेअरी व्यवस्थापन' : language === 'hi' ? 'डेरी मैनेजमेंट' : 'Shop Management'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold' 
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-600'
                }`} />
                <div className="truncate">
                  <div className="text-sm truncate leading-tight">{item.label}</div>
                  <div className={`text-[11px] leading-tight truncate ${
                    isActive ? 'text-emerald-100' : 'text-slate-500'
                  }`}>
                    {item.sublabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium ${
                  isActive ? 'bg-white/20 text-white' : item.badgeColor
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Summary Pill at Bottom */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {language === 'mr' ? 'दैनिक व्यवसाय गोषवारा' : language === 'hi' ? 'दैनिक व्यापार सारांश' : 'Daily Business Summary'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-600 mt-2">
            <span>{language === 'mr' ? 'आजचा निव्वळ नफा:' : language === 'hi' ? 'आज का शुद्ध लाभ:' : 'Today Net Profit:'}</span>
            <span className="font-bold text-emerald-700">₹{metrics.netProfit.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-600 mt-1">
            <span>{language === 'mr' ? 'एकूण उधारी बाकी:' : language === 'hi' ? 'कुल उधारी बाकी:' : 'Total Due Credit:'}</span>
            <span className="font-bold text-amber-700">₹{metrics.totalOutstandingUdhar.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

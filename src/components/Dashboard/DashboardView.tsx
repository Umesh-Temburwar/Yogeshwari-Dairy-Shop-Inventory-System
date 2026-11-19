import React, { Suspense } from 'react';
import { PeriodFilter } from './PeriodFilter';
import { MetricsOverview } from './MetricsOverview';
import { Skeleton } from '../ui/Skeleton';
import { BestSellersWidget } from './BestSellersWidget';
import { OwnerAdminCounterWidget } from './OwnerAdminCounterWidget';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingCart, 
  Truck, 
  Plus, 
  BookOpen 
} from 'lucide-react';

const SalesProfitChart = React.lazy(() =>
  import('./SalesProfitChart').then((m) => ({ default: m.SalesProfitChart }))
);
const PaymentBreakdownChart = React.lazy(() =>
  import('./PaymentBreakdownChart').then((m) => ({ default: m.PaymentBreakdownChart }))
);

interface DashboardViewProps {
  onOpenAddProduct: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenAddProduct }) => {
  const { setActiveView } = useStore();
  const { user, role } = useAuth();

  const { greeting, formattedDate } = React.useMemo(() => {
    const hour = new Date().getHours();
    const g = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const d = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return { greeting: g, formattedDate: d };
  }, []);

  const userName = 
    role === 'Owner' || user?.email?.toLowerCase().includes('yogeshwari')
      ? 'Nikhil'
      : role === 'Admin' || user?.email?.toLowerCase().includes('nilu')
      ? 'Nilesh'
      : (user?.user_metadata?.full_name?.split(' ')[0] || 'Nikhil');

  const quickActions = [
    {
      id: 'new-sale',
      label: 'New Sale (POS)',
      icon: ShoppingCart,
      isPrimary: true,
      action: () => setActiveView('pos')
    },
    {
      id: 'add-stock',
      label: 'Add Stock',
      icon: Truck,
      isPrimary: false,
      action: () => setActiveView('purchases')
    },
    {
      id: 'add-product',
      label: 'Add Product',
      icon: Plus,
      isPrimary: false,
      action: onOpenAddProduct
    },
    {
      id: 'khata',
      label: 'Khata',
      icon: BookOpen,
      isPrimary: false,
      action: () => setActiveView('udhar')
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-28 lg:pb-8">

      {/* 1. STICKY TOP BAR: Period Pills Row (Auto-scrolled, non-clipped) */}
      <PeriodFilter />

      {/* 2. GREETING + QUICK ACTIONS */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 px-0.5">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {userName}
          </h2>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {formattedDate}
          </span>
        </div>

        {/* 4 Equal Quick Action Tiles (Min 64px height, replaces separate header buttons) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.id}
                type="button"
                onClick={qa.action}
                className={`min-h-[64px] sm:min-h-[72px] flex flex-col items-center justify-center p-2 rounded-2xl transition-all active:scale-95 cursor-pointer text-center ${
                  qa.isPrimary
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/40'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1 ${qa.isPrimary ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`} />
                <span className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-1">
                  {qa.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3, 4, 5. HERO CARD (Net Profit), KPI GRID (2 columns, 6 cards), ATTENTION CARD */}
      <MetricsOverview />

      {/* 6. OWNER CONTROL CENTER (Collapsible, Operator cards & Live Audit stream) */}
      <OwnerAdminCounterWidget />

      {/* 7. Analytical Visuals: Sales Trend & Payment Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        <div className="xl:col-span-2">
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
            <SalesProfitChart />
          </Suspense>
        </div>
        <div className="xl:col-span-1">
          <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
            <PaymentBreakdownChart />
          </Suspense>
        </div>
      </div>

      {/* Operational Widgets: Best Sellers */}
      <div>
        <BestSellersWidget />
      </div>

    </div>
  );
};

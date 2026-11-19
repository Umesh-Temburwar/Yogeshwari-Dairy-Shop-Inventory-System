import React, { Suspense } from 'react';
import { PeriodFilter } from './PeriodFilter';
import { MetricsOverview } from './MetricsOverview';
import { Skeleton } from '../ui/Skeleton';
import { BestSellersWidget } from './BestSellersWidget';
import { LowStockAlertsWidget } from './LowStockAlertsWidget';
import { OwnerAdminCounterWidget } from './OwnerAdminCounterWidget';
import { CompactPageHeader } from '../Common/CompactPageHeader';
import { ActiveOperatorBar } from '../Common/ActiveOperatorBar';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { LayoutDashboard, ShoppingCart, Plus } from 'lucide-react';

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
  const { language } = useLanguage();

  const title =
    'Dairy Dashboard';

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto pb-28 lg:pb-8">
      {/* POS-Style Active Operator & Store Badge Bar */}
      <ActiveOperatorBar
        locationName="Dairy Central Headquarters"
        pulseColor="emerald"
        className="mb-1"
      />

      {/* Compact 1-Row Header (Matches Inventory Mobile-First System) */}
      <CompactPageHeader
        title={title}
        icon={<LayoutDashboard className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
        secondaryAction={{
          label: 'Add',
          icon: <Plus className="w-3.5 h-3.5 stroke-[2.5]" />,
          onClick: onOpenAddProduct,
          ariaLabel: 'Add new product'
        }}
        primaryAction={{
          label: 'POS',
          icon: <ShoppingCart className="w-3.5 h-3.5" />,
          onClick: () => setActiveView('pos'),
          ariaLabel: 'Open POS billing counter'
        }}
      />

      {/* Sticky 1-Row Period Filter Pill Strip */}
      <PeriodFilter />

      {/* Key Metric Cards */}
      <MetricsOverview />

      {/* Shop Owner Control Center: Admins & Counter Audit Ledger */}
      <OwnerAdminCounterWidget />

      {/* Analytical Visuals: Sales Trend (2/3) & Cash vs Online Distribution (1/3) */}
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

      {/* Operational Widgets: Best Sellers & Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <BestSellersWidget />
        <LowStockAlertsWidget />
      </div>
    </div>
  );
};

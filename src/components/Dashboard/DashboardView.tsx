import React from 'react';
import { PeriodFilter } from './PeriodFilter';
import { MetricsOverview } from './MetricsOverview';
import { SalesProfitChart } from './SalesProfitChart';
import { PaymentBreakdownChart } from './PaymentBreakdownChart';
import { BestSellersWidget } from './BestSellersWidget';
import { LowStockAlertsWidget } from './LowStockAlertsWidget';
import { OwnerAdminCounterWidget } from './OwnerAdminCounterWidget';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingCart, PlusCircle, Sparkles } from 'lucide-react';
import { Button, Kbd } from '../ui';

interface DashboardViewProps {
  onOpenAddProduct: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenAddProduct }) => {
  const { setActiveView } = useStore();
  const { t, language } = useLanguage();

  const heroHeading = 
    language === 'mr' ? 'दुकान इन्व्हेंटरी आणि दैनिक व्यवसाय डॅशबोर्ड' : 
    language === 'hi' ? 'दुकान इन्वेंटरी & दैनिक व्यापार डैशबोर्ड' : 
    'Dairy Shop Inventory & Business Dashboard';

  const heroDescription = 
    language === 'mr' ? 'दैनिक विक्री, रोख व ऑनलाईन UPI कलेक्शन, खरेदी, उधारी खाते आणि नफ्याचा संपूर्ण हिशोब.' :
    language === 'hi' ? 'दैनिक बिक्री, रोकड़ & ऑनलाइन UPI कलेक्शन, माल खरीद, उधारी खाता और शुद्ध लाभ का संपूर्ण हिसाब।' :
    'Complete tracking of daily sales, cash & online UPI collections, purchases, udhar credit book, and net profit.';

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Clean Ink & Milk Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-accent text-accent-fg p-5 sm:p-7 shadow-card border border-line relative overflow-hidden transition-colors">
        
        {/* Left: Heading & Description */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 text-ink text-[11px] font-medium w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="truncate">{t('shopName')} &bull; ERP</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
            {heroHeading}
          </h1>
          <p className="text-xs sm:text-sm opacity-80 max-w-xl line-clamp-2 sm:line-clamp-none font-normal">
            {heroDescription}
          </p>
        </div>

        {/* Right: Action Buttons (F2 / F3) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveView('pos')}
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold justify-center"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('openBillingCounter')}</span>
            <Kbd>F2</Kbd>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onOpenAddProduct}
            className="h-10 px-4 rounded-xl text-xs sm:text-sm font-medium justify-center bg-surface-2/40 hover:bg-surface-2 text-accent-fg border border-line/40"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('addNewMaal')}</span>
            <Kbd>F3</Kbd>
          </Button>
        </div>
      </div>

      {/* Date Filter Segmented Control */}
      <PeriodFilter />

      {/* Primary 8 Key Metric Cards */}
      <MetricsOverview />

      {/* Shop Owner Control Center: Counter Audit Ledger */}
      <OwnerAdminCounterWidget />

      {/* Analytical Visuals: Sales Trend (2/3) & Payment Distribution (1/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesProfitChart />
        </div>
        <div className="xl:col-span-1">
          <PaymentBreakdownChart />
        </div>
      </div>

      {/* Operational Widgets: Best Sellers & Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20 sm:pb-8">
        <BestSellersWidget />
        <LowStockAlertsWidget />
      </div>

    </div>
  );
};

export default DashboardView;

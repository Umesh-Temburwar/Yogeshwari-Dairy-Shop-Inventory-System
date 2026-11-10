import React from 'react';
import { PeriodFilter } from './PeriodFilter';
import { MetricsOverview } from './MetricsOverview';
import { SalesProfitChart } from './SalesProfitChart';
import { PaymentBreakdownChart } from './PaymentBreakdownChart';
import { BestSellersWidget } from './BestSellersWidget';
import { LowStockAlertsWidget } from './LowStockAlertsWidget';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ShoppingCart, PlusCircle, Sparkles } from 'lucide-react';

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
    <div className="space-y-6 max-w-[1440px] mx-auto">
      
      {/* Compact Hero Banner (max 160px tall on desktop) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950 dark:from-[#064E3B] dark:to-[#0B1210] rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-emerald-700/40 dark:border-[#24352F] relative overflow-hidden md:max-h-[160px] transition-colors duration-150">
        
        {/* Left: Heading & Description */}
        <div className="relative z-10 space-y-1 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-700/50 dark:bg-emerald-950/60 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-emerald-600/40 dark:border-emerald-800/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{t('shopName')} &bull; ERP</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate text-white">
            {heroHeading}
          </h1>
          <p className="text-emerald-100/80 dark:text-[#8FA69C] text-xs max-w-xl truncate">
            {heroDescription}
          </p>
        </div>

        {/* Right: Action Buttons in one row on desktop, stacking on mobile */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveView('pos')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 text-amber-950 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 shrink-0"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>{t('openBillingCounter')}</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm backdrop-blur-xs border border-white/20 transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{t('addNewMaal')}</span>
          </button>
        </div>

        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Date Filter Segmented Control (Sticky below Header) */}
      <PeriodFilter />

      {/* Primary 8 Key Metric Cards */}
      <MetricsOverview />

      {/* Analytical Visuals: Sales Trend (2/3) & Cash vs Online Distribution (1/3) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesProfitChart />
        </div>
        <div className="xl:col-span-1">
          <PaymentBreakdownChart />
        </div>
      </div>

      {/* Operational Widgets: Best Sellers & Stock Alert List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-28 sm:pb-10">
        <BestSellersWidget />
        <LowStockAlertsWidget />
      </div>

    </div>
  );
};

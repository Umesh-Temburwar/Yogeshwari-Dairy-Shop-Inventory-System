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

  return (
    <div className="space-y-6">
      
      {/* Top Welcome & Quick Actions Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/50 backdrop-blur-xs text-xs font-semibold text-emerald-200 border border-emerald-600/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('shopName')} &bull; ERP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {language === 'mr' ? 'दुकान इन्व्हेंटरी आणि दैनिक व्यवसाय डॅशबोर्ड' : language === 'hi' ? 'दुकान इन्वेंटरी & दैनिक व्यापार डैशबोर्ड' : 'Dairy Shop Inventory & Business Dashboard'}
          </h1>
          <p className="text-emerald-100/90 text-sm max-w-xl">
            {language === 'mr' 
              ? 'दैनिक विक्री, रोख व ऑनलाईन UPI कलेक्शन, खरेदी, उधारी खाते आणि नफ्याचा संपूर्ण हिशोब.'
              : language === 'hi'
              ? 'दैनिक बिक्री, रोकड़ & ऑनलाइन UPI कलेक्शन, माल खरीद, उधारी खाता और शुद्ध लाभ का संपूर्ण हिसाब-किताब।'
              : 'Complete tracking of daily sales, cash & online UPI collections, purchases, udhar credit book, and net profit.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveView('pos')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t('openBillingCounter')}</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-xs border border-white/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>{t('addNewMaal')}</span>
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Time Period Filter Tabs */}
      <PeriodFilter />

      {/* Primary 8 Key Metric Cards */}
      <MetricsOverview />

      {/* Main Analytical Visuals: Sales Trend & Cash vs Online Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesProfitChart />
        </div>
        <div>
          <PaymentBreakdownChart />
        </div>
      </div>

      {/* Operational Widgets: Best Sellers & Low Stock Shortage Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BestSellersWidget />
        <LowStockAlertsWidget />
      </div>

    </div>
  );
};

import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  TrendingUp, 
  Banknote, 
  Smartphone, 
  ShoppingBag, 
  AlertTriangle, 
  BookOpen, 
  PackageX, 
  Sparkles
} from 'lucide-react';
import { KpiCard } from '../ui';

export const MetricsOverview: React.FC = () => {
  const { metrics, setActiveView, timeFilter } = useStore();
  const { t, language } = useLanguage();

  const timeLabel = t(timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'thisWeek' : timeFilter === 'month' ? 'thisMonth' : timeFilter === 'year' ? 'thisYear' : 'allTime');

  const cards = [
    {
      label: `${timeLabel} ${t('totalSales')}`,
      value: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'काउंटर व होम डिलिव्हरी विक्री' : language === 'hi' ? 'काउंटर व होम डिलीवरी बिक्री' : 'Counter & delivery sales',
      icon: <TrendingUp className="w-4 h-4" />,
      onClick: () => setActiveView('sales'),
      deltaType: 'ok' as const,
    },
    {
      label: `${timeLabel} ${t('cashCollected')}`,
      value: `₹${metrics.cashCollected.toLocaleString('en-IN')}`,
      subtitle: `${((metrics.cashCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${language === 'mr' ? 'रोख विक्री वाटा' : language === 'hi' ? 'रोकड़ शेयर' : 'Cash share'}`,
      icon: <Banknote className="w-4 h-4" />,
      onClick: () => setActiveView('sales'),
      deltaType: 'neutral' as const,
    },
    {
      label: `${timeLabel} ${t('onlineCollected')}`,
      value: `₹${metrics.onlineCollected.toLocaleString('en-IN')}`,
      subtitle: `${((metrics.onlineCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${language === 'mr' ? 'फोनपे, जीपे, स्कॅनर' : language === 'hi' ? 'फोनपे, जीपे, स्कैनर' : 'PhonePe, GPay, QR'}`,
      icon: <Smartphone className="w-4 h-4" />,
      onClick: () => setActiveView('sales'),
      deltaType: 'neutral' as const,
    },
    {
      label: `${timeLabel} ${t('totalPurchases')}`,
      value: `₹${metrics.totalPurchasesAmount.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'दूध, खवा, तूप खरेदी खर्च' : language === 'hi' ? 'दूध, घी, खोया रॉ माल लागत' : 'Milk & raw materials cost',
      icon: <ShoppingBag className="w-4 h-4" />,
      onClick: () => setActiveView('purchases'),
      deltaType: 'neutral' as const,
    },
    {
      label: `${timeLabel} ${t('netProfit')}`,
      value: `₹${metrics.netProfit.toLocaleString('en-IN')}`,
      subtitle: `${language === 'mr' ? 'एकूण नफा' : language === 'hi' ? 'सकल लाभ' : 'Gross'} ₹${metrics.grossProfit.toLocaleString('en-IN')} ${language === 'mr' ? 'मधून खर्च वजा' : language === 'hi' ? 'में से खर्च घटाकर' : 'after expenses'}`,
      icon: <Sparkles className="w-4 h-4" />,
      onClick: () => setActiveView('analytics'),
      deltaType: 'ok' as const,
      delta: 'नफा',
    },
    {
      label: t('totalUdharDue'),
      value: `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'ग्राहक व मिठाईवाल्यांकडून बाकी' : language === 'hi' ? 'ग्राहकों व हलवाइयों से बाकी' : 'Customer credit receivable',
      icon: <BookOpen className="w-4 h-4" />,
      onClick: () => setActiveView('udhar'),
      deltaType: 'warn' as const,
      delta: metrics.totalOutstandingUdhar > 0 ? 'बाकी' : undefined,
    },
    {
      label: `${timeLabel} ${t('damageLoss')}`,
      value: `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'नासलेले दूध, लिकेज व एक्सपायरी' : language === 'hi' ? 'फटा दूध, पाउच लीकेज नुकसान' : 'Curdled milk & leakage loss',
      icon: <PackageX className="w-4 h-4" />,
      onClick: () => setActiveView('damages'),
      deltaType: 'danger' as const,
    },
    {
      label: t('lowStockAlert'),
      value: `${metrics.lowStockCount} ${language === 'mr' ? 'उत्पादने' : language === 'hi' ? 'आइटम्स' : 'items'}`,
      subtitle: (metrics.expiredBatchesCount > 0 || metrics.expiringTodayBatchesCount > 0)
        ? (language === 'mr' 
            ? `${metrics.expiredBatchesCount} एक्सपायर्ड • ${metrics.expiringTodayBatchesCount} आज मुदत संपणारे` 
            : language === 'hi' 
            ? `${metrics.expiredBatchesCount} एक्सपायर • ${metrics.expiringTodayBatchesCount} आज एक्सपायर` 
            : `${metrics.expiredBatchesCount} expired • ${metrics.expiringTodayBatchesCount} exp. today`)
        : metrics.lowStockCount > 0 
        ? (language === 'mr' ? 'त्वरित मागवण्याची गरज' : language === 'hi' ? 'तुरंत मंगाने की ज़रूरत' : 'Reorder needed now')
        : (language === 'mr' ? 'सर्व माल पुरेसा उपलब्ध' : language === 'hi' ? 'सभी माल पर्याप्त' : 'Stock level healthy'),
      icon: <AlertTriangle className="w-4 h-4" />,
      onClick: () => setActiveView(metrics.expiredBatchesCount > 0 ? 'expiry' : 'reorder'),
      deltaType: metrics.expiredBatchesCount > 0 ? 'danger' : metrics.lowStockCount > 0 ? 'warn' : 'ok',
      delta: metrics.expiredBatchesCount > 0 ? 'Alert' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card, idx) => (
        <KpiCard
          key={idx}
          label={card.label}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          delta={card.delta}
          deltaType={card.deltaType}
          onClick={card.onClick}
        />
      ))}
    </div>
  );
};

export default MetricsOverview;

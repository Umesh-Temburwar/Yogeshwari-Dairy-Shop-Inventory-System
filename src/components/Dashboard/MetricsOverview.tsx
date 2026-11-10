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
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export const MetricsOverview: React.FC = () => {
  const { metrics, setActiveView, timeFilter } = useStore();
  const { t, language } = useLanguage();

  const timeLabel = t(timeFilter === 'today' ? 'today' : timeFilter === 'week' ? 'thisWeek' : timeFilter === 'month' ? 'thisMonth' : timeFilter === 'year' ? 'thisYear' : 'allTime');

  const cards = [
    {
      title: `${timeLabel} ${t('totalSales')}`,
      amount: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'काउंटर व होम डिलिव्हरी विक्री' : language === 'hi' ? 'काउंटर व होम डिलीवरी बिक्री' : 'Counter & delivery sales',
      icon: TrendingUp,
      bgGradient: 'from-emerald-500 to-teal-600',
      action: () => setActiveView('sales')
    },
    {
      title: `${timeLabel} ${t('cashCollected')}`,
      amount: `₹${metrics.cashCollected.toLocaleString('en-IN')}`,
      subtitle: `${((metrics.cashCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${language === 'mr' ? 'रोख विक्री' : language === 'hi' ? 'बिक्री कैश में' : 'Cash share'}`,
      icon: Banknote,
      bgGradient: 'from-blue-600 to-indigo-600',
      action: () => setActiveView('sales')
    },
    {
      title: `${timeLabel} ${t('onlineCollected')}`,
      amount: `₹${metrics.onlineCollected.toLocaleString('en-IN')}`,
      subtitle: `${((metrics.onlineCollected / (metrics.totalSalesRevenue || 1)) * 100).toFixed(0)}% ${language === 'mr' ? 'फोनपे / जीपे / स्कॅनर' : language === 'hi' ? 'फोनपे / जीपे / स्कैनर' : 'UPI QR collection'}`,
      icon: Smartphone,
      bgGradient: 'from-purple-600 to-violet-600',
      action: () => setActiveView('sales')
    },
    {
      title: `${timeLabel} ${t('totalPurchases')}`,
      amount: `₹${metrics.totalPurchasesAmount.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'दूध, खवा, तूप खरेदी खर्च' : language === 'hi' ? 'दूध, घी, खोया व रॉ माल लागत' : 'Milk & raw materials cost',
      icon: ShoppingBag,
      bgGradient: 'from-sky-500 to-cyan-600',
      action: () => setActiveView('purchases')
    },
    {
      title: `${timeLabel} ${t('netProfit')}`,
      amount: `₹${metrics.netProfit.toLocaleString('en-IN')}`,
      subtitle: `${language === 'mr' ? 'एकूण नफा' : language === 'hi' ? 'ग्रॉस प्रॉफिट' : 'Gross'} ₹${metrics.grossProfit.toLocaleString('en-IN')} ${language === 'mr' ? 'मधून खर्च वजा करून' : language === 'hi' ? 'में से खर्च घटाकर' : 'after expenses'}`,
      icon: Sparkles,
      bgGradient: 'from-amber-500 to-orange-600',
      action: () => setActiveView('analytics'),
      highlight: true
    },
    {
      title: t('totalUdharDue'),
      amount: `₹${metrics.totalOutstandingUdhar.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'ग्राहक व मिठाईवाल्यांकडून येणे बाकी' : language === 'hi' ? 'ग्राहकों व हलवाइयों से लेना बाकी' : 'Total credit receivable',
      icon: BookOpen,
      bgGradient: 'from-rose-500 to-red-600',
      action: () => setActiveView('udhar')
    },
    {
      title: `${timeLabel} ${t('damageLoss')}`,
      amount: `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`,
      subtitle: language === 'mr' ? 'नासलेले दूध, लिकेज व एक्सपायरी' : language === 'hi' ? 'फटा दूध, पाउच लीकेज व एक्सपायरी' : 'Curdled milk & leakage loss',
      icon: PackageX,
      bgGradient: 'from-slate-600 to-slate-800',
      action: () => setActiveView('damages')
    },
    {
      title: t('lowStockAlert'),
      amount: `${metrics.lowStockCount} ${language === 'mr' ? 'उत्पादने' : language === 'hi' ? 'आइटम्स' : 'items'}`,
      subtitle: metrics.lowStockCount > 0 
        ? (language === 'mr' ? 'त्वरित मागवण्याची गरज आहे' : language === 'hi' ? 'तुरंत मंगाने की ज़रूरत है' : 'Reorder needed now')
        : (language === 'mr' ? 'सर्व माल पुरेसा उपलब्ध आहे' : language === 'hi' ? 'सभी माल पर्याप्त मात्रा में है' : 'Stock level is healthy'),
      icon: AlertTriangle,
      bgGradient: metrics.lowStockCount > 0 ? 'from-amber-600 to-red-600' : 'from-emerald-600 to-teal-700',
      action: () => setActiveView('reorder')
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            onClick={card.action}
            className={`relative overflow-hidden bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${
              card.highlight ? 'ring-2 ring-amber-400/60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 block truncate">
                  {card.title}
                </span>
                <span className="text-2xl font-black text-slate-900 tracking-tight block">
                  {card.amount}
                </span>
                <span className="text-[11px] font-medium text-slate-500 block line-clamp-1">
                  {card.subtitle}
                </span>
              </div>

              <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.bgGradient} flex items-center justify-center text-white shadow-md shadow-slate-200 shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium group-hover:text-emerald-700 transition-colors">
                {language === 'mr' ? 'सविस्तर पहा' : language === 'hi' ? 'विस्तार से देखें' : 'View Details'}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

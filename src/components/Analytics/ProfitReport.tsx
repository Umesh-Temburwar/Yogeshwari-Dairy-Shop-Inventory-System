import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { 
  Sparkles, 
  Trophy, 
  ShoppingBag, 
  Printer 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const ProfitReport: React.FC = () => {
  const { filteredSales, metrics } = useStore();
  const { t, language } = useLanguage();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Aggregate product performance
  const productPerformance = useMemo(() => {
    const map: Record<string, { 
      name: string; 
      quantity: number; 
      unit: string; 
      revenue: number; 
      cost: number; 
      profit: number 
    }> = {};

    filteredSales.forEach(s => {
      s.items?.forEach(i => {
        if (!map[i.product_name]) {
          map[i.product_name] = {
            name: i.product_name,
            quantity: 0,
            unit: i.unit,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        const itemRevenue = i.total_price;
        const itemCost = (i.purchase_cost || 0) * (i.quantity || 0);
        map[i.product_name].quantity += i.quantity;
        map[i.product_name].revenue += itemRevenue;
        map[i.product_name].cost += itemCost;
        map[i.product_name].profit += (itemRevenue - itemCost);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  const revKey = language === 'mr' ? 'कमाई (Revenue)' : language === 'hi' ? 'कमाई (Revenue)' : 'Revenue';
  const profKey = language === 'mr' ? 'नफा (Profit)' : language === 'hi' ? 'मुनाफा (Profit)' : 'Profit';

  const topProductsChartData = productPerformance.slice(0, 6).map(p => ({
    name: p.name.split(' (')[0],
    [revKey]: p.revenue,
    [profKey]: Math.round(p.profit)
  }));

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>
              {language === 'mr' ? 'नफा आणि सर्वाधिक खपणारा माल अहवाल (P&L & Analytics)' : 'लाभ और बेस्ट सेलर माल रिपोर्ट (Profit & Sales Intelligence)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' 
              ? 'निव्वळ नफा (Net Profit) आणि कोणत्या मालातून सर्वाधिक नफा मिळतो याचे संपूर्ण विश्लेषण'
              : 'शुद्ध मुनाफा (Net Profit) एवं कौनसा माल सबसे ज़्यादा बिकता है उसका पूरा विश्लेषण'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-white text-xs font-bold transition-all border border-transparent dark:border-[#24352F]"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'mr' ? 'प्रिंट नफा-तोटा अहवाल' : 'प्रिंट P&L रिपोर्ट'}</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* PROFIT & LOSS STATEMENT CARD */}
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-6 border border-slate-200/90 dark:border-[#24352F] shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {t('plStatement')}
            </h3>
            <span className="text-xs text-slate-500 dark:text-[#8FA69C]">
              {language === 'mr' 
                ? 'फॉर्म्युला: विक्री - खरेदी खर्च - दुकानाचे खर्च - नासाडी नुकसान'
                : 'सटीक फॉर्मूला: बिक्री - खरीद लागत - दुकान खर्च - डैमेज नुकसान'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
              {language === 'mr' ? 'खिशात पडलेला निव्वळ नफा:' : 'शुद्ध जेब में आया मुनाफा:'}
            </span>
            <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Step-by-Step Breakdown Table */}
        <div className="space-y-2 text-xs">
          
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] font-bold text-slate-900 dark:text-white">
            <span className="text-sm">
              1. {language === 'mr' ? 'एकूण विक्री महसूल (Total Sales Revenue):' : 'कुल बिक्री राजस्व (Total Sales Revenue):'}
            </span>
            <span className="text-base text-emerald-700 dark:text-emerald-400">+₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600 dark:text-[#8FA69C]">
            <span className="pl-4">&bull; {language === 'mr' ? 'रोख रक्कम आली (Cash):' : 'रोकड़ में आया (Cash):'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">₹{metrics.cashCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600 dark:text-[#8FA69C]">
            <span className="pl-4">&bull; {language === 'mr' ? 'ऑनलाईन UPI / QR द्वारे आले:' : 'ऑनलाइन UPI / QR में आया:'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">₹{metrics.onlineCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 text-slate-800 dark:text-[#E7F0EC] font-semibold border border-rose-100 dark:border-rose-900/40">
            <span>2. {language === 'mr' ? 'वजा: विकलेल्या मालाचा मूळ खरेदी खर्च (COGS):' : 'घटाएं: बेचे गए माल की मूल खरीद लागत (COGS):'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.cogs.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800/40">
            <span>= {language === 'mr' ? 'एकूण नफा मार्जिन (Gross Profit Margin):' : 'सकल लाभ (Gross Profit Margin):'}</span>
            <span className="text-base text-emerald-700 dark:text-emerald-400">₹{metrics.grossProfit.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-[#E7F0EC] font-semibold border border-amber-100 dark:border-amber-900/40">
            <span>3. {language === 'mr' ? 'वजा: दुकानाचे दैनंदिन खर्च (भाडे + वीज बिल + पेट्रोल + इतर):' : 'घटाएं: दुकान संचालन खर्च (Rent + Light + Petrol + Other):'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.operatingExpenses.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] text-slate-800 dark:text-[#E7F0EC] font-semibold">
            <span>4. {language === 'mr' ? 'वजा: नासलेला / खराब माल नुकसान (Spoilage Loss):' : 'घटाएं: डैमेज व खराब माल का नुकसान (Spoilage Loss):'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-baseline p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm shadow-md mt-4">
            <div>
              <span className="text-base block">{t('netPocketProfit')}</span>
              <span className="text-[11px] text-emerald-100 font-normal">
                {language === 'mr' ? 'सर्व खर्च, खरेदी आणि नुकसान वजा करून' : 'सभी खर्चे, नुकसान व खरीद लागत निकालने के बाद'}
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </span>
          </div>

        </div>
      </div>

      {/* TOP SELLING PRODUCTS & BEST SELLERS INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Visual Bar Chart */}
        <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'mr' ? 'सर्वाधिक महसूल देणारी उत्पादने' : 'सर्वाधिक कमाई देने वाले उत्पाद'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
              Revenue vs Net Profit per dairy item
            </p>
          </div>

          <div className="h-64 w-full my-4">
            {topProductsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#24352F' : '#f1f5f9'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#8FA69C' : '#64748b' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#8FA69C' : '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: isDark ? '#131F1B' : '#ffffff',
                      borderColor: isDark ? '#24352F' : '#e2e8f0',
                      borderRadius: '12px',
                      color: isDark ? '#ffffff' : '#0f172a'
                    }}
                  />
                  <Bar dataKey={revKey} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
                  <Bar dataKey={profKey} fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-[#8FA69C] text-xs">
                डेटा उपलब्ध नाही
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex items-center justify-between border-t border-slate-100 dark:border-[#24352F] pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded" /> {language === 'mr' ? 'एकूण कमाई' : 'कुल कमाई'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded" /> {language === 'mr' ? 'त्यातील निव्वळ नफा' : 'उसमें से शुद्ध मुनाफा'}
            </span>
          </div>
        </div>

        {/* Detailed Item Ranking Table */}
        <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'mr' ? 'माल विक्री रँकिंग (Leaderboard)' : 'माल बिक्री रैंकिंग (Leaderboard)'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
              {language === 'mr' ? 'रँक १ ते १० कोणता माल जास्त खपला' : 'रैंक 1 से 10 तक कौनसा माल कितना बिका'}
            </p>
          </div>

          <div className="space-y-2.5 my-3 max-h-72 overflow-y-auto pr-1">
            {productPerformance.map((prod, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-[#24352F] bg-slate-50/60 dark:bg-[#1A2A25] text-xs hover:bg-slate-100/60 dark:hover:bg-[#1F332D] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200' : 
                    idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' :
                    idx === 2 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300' : 'bg-white dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                  }`}>
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{prod.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
                      {language === 'mr' ? 'विक्री प्रमाण:' : 'बिक्री मात्रा:'} {prod.quantity.toFixed(1)} {prod.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 dark:text-white block">
                    ₹{prod.revenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                    {language === 'mr' ? 'नफा:' : 'लाभ:'} +₹{Math.round(prod.profit).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] text-[11px] text-slate-500 dark:text-[#8FA69C] flex justify-between">
            <span>{language === 'mr' ? 'एकूण विकलेली उत्पादने:' : 'कुल बिके उत्पाद:'} <b className="text-slate-700 dark:text-white">{productPerformance.length}</b></span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक मागणीत आहेत' : 'दूध & पनीर सबसे अधिक मांग में हैं'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import {
  Sparkles,
  Trophy,
  ShoppingBag,
  Printer,
  Users,
  UserCheck,
  TrendingUp,
  Heart,
  FileText
} from 'lucide-react';
import { exportReportToPDF } from '../../lib/exportUtils';
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

  // Aggregate customer demographic insights
  const demographicStats = useMemo(() => {
    let totalSalesCount = 0;
    let totalRevenue = 0;

    const genderStats: Record<string, { count: number; revenue: number; qty: number }> = {
      Male: { count: 0, revenue: 0, qty: 0 },
      Female: { count: 0, revenue: 0, qty: 0 },
      Other: { count: 0, revenue: 0, qty: 0 }
    };

    const ageGroupStats: Record<string, { count: number; revenue: number; qty: number }> = {
      'Kids/Teens (<18)': { count: 0, revenue: 0, qty: 0 },
      'Youth (18-25)': { count: 0, revenue: 0, qty: 0 },
      'Adults (26-45)': { count: 0, revenue: 0, qty: 0 },
      'Seniors (45+)': { count: 0, revenue: 0, qty: 0 }
    };

    // Product-level demographic affinities
    const productDemographics: Record<string, {
      productName: string;
      totalRevenue: number;
      totalQty: number;
      unit: string;
      byGender: Record<string, { qty: number; revenue: number }>;
      byAge: Record<string, { qty: number; revenue: number }>;
    }> = {};

    filteredSales.forEach(s => {
      const gender = s.customer_gender || 'Male';
      const ageGroup = s.customer_age_group || 'Adults (26-45)';

      totalSalesCount += 1;
      totalRevenue += s.net_amount;

      if (!genderStats[gender]) {
        genderStats[gender] = { count: 0, revenue: 0, qty: 0 };
      }
      genderStats[gender].count += 1;
      genderStats[gender].revenue += s.net_amount;

      if (!ageGroupStats[ageGroup]) {
        ageGroupStats[ageGroup] = { count: 0, revenue: 0, qty: 0 };
      }
      ageGroupStats[ageGroup].count += 1;
      ageGroupStats[ageGroup].revenue += s.net_amount;

      s.items?.forEach(item => {
        genderStats[gender].qty += item.quantity;
        ageGroupStats[ageGroup].qty += item.quantity;

        if (!productDemographics[item.product_name]) {
          productDemographics[item.product_name] = {
            productName: item.product_name,
            totalRevenue: 0,
            totalQty: 0,
            unit: item.unit,
            byGender: {
              Male: { qty: 0, revenue: 0 },
              Female: { qty: 0, revenue: 0 },
              Other: { qty: 0, revenue: 0 }
            },
            byAge: {
              'Kids/Teens (<18)': { qty: 0, revenue: 0 },
              'Youth (18-25)': { qty: 0, revenue: 0 },
              'Adults (26-45)': { qty: 0, revenue: 0 },
              'Seniors (45+)': { qty: 0, revenue: 0 }
            }
          };
        }

        const pd = productDemographics[item.product_name];
        pd.totalRevenue += item.total_price;
        pd.totalQty += item.quantity;

        if (!pd.byGender[gender]) pd.byGender[gender] = { qty: 0, revenue: 0 };
        pd.byGender[gender].qty += item.quantity;
        pd.byGender[gender].revenue += item.total_price;

        if (!pd.byAge[ageGroup]) pd.byAge[ageGroup] = { qty: 0, revenue: 0 };
        pd.byAge[ageGroup].qty += item.quantity;
        pd.byAge[ageGroup].revenue += item.total_price;
      });
    });

    const productAffinityList = Object.values(productDemographics).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Compute top Age Group
    let maxAgeRev = -1;
    let topAgeName = 'Adults (26-45)';
    Object.entries(ageGroupStats).forEach(([grp, data]) => {
      if (data.revenue > maxAgeRev) {
        maxAgeRev = data.revenue;
        topAgeName = grp;
      }
    });

    // Top Product for Youth (18-25)
    const youthTopProduct = [...productAffinityList].sort((a, b) => {
      const qA = a.byAge['Youth (18-25)']?.qty || 0;
      const qB = b.byAge['Youth (18-25)']?.qty || 0;
      return qB - qA;
    }).find(p => (p.byAge['Youth (18-25)']?.qty || 0) > 0);

    // Top Product for Seniors (45+)
    const seniorsTopProduct = [...productAffinityList].sort((a, b) => {
      const qA = a.byAge['Seniors (45+)']?.qty || 0;
      const qB = b.byAge['Seniors (45+)']?.qty || 0;
      return qB - qA;
    }).find(p => (p.byAge['Seniors (45+)']?.qty || 0) > 0);

    return {
      totalSalesCount,
      totalRevenue,
      genderStats,
      ageGroupStats,
      productAffinityList,
      topAgeGroup: {
        name: topAgeName,
        revenue: maxAgeRev > 0 ? maxAgeRev : 0,
        percentage: totalRevenue > 0 ? Math.round((Math.max(0, maxAgeRev) / totalRevenue) * 100) : 0
      },
      youthTopProduct,
      seniorsTopProduct
    };
  }, [filteredSales]);

  const maleShare = demographicStats.totalRevenue > 0
    ? Math.round(((demographicStats.genderStats['Male']?.revenue || 0) / demographicStats.totalRevenue) * 100)
    : 0;
  const femaleShare = demographicStats.totalRevenue > 0
    ? Math.round(((demographicStats.genderStats['Female']?.revenue || 0) / demographicStats.totalRevenue) * 100)
    : 0;
  const otherShare = Math.max(0, 100 - maleShare - femaleShare);

  const handleDownloadPLPDF = () => {
    exportReportToPDF({
      title: language === 'mr' ? 'दुकान नफा-तोटा व व्यवसाय विश्लेषण अहवाल (P&L Statement)' : language === 'hi' ? 'दुकान लाभ-हानि व व्यापार विश्लेषण रिपोर्ट (P&L Statement)' : 'Dairy Profit & Loss Statement & Sales Intelligence Report',
      subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Financial Statement',
      periodText: language === 'mr' ? 'कालावधी आर्थिक विवरणपत्र' : 'अवधि वित्तीय विवरणपत्र',
      kpis: [
        { label: 'एकूण विक्री (Revenue)', value: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: 'स्थूल नफा (Gross Profit)', value: `₹${metrics.grossProfit.toLocaleString('en-IN')}`, color: 'blue' },
        { label: 'एकूण खर्च (Opex + Loss)', value: `₹${(metrics.operatingExpenses + metrics.totalDamagesLoss).toLocaleString('en-IN')}`, color: 'rose' },
        { label: 'निव्वळ नफा (Net Profit)', value: `₹${metrics.netProfit.toLocaleString('en-IN')}`, color: metrics.netProfit >= 0 ? 'emerald' : 'rose' }
      ],
      tables: [
        {
          heading: language === 'mr' ? '१. नफा-तोटा ताळेबंद (P&L Summary Breakdown)' : '1. Profit & Loss Summary Breakdown',
          data: {
            headers: ['तपशील (Financial Line Item)', 'रक्कम (₹)', 'टक्केवारी / शेरा (Share)'],
            alignments: ['left', 'right', 'right'],
            rows: [
              ['(+) एकूण विक्री कमाई (Total Sales Revenue)', `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, '100.0%'],
              ['(-) विकलेल्या मालाचा मूळ खरेदी खर्च (COGS)', `₹${metrics.totalCOGS.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalCOGS / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(=) स्थूल नफा (Gross Profit Margin)', `₹${metrics.grossProfit.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.grossProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(-) दुकान दैनंदिन चालू खर्च (Operating Expenses)', `₹${metrics.operatingExpenses.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.operatingExpenses / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(-) नासलेले दूध व खराब माल नुकसान (Damages & Spoilage)', `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalDamagesLoss / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              ['(=) अंतिम निव्वळ शिल्लक नफा (Net Profit In Hand)', `₹${metrics.netProfit.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.netProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%']
            ]
          }
        },
        {
          heading: language === 'mr' ? '२. उत्पादननिहाय नफा व विक्री कामगिरी (Product Margins)' : '2. Product Performance & Margins',
          data: {
            headers: ['उत्पादनाचे नाव (Product)', 'विक्री प्रमाण (Qty)', 'कमाई (Revenue ₹)', 'खर्च (Cost ₹)', 'नफा (Profit ₹)', 'नफा मार्जिन %'],
            alignments: ['left', 'right', 'right', 'right', 'right', 'right'],
            rows: productPerformance.map(p => [
              p.name,
              `${p.quantity} ${p.unit}`,
              `₹${p.revenue.toLocaleString('en-IN')}`,
              `₹${Math.round(p.cost).toLocaleString('en-IN')}`,
              `₹${Math.round(p.profit).toLocaleString('en-IN')}`,
              p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%'
            ]),
            summaryRow: [
              'एकूण (Total)',
              `${productPerformance.length} उत्पादने`,
              `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
              `₹${metrics.totalCOGS.toLocaleString('en-IN')}`,
              `₹${metrics.grossProfit.toLocaleString('en-IN')}`,
              metrics.totalSalesRevenue > 0 ? `${((metrics.grossProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'
            ]
          }
        }
      ],
      notes: 'योगेश्वरी डेअरी फार्म अधिकृत आर्थिक विवरणपत्र. सीए/कर सल्लागारासाठी वैध.'
    });
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>
              {language === 'mr' ? 'नफा आणि सर्वाधिक खपणारा माल अहवाल (P&L & Analytics)' : language === 'hi' ? 'लाभ और बेस्ट सेलर माल रिपोर्ट (Profit & Sales Intelligence)' : 'Profit & Loss Statement (P&L & Intelligence)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr'
              ? 'निव्वळ नफा (Net Profit) आणि कोणत्या मालातून सर्वाधिक नफा मिळतो याचे संपूर्ण विश्लेषण'
              : language === 'hi'
                ? 'शुद्ध मुनाफा (Net Profit) एवं कौनसा माल सबसे ज़्यादा बिकता है उसका पूरा विश्लेषण'
                : 'Comprehensive Net Profit analysis and product-level margin breakdown'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPLPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            title="Download Official P&L Statement PDF"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'mr' ? 'नफा-तोटा PDF' : language === 'hi' ? 'P&L PDF डाउनलोड' : 'Download P&L PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-white text-xs font-bold transition-all border border-transparent dark:border-[#24352F]"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print')}</span>
          </button>
        </div>
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
                : language === 'hi'
                  ? 'सटीक फॉर्मूला: बिक्री - खरीद लागत - दुकान खर्च - डैमेज नुकसान'
                  : 'Formula: Revenue - Cost of Goods - Operating Expenses - Spoilage'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
              {language === 'mr' ? 'खिशात पडलेला निव्वळ नफा:' : language === 'hi' ? 'शुद्ध जेब में आया मुनाफा:' : 'Net Pocket Profit:'}
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
              1. {language === 'mr' ? 'एकूण विक्री महसूल (Total Sales Revenue):' : language === 'hi' ? 'कुल बिक्री राजस्व (Total Sales Revenue):' : 'Total Sales Revenue:'}
            </span>
            <span className="text-base text-emerald-700 dark:text-emerald-400">+₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600 dark:text-[#8FA69C]">
            <span className="pl-4">&bull; {language === 'mr' ? 'रोख रक्कम आली (Cash):' : language === 'hi' ? 'रोकड़ में आया (Cash):' : 'Cash Collected:'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">₹{metrics.cashCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600 dark:text-[#8FA69C]">
            <span className="pl-4">&bull; {language === 'mr' ? 'ऑनलाईन UPI / QR द्वारे आले:' : language === 'hi' ? 'ऑनलाइन UPI / QR में आया:' : 'Online UPI Collected:'}</span>
            <span className="font-semibold text-slate-900 dark:text-white">₹{metrics.onlineCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 text-slate-800 dark:text-[#E7F0EC] font-semibold border border-rose-100 dark:border-rose-900/40">
            <span>2. {language === 'mr' ? 'वजा: विकलेल्या मालाचा मूळ खरेदी खर्च (COGS):' : language === 'hi' ? 'घटाएं: बेचे गए माल की मूल खरीद लागत (COGS):' : 'Less: Cost of Goods Sold (COGS):'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.cogs.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800/40">
            <span>= {language === 'mr' ? 'एकूण नफा मार्जिन (Gross Profit Margin):' : language === 'hi' ? 'सकल लाभ (Gross Profit Margin):' : 'Gross Profit Margin:'}</span>
            <span className="text-base text-emerald-700 dark:text-emerald-400">₹{metrics.grossProfit.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-[#E7F0EC] font-semibold border border-amber-100 dark:border-amber-900/40">
            <span>3. {language === 'mr' ? 'वजा: दुकानाचे दैनंदिन खर्च (भाडे + वीज बिल + पेट्रोल + इतर):' : language === 'hi' ? 'घटाएं: दुकान संचालन खर्च (Rent + Light + Petrol + Other):' : 'Less: Operating Expenses (Rent, Electricity Bill, Fuel, Staff):'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.operatingExpenses.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] text-slate-800 dark:text-[#E7F0EC] font-semibold">
            <span>4. {language === 'mr' ? 'वजा: नासलेला / खराब माल नुकसान (Spoilage Loss):' : language === 'hi' ? 'घटाएं: डैमेज व खराब माल का नुकसान (Spoilage Loss):' : 'Less: Spoilage & Damaged Goods Loss:'}</span>
            <span className="font-black text-rose-700 dark:text-rose-400">-₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-baseline p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm shadow-md mt-4">
            <div>
              <span className="text-base block">{t('netPocketProfit')}</span>
              <span className="text-[11px] text-emerald-100 font-normal">
                {language === 'mr' ? 'सर्व खर्च, खरेदी आणि नुकसान वजा करून' : language === 'hi' ? 'सभी खर्चे, नुकसान व खरीद लागत निकालने के बाद' : 'After all expenses, wholesale costs, and spoilage'}
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
                {language === 'mr' ? 'सर्वाधिक महसूल देणारी उत्पादने' : language === 'hi' ? 'सर्वाधिक कमाई देने वाले उत्पाद' : 'Highest Revenue Dairy Products'}
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
                {language === 'mr' ? 'माहिती उपलब्ध नाही' : language === 'hi' ? 'डेटा उपलब्ध नहीं' : 'No data available'}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex items-center justify-between border-t border-slate-100 dark:border-[#24352F] pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded" /> {language === 'mr' ? 'एकूण कमाई' : language === 'hi' ? 'कुल कमाई' : 'Total Revenue'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded" /> {language === 'mr' ? 'त्यातील निव्वळ नफा' : language === 'hi' ? 'उसमें से शुद्ध मुनाफा' : 'Net Profit'}
            </span>
          </div>
        </div>

        {/* Detailed Item Ranking Table */}
        <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'mr' ? 'माल विक्री रँकिंग (Leaderboard)' : language === 'hi' ? 'माल बिक्री रैंकिंग (Leaderboard)' : 'Dairy Sales Leaderboard'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
              {language === 'mr' ? 'रँक १ ते १० कोणता माल जास्त खपला' : language === 'hi' ? 'रैंक 1 से 10 तक कौनसा माल कितना बिका' : 'Rank 1 to 10 best-selling items'}
            </p>
          </div>

          <div className="space-y-2.5 my-3 max-h-72 overflow-y-auto pr-1">
            {productPerformance.map((prod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-[#24352F] bg-slate-50/60 dark:bg-[#1A2A25] text-xs hover:bg-slate-100/60 dark:hover:bg-[#1F332D] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${idx === 0 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200' :
                      idx === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' :
                        idx === 2 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300' : 'bg-white dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                    }`}>
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{prod.name}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
                      {language === 'mr' ? 'विक्री प्रमाण:' : language === 'hi' ? 'बिक्री मात्रा:' : 'Sold:'} {prod.quantity.toFixed(1)} {prod.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 dark:text-white block">
                    ₹{prod.revenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                    {language === 'mr' ? 'नफा:' : language === 'hi' ? 'लाभ:' : 'Profit:'} +₹{Math.round(prod.profit).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] text-[11px] text-slate-500 dark:text-[#8FA69C] flex justify-between">
            <span>{language === 'mr' ? 'एकूण विकलेली उत्पादने:' : language === 'hi' ? 'कुल बिके उत्पाद:' : 'Total Products Sold:'} <b className="text-slate-700 dark:text-white">{productPerformance.length}</b></span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक मागणीत आहेत' : language === 'hi' ? 'दूध & पनीर सबसे अधिक मांग में हैं' : 'Milk & Paneer are in highest demand'}
            </span>
          </div>
        </div>

      </div>

      {/* CUSTOMER DEMOGRAPHICS & PRODUCT PREFERENCE INTELLIGENCE */}
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl p-6 border border-slate-200/90 dark:border-[#24352F] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#24352F] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {t('demographicsTitle')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {t('demographicsSub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40">
              {demographicStats.totalSalesCount} {language === 'mr' ? 'ग्राहक नोंदी' : language === 'hi' ? 'ग्राहक रिकॉर्ड' : 'Customer Bills'}
            </span>
          </div>
        </div>

        {/* Demographic KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Gender Ratio Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
              <span>{t('genderBreakdown')}</span>
              <UserCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                👨 {maleShare}%
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xl font-black text-pink-600 dark:text-pink-400">
                👩 {femaleShare}%
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-[#131F1B] rounded-full h-2 flex overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${maleShare}%` }} />
              <div className="bg-pink-500 h-full" style={{ width: `${femaleShare}%` }} />
              <div className="bg-purple-500 h-full" style={{ width: `${otherShare}%` }} />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex justify-between">
              <span>👨 ₹{demographicStats.genderStats['Male']?.revenue.toLocaleString('en-IN') || 0}</span>
              <span>👩 ₹{demographicStats.genderStats['Female']?.revenue.toLocaleString('en-IN') || 0}</span>
            </div>
          </div>

          {/* Top Age Segment Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">
              <span>{t('topBuyerAge')}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white truncate">
              {demographicStats.topAgeGroup.name}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {demographicStats.topAgeGroup.percentage}% {language === 'mr' ? 'एकूण विक्री' : language === 'hi' ? 'कुल बिक्री' : 'of sales'} (₹{demographicStats.topAgeGroup.revenue.toLocaleString('en-IN')})
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
              {language === 'mr' ? 'दुधाचे मुख्य घरगुती खरेदीदार' : language === 'hi' ? 'दूध के मुख्य घरेलू खरीदार' : 'Core household buyers'}
            </div>
          </div>

          {/* Youth Favorite Card */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-amber-800 dark:text-amber-300">
              <span>{language === 'mr' ? 'तरुणांची पसंती (Youth 18-25)' : language === 'hi' ? 'युवाओं की पसंद (Youth 18-25)' : 'Youth Favorites (18-25)'}</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-sm font-black text-amber-950 dark:text-amber-100 truncate">
              {demographicStats.youthTopProduct?.productName || 'Kulhad Lassi / Chaas'}
            </div>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-bold">
              {demographicStats.youthTopProduct ? `${demographicStats.youthTopProduct.byAge['Youth (18-25)']?.qty || 0} ${demographicStats.youthTopProduct.unit} (₹${demographicStats.youthTopProduct.byAge['Youth (18-25)']?.revenue || 0})` : 'High Refreshment Demand'}
            </div>
            <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              {language === 'mr' ? 'लस्सी, ताक व मिठाईची जास्त मागणी' : language === 'hi' ? 'लस्सी, छाछ व मिठाई की ज्यादा मांग' : 'Lassi, Chaas & Quick Treats'}
            </div>
          </div>

          {/* Seniors Favorite Card */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/40 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-teal-800 dark:text-teal-300">
              <span>{language === 'mr' ? 'ज्येष्ठांची पसंती (Seniors 45+)' : language === 'hi' ? 'वरिष्ठ नागरिकों की पसंद (45+)' : 'Seniors Favorites (45+)'}</span>
              <Heart className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-sm font-black text-teal-950 dark:text-teal-100 truncate">
              {demographicStats.seniorsTopProduct?.productName || 'Desi Cow Milk / Pure Ghee'}
            </div>
            <div className="text-xs text-teal-700 dark:text-teal-400 font-bold">
              {demographicStats.seniorsTopProduct ? `${demographicStats.seniorsTopProduct.byAge['Seniors (45+)']?.qty || 0} ${demographicStats.seniorsTopProduct.unit} (₹${demographicStats.seniorsTopProduct.byAge['Seniors (45+)']?.revenue || 0})` : 'Pure Health Focus'}
            </div>
            <div className="text-[11px] text-teal-800/80 dark:text-teal-300/80">
              {language === 'mr' ? 'गाईचे दूध व शुद्ध साजूक तूप प्राधान्य' : language === 'hi' ? 'गाय का दूध व शुद्ध देसी घी प्राथमिकता' : 'Cow Milk & Pure Ghee focus'}
            </div>
          </div>

        </div>

        {/* Detailed "Who Buys What" Product-Level Demographics Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {t('whoBuysWhat')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {t('whoBuysWhatSub')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#24352F]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">{language === 'mr' ? 'उत्पादन (Product)' : language === 'hi' ? 'उत्पाद (Product)' : 'Product'}</th>
                  <th className="py-3 px-3 text-right">{language === 'mr' ? 'एकूण विक्री' : language === 'hi' ? 'कुल बिक्री' : 'Total Sales'}</th>
                  <th className="py-3 px-4">{language === 'mr' ? 'लिंगानुसार वाटा (Gender Ratio)' : language === 'hi' ? 'जेंडर अनुसार (Gender Ratio)' : 'Gender Ratio'}</th>
                  <th className="py-3 px-4">{language === 'mr' ? 'वय गटानुसार वाटा (Age Demographics)' : language === 'hi' ? 'आयु वर्ग अनुसार (Age Demographics)' : 'Age Breakdown'}</th>
                  <th className="py-3 px-4">{language === 'mr' ? 'मुख्य ग्राहक गट' : language === 'hi' ? 'मुख्य ग्राहक वर्ग' : 'Primary Buyer Profile'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F] bg-white dark:bg-[#131F1B]">
                {demographicStats.productAffinityList.map((item, idx) => {
                  const mQty = item.byGender['Male']?.qty || 0;
                  const fQty = item.byGender['Female']?.qty || 0;
                  const oQty = item.byGender['Other']?.qty || 0;
                  const totalGQty = mQty + fQty + oQty || 1;
                  const mPercent = Math.round((mQty / totalGQty) * 100);
                  const fPercent = Math.round((fQty / totalGQty) * 100);

                  // Find primary demographic
                  let topGender = mPercent >= fPercent ? (language === 'mr' ? '👨 पुरुष' : language === 'hi' ? '👨 पुरुष' : '👨 Male') : (language === 'mr' ? '👩 महिला' : language === 'hi' ? '👩 महिला' : '👩 Female');
                  let maxAgeGroup = 'Adults (26-45)';
                  let maxAgeVal = -1;
                  Object.entries(item.byAge).forEach(([grp, data]) => {
                    if (data.qty > maxAgeVal) {
                      maxAgeVal = data.qty;
                      maxAgeGroup = grp;
                    }
                  });

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="truncate max-w-[200px]">{item.productName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {item.totalQty.toFixed(1)} {item.unit}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 min-w-[170px]">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold mb-1">
                          <span className="text-blue-600 dark:text-blue-400">👨 {mPercent}%</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-pink-600 dark:text-pink-400">👩 {fPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-[#1A2A25] rounded-full h-1.5 flex overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: `${mPercent}%` }} />
                          <div className="bg-pink-500 h-full" style={{ width: `${fPercent}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.byAge).map(([grp, data]) => {
                            if (data.qty <= 0) return null;
                            const shortLabel = grp.includes('<18') ? '<18' : grp.includes('18-25') ? '18-25' : grp.includes('26-45') ? '26-45' : '45+';
                            return (
                              <span
                                key={grp}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${grp === maxAgeGroup
                                    ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60 font-bold'
                                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                                  }`}
                              >
                                {shortLabel}: {data.qty.toFixed(1)} {item.unit}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                          {topGender} • {maxAgeGroup.split(' ')[0]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

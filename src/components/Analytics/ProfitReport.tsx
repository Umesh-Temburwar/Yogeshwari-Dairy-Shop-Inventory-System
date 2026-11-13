import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import {
  Sparkles,
  Trophy,
  ShoppingBag,
  Printer,
  Users,
  UserCheck,
  TrendingUp,
  Heart,
  Download,
  Eye
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, KpiCard, Button, Badge, StatusBadge } from '../ui';

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

  const revKey = language === 'mr' ? 'कमाई' : language === 'hi' ? 'कमाई' : 'Revenue';
  const profKey = language === 'mr' ? 'नफा' : language === 'hi' ? 'मुनाफा' : 'Profit';

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
      'Kids (<18)': { count: 0, revenue: 0, qty: 0 },
      'Youth (18-25)': { count: 0, revenue: 0, qty: 0 },
      'Adults (26-45)': { count: 0, revenue: 0, qty: 0 },
      'Senior (45+)': { count: 0, revenue: 0, qty: 0 }
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
              'Kids (<18)': { qty: 0, revenue: 0 },
              'Youth (18-25)': { qty: 0, revenue: 0 },
              'Adults (26-45)': { qty: 0, revenue: 0 },
              'Senior (45+)': { qty: 0, revenue: 0 }
            }
          };
        }

        const pd = productDemographics[item.product_name];
        pd.totalRevenue += item.total_price;
        pd.totalQty += item.quantity;
        if (pd.byGender[gender]) {
          pd.byGender[gender].qty += item.quantity;
          pd.byGender[gender].revenue += item.total_price;
        }
        if (pd.byAge[ageGroup]) {
          pd.byAge[ageGroup].qty += item.quantity;
          pd.byAge[ageGroup].revenue += item.total_price;
        }
      });
    });

    const topAgeGroup = Object.entries(ageGroupStats).reduce((max, [group, data]) => {
      return data.revenue > max.revenue ? { name: group, revenue: data.revenue, count: data.count } : max;
    }, { name: 'Adults (26-45)', revenue: 0, count: 0 });

    const topAgePercentage = totalRevenue > 0 ? Math.round((topAgeGroup.revenue / totalRevenue) * 100) : 0;

    const productAffinityList = Object.values(productDemographics).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const youthTopProduct = productAffinityList.slice().sort((a, b) => {
      const aYouth = a.byAge['Youth (18-25)']?.revenue || 0;
      const bYouth = b.byAge['Youth (18-25)']?.revenue || 0;
      return bYouth - aYouth;
    })[0];

    const seniorsTopProduct = productAffinityList.slice().sort((a, b) => {
      const aSenior = a.byAge['Senior (45+)']?.revenue || 0;
      const bSenior = b.byAge['Senior (45+)']?.revenue || 0;
      return bSenior - aSenior;
    })[0];

    return {
      totalSalesCount,
      totalRevenue,
      genderStats,
      ageGroupStats,
      productAffinityList,
      topAgeGroup: {
        ...topAgeGroup,
        percentage: topAgePercentage
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

  const getPLReportPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दुकान नफा-तोटा व व्यवसाय विश्लेषण अहवाल' : isHi ? 'दुकान लाभ-हानि व व्यापार विश्लेषण रिपोर्ट' : 'Dairy Profit & Loss Statement & Sales Intelligence Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'कालावधी आर्थिक ताळेबंद विवरणपत्र' : isHi ? 'अवधि वित्तीय स्थिति विवरणपत्र' : 'Period Financial Statement',
      language,
      kpis: [
        { label: isMr ? 'एकूण विक्री' : isHi ? 'कुल बिक्री' : 'Revenue', value: `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, color: 'emerald' },
        { label: isMr ? 'स्थूल नफा' : isHi ? 'सकल लाभ' : 'Gross Profit', value: `₹${metrics.grossProfit.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'एकूण खर्च व नुकसान' : isHi ? 'कुल खर्च व नुकसान' : 'Expenses & Loss', value: `₹${(metrics.operatingExpenses + metrics.totalDamagesLoss).toLocaleString('en-IN')}`, color: 'rose' },
        { label: isMr ? 'निव्वळ नफा' : isHi ? 'शुद्ध लाभ' : 'Net Profit', value: `₹${metrics.netProfit.toLocaleString('en-IN')}`, color: metrics.netProfit >= 0 ? 'emerald' : 'rose' }
      ],
      tables: [
        {
          heading: isMr ? '१. नफा-तोटा ताळेबंद तपशील' : isHi ? '१. लाभ-हानि खाता विवरण' : '1. Profit & Loss Summary Breakdown',
          data: {
            headers: isMr 
              ? ['आर्थिक बाबी तपशील', 'रक्कम (₹)', 'टक्केवारी / हिस्सा']
              : isHi
              ? ['वित्तीय मद विवरण', 'राशि (₹)', 'प्रतिशत / अनुपात']
              : ['Financial Line Item', 'Amount (₹)', 'Share / Ratio'],
            alignments: ['left', 'right', 'right'] as ('left' | 'right')[],
            rows: [
              [isMr ? '(+) एकूण विक्री कमाई' : isHi ? '(+) कुल बिक्री आय' : '(+) Total Sales Revenue', `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`, '100.0%'],
              [isMr ? '(-) विकलेल्या मालाचा मूळ खरेदी खर्च' : isHi ? '(-) बेचे गए माल की मूल लागत' : '(-) Cost of Goods Sold (COGS)', `₹${metrics.totalCOGS.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalCOGS / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              [isMr ? '(=) स्थूल नफा' : isHi ? '(=) सकल लाभ' : '(=) Gross Profit', `₹${metrics.grossProfit.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.grossProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              [isMr ? '(-) दुकान दैनंदिन चालू खर्च' : isHi ? '(-) दुकान दैनिक परिचालन व्यय' : '(-) Operating Expenses', `₹${metrics.operatingExpenses.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.operatingExpenses / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              [isMr ? '(-) नासलेले दूध व खराब माल नुकसान' : isHi ? '(-) खराब दूध व नुकसान माल' : '(-) Damages & Spoilage Loss', `₹${metrics.totalDamagesLoss.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.totalDamagesLoss / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              [isMr ? '(-) ग्राहक माल परतावा रिफंड' : isHi ? '(-) ग्राहक वापसी रिफंड' : '(-) Customer Returns Refund', `₹${(metrics.totalRefundAmount || 0).toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${(((metrics.totalRefundAmount || 0) / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'],
              [isMr ? '(+) सप्लायरकडून मिळालेला परतावा' : isHi ? '(+) सप्लायर से प्राप्त रिफंड' : '(+) Supplier Refund Received', `+₹${(metrics.totalSupplierRefundReceived || 0).toLocaleString('en-IN')}`, '—'],
              [isMr ? '(=) अंतिम निव्वळ शिल्लक नफा' : isHi ? '(=) अंतिम शुद्ध मुनाफा' : '(=) Net Profit', `₹${metrics.netProfit.toLocaleString('en-IN')}`, metrics.totalSalesRevenue > 0 ? `${((metrics.netProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%']
            ]
          }
        },
        {
          heading: isMr ? '२. उत्पादननिहाय नफा व विक्री कामगिरी' : isHi ? '२. उत्पाद अनुसार लाभ व बिक्री प्रदर्शन' : '2. Product Performance & Margins',
          data: {
            headers: isMr 
              ? ['उत्पादनाचे नाव', 'विक्री प्रमाण', 'कमाई (₹)', 'खर्च (₹)', 'नफा (₹)', 'नफा मार्जिन']
              : isHi
              ? ['उत्पाद नाम', 'बिक्री मात्रा', 'आय (₹)', 'लागत (₹)', 'लाभ (₹)', 'लाभ मार्जिन']
              : ['Product Name', 'Sold Qty', 'Revenue (₹)', 'Cost (₹)', 'Profit (₹)', 'Margin %'],
            alignments: ['left', 'right', 'right', 'right', 'right', 'right'] as ('left' | 'right')[],
            rows: productPerformance.map(p => [
              p.name,
              `${p.quantity} ${p.unit}`,
              `₹${p.revenue.toLocaleString('en-IN')}`,
              `₹${Math.round(p.cost).toLocaleString('en-IN')}`,
              `₹${Math.round(p.profit).toLocaleString('en-IN')}`,
              p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%'
            ]),
            summaryRow: [
              isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
              `${productPerformance.length} ${isMr ? 'उत्पादने' : isHi ? 'उत्पाद' : 'Products'}`,
              `₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`,
              `₹${metrics.totalCOGS.toLocaleString('en-IN')}`,
              `₹${metrics.grossProfit.toLocaleString('en-IN')}`,
              metrics.totalSalesRevenue > 0 ? `${((metrics.grossProfit / metrics.totalSalesRevenue) * 100).toFixed(1)}%` : '0%'
            ]
          }
        }
      ],
      notes: isMr 
        ? 'योगेश्वरी डेअरी अधिकृत आर्थिक विवरणपत्र. हिशोब व कर सल्ल्यासाठी वैध.'
        : isHi
        ? 'योगेश्वरी डेरी अधिकृत वित्तीय विवरणपत्र। लेखा व कर उद्देश्य हेतु वैध।'
        : 'Yogeshwari Dairy official financial audit statement. Valid for accounting and taxation.'
    };
  };

  const handleViewPLPDF = () => {
    viewReportPDF(getPLReportPayload());
  };

  const handlePrintPLPDF = () => {
    printReport(getPLReportPayload());
  };

  const handleDownloadPLPDF = () => {
    downloadReportPDF(getPLReportPayload());
  };

  return (
    <div className="space-y-5">

      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ink-2" />
            <span>
              {language === 'mr' ? 'नफा आणि व्यवसाय विश्लेषण अहवाल' : language === 'hi' ? 'लाभ और व्यापार विश्लेषण रिपोर्ट' : 'Profit & Loss Statement & Intelligence'}
            </span>
          </h2>
          <p className="text-xs text-ink-3 font-medium mt-1">
            {language === 'mr'
              ? 'निव्वळ नफा आणि कोणत्या मालातून सर्वाधिक नफा मिळतो याचे संपूर्ण विश्लेषण'
              : language === 'hi'
                ? 'शुद्ध मुनाफा एवं कौनसे माल से सर्वाधिक लाभ मिलता है उसका पूरा विश्लेषण'
                : 'Comprehensive Net Profit analysis and product-level margin breakdown'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewPLPDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title={language === 'mr' ? 'अहवाल पहा' : language === 'hi' ? 'रिपोर्ट देखें' : 'View P&L Statement PDF'}
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintPLPDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Official P&L Statement"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPLPDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download Official P&L Statement PDF"
          >
            PDF
          </Button>
        </div>
      </Card>

      {/* Time Filter */}
      <PeriodFilter />

      {/* PROFIT & LOSS STATEMENT CARD */}
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-ink">
              {t('plStatement')}
            </h3>
            <span className="text-xs text-ink-3 font-medium">
              {language === 'mr'
                ? 'फॉर्म्युला: विक्री - खरेदी खर्च - दुकानाचे खर्च - नासाडी नुकसान'
                : language === 'hi'
                  ? 'फॉर्मूला: बिक्री - खरीद लागत - दुकान खर्च - डैमेज नुकसान'
                  : 'Formula: Revenue - Cost of Goods - Operating Expenses - Spoilage'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-ink-3 block">
              {language === 'mr' ? 'निव्वळ नफा:' : language === 'hi' ? 'शुद्ध मुनाफा:' : 'Net Profit:'}
            </span>
            <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-ink">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Step-by-Step Breakdown Table */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 font-semibold text-ink">
            <span>
              1. {language === 'mr' ? 'एकूण विक्री महसूल:' : language === 'hi' ? 'कुल बिक्री आय:' : 'Total Sales Revenue:'}
            </span>
            <span className="tabular-nums font-semibold">+₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-1.5 text-ink-3">
            <span className="pl-3">&bull; {language === 'mr' ? 'रोख जमा:' : language === 'hi' ? 'रोकड़ जमा:' : 'Cash Collected:'}</span>
            <span className="font-medium text-ink tabular-nums">₹{metrics.cashCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-1.5 text-ink-3">
            <span className="pl-3">&bull; {language === 'mr' ? 'ऑनलाईन UPI जमा:' : language === 'hi' ? 'ऑनलाइन UPI जमा:' : 'Online UPI Collected:'}</span>
            <span className="font-medium text-ink tabular-nums">₹{metrics.onlineCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink-2 font-medium">
            <span>2. {language === 'mr' ? 'वजा: विकलेल्या मालाचा मूळ खरेदी खर्च:' : language === 'hi' ? 'घटाएं: बेचे गए माल की मूल खरीद लागत:' : 'Less: Cost of Goods Sold (COGS):'}</span>
            <span className="font-semibold text-danger tabular-nums">-₹{metrics.cogs.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink font-semibold">
            <span>= {language === 'mr' ? 'स्थूल नफा (Gross Profit):' : language === 'hi' ? 'सकल लाभ (Gross Profit):' : 'Gross Profit:'}</span>
            <span className="tabular-nums font-semibold">₹{metrics.grossProfit.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink-2 font-medium">
            <span>3. {language === 'mr' ? 'वजा: दुकानाचे दैनंदिन खर्च:' : language === 'hi' ? 'घटाएं: दुकान के दैनिक संचालन खर्च:' : 'Less: Operating Expenses:'}</span>
            <span className="font-semibold text-danger tabular-nums">-₹{metrics.operatingExpenses.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink-2 font-medium">
            <span>4. {language === 'mr' ? 'वजा: नासलेला व खराब माल नुकसान:' : language === 'hi' ? 'घटाएं: खराब माल व दूध का नुकसान:' : 'Less: Spoilage & Damaged Goods Loss:'}</span>
            <span className="font-semibold text-danger tabular-nums">-₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}</span>
          </div>

          {(metrics.totalRefundAmount || 0) > 0 && (
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink-2 font-medium">
              <span>5. {language === 'mr' ? 'वजा: ग्राहक माल परतावा रिफंड:' : language === 'hi' ? 'घटाएं: ग्राहक सामान वापसी रिफंड:' : 'Less: Customer Returns & Refunds:'}</span>
              <span className="font-semibold text-danger tabular-nums">-₹{metrics.totalRefundAmount.toLocaleString('en-IN')}</span>
            </div>
          )}

          {(metrics.totalSupplierRefundReceived || 0) > 0 && (
            <div className="flex justify-between items-center p-3 rounded-xl bg-surface-2 text-ink font-medium">
              <span>6. {language === 'mr' ? 'अधिक: सप्लायरकडून मिळालेला परतावा:' : language === 'hi' ? 'जोड़ें: सप्लायर से प्राप्त रिफंड:' : 'Add: Supplier Refunds & Compensations:'}</span>
              <span className="font-semibold text-ok tabular-nums">+₹{metrics.totalSupplierRefundReceived.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline p-4 sm:p-5 rounded-2xl bg-accent text-accent-fg font-semibold text-sm shadow-card mt-3">
            <div>
              <span className="text-base block">{t('netPocketProfit')}</span>
              <span className="text-[11px] opacity-75 font-normal">
                {language === 'mr' ? 'सर्व खर्च, खरेदी आणि नुकसान वजा करून' : language === 'hi' ? 'सभी खर्चे व नुकसान निकालने के बाद' : 'After all expenses, wholesale costs, and spoilage'}
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-semibold tabular-nums">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </Card>

      {/* TOP SELLING PRODUCTS & BEST SELLERS INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Visual Bar Chart */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-ink-2" />
              <h3 className="font-semibold text-ink text-sm sm:text-base">
                {language === 'mr' ? 'सर्वाधिक महसूल देणारी उत्पादने' : language === 'hi' ? 'सर्वाधिक कमाई देने वाले उत्पाद' : 'Highest Revenue Products'}
              </h3>
            </div>
            <p className="text-xs text-ink-3 font-medium">
              Revenue vs Net Profit per dairy item
            </p>
          </div>

          <div className="h-64 w-full my-4">
            {topProductsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#262628' : '#E6E3DC'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#b4b1aa' : '#55534e' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#b4b1aa' : '#55534e' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{
                      backgroundColor: isDark ? '#151516' : '#ffffff',
                      borderColor: isDark ? '#262628' : '#e6e3dc',
                      borderRadius: '12px',
                      color: isDark ? '#f3f1ec' : '#18181a',
                      boxShadow: '0 8px 30px rgb(0 0 0 / .08)'
                    }}
                  />
                  <Bar dataKey={revKey} fill={isDark ? '#F3F1EC' : '#18181A'} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey={profKey} fill={isDark ? '#7D7A73' : '#8A8780'} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-ink-3 text-xs">
                {language === 'mr' ? 'माहिती उपलब्ध नाही' : language === 'hi' ? 'डेटा उपलब्ध नहीं' : 'No data available'}
              </div>
            )}
          </div>

          <div className="text-[11px] text-ink-3 flex items-center justify-between border-t border-line pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-accent rounded" /> {language === 'mr' ? 'एकूण कमाई' : language === 'hi' ? 'कुल कमाई' : 'Total Revenue'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-ink-3 rounded" /> {language === 'mr' ? 'त्यातील निव्वळ नफा' : language === 'hi' ? 'उसमें से शुद्ध मुनाफा' : 'Net Profit'}
            </span>
          </div>
        </Card>

        {/* Detailed Item Ranking Table */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-ink-2" />
              <h3 className="font-semibold text-ink text-sm sm:text-base">
                {language === 'mr' ? 'माल विक्री रँकिंग (Leaderboard)' : language === 'hi' ? 'माल बिक्री रैंकिंग (Leaderboard)' : 'Dairy Sales Leaderboard'}
              </h3>
            </div>
            <p className="text-xs text-ink-3 font-medium">
              {language === 'mr' ? 'रँक १ ते १० कोणता माल जास्त खपला' : language === 'hi' ? 'रैंक 1 से 10 तक कौनसा माल कितना बिका' : 'Rank 1 to 10 best-selling items'}
            </p>
          </div>

          <div className="space-y-2 my-3 max-h-72 overflow-y-auto pr-1">
            {productPerformance.map((prod, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-surface-2/60 text-xs hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-surface border border-line flex items-center justify-center font-semibold text-xs shrink-0 text-ink">
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-medium text-ink block truncate">{prod.name}</span>
                    <span className="text-[11px] text-ink-3 font-medium">
                      {language === 'mr' ? 'विक्री:' : language === 'hi' ? 'बिक्री:' : 'Sold:'} {prod.quantity.toFixed(1)} {prod.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-semibold text-ink block tabular-nums">
                    ₹{prod.revenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-ok font-medium block tabular-nums">
                    +{Math.round(prod.profit).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-line text-[11px] text-ink-3 flex justify-between">
            <span>{language === 'mr' ? 'एकूण उत्पादने:' : language === 'hi' ? 'कुल उत्पाद:' : 'Total Products:'} <b className="text-ink">{productPerformance.length}</b></span>
            <span className="font-medium text-ink">
              {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक मागणीत' : language === 'hi' ? 'दूध & पनीर सबसे अधिक मांग में' : 'Milk & Paneer in highest demand'}
            </span>
          </div>
        </Card>

      </div>

      {/* CUSTOMER DEMOGRAPHICS & PRODUCT PREFERENCE INTELLIGENCE */}
      <Card className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-surface-2 text-ink-2">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                {t('demographicsTitle')}
              </h3>
              <p className="text-xs text-ink-3 font-medium">
                {t('demographicsSub')}
              </p>
            </div>
          </div>

          <Badge variant="default" className="text-xs font-semibold">
            {demographicStats.totalSalesCount} {language === 'mr' ? 'ग्राहक नोंदी' : language === 'hi' ? 'ग्राहक रिकॉर्ड' : 'Customer Bills'}
          </Badge>
        </div>

        {/* Demographic KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Gender Ratio Card */}
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-ink-3">
              <span>{t('genderBreakdown')}</span>
              <UserCheck className="w-4 h-4 text-ink-3" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-ink">
                👨 {maleShare}%
              </span>
              <span className="text-xs text-ink-3">|</span>
              <span className="text-lg font-semibold text-ink">
                👩 {femaleShare}%
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 flex overflow-hidden border border-line">
              <div className="bg-accent h-full" style={{ width: `${maleShare}%` }} />
              <div className="bg-ink-3 h-full" style={{ width: `${femaleShare}%` }} />
              <div className="bg-line h-full" style={{ width: `${otherShare}%` }} />
            </div>
            <div className="text-[11px] text-ink-3 flex justify-between tabular-nums">
              <span>👨 ₹{demographicStats.genderStats['Male']?.revenue.toLocaleString('en-IN') || 0}</span>
              <span>👩 ₹{demographicStats.genderStats['Female']?.revenue.toLocaleString('en-IN') || 0}</span>
            </div>
          </div>

          {/* Top Age Segment Card */}
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-ink-3">
              <span>{t('topBuyerAge')}</span>
              <TrendingUp className="w-4 h-4 text-ink-3" />
            </div>
            <div className="text-base font-semibold text-ink truncate">
              {demographicStats.topAgeGroup.name}
            </div>
            <div className="text-xs font-medium text-ink tabular-nums">
              {demographicStats.topAgeGroup.percentage}% {language === 'mr' ? 'एकूण विक्री' : language === 'hi' ? 'कुल बिक्री' : 'of sales'} (₹{demographicStats.topAgeGroup.revenue.toLocaleString('en-IN')})
            </div>
            <div className="text-[11px] text-ink-3">
              {language === 'mr' ? 'दुधाचे मुख्य घरगुती खरेदीदार' : language === 'hi' ? 'दूध के मुख्य घरेलू खरीदार' : 'Core household buyers'}
            </div>
          </div>

          {/* Youth Favorite Card */}
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-ink-3">
              <span>{language === 'mr' ? 'तरुणांची पसंती (18-25)' : language === 'hi' ? 'युवाओं की पसंद (18-25)' : 'Youth Favorites (18-25)'}</span>
              <Sparkles className="w-4 h-4 text-ink-3" />
            </div>
            <div className="text-base font-semibold text-ink truncate">
              {demographicStats.youthTopProduct?.productName || 'Lassi / Chaas'}
            </div>
            <div className="text-xs font-medium text-ink tabular-nums">
              {demographicStats.youthTopProduct ? `${demographicStats.youthTopProduct.byAge['Youth (18-25)']?.qty || 0} ${demographicStats.youthTopProduct.unit} (₹${demographicStats.youthTopProduct.byAge['Youth (18-25)']?.revenue || 0})` : 'High Demand'}
            </div>
            <div className="text-[11px] text-ink-3">
              {language === 'mr' ? 'लस्सी, ताक व मिठाईची जास्त मागणी' : language === 'hi' ? 'लस्सी, छाछ व मिठाई' : 'Lassi, Chaas & Sweets'}
            </div>
          </div>

          {/* Seniors Favorite Card */}
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-ink-3">
              <span>{language === 'mr' ? 'ज्येष्ठांची पसंती (45+)' : language === 'hi' ? 'वरिष्ठ नागरिक (45+)' : 'Seniors Favorites (45+)'}</span>
              <Heart className="w-4 h-4 text-ink-3" />
            </div>
            <div className="text-base font-semibold text-ink truncate">
              {demographicStats.seniorsTopProduct?.productName || 'Cow Milk / Ghee'}
            </div>
            <div className="text-xs font-medium text-ink tabular-nums">
              {demographicStats.seniorsTopProduct ? `${demographicStats.seniorsTopProduct.byAge['Senior (45+)']?.qty || 0} ${demographicStats.seniorsTopProduct.unit} (₹${demographicStats.seniorsTopProduct.byAge['Senior (45+)']?.revenue || 0})` : 'Pure Health Focus'}
            </div>
            <div className="text-[11px] text-ink-3">
              {language === 'mr' ? 'गाईचे दूध व शुद्ध साजूक तूप' : language === 'hi' ? 'गाय का दूध व शुद्ध घी' : 'Cow Milk & Pure Ghee'}
            </div>
          </div>

        </div>

        {/* Detailed "Who Buys What" Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-ink text-sm">
                {t('whoBuysWhat')}
              </h4>
              <p className="text-xs text-ink-3 font-medium">
                {t('whoBuysWhatSub')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-2/60 border-b border-line text-ink-3 uppercase text-[10px] tracking-wider font-medium">
                  <th className="py-2.5 px-4">{language === 'mr' ? 'उत्पादन' : language === 'hi' ? 'उत्पाद' : 'Product'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'mr' ? 'विक्री' : language === 'hi' ? 'बिक्री' : 'Sales'}</th>
                  <th className="py-2.5 px-4">{language === 'mr' ? 'लिंग वाटा' : language === 'hi' ? 'जेंडर' : 'Gender'}</th>
                  <th className="py-2.5 px-4">{language === 'mr' ? 'वय गट' : language === 'hi' ? 'आयु वर्ग' : 'Age Breakdown'}</th>
                  <th className="py-2.5 px-4">{language === 'mr' ? 'मुख्य ग्राहक' : language === 'hi' ? 'मुख्य वर्ग' : 'Primary Buyer'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {demographicStats.productAffinityList.map((item, idx) => {
                  const mQty = item.byGender['Male']?.qty || 0;
                  const fQty = item.byGender['Female']?.qty || 0;
                  const oQty = item.byGender['Other']?.qty || 0;
                  const totalGQty = mQty + fQty + oQty || 1;
                  const mPercent = Math.round((mQty / totalGQty) * 100);
                  const fPercent = Math.round((fQty / totalGQty) * 100);

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
                    <tr key={idx} className="hover:bg-surface-2/50 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-ink">
                        <div className="truncate max-w-[200px]">{item.productName}</div>
                        <div className="text-[10px] text-ink-3">
                          {item.totalQty.toFixed(1)} {item.unit}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-ink tabular-nums">
                        ₹{item.totalRevenue.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-4 min-w-[170px]">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium mb-1 text-ink-2 tabular-nums">
                          <span>👨 {mPercent}%</span>
                          <span className="text-ink-3">/</span>
                          <span>👩 {fPercent}%</span>
                        </div>
                        <div className="w-full bg-surface-2 rounded-full h-1.5 flex overflow-hidden border border-line">
                          <div className="bg-accent h-full" style={{ width: `${mPercent}%` }} />
                          <div className="bg-ink-3 h-full" style={{ width: `${fPercent}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 min-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.byAge).map(([grp, data]) => {
                            if (data.qty <= 0) return null;
                            const shortLabel = grp.includes('<18') ? '<18' : grp.includes('18-25') ? '18-25' : grp.includes('26-45') ? '26-45' : '45+';
                            return (
                              <span
                                key={grp}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  grp === maxAgeGroup
                                    ? 'bg-surface shadow-card text-ink border border-line font-semibold'
                                    : 'bg-surface-2 text-ink-3'
                                }`}
                              >
                                {shortLabel}: {data.qty.toFixed(1)} {item.unit}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="default" className="text-[10px]">
                          {topGender} • {maxAgeGroup.split(' ')[0]}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

    </div>
  );
};

export default ProfitReport;

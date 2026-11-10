import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { format, subDays } from 'date-fns';

export const SalesProfitChart: React.FC = () => {
  const { sales, purchases, expenses } = useStore();
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const salesLabel = t('salesLegend');
  const purchaseLabel = t('purchaseLegend');
  const profitLabel = t('profitLegend');

  // Colors adapted for dark/light themes
  const colors = {
    sales: isDark ? '#34D399' : '#10b981',
    purchase: isDark ? '#60A5FA' : '#3b82f6',
    profit: isDark ? '#FBBF24' : '#f59e0b',
    grid: isDark ? '#24352F' : '#f1f5f9',
    axis: isDark ? '#8FA69C' : '#64748b',
    tooltipBg: isDark ? '#131F1B' : '#ffffff',
    tooltipBorder: isDark ? '#24352F' : '#e2e8f0',
    tooltipText: isDark ? '#E7F0EC' : '#0f172a',
  };

  // Generate last 7 days chart data
  let totalDataPoints = 0;
  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const targetDate = subDays(new Date(), 6 - index);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const displayLabel = format(targetDate, 'dd MMM');

    // Sales on this date
    const daySales = sales
      .filter(s => s.sale_date === dateStr)
      .reduce((sum, s) => sum + s.net_amount, 0);

    // Purchases on this date
    const dayPurchases = purchases
      .filter(p => p.purchase_date === dateStr)
      .reduce((sum, p) => sum + p.total_amount, 0);

    // Expenses on this date
    const dayExpenses = expenses
      .filter(e => e.expense_date === dateStr && !e.is_capital_investment)
      .reduce((sum, e) => sum + e.amount, 0);

    // Approximate profit
    const dayProfit = Math.max(0, daySales - (daySales * 0.72) - dayExpenses);

    if (daySales > 0 || dayPurchases > 0 || dayProfit > 0) {
      totalDataPoints++;
    }

    return {
      date: displayLabel,
      [salesLabel]: daySales,
      [purchaseLabel]: dayPurchases,
      [profitLabel]: Math.round(dayProfit)
    };
  });

  return (
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between h-full transition-colors duration-150">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC]">
            {t('trendTitle')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' ? 'दैनिक विक्री वि. खरेदी वि. अंदाजित नफा' : language === 'hi' ? 'दैनिक बिक्री बनाम खरीद व शुद्ध लाभ' : 'Daily Sales vs Purchases vs Estimated Profit'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        {totalDataPoints > 0 ? (
          <ResponsiveContainer width="100%" height="100%" key={`bar-${resolvedTheme}`}>
            <BarChart 
              data={chartData} 
              barGap={4}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: colors.axis }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 11, fill: colors.axis }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
              />
              <Tooltip 
                formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                contentStyle={{ 
                  backgroundColor: colors.tooltipBg, 
                  borderColor: colors.tooltipBorder, 
                  color: colors.tooltipText,
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  fontSize: '12px'
                }}
                itemStyle={{ color: colors.tooltipText }}
                labelStyle={{ color: colors.tooltipText, fontWeight: 'bold' }}
              />
              <Legend 
                formatter={(value) => (
                  <span style={{ color: isDark ? '#E7F0EC' : '#1e293b', fontWeight: 600 }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ 
                  fontSize: '12px', 
                  paddingTop: '12px',
                }} 
              />
              <Bar dataKey={salesLabel} fill={colors.sales} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={28} />
              <Bar dataKey={purchaseLabel} fill={colors.purchase} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={28} />
              <Bar dataKey={profitLabel} fill={colors.profit} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-[#8FA69C] text-xs">
            <p>{language === 'mr' ? 'या कालावधीत कोणताही व्यवहार नोंदवला नाही' : language === 'hi' ? 'इस अवधि में कोई लेनदेन नहीं मिला' : 'No transactions recorded for this period'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

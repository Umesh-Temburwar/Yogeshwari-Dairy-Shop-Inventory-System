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
import { Card } from '../ui';

export const SalesProfitChart: React.FC = () => {
  const { sales, purchases, expenses } = useStore();
  const { t, language } = useLanguage();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const salesLabel = t('salesLegend');
  const purchaseLabel = t('purchaseLegend');
  const profitLabel = t('profitLegend');

  // Sophisticated minimal palette
  const colors = {
    sales: isDark ? '#F3F1EC' : '#18181A',
    purchase: isDark ? '#7D7B76' : '#8A8780',
    profit: isDark ? '#6EBD94' : '#3F7D5C',
    grid: isDark ? '#262628' : '#E6E3DC',
    axis: isDark ? '#7D7B76' : '#8A8780',
    tooltipBg: isDark ? '#151516' : '#FFFFFF',
    tooltipBorder: isDark ? '#262628' : '#E6E3DC',
    tooltipText: isDark ? '#F3F1EC' : '#18181A',
  };

  let totalDataPoints = 0;
  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const targetDate = subDays(new Date(), 6 - index);
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    const displayLabel = format(targetDate, 'dd MMM');

    const daySales = sales
      .filter(s => s.sale_date === dateStr)
      .reduce((sum, s) => sum + s.net_amount, 0);

    const dayPurchases = purchases
      .filter(p => p.purchase_date === dateStr)
      .reduce((sum, p) => sum + p.total_amount, 0);

    const dayExpenses = expenses
      .filter(e => e.expense_date === dateStr && !e.is_capital_investment)
      .reduce((sum, e) => sum + e.amount, 0);

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
    <Card className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {t('trendTitle')}
          </h3>
          <p className="text-xs text-ink-3 font-normal mt-0.5">
            {language === 'mr' ? 'दैनिक विक्री, खरेदी व नफा' : 'Daily Sales vs Purchases vs Profit'}
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
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  fontSize: '12px'
                }}
                itemStyle={{ color: colors.tooltipText }}
                labelStyle={{ color: colors.tooltipText, fontWeight: 600 }}
              />
              <Legend 
                formatter={(value) => (
                  <span style={{ color: colors.tooltipText, fontSize: '11px', fontWeight: 500 }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ 
                  fontSize: '11px', 
                  paddingTop: '12px',
                }} 
              />
              <Bar dataKey={salesLabel} fill={colors.sales} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={24} />
              <Bar dataKey={purchaseLabel} fill={colors.purchase} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={24} />
              <Bar dataKey={profitLabel} fill={colors.profit} radius={[4, 4, 0, 0]} minPointSize={3} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-ink-3 text-xs">
            <p>{language === 'mr' ? 'या कालावधीत कोणताही व्यवहार नोंदवला नाही' : 'No transactions recorded for this period'}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SalesProfitChart;

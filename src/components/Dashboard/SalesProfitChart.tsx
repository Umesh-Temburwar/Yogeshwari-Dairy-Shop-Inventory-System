import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
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
  const { language } = useLanguage();

  const salesLabel = language === 'mr' ? 'विक्री (Sales)' : language === 'hi' ? 'बिक्री (Sales)' : 'Sales';
  const purchaseLabel = language === 'mr' ? 'खरेदी (Purchases)' : language === 'hi' ? 'खरीद (Purchases)' : 'Purchases';
  const profitLabel = language === 'mr' ? 'नफा (Profit)' : language === 'hi' ? 'लाभ (Profit)' : 'Profit';

  // Generate last 7 days chart data
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

    return {
      date: displayLabel,
      [salesLabel]: daySales,
      [purchaseLabel]: dayPurchases,
      [profitLabel]: Math.round(dayProfit)
    };
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {language === 'mr' ? 'दैनिक विक्री, खरेदी आणि नफा कल (गेले ७ दिवस)' : language === 'hi' ? 'दैनिक बिक्री, खरीद और लाभ ट्रेंड (Last 7 Days)' : 'Daily Sales, Purchases & Profit Trend (Last 7 Days)'}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Daily Sales vs Purchases vs Estimated Profit
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
            <Tooltip 
              formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={salesLabel} fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey={purchaseLabel} fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey={profitLabel} fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

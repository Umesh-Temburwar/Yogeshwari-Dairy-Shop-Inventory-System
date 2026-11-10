import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Banknote, Smartphone, BookOpen } from 'lucide-react';

export const PaymentBreakdownChart: React.FC = () => {
  const { metrics } = useStore();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const total = metrics.cashCollected + metrics.onlineCollected + metrics.udharGiven || 1;
  const cashPct = Math.round((metrics.cashCollected / total) * 100);
  const onlinePct = Math.round((metrics.onlineCollected / total) * 100);
  const udharPct = Math.round((metrics.udharGiven / total) * 100);

  const cashLabel = t('cashLabel');
  const onlineLabel = t('onlineLabel');
  const udharLabel = t('udharLabel');

  const data = [
    { name: cashLabel, value: metrics.cashCollected, color: isDark ? '#60A5FA' : '#3b82f6' },
    { name: onlineLabel, value: metrics.onlineCollected, color: isDark ? '#C084FC' : '#9333ea' },
    { name: udharLabel, value: metrics.udharGiven, color: isDark ? '#FB923C' : '#f97316' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between h-full transition-colors duration-150">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC]">
            {t('paymentBreakdownTitle')}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
          Cash vs Online UPI vs Udhar Credit
        </p>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="h-44 w-full relative flex items-center justify-center my-2">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                contentStyle={{ 
                  backgroundColor: isDark ? '#131F1B' : '#ffffff', 
                  borderColor: isDark ? '#24352F' : '#e2e8f0',
                  color: isDark ? '#E7F0EC' : '#0f172a',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-slate-400 dark:text-[#8FA69C] text-xs py-8">
            No payments recorded in this period
          </div>
        )}

        {/* Centered Total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-[#8FA69C] uppercase tracking-wider">
            {t('totalIn')}
          </span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-[#E7F0EC] tabular-nums">
            ₹{(metrics.cashCollected + metrics.onlineCollected).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Equal-Width Legend Cards Below (Cash / UPI / Udhar) */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
        {/* Cash */}
        <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
            <Banknote className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{cashLabel}</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-blue-200 mt-1 tabular-nums">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{cashPct}%</div>
        </div>

        {/* UPI QR */}
        <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300">
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">UPI</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-purple-950 dark:text-purple-200 mt-1 tabular-nums">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">{onlinePct}%</div>
        </div>

        {/* Udhar Credit */}
        <div className="p-2.5 bg-orange-50/70 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/40 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-bold text-orange-700 dark:text-orange-300">
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{udharLabel}</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-orange-950 dark:text-orange-200 mt-1 tabular-nums">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">{udharPct}%</div>
        </div>
      </div>
    </div>
  );
};

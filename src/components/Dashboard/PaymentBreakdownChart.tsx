import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Banknote, Smartphone, BookOpen } from 'lucide-react';
import { Card } from '../ui';

export const PaymentBreakdownChart: React.FC = () => {
  const { metrics } = useStore();
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';

  const cashLabel = t('cashLabel');
  const onlineLabel = t('onlineLabel');
  const udharLabel = t('udharLabel');

  // Minimal monochrome with subtle tints
  const data = [
    { name: cashLabel, value: metrics.cashCollected, color: isDark ? '#F3F1EC' : '#18181A' },
    { name: onlineLabel, value: metrics.onlineCollected, color: isDark ? '#7D7B76' : '#8A8780' },
    { name: udharLabel, value: metrics.udharGiven, color: isDark ? '#E0AA50' : '#B7791F' },
  ].filter(d => d.value > 0);

  return (
    <Card className="flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-semibold text-ink">
          {t('paymentBreakdownTitle')}
        </h3>
        <p className="text-xs text-ink-3 font-normal mt-0.5">
          Cash vs Online UPI vs Udhar Credit
        </p>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="h-44 w-full relative flex items-center justify-center my-2">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" key={`pie-${resolvedTheme}`}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke={isDark ? '#151516' : '#FFFFFF'} 
                    strokeWidth={2} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                contentStyle={{ 
                  backgroundColor: isDark ? '#151516' : '#FFFFFF', 
                  borderColor: isDark ? '#262628' : '#E6E3DC',
                  color: isDark ? '#F3F1EC' : '#18181A',
                  borderRadius: '12px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  fontSize: '12px'
                }}
                itemStyle={{ color: isDark ? '#F3F1EC' : '#18181A' }}
                labelStyle={{ color: isDark ? '#F3F1EC' : '#18181A', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-ink-3 text-xs py-8">
            No payments recorded in this period
          </div>
        )}

        {/* Centered Total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-medium text-ink-3 uppercase tracking-wider">
            {t('totalIn')}
          </span>
          <span className="text-sm font-semibold text-ink tabular-nums">
            ₹{(metrics.cashCollected + metrics.onlineCollected).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Equal-Width Legend Cards Below */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line/40">
        <div className="p-2 bg-surface-2 rounded-xl border border-line/30 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-medium text-ink">
            <Banknote className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span className="truncate">{cashLabel}</span>
          </div>
          <span className="text-xs font-semibold text-ink tabular-nums mt-1">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-2 bg-surface-2 rounded-xl border border-line/30 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-medium text-ink">
            <Smartphone className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span className="truncate">{onlineLabel}</span>
          </div>
          <span className="text-xs font-semibold text-ink tabular-nums mt-1">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="p-2 bg-surface-2 rounded-xl border border-line/30 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-medium text-ink">
            <BookOpen className="w-3.5 h-3.5 text-ink-3 shrink-0" />
            <span className="truncate">{udharLabel}</span>
          </div>
          <span className="text-xs font-semibold text-warn tabular-nums mt-1">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PaymentBreakdownChart;

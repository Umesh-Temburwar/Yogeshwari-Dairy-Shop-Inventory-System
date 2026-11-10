import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Banknote, Smartphone, BookOpen } from 'lucide-react';

export const PaymentBreakdownChart: React.FC = () => {
  const { metrics } = useStore();
  const { language } = useLanguage();

  const total = metrics.cashCollected + metrics.onlineCollected + metrics.udharGiven || 1;
  const cashPct = Math.round((metrics.cashCollected / total) * 100);
  const onlinePct = Math.round((metrics.onlineCollected / total) * 100);
  const udharPct = Math.round((metrics.udharGiven / total) * 100);

  const cashLabel = language === 'mr' ? 'रोख (Cash)' : language === 'hi' ? 'रोकड़ (Cash)' : 'Cash';
  const onlineLabel = language === 'mr' ? 'ऑनलाईन (UPI / QR)' : language === 'hi' ? 'ऑनलाइन (UPI / QR)' : 'Online UPI';
  const udharLabel = language === 'mr' ? 'उधार (Credit)' : language === 'hi' ? 'उधार (Credit)' : 'Udhar Credit';

  const data = [
    { name: cashLabel, value: metrics.cashCollected, color: '#3b82f6' },
    { name: onlineLabel, value: metrics.onlineCollected, color: '#9333ea' },
    { name: udharLabel, value: metrics.udharGiven, color: '#f97316' },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-slate-900">
            {language === 'mr' ? 'रोख विरुद्ध ऑनलाईन पेमेंट' : language === 'hi' ? 'रोकड़ vs ऑनलाइन भुगतान' : 'Cash vs Online Payments'}
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Cash vs Online UPI vs Udhar Credit breakdown
        </p>
      </div>

      <div className="h-44 w-full relative flex items-center justify-center my-2">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-slate-400 text-xs py-8">
            {language === 'mr' ? 'कोणतेही पेमेंट नोंदवले नाही' : language === 'hi' ? 'कोई भुगतान दर्ज नहीं है' : 'No payments in period'}
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-semibold text-slate-400">
            {language === 'mr' ? 'एकूण जमा' : language === 'hi' ? 'कुल जमा' : 'Total In'}
          </span>
          <span className="text-sm font-black text-slate-800">
            ₹{(metrics.cashCollected + metrics.onlineCollected).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Breakdown stat pills */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            <Banknote className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'रोख Cash' : language === 'hi' ? 'रोकड़ Cash' : 'Cash'}</span>
          </div>
          <div className="text-sm font-bold text-blue-900 mt-0.5">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-blue-600 font-medium">{cashPct}%</div>
        </div>

        <div className="p-2 bg-purple-50/60 rounded-xl border border-purple-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-700">
            <Smartphone className="w-3.5 h-3.5" />
            <span>UPI QR</span>
          </div>
          <div className="text-sm font-bold text-purple-900 mt-0.5">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-purple-600 font-medium">{onlinePct}%</div>
        </div>

        <div className="p-2 bg-orange-50/60 rounded-xl border border-orange-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-orange-700">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{language === 'mr' ? 'उधार' : language === 'hi' ? 'उधार' : 'Udhar'}</span>
          </div>
          <div className="text-sm font-bold text-orange-900 mt-0.5">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-orange-600 font-medium">{udharPct}%</div>
        </div>
      </div>
    </div>
  );
};

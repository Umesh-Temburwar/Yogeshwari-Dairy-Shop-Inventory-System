import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { 
  TrendingUp, 
  Sparkles, 
  Trophy, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  CheckCircle2, 
  ShoppingBag, 
  Layers, 
  Printer 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export const ProfitReport: React.FC = () => {
  const { filteredSales, filteredPurchases, filteredExpenses, filteredDamages, metrics, timeFilter } = useStore();

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

  // Chart data for top products
  const topProductsChartData = productPerformance.slice(0, 6).map(p => ({
    name: p.name.split(' (')[0],
    कमाई_Revenue: p.revenue,
    मुनाफा_Profit: Math.round(p.profit)
  }));

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>लाभ और बेस्ट सेलर माल रिपोर्ट (Profit &amp; Sales Intelligence)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            शुद्ध मुनाफा (Net Profit) एवं कौनसा माल सबसे ज़्यादा बिकता है उसका पूरा विश्लेषण
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट P&amp;L रिपोर्ट</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* PROFIT & LOSS STATEMENT CARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              दुकान लाभ-हानि खाता (Profit &amp; Loss Statement)
            </h3>
            <span className="text-xs text-slate-500">
              सटीक फॉर्मूला: बिक्री - खरीद लागत - दुकान खर्च - डैमेज नुकसान
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 block">शुद्ध जेब में आया मुनाफा:</span>
            <span className="text-3xl font-black text-emerald-700">
              ₹{metrics.netProfit.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Step-by-Step Breakdown Table */}
        <div className="space-y-2 text-xs">
          
          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 font-bold text-slate-900">
            <span className="text-sm">1. कुल बिक्री राजस्व (Total Sales Revenue):</span>
            <span className="text-base text-emerald-700">+₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600">
            <span className="pl-4">&bull; रोकड़ में आया (Cash):</span>
            <span className="font-semibold">₹{metrics.cashCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center px-4 py-2 text-slate-600">
            <span className="pl-4">&bull; ऑनलाइन UPI / QR में आया:</span>
            <span className="font-semibold">₹{metrics.onlineCollected.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50/50 text-slate-800 font-semibold border border-rose-100">
            <span>2. घटाएं: बेचे गए माल की मूल खरीद लागत (Cost of Goods Sold):</span>
            <span className="font-black text-rose-700">-₹{metrics.cogs.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 text-emerald-950 font-extrabold border border-emerald-200">
            <span>= सकल लाभ (Gross Profit Margin):</span>
            <span className="text-base text-emerald-700">₹{metrics.grossProfit.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-amber-50/50 text-slate-800 font-semibold border border-amber-100">
            <span>3. घटाएं: दुकान संचालन खर्च (Rent + Light + Petrol + Other):</span>
            <span className="font-black text-rose-700">-₹{metrics.operatingExpenses.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 text-slate-800 font-semibold">
            <span>4. घटाएं: डैमेज व खराब माल का नुकसान (Spoilage Loss):</span>
            <span className="font-black text-rose-700">-₹{metrics.totalDamagesLoss.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between items-baseline p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-extrabold text-sm shadow-md mt-4">
            <div>
              <span className="text-base block">अंतिम शुद्ध मुनाफा (Net Profit in Pocket):</span>
              <span className="text-[11px] text-emerald-100 font-normal">
                सभी खर्चे, नुकसान व खरीद लागत निकालने के बाद
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-base">
                सर्वाधिक कमाई देने वाले उत्पाद (Top Revenue Products)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Revenue vs Net Profit per dairy item
            </p>
          </div>

          <div className="h-64 w-full my-4">
            {topProductsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ borderRadius: '12px' }}
                  />
                  <Bar dataKey="कमाई_Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
                  <Bar dataKey="मुनाफा_Profit" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                डेटा उपलब्ध नहीं है
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between border-t pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded" /> कुल कमाई
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded" /> उसमें से शुद्ध मुनाफा
            </span>
          </div>
        </div>

        {/* Detailed Item Ranking Table */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                माल बिक्री रैंकिंग (Sales Leaderboard)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              रैंक 1 से 10 तक कौनसा माल कितना बिका
            </p>
          </div>

          <div className="space-y-2.5 my-3 max-h-72 overflow-y-auto pr-1">
            {productPerformance.map((prod, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200' :
                    idx === 1 ? 'bg-slate-200 text-slate-800' :
                    idx === 2 ? 'bg-amber-100 text-amber-900' : 'bg-white text-slate-600 border'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-900 block truncate">{prod.name}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      बिक्री मात्रा: {prod.quantity.toFixed(1)} {prod.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 block">
                    ₹{prod.revenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold block">
                    लाभ: +₹{Math.round(prod.profit).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>कुल बिके उत्पाद: <b>{productPerformance.length}</b></span>
            <span className="text-emerald-700 font-bold">दूध &amp; पनीर सबसे अधिक मांग में हैं</span>
          </div>
        </div>

      </div>

    </div>
  );
};


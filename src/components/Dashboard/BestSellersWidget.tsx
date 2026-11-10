import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Trophy, Flame, ArrowRight } from 'lucide-react';

export const BestSellersWidget: React.FC = () => {
  const { filteredSales, setActiveView } = useStore();
  const { t, language } = useLanguage();

  // Aggregate sales by product
  const productStats: Record<string, { name: string; quantity: number; unit: string; totalRevenue: number }> = {};

  filteredSales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productStats[item.product_name]) {
        productStats[item.product_name] = {
          name: item.product_name,
          quantity: 0,
          unit: item.unit,
          totalRevenue: 0
        };
      }
      productStats[item.product_name].quantity += item.quantity;
      productStats[item.product_name].totalRevenue += item.total_price;
    });
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  const maxRevenue = topProducts[0]?.totalRevenue || 1;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {t('bestSellersTitle')}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('analytics')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            {language === 'mr' ? 'सर्व पहा' : language === 'hi' ? 'सब देखें' : 'View All'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Highest revenue generating dairy items for selected period
        </p>
      </div>

      <div className="space-y-3.5 my-4">
        {topProducts.length > 0 ? (
          topProducts.map((item, index) => {
            const percentage = Math.round((item.totalRevenue / maxRevenue) * 100);
            return (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      index === 0 ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-200' : 
                      index === 1 ? 'bg-slate-200 text-slate-800' :
                      index === 2 ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      ₹{item.totalRevenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5">
                      ({item.quantity.toFixed(1)} {item.unit})
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            {language === 'mr' ? 'या कालावधीत विक्री सापडली नाही' : language === 'hi' ? 'चुनी गई अवधि में कोई बिक्री नहीं मिली' : 'No sales in this period'}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1 text-emerald-700 font-medium">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक वेगाने खपणारी उत्पादने आहेत' : language === 'hi' ? 'दूध & पनीर सबसे तेज़ बिकने वाले उत्पाद हैं' : 'Milk & Paneer are highest selling products'}
        </span>
      </div>
    </div>
  );
};

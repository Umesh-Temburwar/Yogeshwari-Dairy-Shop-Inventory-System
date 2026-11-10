import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Trophy, ArrowRight } from 'lucide-react';

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
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between h-full transition-colors duration-150">
      
      {/* Fixed Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/30 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
              {t('bestSellersTitle')}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('analytics')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 shrink-0"
          >
            <span>{t('viewAll')}</span> 
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium truncate">
          {t('bestSellersSubtitle')}
        </p>
      </div>

      {/* Scrollable Body (max-h-80) */}
      <div className="my-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {topProducts.length > 0 ? (
          topProducts.map((item, index) => {
            const percentage = Math.round((item.totalRevenue / maxRevenue) * 100);
            return (
              <div 
                key={index} 
                className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#1F332D] border border-slate-200/60 dark:border-[#24352F] hover:border-emerald-300 dark:hover:border-emerald-600/40 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                      index === 0 
                        ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300 dark:ring-amber-400/50 shadow-xs' : 
                      index === 1 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 ring-1 ring-slate-300 dark:ring-slate-500' :
                      index === 2 
                        ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-700' 
                        : 'bg-slate-100 dark:bg-[#283C35] text-slate-600 dark:text-[#E7F0EC] ring-1 ring-slate-200 dark:ring-[#364e45]'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-[#E7F0EC] truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                      ₹{item.totalRevenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] ml-1.5 tabular-nums">
                      ({item.quantity.toFixed(1)} {item.unit})
                    </span>
                  </div>
                </div>

                {/* Progress bar with visible dark track */}
                <div className="h-2 w-full bg-slate-200 dark:bg-[#283C35] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-emerald-400 dark:to-teal-300 rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत विक्री सापडली नाही' : language === 'hi' ? 'चुनी गई अवधि में कोई बिक्री नहीं मिली' : 'No sales recorded in this period'}
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between text-xs text-slate-500 dark:text-[#8FA69C]">
        <span className="truncate">
          {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक वेगाने खपणारी उत्पादने आहेत' : language === 'hi' ? 'दूध व पनीर सर्वाधिक बिकने वाले उत्पाद हैं' : 'Milk and paneer are highest velocity items'}
        </span>
      </div>

    </div>
  );
};

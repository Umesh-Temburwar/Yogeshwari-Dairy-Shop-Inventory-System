import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Trophy, ArrowRight } from 'lucide-react';
import { Card } from '../ui';

export const BestSellersWidget: React.FC = () => {
  const { filteredSales, setActiveView } = useStore();
  const { t, language } = useLanguage();

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
    <Card className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-ink-3" />
            <h3 className="text-sm font-semibold text-ink truncate">
              {t('bestSellersTitle')}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('analytics')}
            className="text-xs font-medium text-ink-2 hover:text-ink flex items-center gap-1 shrink-0 transition"
          >
            <span>{t('viewAll')}</span> 
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-ink-3 font-normal truncate">
          {t('bestSellersSubtitle')}
        </p>
      </div>

      <div className="my-4 space-y-2 max-h-80 overflow-y-auto pr-1">
        {topProducts.length > 0 ? (
          topProducts.map((item, index) => {
            const percentage = Math.round((item.totalRevenue / maxRevenue) * 100);
            return (
              <div 
                key={index} 
                className="p-2.5 rounded-xl bg-surface-2 border border-line/40 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-surface border border-line flex items-center justify-center font-medium text-[10px] text-ink-3 shrink-0">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-ink truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-ink tabular-nums">
                      ₹{item.totalRevenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-ink-3 ml-1.5 tabular-nums">
                      ({item.quantity.toFixed(1)} {item.unit})
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-line/30">
                  <div 
                    className="h-full bg-ink rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-ink-3 text-xs">
            {language === 'mr' ? 'या कालावधीत विक्री सापडली नाही' : language === 'hi' ? 'चुनी गई अवधि में कोई बिक्री नहीं मिली' : 'No sales recorded in this period'}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-line/40 flex items-center justify-between text-xs text-ink-3">
        <span className="truncate">
          {language === 'mr' ? 'दूध आणि पनीर सर्वाधिक वेगाने खपणारी उत्पादने आहेत' : language === 'hi' ? 'दूध व पनीर सर्वाधिक बिकने वाले उत्पाद हैं' : 'Milk and paneer are highest velocity items'}
        </span>
      </div>
    </Card>
  );
};

export default BestSellersWidget;

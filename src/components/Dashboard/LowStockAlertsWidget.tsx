import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LowStockAlertsWidget: React.FC = () => {
  const { products, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock_alert);

  return (
    <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-5 border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col justify-between h-full transition-colors duration-150">
      
      {/* Fixed Header */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shrink-0 border ${
              lowStockItems.length > 0 
                ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/30' 
                : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/30'
            }`}>
              {lowStockItems.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
              {t('stockNeedTitle')}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('reorder')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 shrink-0"
          >
            <span>{t('createOrderSheet')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium truncate">
          {t('stockNeedSubtitle')}
        </p>
      </div>

      {/* Scrollable Body (max-h-80) */}
      <div className="my-4 space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {lowStockItems.length > 0 ? (
          lowStockItems.map((item) => {
            const deficit = Math.max(0, item.min_stock_alert * 2 - item.stock_quantity);
            const isOutOfStock = item.stock_quantity <= 0;
            const displayName = 
              (language === 'mr' && item.marathi_name) ? item.marathi_name : 
              (language === 'hi' && item.hindi_name) ? item.hindi_name : 
              item.name;

            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-xl border border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 dark:bg-[#1A2A25] hover:bg-rose-50/80 dark:hover:bg-[#1F332D] hover:border-rose-300 dark:hover:border-rose-700/60 transition-all gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-[#E7F0EC] truncate">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    <span className={`font-semibold tabular-nums ${
                      isOutOfStock 
                        ? 'text-rose-600 dark:text-rose-400 font-extrabold' 
                        : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {language === 'mr' ? 'साठा:' : language === 'hi' ? 'स्टॉक:' : 'Stock:'} {item.stock_quantity} {item.unit}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                    <span className="text-slate-500 dark:text-[#8FA69C] tabular-nums">
                      {language === 'mr' ? 'किमान:' : language === 'hi' ? 'न्यूनतम:' : 'Min:'} {item.min_stock_alert} {item.unit}
                    </span>
                  </div>
                </div>

                {/* Right: Reorder chip and Buy button */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/70 tabular-nums shadow-xs">
                    {deficit.toFixed(0)} {item.unit} {t('reorderUnits')}
                  </span>
                  <button
                    onClick={() => setActiveView('purchases')}
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline"
                  >
                    + {t('addBuy')}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-emerald-700 dark:text-emerald-400 text-xs font-medium bg-emerald-50/50 dark:bg-[#1A2A25] rounded-xl border border-emerald-100 dark:border-emerald-800/40">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-1 opacity-80" />
            {language === 'mr' ? 'दुकानातील सर्व माल पुरेशा प्रमाणात उपलब्ध आहे!' : language === 'hi' ? 'दुकान में सभी माल पर्याप्त मात्रा में उपलब्ध है!' : 'All inventory stock is healthy and sufficient!'}
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-[#8FA69C] flex items-center">
          {language === 'mr' ? 'कमी साठा उत्पादने:' : language === 'hi' ? 'कुल कम स्टॉक:' : 'Low Stock Items:'} 
          <b className="text-slate-900 dark:text-white font-extrabold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] border border-slate-200/60 dark:border-[#24352F] ml-1.5">
            {lowStockItems.length}
          </b>
        </span>
        <button
          onClick={() => setActiveView('reorder')}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1"
        >
          <span>{t('createOrderSheet')}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

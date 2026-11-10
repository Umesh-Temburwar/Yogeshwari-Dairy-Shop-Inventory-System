import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LowStockAlertsWidget: React.FC = () => {
  const { products, setActiveView } = useStore();
  const { language } = useLanguage();

  const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock_alert);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${lowStockItems.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {lowStockItems.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'mr' ? 'माल संपला / कमी साठा अलर्ट (Stock Need)' : language === 'hi' ? 'माल की कमी / ज़रूरत अलर्ट (Stock Need)' : 'Stock Need & Low Stock Alerts'}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('reorder')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            {language === 'mr' ? 'गरज यादी' : language === 'hi' ? 'ज़रूरत लिस्ट' : 'Need Sheet'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          Products reaching or below reorder threshold
        </p>
      </div>

      <div className="my-3 space-y-2.5">
        {lowStockItems.length > 0 ? (
          lowStockItems.slice(0, 4).map((item) => {
            const deficit = Math.max(0, item.min_stock_alert * 2 - item.stock_quantity);
            const isOutOfStock = item.stock_quantity <= 0;
            const displayName = (language === 'mr' && item.marathi_name) ? item.marathi_name : (language === 'hi' && item.hindi_name) ? item.hindi_name : item.name;

            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50 transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5">
                    <span className={`font-semibold ${isOutOfStock ? 'text-rose-700 font-bold' : 'text-amber-700'}`}>
                      {language === 'mr' ? 'साठा:' : language === 'hi' ? 'स्टॉक:' : 'Stock:'} {item.stock_quantity} {item.unit}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500">
                      {language === 'mr' ? 'किमान मर्यादा:' : language === 'hi' ? 'न्यूनतम:' : 'Min:'} {item.min_stock_alert} {item.unit}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-200 text-rose-900 block mb-1">
                    {deficit.toFixed(0)} {item.unit} {language === 'mr' ? 'मागवा' : language === 'hi' ? 'मंगाएं' : 'Need'}
                  </span>
                  <button
                    onClick={() => setActiveView('purchases')}
                    className="text-[10px] text-emerald-700 font-bold hover:underline"
                  >
                    + {language === 'mr' ? 'खरेदी नोंद' : language === 'hi' ? 'खरीद एंट्री' : 'Add Buy'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-emerald-700 text-xs font-medium bg-emerald-50/50 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1 opacity-80" />
            {language === 'mr' ? 'दुकानातील सर्व माल पुरेशा प्रमाणात उपलब्ध आहे!' : language === 'hi' ? 'दुकान में सभी माल पर्याप्त मात्रा में उपलब्ध है!' : 'All inventory stock is sufficient!'}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          {language === 'mr' ? 'कमी साठा उत्पादने:' : language === 'hi' ? 'कुल कम स्टॉक आइटम्स:' : 'Low Stock Items:'} <b className="text-slate-800">{lowStockItems.length}</b>
        </span>
        <button
          onClick={() => setActiveView('reorder')}
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
        >
          {language === 'mr' ? 'ऑर्डर यादी तयार करा &rarr;' : language === 'hi' ? 'फुल आर्डर लिस्ट तैयार करें &rarr;' : 'Open Reorder Sheet &rarr;'}
        </button>
      </div>
    </div>
  );
};

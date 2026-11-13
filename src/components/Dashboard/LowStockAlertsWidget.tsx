import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, StatusBadge } from '../ui';

export const LowStockAlertsWidget: React.FC = () => {
  const { products, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const lowStockItems = products.filter(p => p.stock_quantity <= p.min_stock_alert);

  return (
    <Card className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {lowStockItems.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-warn" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-ok" />
            )}
            <h3 className="text-sm font-semibold text-ink truncate">
              {t('stockNeedTitle')}
            </h3>
          </div>
          <button
            onClick={() => setActiveView('reorder')}
            className="text-xs font-medium text-ink-2 hover:text-ink flex items-center gap-1 shrink-0 transition"
          >
            <span>{t('createOrderSheet')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-ink-3 font-normal truncate">
          {t('stockNeedSubtitle')}
        </p>
      </div>

      <div className="my-4 space-y-2 max-h-80 overflow-y-auto pr-1">
        {lowStockItems.length > 0 ? (
          lowStockItems.map((item) => {
            const isOutOfStock = item.stock_quantity <= 0;
            const displayName = 
              (language === 'mr' && item.marathi_name) ? item.marathi_name : 
              (language === 'hi' && item.hindi_name) ? item.hindi_name : 
              item.name;

            return (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-2.5 rounded-xl border border-line/40 bg-surface-2 gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-xs sm:text-sm text-ink truncate">
                    {displayName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-ink-3 mt-0.5">
                    <span>{item.brand || 'Dairy'}</span>
                    <span>&bull;</span>
                    <span>Min: {item.min_stock_alert} {item.unit}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <StatusBadge
                    status={isOutOfStock ? 'danger' : 'warn'}
                    label={`${item.stock_quantity} ${item.unit}`}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-ink-3 text-xs">
            <CheckCircle2 className="w-6 h-6 text-ok mx-auto mb-1.5" />
            <span>{language === 'mr' ? 'सर्व उत्पादनांचा साठा पुरेसा आहे!' : 'All items are in healthy stock!'}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-line/40 flex items-center justify-between text-xs text-ink-3">
        <span>{lowStockItems.length} {language === 'mr' ? 'उत्पादने कमी साठ्यात' : 'items need reorder'}</span>
      </div>
    </Card>
  );
};

export default LowStockAlertsWidget;

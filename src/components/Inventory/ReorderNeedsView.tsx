import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  AlertTriangle, 
  Printer, 
  Copy, 
  Check, 
  Truck, 
  CheckCircle2 
} from 'lucide-react';

export const ReorderNeedsView: React.FC = () => {
  const { products, setActiveView } = useStore();
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Identify all products needing restock
  const itemsNeedingRestock = useMemo(() => {
    return products
      .filter(p => p.stock_quantity <= p.min_stock_alert)
      .map(p => {
        const recommendedOrderQty = Math.max(
          p.min_stock_alert, 
          Number(((p.min_stock_alert * 2.5) - p.stock_quantity).toFixed(1))
        );
        const estimatedCost = Number((recommendedOrderQty * p.purchase_price).toFixed(2));

        return {
          ...p,
          recommendedOrderQty,
          estimatedCost,
          isCritical: p.stock_quantity <= 0
        };
      })
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [products]);

  const totalEstimatedCost = itemsNeedingRestock.reduce((acc, it) => acc + it.estimatedCost, 0);

  const getDisplayName = (it: any) => {
    if (language === 'mr' && it.marathi_name) return it.marathi_name;
    if (language === 'hi' && it.hindi_name) return it.hindi_name;
    return it.name;
  };

  // Copy WhatsApp format procurement list based on active language
  const handleCopyWhatsAppList = () => {
    const locale = language === 'mr' ? 'mr-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';
    const dateStr = new Date().toLocaleDateString(locale);

    let text = '';
    if (language === 'mr') {
      text = `🥛 *योगेश्वरी डेअरी फार्म - आजची माल खरेदी गरज / ऑर्डर यादी* 🥛\nतारीख: ${dateStr}\n\n`;
      itemsNeedingRestock.forEach((it, idx) => {
        text += `${idx + 1}. *${getDisplayName(it)}*\n   👉 आवश्यक मागणी: *${it.recommendedOrderQty} ${it.unit}* (सध्याचा साठा: ${it.stock_quantity})\n\n`;
      });
      text += `एकूण अंदाजे बजेट: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nकृपया लवकरात लवकर माल पाठवून द्यावा. धन्यवाद!`;
    } else if (language === 'hi') {
      text = `🥛 *योगेश्वरी डेरी फार्म - आज का आर्डर / माल की ज़रूरत* 🥛\nदिनांक: ${dateStr}\n\n`;
      itemsNeedingRestock.forEach((it, idx) => {
        text += `${idx + 1}. *${getDisplayName(it)}*\n   👉 मंगाना है: *${it.recommendedOrderQty} ${it.unit}* (वर्तमान स्टॉक: ${it.stock_quantity})\n\n`;
      });
      text += `कुल अनुमानित बजट: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nकृपया जल्दी डिलीवरी भिजवाएं। धन्यवाद!`;
    } else {
      text = `🥛 *Yogeshwari Dairy Farm - Reorder Requirement Sheet* 🥛\nDate: ${dateStr}\n\n`;
      itemsNeedingRestock.forEach((it, idx) => {
        text += `${idx + 1}. *${it.name}*\n   👉 Reorder Quantity: *${it.recommendedOrderQty} ${it.unit}* (Current Stock: ${it.stock_quantity})\n\n`;
      });
      text += `Total Estimated Cost: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nPlease deliver as early as possible. Thank you!`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 p-6 rounded-3xl text-white shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-800/60 text-xs font-semibold text-amber-200 border border-amber-700/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('stockNeedNav')}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            {t('reorderTitle')}
          </h2>
          <p className="text-amber-100/90 text-xs max-w-xl">
            {t('reorderDesc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyWhatsAppList}
            disabled={itemsNeedingRestock.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t('orderCopied') : t('copyWhatsAppOrder')}</span>
          </button>

          <button
            onClick={() => window.print()}
            disabled={itemsNeedingRestock.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{t('print')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            {language === 'mr' ? 'एकूण संपलेली उत्पादने' : 'कुल खत्म / कम स्टॉक'}
          </span>
          <span className="text-2xl font-black text-rose-600 mt-1 block">
            {itemsNeedingRestock.length} {language === 'mr' ? 'उत्पादने' : 'आइटम्स'}
          </span>
          <span className="text-[11px] text-slate-500">
            {itemsNeedingRestock.filter(i => i.isCritical).length} {language === 'mr' ? 'उत्पादने पूर्णपणे संपली आहेत' : 'पूरी तरह शून्य हैं'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">
            {language === 'mr' ? 'अंदाजे खरेदी बजेट' : 'अनुमानित खरीद बजट (Total Cost)'}
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            ₹{totalEstimatedCost.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500">
            {language === 'mr' ? 'घाऊक खरेदी दराप्रमाणे अंदाजे रक्कम' : 'थोक खरीद भाव के हिसाब से'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">
              {language === 'mr' ? 'खरेदी नोंद' : 'खरीद एंट्री'}
            </span>
            <span className="text-xs text-slate-600 block mt-1">
              {language === 'mr' ? 'माल येताच थेट साठ्यात नोंदवा' : 'माल आते ही सीधे स्टॉक में जोड़ें'}
            </span>
          </div>
          <button
            onClick={() => setActiveView('purchases')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            + {language === 'mr' ? 'खरेदी नोंदवा' : 'खरीद दर्ज करें'}
          </button>
        </div>
      </div>

      {/* Procurement Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>
              {language === 'mr' ? 'आजचे खरेदी मागणी पत्रक' : 'आज का आर्डर मांग पत्र'}
            </span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {language === 'mr' ? 'किमान मर्यादेपेक्षा कमी माल' : 'न्यूनतम अलर्ट से कम उत्पाद'}
          </span>
        </div>

        {itemsNeedingRestock.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'किमान मर्यादा' : 'न्यूनतम सीमा'}</th>
                  <th className="px-3 py-3 text-center">{t('recommendedOrderQty')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'अंदाजे खर्च' : 'अनुमानित लागत'}</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemsNeedingRestock.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{getDisplayName(item)}</div>
                      {getDisplayName(item) !== item.name && (
                        <div className="text-[11px] text-slate-500 font-medium">{item.name}</div>
                      )}
                    </td>

                    <td className="px-3 py-3 font-semibold text-slate-600">
                      {item.category}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        item.isCritical ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {item.stock_quantity} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center font-bold text-slate-500">
                      {item.min_stock_alert} {item.unit}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                        +{item.recommendedOrderQty} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-medium text-slate-600">
                      ₹{item.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-black text-slate-900">
                      ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setActiveView('purchases')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs"
                      >
                        + {language === 'mr' ? 'माल खरेदी' : 'माल खरीदें'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-base">
              {language === 'mr' ? 'दुकानातील कोणताही माल संपलेला नाही!' : 'दुकान का कोई भी माल खत्म नहीं है!'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'mr' ? 'दूध, पनीर, दही, तूप आणि मिठाई पुरेशा साठ्यात उपलब्ध आहे.' : 'सभी डेरी उत्पाद, दूध, पनीर, दही व घी पर्याप्त स्टॉक में उपलब्ध हैं।'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

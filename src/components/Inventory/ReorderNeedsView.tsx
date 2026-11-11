import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  AlertTriangle,
  Printer,
  Copy,
  Check,
  Truck,
  CheckCircle2,
  FileText,
  TrendingUp,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { exportReportToPDF } from '../../lib/exportUtils';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';

export const ReorderNeedsView: React.FC = () => {
  const { products, batches, sales, returns, setActiveView } = useStore();
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Train & Analyze inventory based on sales velocity, customer returns, and shelf life
  const itemsNeedingRestock = useMemo(() => {
    return products
      .filter(p => p.stock_quantity <= p.min_stock_alert)
      .map(p => {
        // 1. Calculate actual sales volume
        const totalSold = sales.reduce((sum, s) => {
          const item = s.items?.find(it => it.product_id === p.id);
          return sum + (item ? item.quantity : 0);
        }, 0);

        // 2. Calculate customer returns
        const totalReturned = returns
          .filter(r => r.product_id === p.id)
          .reduce((sum, r) => sum + r.quantity, 0);

        // 3. Check for batches nearing expiry
        const hasNearExpiryBatch = batches.some(
          b => b.product_id === p.id && b.qty_remaining > 0 && ['EXPIRING_TODAY', 'EXPIRING_TOMORROW'].includes(computeExpiryStatus(b.expiry_date).status)
        );

        // Dynamic demand-trained reorder recommendation
        const demandBuffer = totalSold > 0 ? Math.max(p.min_stock_alert * 1.5, totalSold * 1.2) : p.min_stock_alert * 2.5;
        const recommendedOrderQty = Math.max(
          p.min_stock_alert,
          Number((demandBuffer - p.stock_quantity).toFixed(1))
        );
        const estimatedCost = Number((recommendedOrderQty * p.purchase_price).toFixed(2));

        return {
          ...p,
          recommendedOrderQty,
          estimatedCost,
          isCritical: p.stock_quantity <= 0,
          totalSold,
          totalReturned,
          hasNearExpiryBatch,
          isFastMover: totalSold >= (p.min_stock_alert * 2)
        };
      })
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [products, batches, sales, returns]);

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
      text = `🥛 *योगेश्वरी डेअरी - आजची माल खरेदी गरज / ऑर्डर यादी* 🥛\nतारीख: ${dateStr}\n\n`;
      itemsNeedingRestock.forEach((it, idx) => {
        text += `${idx + 1}. *${getDisplayName(it)}*\n   👉 आवश्यक मागणी: *${it.recommendedOrderQty} ${it.unit}* (सध्याचा साठा: ${it.stock_quantity})\n\n`;
      });
      text += `एकूण अंदाजे बजेट: ₹${totalEstimatedCost.toLocaleString('en-IN')}\nकृपया लवकरात लवकर माल पाठवून द्यावा. धन्यवाद!`;
    } else if (language === 'hi') {
      text = `🥛 *योगेश्वरी डेरी - आज का आर्डर / माल की ज़रूरत* 🥛\nदिनांक: ${dateStr}\n\n`;
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

  const handleDownloadReorderPDF = () => {
    exportReportToPDF({
      title: language === 'mr' ? 'माल खरेदी मागणी पत्रक (Reorder Sheet)' : language === 'hi' ? 'सामान खरीद मांग पत्रक (Reorder Sheet)' : 'Procurement & Reorder Requirements Sheet',
      subtitle: 'Yogeshwari Dairy Farm & Sweets ERP — Supplier Restock Order',
      periodText: language === 'mr' ? 'तात्काळ आवश्यक माल मागणी' : 'तत्काल आवश्यक मांग',
      kpis: [
        { label: 'एकूण आवश्यक वस्तू', value: `${itemsNeedingRestock.length} उत्पादने`, color: 'rose' },
        { label: 'संपलेली उत्पादने (0 साठा)', value: `${itemsNeedingRestock.filter(i => i.isCritical).length} उत्पादने`, color: 'rose' },
        { label: 'अंदाजे खरेदी बजेट', value: `₹${totalEstimatedCost.toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: ['अ.क्र.', 'उत्पादनाचे नाव (Product)', 'प्रवर्ग (Category)', 'सध्याचा साठा', 'किमान मर्यादा', 'मागणी प्रमाण (Order Qty)', 'अंदाजे दर (₹)', 'एकूण रक्कम (₹)'],
        alignments: ['center', 'left', 'center', 'right', 'right', 'right', 'right', 'right'],
        rows: itemsNeedingRestock.map((it, idx) => [
          idx + 1,
          getDisplayName(it),
          it.category,
          `${it.stock_quantity} ${it.unit}`,
          `${it.min_stock_alert} ${it.unit}`,
          `${it.recommendedOrderQty} ${it.unit}`,
          `₹${it.purchase_price}`,
          `₹${it.estimatedCost.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          'एकूण (Total)',
          `${itemsNeedingRestock.length} वस्तू`,
          '',
          '',
          '',
          '',
          '',
          `₹${totalEstimatedCost.toLocaleString('en-IN')}`
        ]
      },
      notes: 'सदर माल लवकरात लवकर पुरवठादार/सप्लायरकडून मागवून घ्यावा.'
    });
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-900 via-orange-900 to-amber-950 dark:from-[#3D1E0B] dark:to-[#131F1B] p-6 rounded-3xl text-white shadow-md border border-amber-800/40 dark:border-[#24352F] transition-colors">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-800/60 dark:bg-amber-950/60 text-xs font-semibold text-amber-200 border border-amber-700/50 dark:border-amber-800/50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('stockNeedNav')}</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {t('reorderTitle')}
          </h2>
          <p className="text-amber-100/90 dark:text-[#8FA69C] text-xs max-w-xl">
            {t('reorderDesc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadReorderPDF}
            disabled={itemsNeedingRestock.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
            title="Download PDF Order Sheet"
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'mr' ? 'मागणी पत्रक PDF' : language === 'hi' ? 'मांग पत्रक PDF' : 'Download Order PDF'}</span>
          </button>

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
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'एकूण संपलेली उत्पादने' : language === 'hi' ? 'कुल खत्म / कम स्टॉक' : 'Total Low / Out of Stock'}
          </span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            {itemsNeedingRestock.length} {language === 'mr' ? 'उत्पादने' : language === 'hi' ? 'आइटम्स' : 'items'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {itemsNeedingRestock.filter(i => i.isCritical).length} {language === 'mr' ? 'उत्पादने पूर्णपणे संपली आहेत' : language === 'hi' ? 'पूरी तरह शून्य हैं' : 'completely out of stock'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {language === 'mr' ? 'अंदाजे खरेदी बजेट' : language === 'hi' ? 'अनुमानित खरीद बजट (Total Cost)' : 'Estimated Procurement Budget'}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ₹{totalEstimatedCost.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
            {language === 'mr' ? 'घाऊक खरेदी दराप्रमाणे अंदाजे रक्कम' : language === 'hi' ? 'थोक खरीद भाव के हिसाब से' : 'Calculated at wholesale purchase rate'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
              {language === 'mr' ? 'खरेदी नोंद' : language === 'hi' ? 'खरीद एंट्री' : 'Record Purchase'}
            </span>
            <span className="text-xs text-slate-600 dark:text-[#8FA69C] block mt-1">
              {language === 'mr' ? 'माल येताच थेट साठ्यात नोंदवा' : language === 'hi' ? 'माल आते ही सीधे स्टॉक में जोड़ें' : 'Directly add to stock upon arrival'}
            </span>
          </div>
          <button
            onClick={() => setActiveView('purchases')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            + {language === 'mr' ? 'खरेदी नोंदवा' : language === 'hi' ? 'खरीद दर्ज करें' : 'Record Purchase'}
          </button>
        </div>
      </div>

      {/* Procurement Items Table */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>
              {language === 'mr' ? 'आजचे खरेदी मागणी पत्रक' : language === 'hi' ? 'आज का आर्डर मांग पत्र' : "Today's Restock Order Sheet"}
            </span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'किमान मर्यादेपेक्षा कमी माल' : language === 'hi' ? 'न्यूनतम अलर्ट से कम उत्पाद' : 'Products below minimum alert threshold'}
          </span>
        </div>

        {itemsNeedingRestock.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'किमान मर्यादा' : language === 'hi' ? 'न्यूनतम सीमा' : 'Min Alert'}</th>
                  <th className="px-3 py-3 text-center">{t('recommendedOrderQty')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'अंदाजे खर्च' : language === 'hi' ? 'अनुमानित लागत' : 'Est Cost'}</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {itemsNeedingRestock.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{getDisplayName(item)}</span>
                        {item.isFastMover && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                            🔥 {language === 'mr' ? 'जलद खप' : language === 'hi' ? 'तेज़ बिक्री' : 'Fast Mover'}
                          </span>
                        )}
                        {item.hasNearExpiryBatch && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            ⚠️ {language === 'mr' ? 'बॅच आधी विका' : language === 'hi' ? 'बैच पहले बेचें' : 'Sell batch first'}
                          </span>
                        )}
                        {item.totalReturned > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            ↩️ {item.totalReturned} {item.unit} {language === 'mr' ? 'परत' : 'वापस'}
                          </span>
                        )}
                      </div>
                      {getDisplayName(item) !== item.name && (
                        <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">{item.name}</div>
                      )}
                    </td>

                    <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">
                      {item.category}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${item.isCritical ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        }`}>
                        {item.stock_quantity} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center font-bold text-slate-500 dark:text-[#8FA69C]">
                      {item.min_stock_alert} {item.unit}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800/60">
                        +{item.recommendedOrderQty} {item.unit}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-[#8FA69C]">
                      ₹{item.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">
                      ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setActiveView('purchases')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs"
                      >
                        + {language === 'mr' ? 'माल खरेदी' : language === 'hi' ? 'माल खरीदें' : 'Buy Stock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              {language === 'mr' ? 'दुकानातील कोणताही माल संपलेला नाही!' : language === 'hi' ? 'दुकान का कोई भी माल खत्म नहीं है!' : 'All dairy items are well stocked!'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] max-w-sm mx-auto">
              {language === 'mr' ? 'दूध, पनीर, दही, तूप आणि मिठाई पुरेशा साठ्यात उपलब्ध आहे.' : language === 'hi' ? 'सभी डेरी उत्पाद, दूध, पनीर, दही व घी पर्याप्त स्टॉक में उपलब्ध हैं।' : 'Fresh milk, paneer, curd, ghee, and sweets are available in sufficient quantities.'}
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

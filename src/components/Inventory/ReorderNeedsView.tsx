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
  Download,
  Eye
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import { Card, KpiCard, Button, Badge, StatusBadge } from '../ui';

export const ReorderNeedsView: React.FC = () => {
  const { products, batches, sales, returns, supplierReturns, metrics, setActiveView } = useStore();
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  // Train & Analyze inventory based on sales velocity, customer returns, supplier defects, and shelf life
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

        // 3. Calculate supplier / inward returns (defective/expired goods returned to vendor)
        const vendorReturnedQty = supplierReturns
          .filter(sr => sr.product_id === p.id)
          .reduce((sum, sr) => sum + sr.quantity, 0);

        const vendorPendingRefund = supplierReturns
          .filter(sr => sr.product_id === p.id && sr.refund_status === 'Pending')
          .reduce((sum, sr) => sum + sr.total_refund_amount, 0);

        // 4. Check for batches nearing expiry
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
          vendorReturnedQty,
          vendorPendingRefund,
          hasNearExpiryBatch,
          isFastMover: totalSold >= (p.min_stock_alert * 2)
        };
      })
      .sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  }, [products, batches, sales, returns, supplierReturns]);

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

  const getReorderPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'माल खरेदी मागणी पत्रक' : isHi ? 'सामान खरीद मांग पत्रक' : 'Procurement & Reorder Requirements Sheet',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'तात्काळ आवश्यक माल मागणी' : isHi ? 'तत्काल आवश्यक सामान मांग' : 'Immediate Restock Requirements',
      language,
      kpis: [
        { label: isMr ? 'एकूण आवश्यक उत्पादने' : isHi ? 'कुल आवश्यक उत्पाद' : 'Total Items Needed', value: `${itemsNeedingRestock.length}`, color: 'rose' },
        { label: isMr ? 'शून्य साठा (संपलेला माल)' : isHi ? 'स्टॉक समाप्त उत्पाद' : 'Out of Stock Items', value: `${itemsNeedingRestock.filter(i => i.isCritical).length}`, color: 'rose' },
        { label: isMr ? 'अंदाजे खरेदी बजेट' : isHi ? 'अनुमानित खरीद बजट' : 'Estimated Restock Budget', value: `₹${totalEstimatedCost.toLocaleString('en-IN')}`, color: 'amber' }
      ],
      table: {
        headers: isMr 
          ? ['अ.क्र.', 'उत्पादनाचे नाव', 'प्रवर्ग', 'सध्याचा साठा', 'किमान मर्यादा', 'मागणी प्रमाण', 'अंदाजे दर (₹)', 'एकूण रक्कम (₹)']
          : isHi
          ? ['क्र.सं.', 'सामान का नाम', 'वर्ग', 'वर्तमान स्टॉक', 'न्यूनतम सीमा', 'मांग मात्रा', 'अनुमानित दर (₹)', 'कुल राशि (₹)']
          : ['Sr.No.', 'Product Name', 'Category', 'Current Stock', 'Min Alert', 'Order Qty', 'Unit Price (₹)', 'Est. Total (₹)'],
        alignments: ['center', 'left', 'center', 'right', 'right', 'right', 'right', 'right'] as ('center' | 'left' | 'center' | 'right' | 'right' | 'right' | 'right' | 'right')[],
        rows: itemsNeedingRestock.length > 0 ? itemsNeedingRestock.map((it, idx) => [
          idx + 1,
          getDisplayName(it),
          it.category,
          `${it.stock_quantity} ${it.unit}`,
          `${it.min_stock_alert} ${it.unit}`,
          `${it.recommendedOrderQty} ${it.unit}`,
          `₹${it.purchase_price}`,
          `₹${it.estimatedCost.toLocaleString('en-IN')}`
        ]) : [
          [1, isMr ? 'सर्व उत्पादने पुरेशा साठ्यात उपलब्ध आहेत (साठा सुरक्षित)' : isHi ? 'सभी उत्पाद पर्याप्त स्टॉक में उपलब्ध हैं (सुरक्षित)' : 'All products are sufficiently stocked (Safe inventory)', '—', '—', '—', '—', '—', '₹0']
        ],
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${itemsNeedingRestock.length} ${isMr ? 'उत्पादने' : isHi ? 'उत्पाद' : 'Products'}`,
          '',
          '',
          '',
          '',
          '',
          `₹${totalEstimatedCost.toLocaleString('en-IN')}`
        ]
      },
      notes: itemsNeedingRestock.length > 0 
        ? (isMr ? 'सदर माल लवकरात लवकर पुरवठादार/सप्लायरकडून मागवून घ्यावा.' : isHi ? 'यह माल जल्द से जल्द सप्लायर या किसान से मंगा लें।' : 'Please issue purchase orders for these items to suppliers promptly.')
        : (isMr ? 'सध्या दुकानातील सर्व साठा सुरक्षित मर्यादेत आहे. कोणत्याही तात्काळ मागणीची गरज नाही.' : isHi ? 'वर्तमान में दुकान का पूरा स्टॉक सुरक्षित है। तत्काल मांग की आवश्यकता नहीं है।' : 'All dairy inventory is currently at safe stock levels. No immediate procurement needed.')
    };
  };

  const handleViewReorderPDF = () => {
    viewReportPDF(getReorderPayload());
  };

  const handlePrintReorderPDF = () => {
    printReport(getReorderPayload());
  };

  const handleDownloadReorderPDF = () => {
    downloadReportPDF(getReorderPayload());
  };

  return (
    <div className="space-y-5">

      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-2 text-ink-2 text-[11px] font-medium border border-line">
            <AlertTriangle className="w-3.5 h-3.5 text-warn" />
            <span>{t('stockNeedNav')}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-ink">
            {t('reorderTitle')}
          </h2>
          <p className="text-xs text-ink-3 max-w-xl font-medium">
            {t('reorderDesc')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewReorderPDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title="View Reorder PDF Sheet"
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintReorderPDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Reorder Sheet"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadReorderPDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download PDF Order Sheet"
          >
            PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleCopyWhatsAppList}
            leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? t('orderCopied') : t('copyWhatsAppOrder')}
          </Button>
        </div>
      </Card>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label={language === 'mr' ? 'एकूण संपलेली उत्पादने' : language === 'hi' ? 'कुल खत्म / कम स्टॉक' : 'Total Low / Out of Stock'}
          value={`${itemsNeedingRestock.length} ${language === 'mr' ? 'उत्पादने' : language === 'hi' ? 'आइटम्स' : 'items'}`}
          delta={`${itemsNeedingRestock.filter(i => i.isCritical).length} ${language === 'mr' ? 'शून्य साठा' : 'शून्य स्टॉक'}`}
          deltaType="danger"
          icon={<AlertTriangle className="w-4 h-4 text-danger" />}
        />

        <KpiCard
          label={language === 'mr' ? 'अंदाजे खरेदी बजेट' : language === 'hi' ? 'अनुमानित खरीद बजट' : 'Estimated Procurement Budget'}
          value={`₹${totalEstimatedCost.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'घाऊक खरेदी दर' : language === 'hi' ? 'थोक खरीद भाव' : 'Wholesale rate'}
          deltaType="neutral"
          icon={<Truck className="w-4 h-4 text-ink-3" />}
        />

        <Card className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-ink-3 block">
              {language === 'mr' ? 'खरेदी नोंद' : language === 'hi' ? 'खरीद एंट्री' : 'Record Purchase'}
            </span>
            <span className="text-xs text-ink-2 block mt-1 font-medium">
              {language === 'mr' ? 'माल येताच थेट साठ्यात नोंदवा' : language === 'hi' ? 'माल आते ही स्टॉक में जोड़ें' : 'Add to stock upon arrival'}
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveView('purchases')}
          >
            + {language === 'mr' ? 'खरेदी नोंदवा' : language === 'hi' ? 'खरीद दर्ज करें' : 'Record Purchase'}
          </Button>
        </Card>
      </div>

      {/* Pending Supplier Refund Recovery Alert Banner */}
      {metrics.pendingSupplierRefundAmount > 0 && (
        <Card className="p-3.5 border border-warn/30 bg-warn/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warn/15 text-warn flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-ink">
                {language === 'mr' ? 'सप्लायरकडे अडकलेला रिफंड: ' : 'सप्लायर से बाकी रिफंड: '}
                <span className="text-danger tabular-nums">₹{metrics.pendingSupplierRefundAmount.toLocaleString('en-IN')}</span>
              </h4>
              <p className="text-[11px] text-ink-3 font-medium">
                {language === 'mr' 
                  ? 'मागील खेपेत खराब/एक्सपायर निघालेल्या मालाचा परतावा येणे बाकी आहे. नवीन खरेदीच्या बिलातून ही रक्कम वजा करून घ्या!' 
                  : 'पिछली खेप में खराब/एक्सपायर निकले माल का रिफंड बाकी है। नए बिल से यह रकम काटकर भुगतान करें!'}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveView('returns')}
            className="shrink-0"
          >
            {language === 'mr' ? 'रिफंड हिशोब पहा' : 'रिफंड हिसाब देखें'}
          </Button>
        </Card>
      )}

      {/* Procurement Items Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-ink-2" />
            <span>
              {language === 'mr' ? 'आजचे खरेदी मागणी पत्रक' : language === 'hi' ? 'आज का आर्डर मांग पत्र' : "Today's Restock Order Sheet"}
            </span>
          </h3>
          <span className="text-xs text-ink-3 font-medium">
            {language === 'mr' ? 'किमान मर्यादेपेक्षा कमी माल' : language === 'hi' ? 'न्यूनतम अलर्ट से कम उत्पाद' : 'Products below minimum alert threshold'}
          </span>
        </div>

        {itemsNeedingRestock.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-line">
                {itemsNeedingRestock.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink flex items-center gap-1.5 flex-wrap">
                        <span>{getDisplayName(item)}</span>
                        {item.isFastMover && (
                          <Badge variant="outline" className="text-[10px]">
                            🔥 {language === 'mr' ? 'जलद खप' : language === 'hi' ? 'तेज़ बिक्री' : 'Fast'}
                          </Badge>
                        )}
                        {item.hasNearExpiryBatch && (
                          <StatusBadge status="warn" className="text-[10px]">
                            {language === 'mr' ? 'बॅच आधी विका' : language === 'hi' ? 'बैच पहले बेचें' : 'Sell batch first'}
                          </StatusBadge>
                        )}
                        {item.totalReturned > 0 && (
                          <Badge variant="default" className="text-[10px]">
                            ↩️ {item.totalReturned} {item.unit} {language === 'mr' ? 'परत' : 'वापस'}
                          </Badge>
                        )}
                        {item.vendorReturnedQty > 0 && (
                          <StatusBadge status="danger" className="text-[10px]" title="सप्लायरकडून खराब माल आला होता!">
                            🚚 {item.vendorReturnedQty} {item.unit}
                          </StatusBadge>
                        )}
                      </div>
                      {getDisplayName(item) !== item.name && (
                        <div className="text-[11px] text-ink-3">{item.name}</div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-ink-2">
                      {item.category}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={item.isCritical ? 'danger' : 'warn'}>
                        {item.stock_quantity} {item.unit}
                      </StatusBadge>
                    </td>

                    <td className="px-3 py-3 text-center text-ink-3 tabular-nums">
                      {item.min_stock_alert} {item.unit}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <Badge variant="default" className="font-semibold text-ink">
                        +{item.recommendedOrderQty} {item.unit}
                      </Badge>
                    </td>

                    <td className="px-3 py-3 text-right text-ink-2 tabular-nums">
                      ₹{item.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-medium text-ink tabular-nums">
                      ₹{item.estimatedCost.toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveView('purchases')}
                        className="h-7 px-2.5 text-xs"
                      >
                        + {language === 'mr' ? 'खरेदी' : language === 'hi' ? 'खरीद' : 'Buy'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-ok mx-auto opacity-70" />
            <h4 className="font-semibold text-ink text-base">
              {language === 'mr' ? 'दुकानातील कोणताही माल संपलेला नाही!' : language === 'hi' ? 'दुकान का कोई भी माल खत्म नहीं है!' : 'All dairy items are well stocked!'}
            </h4>
            <p className="text-xs text-ink-3 max-w-sm mx-auto">
              {language === 'mr' ? 'दूध, पनीर, दही, तूप आणि मिठाई पुरेशा साठ्यात उपलब्ध आहे.' : language === 'hi' ? 'सभी डेरी उत्पाद, दूध, पनीर, दही व घी पर्याप्त स्टॉक में उपलब्ध हैं।' : 'Fresh milk, paneer, curd, ghee, and sweets are available in sufficient quantities.'}
            </p>
          </div>
        )}
      </Card>

    </div>
  );
};

export default ReorderNeedsView;

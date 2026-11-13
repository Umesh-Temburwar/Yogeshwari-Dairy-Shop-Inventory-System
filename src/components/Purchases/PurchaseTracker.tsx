import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { MilkFatCalculator } from './MilkFatCalculator';
import { exportToCSV, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { 
  getShelfLifeDays, 
  getSuggestedExpiryDate, 
  generateBatchNumber, 
  getShelfLifeNote, 
} from '../../lib/shelfLifeUtils';
import { 
  Truck, 
  Plus, 
  Calculator, 
  Download, 
  Printer, 
  Sparkles, 
  RotateCcw, 
  Eye 
} from 'lucide-react';
import { SupplierReturnModal } from '../Returns/SupplierReturnModal';
import { Card, KpiCard, Button, Input, Badge, StatusBadge, Modal } from '../ui';

export const PurchaseTracker: React.FC = () => {
  const { products, filteredPurchases, createPurchase, metrics } = useStore();
  const { t, language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFatCalcOpen, setIsFatCalcOpen] = useState(false);
  const [isSupplierReturnOpen, setIsSupplierReturnOpen] = useState(false);
  const [selectedPurForReturn, setSelectedPurForReturn] = useState<{
    productId?: string;
    supplierName?: string;
    batchNo?: string;
    quantity?: number;
  }>({});

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online_UPI' | 'Bank_Transfer' | 'Udhar'>('Cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Batch & Expiry auto-calculation states
  const [batchNo, setBatchNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const shelfDays = selectedProduct ? getShelfLifeDays(selectedProduct.category, selectedProduct.name) : 2;
  const shelfLifeTip = selectedProduct ? getShelfLifeNote(selectedProduct.category, selectedProduct.name, language) : '';

  useEffect(() => {
    if (selectedProduct) {
      setBatchNo(generateBatchNumber(selectedProduct.name, purchaseDate));
      setExpiryDate(getSuggestedExpiryDate(purchaseDate, shelfDays));
      if (!purchasePrice) {
        setPurchasePrice(selectedProduct.purchase_price.toString());
      }
    }
  }, [selectedProductId, purchaseDate, shelfDays]);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setPurchasePrice(prod.purchase_price.toString());
      const days = getShelfLifeDays(prod.category, prod.name);
      setBatchNo(generateBatchNumber(prod.name, purchaseDate));
      setExpiryDate(getSuggestedExpiryDate(purchaseDate, days));
    }
  };

  const handleDateChange = (newDate: string) => {
    setPurchaseDate(newDate);
    if (selectedProduct) {
      setExpiryDate(getSuggestedExpiryDate(newDate, shelfDays));
    }
  };

  const calculatedTotal = (parseFloat(quantity) || 0) * (parseFloat(purchasePrice) || 0);

  const getProductDisplayName = (prod: any) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || parseFloat(quantity) <= 0) return;

    const qty = parseFloat(quantity);
    const price = parseFloat(purchasePrice) || selectedProduct.purchase_price;
    const total = qty * price;
    const defaultSupplier = language === 'mr' ? 'स्थानिक दुग्ध उत्पादक शेतकरी' : language === 'hi' ? 'स्थानीय डेयरी किसान' : 'Local Dairy Farmer';

    await createPurchase({
      product_id: selectedProduct.id,
      product_name: getProductDisplayName(selectedProduct),
      supplier_name: supplierName.trim() || defaultSupplier,
      quantity: qty,
      unit: selectedProduct.unit,
      purchase_price: price,
      total_amount: total,
      payment_mode: paymentMode,
      purchase_date: purchaseDate,
      batch_no: batchNo.trim() || generateBatchNumber(selectedProduct.name, purchaseDate),
      expiry_date: expiryDate || getSuggestedExpiryDate(purchaseDate, shelfDays),
      invoice_number: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
    setSupplierName('');
    setQuantity('');
    setInvoiceNumber('');
    setNotes('');
  };

  const handleApplyFatRate = (rate: number, liters: number, note: string) => {
    setPurchasePrice(rate.toString());
    setQuantity(liters.toString());
    setNotes(note);
    const milkProd = products.find(p => p.category === 'Milk');
    if (milkProd) setSelectedProductId(milkProd.id);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Supplier', 'Product', 'Quantity', 'Unit', 'Rate (Rs)', 'Total Amount (Rs)', 'Payment Mode', 'Notes'];
    const rows = filteredPurchases.map(p => [
      p.purchase_date,
      p.supplier_name,
      p.product_name,
      p.quantity,
      p.unit,
      p.purchase_price,
      p.total_amount,
      p.payment_mode,
      p.notes || ''
    ]);
    exportToCSV(`Purchases_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  const getPurchaseReportPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    const totalQty = filteredPurchases.reduce((acc, p) => acc + p.quantity, 0);
    const totalAmt = filteredPurchases.reduce((acc, p) => acc + p.total_amount, 0);

    return {
      title: isMr ? 'दूध व कच्चा माल खरेदी लेजर अहवाल' : isHi ? 'दूध व कच्चा माल खरीद लेजर रिपोर्ट' : 'Dairy Purchases & Raw Material Procurement Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'निवडलेला कालावधी खरेदी हिशोब' : isHi ? 'चुनी गई अवधि का खरीद हिसाब' : 'Selected Period Purchases Ledger',
      language,
      kpis: [
        { label: isMr ? 'एकूण खरेदी रक्कम' : isHi ? 'कुल खरीद राशि' : 'Total Purchases', value: `₹${totalAmt.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'एकूण आवक नग/लिटर' : isHi ? 'कुल आवक मात्रा' : 'Total Inward Volume', value: `${totalQty.toLocaleString('en-IN')} Units`, color: 'emerald' },
        { label: isMr ? 'खरेदी नोंदी' : isHi ? 'खरीद प्रविष्टियाँ' : 'Invoices Billed', value: `${filteredPurchases.length}`, color: 'purple' }
      ],
      table: {
        headers: isMr
          ? ['दिनांक', 'शेतकरी / सप्लायर', 'उत्पादनाचे नाव', 'बॅच क्र.', 'प्रमाण', 'दर (₹)', 'एकूण रक्कम (₹)', 'पेमेंट पद्धत', 'शेरा / फॅट']
          : isHi
          ? ['तारीख', 'सप्लायर / किसान', 'सामान का नाम', 'बैच क्र.', 'मात्रा', 'दर (₹)', 'कुल रकम (₹)', 'भुगतान', 'टिप्पणी / फैट']
          : ['Date', 'Supplier / Farmer', 'Product Name', 'Batch No.', 'Quantity', 'Rate (₹)', 'Total (₹)', 'Payment Mode', 'Notes / Remarks'],
        alignments: ['left', 'left', 'left', 'center', 'right', 'right', 'right', 'center', 'left'] as ('left' | 'left' | 'left' | 'center' | 'right' | 'right' | 'right' | 'center' | 'left')[],
        rows: filteredPurchases.map(p => [
          p.purchase_date,
          p.supplier_name + (p.invoice_number ? ` (#${p.invoice_number})` : ''),
          p.product_name,
          p.batch_no || '—',
          `${p.quantity} ${p.unit}`,
          `₹${p.purchase_price}`,
          `₹${p.total_amount.toLocaleString('en-IN')}`,
          p.payment_mode === 'Cash' ? (isMr ? 'रोख' : isHi ? 'रोकड़' : 'Cash') :
          p.payment_mode === 'Online_UPI' ? (isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन UPI' : 'Online UPI') :
          p.payment_mode === 'Bank_Transfer' ? (isMr ? 'बँक ट्रान्सफर' : isHi ? 'बैंक ट्रांसफर' : 'Bank Transfer') :
          p.payment_mode === 'Udhar' ? (isMr ? 'सप्लायर उधारी' : isHi ? 'सप्लायर उधार' : 'Supplier Credit') : p.payment_mode,
          p.notes || '—'
        ]),
        summaryRow: [
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredPurchases.length} ${isMr ? 'नोंदी' : isHi ? 'प्रविष्टियाँ' : 'Records'}`,
          '',
          '',
          `${totalQty} ${isMr ? 'युनिट्स' : isHi ? 'यूनिट' : 'Units'}`,
          '',
          `₹${totalAmt.toLocaleString('en-IN')}`,
          '',
          ''
        ]
      },
      notes: isMr 
        ? 'डेअरी संकलन व कच्चा माल आवक तपशील. सर्व पावत्या तपासून बिल पास करावे.'
        : isHi
        ? 'डेरी दूध संकलन व कच्चा माल आवक विवरण। सभी रसीदें जांचकर बिल पास करें।'
        : 'Dairy procurement & raw milk inward ledger. Verify lab tests and gate passes before approving payout.'
    };
  };

  const handleViewPurchasePDF = () => {
    viewReportPDF(getPurchaseReportPayload());
  };

  const handlePrintPurchasePDF = () => {
    printReport(getPurchaseReportPayload());
  };

  const handleDownloadPurchasePDF = () => {
    downloadReportPDF(getPurchaseReportPayload());
  };

  return (
    <div className="space-y-5">
      
      {/* Header Banner */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-ink-2" />
            <span>
              {language === 'mr' ? 'दूध व माल खरेदी व्यवस्थापन (Purchases)' : language === 'hi' ? 'दुकान का माल खरीदा (Purchases)' : 'Dairy Purchases & Supplier Ledger'}
            </span>
          </h2>
          <p className="text-xs text-ink-3 font-medium mt-1">
            {language === 'mr' ? 'शेतकरी, डेअरी संस्था आणि पुरवठादारांकडून कच्चा माल खरेदी' : language === 'hi' ? 'किसान, डेयरी संस्था और सप्लायर्स से कच्चा माल खरीद' : 'Raw milk & wholesale inventory purchase tracking from farmers and plants'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Milk Fat/SNF Calculator Trigger Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsFatCalcOpen(true)}
            leftIcon={<Calculator className="w-4 h-4 text-ink-2" />}
            title="Milk Fat & SNF Testing Rate Calculator"
          >
            {language === 'mr' ? 'दूध फॅट' : language === 'hi' ? 'दूध फैट' : 'Fat Calc'}
          </Button>

          {/* View PDF Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleViewPurchasePDF}
            leftIcon={<Eye className="w-4 h-4" />}
            title="View Purchases PDF Report"
          >
            {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
          </Button>

          {/* Print PDF Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrintPurchasePDF}
            leftIcon={<Printer className="w-4 h-4" />}
            title="Print Purchases Report"
          >
            {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
          </Button>

          {/* PDF Report Download Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadPurchasePDF}
            leftIcon={<Download className="w-4 h-4" />}
            title="Download Purchases PDF Report"
          >
            PDF
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            title="Export to Excel CSV"
          >
            CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (selectedProduct) setPurchasePrice(selectedProduct.purchase_price.toString());
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            {language === 'mr' ? 'खरेदी नोंदवा' : language === 'hi' ? 'खरीद दर्ज करें' : 'Record Purchase'}
          </Button>
        </div>
      </Card>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label={t('totalPurchases')}
          value={`₹${metrics.totalPurchasesAmount.toLocaleString('en-IN')}`}
          delta={`${filteredPurchases.length} ${language === 'mr' ? 'पावत्या' : language === 'hi' ? 'बिल' : 'invoices'}`}
          deltaType="neutral"
          icon={<Truck className="w-4 h-4 text-ink-3" />}
        />

        <KpiCard
          label={t('totalSales')}
          value={`₹${metrics.totalSalesRevenue.toLocaleString('en-IN')}`}
          delta={`${language === 'mr' ? 'प्रमाण:' : language === 'hi' ? 'अनुपात:' : 'Ratio:'} ${((metrics.totalSalesRevenue / (metrics.totalPurchasesAmount || 1)) * 100).toFixed(0)}%`}
          deltaType="ok"
        />

        <KpiCard
          label={t('grossProfit')}
          value={`₹${metrics.grossProfit.toLocaleString('en-IN')}`}
          delta={language === 'mr' ? 'खरेदी वजा करून' : language === 'hi' ? 'लागत घटाकर' : 'Net gross margin'}
          deltaType="ok"
        />
      </div>

      {/* Purchases History Table */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <h3 className="font-semibold text-ink text-sm">
            {language === 'mr' ? 'खरेदी तपशील यादी (Purchases History)' : language === 'hi' ? 'खरीद विवरण लेजर (Purchases History)' : 'Purchases Ledger History'}
          </h3>
          <span className="text-xs text-ink-3 font-medium">
            {filteredPurchases.length} {language === 'mr' ? 'नोंदी' : language === 'hi' ? 'रिकॉर्ड' : 'records'}
          </span>
        </div>

        {filteredPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-line text-ink-3 font-medium uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : language === 'hi' ? 'दिनांक' : 'Date'}</th>
                  <th className="px-3 py-3">{language === 'mr' ? 'शेतकरी / सप्लायर' : language === 'hi' ? 'सप्लायर / किसान' : 'Supplier / Farmer'}</th>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'प्रमाण' : language === 'hi' ? 'मात्रा' : 'Qty'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'दर' : language === 'hi' ? 'दर' : 'Rate'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'एकूण रक्कम' : language === 'hi' ? 'कुल रकम' : 'Total'}</th>
                  <th className="px-3 py-3 text-center">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'शेरा' : language === 'hi' ? 'रिमार्क' : 'Notes'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'परतावा' : 'वापसी'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-2 whitespace-nowrap">
                      {pur.purchase_date}
                    </td>

                    <td className="px-3 py-3 font-medium text-ink">
                      {pur.supplier_name}
                      {pur.invoice_number && (
                        <span className="block text-[10px] text-ink-3">
                          #{pur.invoice_number}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{pur.product_name}</div>
                      {(pur.batch_no || pur.expiry_date) && (
                        <div className="flex items-center gap-1.5 text-[10px] mt-0.5 text-ink-3">
                          {pur.batch_no && (
                            <span className="font-mono">{pur.batch_no}</span>
                          )}
                          {pur.expiry_date && (
                            <span>• Exp: {pur.expiry_date}</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center font-semibold text-ink tabular-nums">
                      {pur.quantity} {pur.unit}
                    </td>

                    <td className="px-3 py-3 text-right text-ink-2 tabular-nums">
                      ₹{pur.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                      ₹{pur.total_amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <Badge variant="default" className="text-[10px]">
                        {pur.payment_mode}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-ink-3 max-w-xs truncate">
                      {pur.notes || '-'}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPurForReturn({
                            productId: pur.product_id,
                            supplierName: pur.supplier_name,
                            batchNo: pur.batch_no,
                            quantity: pur.quantity
                          });
                          setIsSupplierReturnOpen(true);
                        }}
                        className="h-7 px-2 text-warn hover:bg-warn/10 text-xs ml-auto"
                        title="सप्लायरला खराब माल परत पाठवा"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        <span>{language === 'mr' ? 'परत' : 'वापस'}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-ink-3 text-xs">
            {language === 'mr' ? 'या कालावधीत कोणतीही खरेदी नोंदवलेली नाही.' : language === 'hi' ? 'इस चुनी गई अवधि में कोई खरीद दर्ज नहीं है।' : 'No purchases recorded for this selected period.'}
          </div>
        )}
      </Card>

      {/* FAT & SNF TESTING CALCULATOR MODAL */}
      <MilkFatCalculator 
        isOpen={isFatCalcOpen}
        onClose={() => setIsFatCalcOpen(false)}
        onApplyRate={handleApplyFatRate}
      />

      {/* ADD PURCHASE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'mr' ? 'नवीन माल खरेदी नोंदवा (Add Purchase)' : language === 'hi' ? 'नई खरीद दर्ज करें (Add Purchase)' : 'Record New Purchase Entry'}
        description={language === 'mr' ? 'खरेदी करताच शिल्लक साठा आपोआप वाढेल' : language === 'hi' ? 'माल आते ही स्टॉक बढ़ जाएगा' : 'Stock quantity increases automatically upon purchase'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Product Selection */}
          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'कोणता माल खरेदी केला?' : language === 'hi' ? 'कौनसा माल खरीदा?' : 'Select Product Purchased'} *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {getProductDisplayName(p)} ({p.name}) - Stock: {p.stock_quantity} {p.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Variety-Specific Shelf-Life & Batch Expiry Intelligence */}
          <div className="bg-surface-2 p-3 rounded-xl border border-line space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-ink">
              <div className="flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                <span className="truncate">{shelfLifeTip}</span>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                +{shelfDays} {language === 'mr' ? 'दिवस शेल्फ लाईफ' : language === 'hi' ? 'दिन शेल्फ लाइफ' : 'days shelf-life'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <div>
                <label className="text-[10px] font-medium text-ink-3 block mb-1">
                  {language === 'mr' ? 'आवक तारीख' : language === 'hi' ? 'खरीद तारीख' : 'Purchase Date'}
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-line bg-surface text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-ink-3 block mb-1">
                  {language === 'mr' ? 'बॅच क्र.' : language === 'hi' ? 'बैच नंबर' : 'Batch #'}
                </label>
                <input
                  type="text"
                  required
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-line bg-surface font-mono text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                />
              </div>

              <div>
                <label className="text-[10px] font-medium text-ink block mb-1">
                  {language === 'mr' ? 'मुदत तारीख' : language === 'hi' ? 'एक्सपायरी तारीख' : 'Expiry Date'}
                </label>
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-line bg-surface text-xs font-semibold text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'शेतकरी किंवा पुरवठादाराचे नाव *' : language === 'hi' ? 'सप्लायर या किसान का नाम *' : 'Farmer / Supplier Name *'}
            </label>
            <Input
              type="text"
              required
              placeholder={language === 'mr' ? 'उदा. विलास पाटील (शेतकरी) / वारणा डेअरी' : language === 'hi' ? 'उदा. रामपाल गुर्जर (किसान)' : 'e.g. Rampal Dairy Farmer / Local Dairy'}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-surface-2 p-3 rounded-xl border border-line">
            <div>
              <label className="font-medium text-ink block mb-1.5">
                {language === 'mr' ? `खरेदी प्रमाण (${selectedProduct?.unit}) *` : language === 'hi' ? `मात्रा (${selectedProduct?.unit}) *` : `Qty (${selectedProduct?.unit}) *`}
              </label>
              <Input
                type="number"
                step="0.1"
                required
                placeholder="50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="font-medium text-ink block mb-1.5">
                {language === 'mr' ? `दर प्रति ${selectedProduct?.unit} (₹) *` : language === 'hi' ? `भाव प्रति ${selectedProduct?.unit} (₹) *` : `Rate/unit (₹) *`}
              </label>
              <Input
                type="number"
                step="0.01"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>

            <div className="col-span-2 flex justify-between items-center pt-2 border-t border-line text-xs font-medium text-ink">
              <span>{language === 'mr' ? 'एकूण देय रक्कम:' : language === 'hi' ? 'कुल देय राशि:' : 'Total Payable:'}</span>
              <span className="text-base font-semibold tabular-nums text-ink">
                ₹{calculatedTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {t('paymentMethod')}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="Cash">{t('cash')}</option>
                <option value="Online_UPI">{t('onlineUpi')}</option>
                <option value="Bank_Transfer">{language === 'mr' ? 'बँक ट्रान्सफर (NEFT)' : language === 'hi' ? 'बैंक ट्रांसफर (NEFT)' : 'Bank Transfer'}</option>
                <option value="Udhar">{language === 'mr' ? 'पुरवठादार उधारी' : language === 'hi' ? 'सप्लायर उधारी' : 'Supplier Credit'}</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'पावती / बिल क्रमांक' : language === 'hi' ? 'बिल नंबर' : 'Bill / Invoice Number'}
              </label>
              <Input
                type="text"
                placeholder="MILK-204"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'शेरा / फॅट किंवा इतर नोंद' : language === 'hi' ? 'रिमार्क / फैट या विवरण' : 'Notes / Remarks'}
            </label>
            <Input
              type="text"
              placeholder={language === 'mr' ? 'उदा. सकाळची खेप, फॅट ७.२' : language === 'hi' ? 'उदा. सुबह की खेप, फैट 7.1' : 'e.g. Morning batch, 7.2 fat'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              className="w-1/2"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-1/2"
            >
              {t('save')} &amp; {language === 'mr' ? 'साठा वाढवा' : language === 'hi' ? 'स्टॉक बढ़ाएं' : 'Update Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUPPLIER RETURN MODAL */}
      {isSupplierReturnOpen && (
        <SupplierReturnModal
          onClose={() => setIsSupplierReturnOpen(false)}
          prefillProductId={selectedPurForReturn.productId}
          prefillSupplierName={selectedPurForReturn.supplierName}
          prefillBatchNo={selectedPurForReturn.batchNo}
          prefillQuantity={selectedPurForReturn.quantity}
        />
      )}

    </div>
  );
};

export default PurchaseTracker;

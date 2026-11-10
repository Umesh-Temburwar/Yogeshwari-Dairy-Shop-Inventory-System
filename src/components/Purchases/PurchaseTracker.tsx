import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { MilkFatCalculator } from './MilkFatCalculator';
import { exportToCSV } from '../../lib/exportUtils';
import { 
  Truck, 
  Plus, 
  X,
  Calculator,
  Download
} from 'lucide-react';

export const PurchaseTracker: React.FC = () => {
  const { products, filteredPurchases, createPurchase, metrics } = useStore();
  const { t, language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFatCalcOpen, setIsFatCalcOpen] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Online_UPI' | 'Bank_Transfer' | 'Udhar'>('Cash');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setPurchasePrice(prod.purchase_price.toString());
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
    const defaultSupplier = language === 'mr' ? 'स्थानिक दुग्ध उत्पादक शेतकरी' : 'Local Dairy Farmer';

    await createPurchase({
      product_id: selectedProduct.id,
      product_name: getProductDisplayName(selectedProduct),
      supplier_name: supplierName.trim() || defaultSupplier,
      quantity: qty,
      unit: selectedProduct.unit,
      purchase_price: price,
      total_amount: total,
      payment_mode: paymentMode,
      purchase_date: new Date().toISOString().split('T')[0],
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
    // Find buffalo milk or cow milk
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
    exportToCSV('Dairy_Purchases_Report', headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            <span>
              {language === 'mr' ? 'दूध व माल खरेदी व्यवस्थापन (Purchases & Suppliers)' : language === 'hi' ? 'दुकान का माल खरीदा (Dairy Purchases & Suppliers)' : 'Dairy Purchases & Supplier Ledger'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' ? 'शेतकरी, डेअरी संस्था आणि पुरवठादारांकडून कच्चा माल खरेदी' : 'Raw milk & wholesale inventory purchase tracking from farmers and plants'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Milk Fat/SNF Calculator Trigger Button */}
          <button
            onClick={() => setIsFatCalcOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 text-xs font-bold transition-all"
            title="Milk Fat & SNF Testing Rate Calculator"
          >
            <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{language === 'mr' ? 'दूध फॅट कॅल्क्युलेटर' : 'दूध फैट कैलकुलेटर'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] text-xs font-bold transition-all"
            title="Export to Excel CSV"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-[#8FA69C]" />
            <span>Excel CSV</span>
          </button>

          <button
            onClick={() => {
              if (selectedProduct) setPurchasePrice(selectedProduct.purchase_price.toString());
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ {language === 'mr' ? 'नवीन खरेदी नोंदवा' : 'नई खरीद दर्ज करें'}</span>
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('totalPurchases')}
          </span>
          <span className="text-2xl font-black text-sky-900 dark:text-sky-400 mt-1 block">
            ₹{metrics.totalPurchasesAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredPurchases.length} {language === 'mr' ? 'खरेदी पावत्या' : 'इनवॉइस / बिल'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('totalSales')}
          </span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'खरेदी विरुद्ध विक्री प्रमाण:' : 'खरीद बनाम बिक्री अनुपात:'} {((metrics.totalSalesRevenue / (metrics.totalPurchasesAmount || 1)) * 100).toFixed(0)}%
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('grossProfit')}
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            ₹{metrics.grossProfit.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {language === 'mr' ? 'विक्रीमधून माल खरेदी खर्च वजा केल्यावर' : 'बिक्री में से खरीद लागत घटाने के बाद'}
          </span>
        </div>
      </div>

      {/* Purchases History Table */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'mr' ? 'खरेदी तपशील यादी (Purchases History)' : 'खरीद विवरण लेजर (Purchases History)'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filteredPurchases.length} {language === 'mr' ? 'नोंदी' : 'रिकॉर्ड'}
          </span>
        </div>

        {filteredPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase">
                <tr>
                  <th className="px-4 py-3">{language === 'mr' ? 'तारीख' : 'दिनांक'}</th>
                  <th className="px-3 py-3">{language === 'mr' ? 'शेतकरी / पुरवठादार' : 'सप्लायर / किसान'}</th>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'प्रमाण (Quantity)' : 'मात्रा'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'दर (Rate)' : 'दर'}</th>
                  <th className="px-3 py-3 text-right">{language === 'mr' ? 'एकूण रक्कम' : 'कुल रकम'}</th>
                  <th className="px-3 py-3 text-center">{t('paymentMethod')}</th>
                  <th className="px-4 py-3">{language === 'mr' ? 'शेरा / फॅट' : 'रिमार्क / नोट्स'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredPurchases.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-[#8FA69C] whitespace-nowrap">
                      {pur.purchase_date}
                    </td>

                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">
                      {pur.supplier_name}
                      {pur.invoice_number && (
                        <span className="block text-[10px] text-slate-500 dark:text-[#8FA69C] font-normal">
                          Bill #{pur.invoice_number}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{pur.product_name}</div>
                    </td>

                    <td className="px-3 py-3 text-center font-black text-slate-900 dark:text-white">
                      {pur.quantity} {pur.unit}
                    </td>

                    <td className="px-3 py-3 text-right text-slate-600 dark:text-[#8FA69C] font-semibold">
                      ₹{pur.purchase_price}
                    </td>

                    <td className="px-3 py-3 text-right font-black text-sky-900 dark:text-sky-400">
                      ₹{pur.total_amount.toLocaleString('en-IN')}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C]">
                        {pur.payment_mode}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-500 dark:text-[#8FA69C] italic max-w-xs truncate">
                      {pur.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत कोणतीही खरेदी नोंदवलेली नाही.' : 'इस चुनी गई अवधि में कोई खरीद दर्ज नहीं है।'}
          </div>
        )}
      </div>

      {/* FAT & SNF TESTING CALCULATOR MODAL */}
      <MilkFatCalculator 
        isOpen={isFatCalcOpen}
        onClose={() => setIsFatCalcOpen(false)}
        onApplyRate={handleApplyFatRate}
      />

      {/* ADD PURCHASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-transparent dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {language === 'mr' ? 'नवीन माल खरेदी नोंदवा (Add Purchase)' : 'नई खरीद दर्ज करें (Add Purchase Entry)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'खरेदी करताच शिल्लक साठा आपोआप वाढेल' : 'माल आते ही स्टॉक अपने आप बढ़ जाएगा'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'कोणता माल खरेदी केला?' : 'कौनसा माल खरीदा?'} *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {getProductDisplayName(p)} ({p.name}) - Stock: {p.stock_quantity} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'शेतकरी किंवा पुरवठादाराचे नाव *' : 'सप्लायर या किसान का नाम *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'mr' ? 'उदा. विलास पाटील (शेतकरी) / वारणा डेअरी' : 'उदा. रामपाल गुर्जर (किसान) / बनास डेरी'}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-sky-50/60 dark:bg-[#1A2A25] p-3 rounded-2xl border border-sky-100 dark:border-[#24352F]">
                <div>
                  <label className="text-xs font-bold text-sky-900 dark:text-sky-300 block mb-1">
                    {language === 'mr' ? `खरेदी प्रमाण (${selectedProduct?.unit}) *` : `कितनी मात्रा खरीदी? (${selectedProduct?.unit}) *`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-sky-300 dark:border-[#24352F] text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-sky-900 dark:text-sky-300 block mb-1">
                    {language === 'mr' ? `खरेदी दर प्रति ${selectedProduct?.unit} (₹) *` : `खरीद भाव प्रति ${selectedProduct?.unit} (₹) *`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-sky-300 dark:border-[#24352F] text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 flex justify-between items-center pt-2 border-t border-sky-200 dark:border-[#24352F] text-xs font-bold text-sky-950 dark:text-sky-300">
                  <span>{language === 'mr' ? 'एकूण देय रक्कम:' : 'कुल भुगतान राशि:'}</span>
                  <span className="text-base font-black text-sky-900 dark:text-sky-400">
                    ₹{calculatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {t('paymentMethod')}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Cash">{t('cash')}</option>
                    <option value="Online_UPI">{t('onlineUpi')}</option>
                    <option value="Bank_Transfer">{language === 'mr' ? 'बँक ट्रान्सफर (NEFT)' : 'बैंक ट्रांसफर'}</option>
                    <option value="Udhar">{language === 'mr' ? 'पुरवठादार उधारी' : 'सप्लायर उधारी'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'पावती / बिल क्रमांक' : 'बिल नंबर'}
                  </label>
                  <input
                    type="text"
                    placeholder="MILK-204"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'शेरा / फॅट किंवा इतर नोंद' : 'रिमार्क / फैट या विवरण'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'mr' ? 'उदा. सकाळची खेप, फॅट ७.२, म्हशीचे ताजे दूध' : 'उदा. सुबह की खेप, फैट 7.1'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20"
                >
                  {t('save')} &amp; {language === 'mr' ? 'साठा वाढवा' : 'स्टॉक बढ़ाएं'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

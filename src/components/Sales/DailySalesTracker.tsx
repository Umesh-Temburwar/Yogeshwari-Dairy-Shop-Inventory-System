import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { Sale } from '../../types';
import { 
  ReceiptIndianRupee, 
  Search, 
  Printer, 
  Banknote, 
  Smartphone, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X
} from 'lucide-react';

export const DailySalesTracker: React.FC = () => {
  const { filteredSales, metrics } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('All');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  const paymentModes = [
    { id: 'All', label: language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All' },
    { id: 'Cash', label: t('cash') },
    { id: 'Online_UPI', label: t('onlineUpi') },
    { id: 'Split', label: t('splitPay') },
    { id: 'Udhar', label: t('udharPay') }
  ];

  const filtered = filteredSales.filter(sale => {
    const matchesSearch = sale.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.customer_phone && sale.customer_phone.includes(searchQuery));

    const matchesMode = selectedPaymentMode === 'All' || sale.payment_mode === selectedPaymentMode;
    return matchesSearch && matchesMode;
  });

  const toggleExpand = (id: string) => {
    setExpandedSaleId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131F1B] p-5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>
              {language === 'mr' ? 'दैनिक विक्री व रोख-ऑनलाईन लेजर (Daily Sales History)' : 'दैनिक बिक्री & रोकड़-ऑनलाइन लेजर (Daily Sales History)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium mt-0.5">
            {language === 'mr' 
              ? 'किती माल गेला, काय गेला, रोख किती आली आणि ऑनलाईन UPI किती आले याचा हिशोब' 
              : 'कितना माल बिका, क्या बिका, कैश कितना आया और ऑनलाइन UPI कितना आया'}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>{language === 'mr' ? 'प्रिंट विक्री अहवाल' : 'प्रिंट बिक्री रिपोर्ट'}</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C] block">
            {t('totalSales')}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
            {filtered.length} {language === 'mr' ? 'बिले फाडली' : 'बिल काटे गए'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <Banknote className="w-4 h-4" />
            <span>{t('cashCollected')}</span>
          </div>
          <span className="text-2xl font-black text-blue-900 dark:text-blue-200 mt-1 block">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
            {language === 'mr' ? 'गल्ल्यातील रोख रक्कम' : 'रोकड़ गल्ला कलेक्शन'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400">
            <Smartphone className="w-4 h-4" />
            <span>{t('onlineCollected')}</span>
          </div>
          <span className="text-2xl font-black text-purple-900 dark:text-purple-200 mt-1 block">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            PhonePe, GPay, Paytm
          </span>
        </div>

        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 dark:text-amber-400">
            <BookOpen className="w-4 h-4" />
            <span>{language === 'mr' ? 'उधार माल दिला (Credit)' : 'उधार दिया (Credit)'}</span>
          </div>
          <span className="text-2xl font-black text-orange-900 dark:text-amber-200 mt-1 block">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-orange-600 dark:text-amber-400 font-medium">
            {language === 'mr' ? 'खात्यावर नोंदवलेली उधारी' : 'खाते में दर्ज उधारी'}
          </span>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-[#131F1B] p-3.5 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
          <input
            type="text"
            placeholder={language === 'mr' ? 'बिल क्रमांक, ग्राहक नाव किंवा मोबाईल नंबर शोधा...' : 'बिल नंबर, ग्राहक नाम या फोन नंबर से खोजें...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl shrink-0">
          {paymentModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedPaymentMode(mode.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPaymentMode === mode.id
                  ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs font-bold border dark:border-[#24352F]'
                  : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Invoices List */}
      <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            {language === 'mr' ? 'बिक्री बिल तपशील (Invoices Ledger)' : 'बिक्री बिल विवरण (Invoices Ledger)'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
            {filtered.length} {language === 'mr' ? 'बिले' : 'बिल प्रदर्शित'}
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-[#24352F]">
            {filtered.map((sale) => {
              const isExpanded = expandedSaleId === sale.id;

              return (
                <div key={sale.id} className="p-4 hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Invoice ID & Date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {sale.invoice_no}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.payment_mode === 'Cash' ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' :
                          sale.payment_mode === 'Online_UPI' ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300' :
                          sale.payment_mode === 'Split' ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300' : 'bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300'
                        }`}>
                          {sale.payment_mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
                        <span>{sale.sale_date}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700 dark:text-[#E7F0EC]">{sale.customer_name}</span>
                        {sale.customer_phone && <span>({sale.customer_phone})</span>}
                      </div>
                    </div>

                    {/* Financial details & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                          {sale.payment_mode === 'Split' && (
                            <span>{language === 'mr' ? 'रोख' : 'कैश'}: ₹{sale.cash_amount} | UPI: ₹{sale.online_amount}</span>
                          )}
                          {sale.discount > 0 && <span>{t('discount')}: ₹{sale.discount}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForView(sale)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-[#8FA69C] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#1A2A25]"
                          title="View Bill Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(sale.id)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#1A2A25]"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === 'mr' ? 'या बिलामध्ये गेलेला माल (Sold Items):' : 'इस बिल में क्या-क्या सामान गया (Sold Items):'}
                      </div>
                      {sale.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-[#8FA69C]">
                          <span>{it.product_name}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {it.quantity} {it.unit} &times; ₹{it.unit_price} = <b className="text-emerald-700 dark:text-emerald-400">₹{it.total_price}</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
            {language === 'mr' ? 'या कालावधीत कोणतेही बिल आढळले नाही.' : 'इस अवधि में कोई बिक्री बिल नहीं मिला।'}
          </div>
        )}
      </div>

      {/* BILL VIEW & REPRINT MODAL */}
      {selectedSaleForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'पावती तपशील:' : 'रसीद विवरण:'} {selectedSaleForView.invoice_no}
              </span>
              <button 
                onClick={() => setSelectedSaleForView(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-receipt" className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#24352F] font-mono text-xs space-y-2">
              <div className="text-center border-b border-slate-200 dark:border-[#24352F] pb-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{t('shopName')}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी'}
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC] pt-1">
                <span>{language === 'mr' ? 'बिल:' : 'बिल:'} {selectedSaleForView.invoice_no}</span>
                <span>{selectedSaleForView.sale_date}</span>
              </div>
              <div className="text-[11px] text-slate-700 dark:text-[#E7F0EC]">{t('customerName')}: {selectedSaleForView.customer_name}</div>

              <div className="border-t border-b border-slate-200 dark:border-[#24352F] py-1.5 space-y-1">
                {selectedSaleForView.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-800 dark:text-[#E7F0EC]">
                    <span className="truncate max-w-[150px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs pt-1 text-slate-900 dark:text-white">
                {selectedSaleForView.discount > 0 && (
                  <div className="text-slate-500 dark:text-[#8FA69C]">{t('discount')} -₹{selectedSaleForView.discount}</div>
                )}
                <div className="text-sm text-emerald-700 dark:text-emerald-400">{t('netAmount')} ₹{selectedSaleForView.net_amount}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-[#8FA69C]">
                  {t('paymentMethod')}: {selectedSaleForView.payment_mode}
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>{t('print')}</span>
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

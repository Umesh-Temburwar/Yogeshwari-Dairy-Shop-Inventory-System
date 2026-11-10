import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PeriodFilter } from '../Dashboard/PeriodFilter';
import { Sale, PaymentMode } from '../../types';
import { 
  ReceiptIndianRupee, 
  Search, 
  Printer, 
  Banknote, 
  Smartphone, 
  BookOpen, 
  CreditCard, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Calendar,
  X
} from 'lucide-react';

export const DailySalesTracker: React.FC = () => {
  const { filteredSales, metrics, setCurrentReceipt } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('All');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [selectedSaleForView, setSelectedSaleForView] = useState<Sale | null>(null);

  const paymentModes = ['All', 'Cash', 'Online_UPI', 'Split', 'Udhar'];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-emerald-600" />
            <span>दैनिक बिक्री &amp; रोकड़-ऑनलाइन लेजर (Daily Sales History)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            कितना माल बिका, क्या बिका, कैश कितना आया और ऑनलाइन UPI कितना आया
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>प्रिंट बिक्री रिपोर्ट</span>
        </button>
      </div>

      {/* Time Filter */}
      <PeriodFilter />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block">कुल बिक्री (Total Sales)</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            ₹{metrics.totalSalesRevenue.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {filtered.length} बिल काटे गए
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700">
            <Banknote className="w-4 h-4" />
            <span>कैश आया (Cash)</span>
          </div>
          <span className="text-2xl font-black text-blue-900 mt-1 block">
            ₹{metrics.cashCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-blue-600 font-medium">
            रोकड़ गल्ला कलेक्शन
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700">
            <Smartphone className="w-4 h-4" />
            <span>ऑनलाइन आया (UPI / QR)</span>
          </div>
          <span className="text-2xl font-black text-purple-900 mt-1 block">
            ₹{metrics.onlineCollected.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-purple-600 font-medium">
            PhonePe, GPay, Paytm खाता
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
            <BookOpen className="w-4 h-4" />
            <span>उधार दिया (Credit)</span>
          </div>
          <span className="text-2xl font-black text-orange-900 mt-1 block">
            ₹{metrics.udharGiven.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-orange-600 font-medium">
            खाते में दर्ज उधारी
          </span>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="बिल नंबर, ग्राहक नाम या फोन नंबर से खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
          {paymentModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedPaymentMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedPaymentMode === mode
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'All' ? 'सभी' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sales Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            बिक्री बिल विवरण (Invoices Ledger)
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filtered.length} बिल प्रदर्शित
          </span>
        </div>

        {filtered.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filtered.map((sale) => {
              const isExpanded = expandedSaleId === sale.id;

              return (
                <div key={sale.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    {/* Invoice ID & Date */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {sale.invoice_no}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.payment_mode === 'Cash' ? 'bg-blue-100 text-blue-800' :
                          sale.payment_mode === 'Online_UPI' ? 'bg-purple-100 text-purple-800' :
                          sale.payment_mode === 'Split' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {sale.payment_mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span>{sale.sale_date}</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700">{sale.customer_name}</span>
                        {sale.customer_phone && <span>({sale.customer_phone})</span>}
                      </div>
                    </div>

                    {/* Financial details & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <div className="text-lg font-black text-slate-900">
                          ₹{sale.net_amount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {sale.payment_mode === 'Split' && (
                            <span>कैश: ₹{sale.cash_amount} | UPI: ₹{sale.online_amount}</span>
                          )}
                          {sale.discount > 0 && <span>छूट: ₹{sale.discount}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForView(sale)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="View Bill Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(sale.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs">
                      <div className="font-bold text-slate-700 mb-1">
                        इस बिल में क्या-क्या सामान गया (Sold Items):
                      </div>
                      {sale.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700">
                          <span>{it.product_name}</span>
                          <span className="font-semibold">
                            {it.quantity} {it.unit} &times; ₹{it.unit_price} = <b className="text-slate-900">₹{it.total_price}</b>
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
          <div className="p-12 text-center text-slate-400 text-xs">
            इस अवधि में कोई बिक्री बिल नहीं मिला।
          </div>
        )}
      </div>

      {/* BILL VIEW & REPRINT MODAL */}
      {selectedSaleForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold text-slate-500">
                रसीद विवरण: {selectedSaleForView.invoice_no}
              </span>
              <button 
                onClick={() => setSelectedSaleForView(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-receipt" className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-xs space-y-2">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm">योगेश्वरी डेरी फार्म &amp; स्वीट्स</div>
                <div className="text-[10px] text-slate-500">ताज़ा दूध, पनीर, दही, शुद्ध देसी घी</div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>बिल: {selectedSaleForView.invoice_no}</span>
                <span>{selectedSaleForView.sale_date}</span>
              </div>
              <div className="text-[11px]">ग्राहक: {selectedSaleForView.customer_name}</div>

              <div className="border-t border-b py-1.5 space-y-1">
                {selectedSaleForView.items?.map((it, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[150px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs pt-1">
                {selectedSaleForView.discount > 0 && (
                  <div className="text-slate-500">छूट: -₹{selectedSaleForView.discount}</div>
                )}
                <div className="text-sm">कुल भुगतान: ₹{selectedSaleForView.net_amount}</div>
                <div className="text-[10px] font-normal text-slate-500">
                  माध्यम: {selectedSaleForView.payment_mode}
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट रसीद निकालें (Print)</span>
            </button>

          </div>
        </div>
      )}

    </div>
  );
};


import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ReturnReason, RefundMode, ReturnCondition, Sale } from '../../types';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Download,
  Search, 
  PackageCheck, 
  Trash2, 
  Wallet, 
  Smartphone, 
  BookOpen, 
  Repeat,
  Eye,
  Receipt,
  Check,
  ChevronDown,
  Layers,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';

interface ReturnProductModalProps {
  onClose: () => void;
  prefillProductId?: string;
  prefillInvoiceNo?: string;
  prefillCustomerName?: string;
  prefillCustomerPhone?: string;
}

export const ReturnProductModal: React.FC<ReturnProductModalProps> = ({
  onClose,
  prefillProductId,
  prefillInvoiceNo = '',
  prefillCustomerName = '',
  prefillCustomerPhone = ''
}) => {
  const { products, sales, customers, processSaleReturn } = useStore();
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  // Return Mode: 'invoice' (Return from Customer Bill) vs 'direct' (Return without Bill)
  const [returnMode, setReturnMode] = useState<'invoice' | 'direct'>(prefillInvoiceNo || sales.length > 0 ? 'invoice' : 'direct');

  // 1. INVOICE-LINKED RETURN STATE
  const [invoiceSearch, setInvoiceSearch] = useState(prefillInvoiceNo || '');
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [itemReturnQtys, setItemReturnQtys] = useState<Record<string, number>>({});

  // 2. COMMON RETURN CONFIGURATION
  const [condition, setCondition] = useState<ReturnCondition>('Resellable');
  const [refundMode, setRefundMode] = useState<RefundMode>('Cash');
  const [reason, setReason] = useState<ReturnReason>('Defective / Spoiled');
  const [customerName, setCustomerName] = useState(prefillCustomerName);
  const [customerPhone, setCustomerPhone] = useState(prefillCustomerPhone);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3. DIRECT RETURN STATE (WITHOUT INVOICE)
  const [directProductId, setDirectProductId] = useState(prefillProductId || (products[0]?.id || ''));
  const [directQuantity, setDirectQuantity] = useState('1');

  // Success summary state
  const [completedSummary, setCompletedSummary] = useState<{
    returnNo: string;
    invoiceNo?: string;
    returnType: 'Full' | 'Partial' | 'Direct';
    customerName: string;
    customerPhone?: string;
    items: Array<{ product_name: string; quantity: number; unit: string; unit_price: number; refund_amount: number }>;
    totalRefund: number;
    refundMode: RefundMode;
    condition: ReturnCondition;
    remainingSaleAmount?: number;
    returnDate: string;
  } | null>(null);

  // Auto-locate sale if prefillInvoiceNo was provided
  useEffect(() => {
    if (prefillInvoiceNo) {
      const matched = sales.find(s => s.invoice_no.trim().toLowerCase() === prefillInvoiceNo.trim().toLowerCase());
      if (matched) {
        setSelectedSaleId(matched.id);
        setCustomerName(matched.customer_name);
        setCustomerPhone(matched.customer_phone || '');
        if (matched.payment_mode === 'Udhar') {
          setRefundMode('Udhar_Credit');
        }
      }
    }
  }, [prefillInvoiceNo, sales]);

  // Find currently active selected sale
  const selectedSale = useMemo(() => {
    if (!selectedSaleId) return null;
    return sales.find(s => s.id === selectedSaleId) || null;
  }, [selectedSaleId, sales]);

  // Filter sales list based on search term
  const matchingSales = useMemo(() => {
    if (!invoiceSearch.trim()) {
      return sales.slice(0, 8); // show latest 8 sales by default
    }
    const q = invoiceSearch.trim().toLowerCase();
    return sales.filter(s => 
      s.invoice_no.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      (s.customer_phone && s.customer_phone.includes(q)) ||
      s.sale_date.includes(q)
    ).slice(0, 10);
  }, [sales, invoiceSearch]);

  // When selected sale changes, reset return quantities
  const handleSelectSale = (sale: Sale) => {
    setSelectedSaleId(sale.id);
    setInvoiceSearch(sale.invoice_no);
    setCustomerName(sale.customer_name);
    setCustomerPhone(sale.customer_phone || '');
    if (sale.payment_mode === 'Udhar') {
      setRefundMode('Udhar_Credit');
    } else {
      setRefundMode('Cash');
    }

    // Default return qty to 0 for each item
    const initQtys: Record<string, number> = {};
    sale.items?.forEach(i => {
      initQtys[i.product_id] = 0;
    });
    setItemReturnQtys(initQtys);
    setErrorMessage(null);
  };

  // Helper: Set return quantity for an item
  const setItemQty = (productId: string, val: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(Number(val.toFixed(2)), maxQty));
    setItemReturnQtys(prev => ({
      ...prev,
      [productId]: clamped
    }));
  };

  // Helper: Return All Items (100% Full Return)
  const handleReturnAll = () => {
    if (!selectedSale || !selectedSale.items) return;
    const allQtys: Record<string, number> = {};
    selectedSale.items.forEach(i => {
      allQtys[i.product_id] = i.quantity;
    });
    setItemReturnQtys(allQtys);
  };

  // Helper: Clear All Return Quantities
  const handleClearAll = () => {
    if (!selectedSale || !selectedSale.items) return;
    const cleared: Record<string, number> = {};
    selectedSale.items.forEach(i => {
      cleared[i.product_id] = 0;
    });
    setItemReturnQtys(cleared);
  };

  // Calculate return items and refund totals for selected sale
  const { returnItemsList, totalRefund, isFullReturn, anyItemReturning, remainingSaleAmount } = useMemo(() => {
    if (!selectedSale || !selectedSale.items) {
      return { returnItemsList: [], totalRefund: 0, isFullReturn: false, anyItemReturning: false, remainingSaleAmount: 0 };
    }

    let refundSum = 0;
    let allFull = true;
    let anyReturning = false;

    const list: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit: string;
      unit_price: number;
      refund_amount: number;
      purchased_qty: number;
    }> = [];

    selectedSale.items.forEach(item => {
      const retQty = itemReturnQtys[item.product_id] || 0;
      if (retQty > 0) {
        anyReturning = true;
        const itemRefund = Number((retQty * item.unit_price).toFixed(2));
        refundSum += itemRefund;
        list.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: retQty,
          unit: item.unit,
          unit_price: item.unit_price,
          refund_amount: itemRefund,
          purchased_qty: item.quantity
        });
      }

      if (retQty < item.quantity) {
        allFull = false;
      }
    });

    const isFull = anyReturning && allFull;
    const remSale = Math.max(0, Number((selectedSale.net_amount - refundSum).toFixed(2)));

    return {
      returnItemsList: list,
      totalRefund: Number(refundSum.toFixed(2)),
      isFullReturn: isFull,
      anyItemReturning: anyReturning,
      remainingSaleAmount: remSale
    };
  }, [selectedSale, itemReturnQtys]);

  // Direct return calculations
  const directProduct = products.find(p => p.id === directProductId) || products[0];
  const directUnitPrice = directProduct?.selling_price || 0;
  const directNumQty = Math.max(0, parseFloat(directQuantity) || 0);
  const directRefundAmount = Number((directUnitPrice * directNumQty).toFixed(2));

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (returnMode === 'invoice') {
      if (!selectedSale) {
        setErrorMessage(isMr ? 'कृपया ग्राहकाचे विक्री बिल / पावती निवडा.' : 'कृपया ग्राहक बिक्री बिल / रसीद चुनें।');
        return;
      }
      if (!anyItemReturning || totalRefund <= 0) {
        setErrorMessage(isMr ? 'कृपया परत करावयाच्या किमान एका वस्तूचे प्रमाण निवडा.' : 'कृपया वापस करने हेतु कम से कम एक सामान की मात्रा चुनें।');
        return;
      }

      setIsSubmitting(true);
      try {
        const todayFormatted = new Date().toISOString().split('T')[0];
        const res = await processSaleReturn({
          sale_id: selectedSale.id,
          invoice_no: selectedSale.invoice_no,
          customer_name: customerName.trim() || selectedSale.customer_name,
          customer_phone: customerPhone.trim() || selectedSale.customer_phone,
          refund_mode: refundMode,
          reason,
          condition,
          notes: notes.trim() || undefined,
          return_date: todayFormatted,
          items: returnItemsList
        });

        setCompletedSummary({
          returnNo: res[0]?.return_no || `RET-${new Date().getTime()}`,
          invoiceNo: selectedSale.invoice_no,
          returnType: isFullReturn ? 'Full' : 'Partial',
          customerName: customerName.trim() || selectedSale.customer_name,
          customerPhone: customerPhone.trim() || selectedSale.customer_phone,
          items: returnItemsList,
          totalRefund,
          refundMode,
          condition,
          remainingSaleAmount: isFullReturn ? 0 : remainingSaleAmount,
          returnDate: todayFormatted
        });
      } catch (err: any) {
        console.error('Failed to process invoice return:', err);
        setErrorMessage(err.message || 'परतावा प्रक्रिया करताना त्रुटी आली. पुन्हा प्रयत्न करा.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Direct return without invoice
      if (!directProduct || directNumQty <= 0) {
        setErrorMessage(isMr ? 'कृपया उत्पादन आणि योग्य प्रमाण प्रविष्ट करा.' : 'कृपया उत्पाद और सही मात्रा दर्ज करें।');
        return;
      }

      setIsSubmitting(true);
      try {
        const todayFormatted = new Date().toISOString().split('T')[0];
        const res = await processSaleReturn({
          customer_name: customerName.trim() || 'थेट ग्राहक',
          customer_phone: customerPhone.trim() || undefined,
          refund_mode: refundMode,
          reason,
          condition,
          notes: notes.trim() || undefined,
          return_date: todayFormatted,
          items: [{
            product_id: directProduct.id,
            product_name: directProduct.name,
            quantity: directNumQty,
            unit: directProduct.unit,
            unit_price: directUnitPrice,
            refund_amount: directRefundAmount
          }]
        });

        setCompletedSummary({
          returnNo: res[0]?.return_no || `RET-${new Date().getTime()}`,
          returnType: 'Direct',
          customerName: customerName.trim() || 'थेट ग्राहक',
          customerPhone: customerPhone.trim() || undefined,
          items: [{
            product_name: directProduct.name,
            quantity: directNumQty,
            unit: directProduct.unit,
            unit_price: directUnitPrice,
            refund_amount: directRefundAmount
          }],
          totalRefund: directRefundAmount,
          refundMode,
          condition,
          returnDate: todayFormatted
        });
      } catch (err: any) {
        console.error('Failed to process direct return:', err);
        setErrorMessage(err.message || 'थेट परतावा नोंदवताना त्रुटी आली.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // PDF & Print Slip Payload
  const getReturnSlipPayload = () => {
    if (!completedSummary) return null;

    const returnTypeLabel = 
      completedSummary.returnType === 'Full' 
        ? (isMr ? 'संपूर्ण पावती परतावा (Full Return)' : 'पूर्ण बिल वापसी')
        : completedSummary.returnType === 'Partial'
        ? (isMr ? 'आंशिक पावती परतावा (Partial Return)' : 'आंशिक बिल वापसी')
        : (isMr ? 'थेट परतावा (Direct Return)' : 'सीधी वापसी');

    return {
      title: isMr 
        ? `ग्राहक माल परतावा पावती (${completedSummary.returnNo})` 
        : isHi 
        ? `ग्राहक सामान वापसी रसीद (${completedSummary.returnNo})` 
        : `Customer Return Voucher (${completedSummary.returnNo})`,
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: `${isMr ? ' व्हाउचर क्र.' : 'वाउचर सं.'}: ${completedSummary.returnNo} | ${isMr ? 'तारीख' : 'दिनांक'}: ${completedSummary.returnDate} | ${returnTypeLabel}`,
      language,
      kpis: [
        { label: isMr ? 'एकूण परतावा रक्कम' : 'कुल रिफंड राशि', value: `₹${completedSummary.totalRefund.toFixed(2)}`, color: 'emerald' },
        { 
          label: isMr ? 'परतावा पद्धत' : 'रिफंड माध्यम', 
          value: completedSummary.refundMode === 'Cash' ? (isMr ? 'रोख' : 'रोकड़') :
                 completedSummary.refundMode === 'Online_UPI' ? 'ऑनलाइन UPI' :
                 completedSummary.refundMode === 'Udhar_Credit' ? (isMr ? 'उधारी खात्यात जमा' : 'उधार खाते में जमा') : completedSummary.refundMode, 
          color: 'blue' 
        },
        {
          label: isMr ? 'मालाची स्थिती' : 'सामान स्थिति',
          value: completedSummary.condition === 'Resellable' ? (isMr ? 'स्टॉकमध्ये जमा (Restocked)' : 'स्टॉक में जमा') : (isMr ? 'नुकसान नोंद (Damaged)' : 'नुकसान दर्ज'),
          color: completedSummary.condition === 'Resellable' ? 'emerald' : 'amber'
        }
      ],
      table: {
        headers: isMr 
          ? ['उत्पादनाचे नाव', 'परत प्रमाण', 'दर (₹)', 'रिफंड रक्कम (₹)']
          : isHi
          ? ['उत्पाद नाम', 'वापसी मात्रा', 'दर (₹)', 'रिफंड राशि (₹)']
          : ['Product Name', 'Returned Qty', 'Unit Price (₹)', 'Refund Amount (₹)'],
        alignments: ['left', 'center', 'right', 'right'] as ('left' | 'center' | 'right' | 'right')[],
        rows: completedSummary.items.map(item => [
          item.product_name,
          `${item.quantity} ${item.unit}`,
          `₹${item.unit_price.toFixed(2)}`,
          `₹${item.refund_amount.toFixed(2)}`
        ]),
        summaryRow: [
          isMr ? 'एकूण परतावा' : 'कुल रिफंड', 
          '', 
          '', 
          `₹${completedSummary.totalRefund.toFixed(2)}`
        ]
      },
      notes: `${isMr ? 'ग्राहक नाव' : 'ग्राहक नाम'}: ${completedSummary.customerName} | ${isMr ? 'फोन' : 'फोन'}: ${completedSummary.customerPhone || '—'} | ${completedSummary.invoiceNo ? `${isMr ? 'मूळ पावती' : 'मूल बिल'}: #${completedSummary.invoiceNo}` : ''} | ${completedSummary.returnType === 'Full' ? (isMr ? 'पावती विक्री यादीतून कायमची हटवली' : 'बिल बिक्री सूची से हटाया गया') : completedSummary.returnType === 'Partial' ? `${isMr ? 'सुधारित पावती शिल्लक' : 'संशोधित बिल शेष'}: ₹${completedSummary.remainingSaleAmount?.toFixed(2)}` : ''}`
    };
  };

  const handleViewSlipPDF = () => {
    const payload = getReturnSlipPayload();
    if (payload) viewReportPDF(payload);
  };

  const handlePrintSlip = () => {
    const payload = getReturnSlipPayload();
    if (payload) printReport(payload);
    else window.print();
  };

  const handleDownloadSlipPDF = () => {
    const payload = getReturnSlipPayload();
    if (payload) downloadReportPDF(payload);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] my-auto space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* SUCCESS CONFIRMATION MODAL STATE */}
        {completedSummary ? (
          <div className="overflow-y-auto space-y-4 py-2 pr-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                {isMr ? 'ग्राहक माल परतावा यशस्वीरित्या नोंदवला!' : isHi ? 'ग्राहक सामान वापसी सफलतापूर्वक दर्ज!' : 'Return Processed Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-mono">
                {isMr ? 'व्हाउचर क्र:' : 'वाउचर सं:'} <span className="font-bold text-purple-600 dark:text-purple-400">{completedSummary.returnNo}</span>
              </p>
            </div>

            {/* Status Highlight Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
              completedSummary.returnType === 'Full'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : completedSummary.returnType === 'Partial'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="font-extrabold flex items-center gap-1.5 text-sm">
                {completedSummary.returnType === 'Full' && '👑 संपूर्ण पावती परतावा (100% Full Return)'}
                {completedSummary.returnType === 'Partial' && '✂️ आंशिक पावती परतावा (Partial Return)'}
                {completedSummary.returnType === 'Direct' && '📦 थेट परतावा (Direct Item Return)'}
              </div>
              <p className="text-[11px] opacity-90">
                {completedSummary.returnType === 'Full' && (
                  isMr 
                    ? `पावती #${completedSummary.invoiceNo} मधील सर्व वस्तू परत झाल्यामुळे ही पावती विक्री यादीतून कायमची हटवली गेली आहे आणि सर्व परतावा Return & Refund मध्ये सेव्ह झाला आहे.`
                    : `बिल #${completedSummary.invoiceNo} के सभी सामान वापस होने से यह बिल बिक्री सूची से हटा दिया गया है और वापसी Return & Refund में दर्ज की गई है।`
                )}
                {completedSummary.returnType === 'Partial' && (
                  isMr 
                    ? `पावती #${completedSummary.invoiceNo} मधील शिल्लक माल पावतीमध्ये राहिला असून, पावतीची सुधारित रक्कम आता ₹${completedSummary.remainingSaleAmount?.toFixed(2)} झाली आहे. परत केलेल्या वस्तू Return & Refund मध्ये सेव्ह झाल्या आहेत.`
                    : `बिल #${completedSummary.invoiceNo} का बाकी सामान बिल में रहा है, और बिल की संशोधित राशि अब ₹${completedSummary.remainingSaleAmount?.toFixed(2)} हो गई है।`
                )}
                {completedSummary.returnType === 'Direct' && (
                  isMr ? 'थेट परतावा नोंदवला गेला असून रक्कम ग्राहकाला अदा करण्यात आली आहे.' : 'सीधी वापसी दर्ज कर राशि ग्राहक को वापस की गई।'
                )}
              </p>
            </div>

            {/* Returned Items Table */}
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200 dark:border-[#24352F]">
                <span>{isMr ? 'परत केलेल्या वस्तू' : 'वापस किया गया सामान'} ({completedSummary.items.length})</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">₹{completedSummary.totalRefund.toFixed(2)}</span>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {completedSummary.items.map((it, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">{it.product_name}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({it.quantity} {it.unit} x ₹{it.unit_price})</span>
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-white">₹{it.refund_amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-[#24352F] grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-[#8FA69C]">
                <div>
                  <span>{isMr ? 'ग्राहक:' : 'ग्राहक:'} </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{completedSummary.customerName}</span>
                </div>
                <div>
                  <span>{isMr ? 'पद्धत:' : 'माध्यम:'} </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{completedSummary.refundMode}</span>
                </div>
                <div>
                  <span>{isMr ? 'मालाची स्थिती:' : 'सामान स्थिति:'} </span>
                  <span className={`font-bold ${completedSummary.condition === 'Resellable' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {completedSummary.condition === 'Resellable' ? (isMr ? 'स्टॉकमध्ये जमा' : 'स्टॉक में जमा') : (isMr ? 'नुकसान नोंद' : 'नुकसान दर्ज')}
                  </span>
                </div>
                <div>
                  <span>{isMr ? 'तारीख:' : 'दिनांक:'} </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{completedSummary.returnDate}</span>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>{isMr ? 'प्रिंट' : 'प्रिंट'}</span>
              </button>
              <button
                type="button"
                onClick={handleViewSlipPDF}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Eye className="w-4 h-4 text-purple-600" />
                <span>{isMr ? 'पहा' : 'देखें'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSlipPDF}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Download className="w-4 h-4 text-purple-600" />
                <span>PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-black text-xs transition active:scale-95 shadow-md mt-2"
            >
              {isMr ? 'पूर्ण झाले (बंद करा)' : isHi ? 'पूर्ण हुआ (बंद करें)' : 'Done (Close)'}
            </button>
          </div>
        ) : (
          /* MAIN RETURN ENTRY FORM */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#24352F] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                    {isMr ? 'ग्राहक माल परतावा (Customer Return & Refund)' : isHi ? 'ग्राहक सामान वापसी (Customer Return)' : 'Customer Sales Return & Refund'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {isMr ? 'ग्राहकाने खरेदी केलेला माल परत घेणे व पावती अपडेट करणे' : 'ग्राहक द्वारा खरीदा गया सामान वापस लेना व बिल अपडेट करना'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-400 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Return Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-[#1A2A25] rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setReturnMode('invoice')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  returnMode === 'invoice'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{isMr ? 'पावतीवरून परतावा' : isHi ? 'बिल से वापसी' : 'From Bill / Invoice'}</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnMode('direct')}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                  returnMode === 'direct'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isMr ? 'थेट परतावा (पावती विना)' : isHi ? 'सीधी वापसी (बिना बिल)' : 'Direct Item Return'}</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 pr-1 flex-1">
              
              {/* ============================================================== */}
              {/* FLOW 1: INVOICE-LINKED RETURN (RECOMMENDED & PRIMARY)          */}
              {/* ============================================================== */}
              {returnMode === 'invoice' && (
                <div className="space-y-3.5">
                  
                  {/* Step 1A: Search or Change Bill */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC]">
                      {isMr ? '१. ग्राहकाची पावती / बिल शोधा किंवा निवडा:' : '१. ग्राहक का बिल / रसीद खोजें या चुनें:'}
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={invoiceSearch}
                        onChange={e => {
                          setInvoiceSearch(e.target.value);
                          if (selectedSale && !e.target.value.includes(selectedSale.invoice_no)) {
                            setSelectedSaleId('');
                          }
                        }}
                        placeholder={isMr ? 'पावती क्र. (YD-...), ग्राहक नाव किंवा मोबाईल नंबर टाका...' : 'बिल सं. (YD-...), ग्राहक नाम या मोबाइल नंबर लिखें...'}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC] focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Dropdown list of matching sales when search is active or no sale selected */}
                    {(!selectedSale || invoiceSearch !== selectedSale.invoice_no) && matchingSales.length > 0 && (
                      <div className="border border-slate-200 dark:border-[#24352F] rounded-2xl bg-white dark:bg-[#1A2A25] p-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#24352F] shadow-lg">
                        <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isMr ? 'नुकतीच झालेली बिले (क्लिक करून निवडा):' : 'हाल के बिल (क्लिक करके चुनें):'}
                        </div>
                        {matchingSales.map(sale => (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => handleSelectSale(sale)}
                            className="w-full p-2 text-left rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center justify-between text-xs group"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-purple-700 dark:text-purple-300">#{sale.invoice_no}</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate">{sale.customer_name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                📅 {sale.sale_date} &bull; {sale.items?.length || 0} {isMr ? 'वस्तू' : 'सामान'} &bull; 💳 {sale.payment_mode}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 block">₹{sale.net_amount}</span>
                              <span className="text-[9px] text-purple-600 font-bold group-hover:underline">निवडा &rarr;</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 1B: Selected Bill Details & Items List */}
                  {selectedSale && (
                    <div className="space-y-3">
                      
                      {/* Active Bill Header Card */}
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/20 rounded-2xl border border-purple-200 dark:border-purple-800/40 text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-purple-700 dark:text-purple-300 text-sm">
                            #{selectedSale.invoice_no}
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                            ₹{selectedSale.net_amount}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <span>👤 <b>{selectedSale.customer_name}</b> {selectedSale.customer_phone ? `(${selectedSale.customer_phone})` : ''}</span>
                          <span>📅 {selectedSale.sale_date}</span>
                          <span>💳 {selectedSale.payment_mode}</span>
                          <span>📍 {selectedSale.counter_name || 'काऊंटर १'}</span>
                        </div>
                      </div>

                      {/* Items Return Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <PackageCheck className="w-4 h-4 text-purple-600" />
                            <span>{isMr ? '२. बिलातील वस्तू व परत प्रमाण निवडा:' : '२. बिल का सामान व वापसी मात्रा चुनें:'}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleReturnAll}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 transition"
                            >
                              ⚡ {isMr ? 'सर्व माल परत' : 'सभी सामान वापस'}
                            </button>
                            <button
                              type="button"
                              onClick={handleClearAll}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-400 transition"
                            >
                              {isMr ? 'रद्द' : 'रद्द'}
                            </button>
                          </div>
                        </div>

                        {/* Item Cards */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                          {selectedSale.items?.map(item => {
                            const currentRetQty = itemReturnQtys[item.product_id] || 0;
                            const isFullyReturned = currentRetQty >= item.quantity;
                            const isPartial = currentRetQty > 0 && currentRetQty < item.quantity;
                            const itemRefund = Number((currentRetQty * item.unit_price).toFixed(2));

                            return (
                              <div 
                                key={item.id}
                                className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                  currentRetQty > 0
                                    ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800'
                                    : 'bg-slate-50/70 dark:bg-[#1A2A25]/50 border-slate-200 dark:border-[#24352F]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <span>{item.product_name}</span>
                                      {isFullyReturned && (
                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                          १००% परतावा
                                        </span>
                                      )}
                                      {isPartial && (
                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                          आंशिक ({currentRetQty}/{item.quantity})
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                                      {isMr ? 'खरेदी प्रमाण:' : 'खरीद मात्रा:'} <b>{item.quantity} {item.unit}</b> &bull; {isMr ? 'दर:' : 'दर:'} <b>₹{item.unit_price}</b>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block">{isMr ? 'परतावा रक्कम:' : 'वापसी राशि:'}</span>
                                    <span className={`text-xs font-black ${currentRetQty > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                                      ₹{itemRefund.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Quantity Control Buttons */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#24352F]">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {isMr ? 'परत प्रमाण (Qty to Return):' : 'वापसी मात्रा:'}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, currentRetQty - 1, item.quantity)}
                                      disabled={currentRetQty <= 0}
                                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-white font-bold flex items-center justify-center disabled:opacity-30"
                                    >
                                      -
                                    </button>

                                    <input
                                      type="number"
                                      min="0"
                                      max={item.quantity}
                                      step="any"
                                      value={currentRetQty === 0 ? '' : currentRetQty}
                                      onChange={e => setItemQty(item.product_id, parseFloat(e.target.value) || 0, item.quantity)}
                                      placeholder="0"
                                      className="w-16 text-center py-1 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-xs font-extrabold text-purple-600 dark:text-purple-400 focus:outline-hidden"
                                    />

                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, currentRetQty + 1, item.quantity)}
                                      disabled={currentRetQty >= item.quantity}
                                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-white font-bold flex items-center justify-center disabled:opacity-30"
                                    >
                                      +
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, item.quantity, item.quantity)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 hover:bg-purple-100 dark:bg-[#24352F] dark:hover:bg-purple-950 text-slate-700 dark:text-slate-200"
                                    >
                                      Full
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DYNAMIC RETURN TYPE STATUS BANNER */}
                      {anyItemReturning && (
                        <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                          isFullReturn
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-200'
                        }`}>
                          <div className="flex items-center justify-between font-black text-sm">
                            <span className="flex items-center gap-1.5">
                              {isFullReturn ? '👑 संपूर्ण पावती परतावा (100% Full Return)' : '✂️ आंशिक पावती परतावा (Partial Return)'}
                            </span>
                            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                              ₹{totalRefund.toFixed(2)}
                            </span>
                          </div>

                          <p className="text-[11px] leading-relaxed">
                            {isFullReturn ? (
                              isMr
                                ? `या बिलातील सर्व वस्तू परत होत आहेत. त्यामुळे ही मूळ पावती विक्री (Sales) यादीतून कायमची हटवली जाईल आणि सर्व तपशील Return & Refund व्यवस्थापनात सेव्ह केले जातील.`
                                : `इस बिल के सभी सामान वापस हो रहे हैं। अतः यह बिल बिक्री सूची से स्थायी रूप से हटा दिया जाएगा और सभी विवरण Return & Refund में सहेजे जाएंगे।`
                            ) : (
                              isMr
                                ? `काही वस्तू परत केल्या जात आहेत. परत न केलेल्या वस्तूंचे बिल अपडेट केले जाईल (नवीन पावती शिल्लक: ₹${remainingSaleAmount.toFixed(2)}) आणि परत केलेला माल Return & Refund व्यवस्थापनात नोंदवला जाईल.`
                                : `कुछ सामान वापस किया जा रहा है। बाकी सामान का बिल अपडेट हो जाएगा (नया बिल शेष: ₹${remainingSaleAmount.toFixed(2)}) और वापसी Return & Refund में दर्ज होगी।`
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* FLOW 2: DIRECT RETURN (WITHOUT INVOICE)                        */}
              {/* ============================================================== */}
              {returnMode === 'direct' && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{isMr ? 'ग्राहकाकडे मूळ बिल उपलब्ध नसल्यास येथून थेट वस्तूचा परतावा नोंदवता येतो.' : 'ग्राहक के पास मूल बिल न होने पर यहाँ से सीधे सामान की वापसी दर्ज करें।'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                      {isMr ? 'उत्पादन निवडा:' : 'उत्पाद चुनें:'}
                    </label>
                    <select
                      value={directProductId}
                      onChange={e => setDirectProductId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.selling_price} / {p.unit} ({isMr ? 'साठा' : 'स्टॉक'}: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                        {isMr ? 'परत प्रमाण:' : 'वापसी मात्रा:'}
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={directQuantity}
                        onChange={e => setDirectQuantity(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-black text-purple-600 dark:text-purple-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                        {isMr ? 'एकूण परतावा रक्कम:' : 'कुल रिफंड राशि:'}
                      </label>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ₹{directRefundAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* COMMON RETURN FORM: CONDITION, REFUND MODE, REASON & NOTES     */}
              {/* ============================================================== */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#24352F] space-y-3.5">
                
                {/* 1. Condition Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5">
                    {isMr ? '३. परत घेतलेल्या मालाची स्थिती (Condition):' : '३. वापस लिए गए सामान की स्थिति:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCondition('Resellable')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        condition === 'Resellable'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-300 font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${condition === 'Resellable' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold">{isMr ? 'चांगला माल (पुन्हा साठ्यात)' : 'अच्छा माल (स्टॉक में)'}</div>
                        <div className="text-[10px] opacity-75">{isMr ? 'साठ्यात आपोआप जोडला जाईल' : 'स्टॉक में स्वतः जुड़ जाएगा'}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCondition('Damaged_Waste')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        condition === 'Damaged_Waste'
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-900 dark:text-amber-300 font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${condition === 'Damaged_Waste' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold">{isMr ? 'खराब / नासलेला (नुकसान)' : 'खराब (नुकसान)'}</div>
                        <div className="text-[10px] opacity-75">{isMr ? 'नुकसान वहीत नोंदवला जाईल' : 'नुकसान रजिस्टर में दर्ज होगा'}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Refund Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5">
                    {isMr ? '४. परतावा पद्धत (Refund Mode):' : '४. रिफंड माध्यम:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: isMr ? 'रोख परतावा' : 'रोकड़', icon: Wallet },
                      { id: 'Online_UPI', label: isMr ? 'ऑनलाइन UPI' : 'UPI', icon: Smartphone },
                      { id: 'Udhar_Credit', label: isMr ? 'उधारी खात्यात जमा' : 'उधार जमा', icon: BookOpen }
                    ].map(m => {
                      const Icon = m.icon;
                      const active = refundMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setRefundMode(m.id as RefundMode)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                            active
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-900 dark:text-purple-300 font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                          <span className="text-[11px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Reason & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                      {isMr ? '५. परतावा कारण (Reason):' : '५. वापसी कारण:'}
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value as ReturnReason)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    >
                      <option value="Defective / Spoiled">{isMr ? 'खराब / नासलेले / आंबलेले' : 'खराब / फटा हुआ'}</option>
                      <option value="Expired Product">{isMr ? 'मुदत संपलेली (Expired)' : 'अवधि समाप्त'}</option>
                      <option value="Customer Changed Mind">{isMr ? 'ग्राहकाची पसंती / नको असलेला' : 'ग्राहक की पसंद'}</option>
                      <option value="Wrong Item Delivered">{isMr ? 'चुकीची वस्तू दिली गेली' : 'गलत सामान'}</option>
                      <option value="Weight / Quantity Discrepancy">{isMr ? 'वजन / मापात तफावत' : 'मात्रा में अंतर'}</option>
                      <option value="Packaging Damaged / Leaked">{isMr ? 'पॅकिंग फुटलेले / लिक' : 'पैकिंग लीक'}</option>
                      <option value="Other">{isMr ? 'इतर कारण' : 'अन्य कारण'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                      {isMr ? 'नोंद / टीप (पर्यायी):' : 'टिप्पणी (वैकल्पिक):'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={isMr ? 'उदा. गिऱ्हाईकाने पाकीट परत आणले...' : 'उदा. ग्राहक ने पैकेट वापस किया...'}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-medium text-slate-800 dark:text-[#E7F0EC]"
                    />
                  </div>
                </div>

                {/* Customer Details Override */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] mb-1">
                      {isMr ? 'ग्राहक नाव:' : 'ग्राहक नाम:'}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] mb-1">
                      {isMr ? 'ग्राहक मोबाईल:' : 'ग्राहक मोबाइल:'}
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Mobile No."
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || (returnMode === 'invoice' ? (!anyItemReturning || totalRefund <= 0) : directRefundAmount <= 0)}
                  className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                    isSubmitting || (returnMode === 'invoice' ? (!anyItemReturning || totalRefund <= 0) : directRefundAmount <= 0)
                      ? 'bg-slate-200 dark:bg-[#1A2A25] text-slate-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>
                    {isSubmitting
                      ? (isMr ? 'परतावा प्रक्रिया सुरू आहे...' : 'वापसी प्रक्रिया जारी है...')
                      : (isMr 
                          ? `ग्राहक परतावा निश्चित करा (रिफंड: ₹${returnMode === 'invoice' ? totalRefund.toFixed(2) : directRefundAmount.toFixed(2)})`
                          : `ग्राहक वापसी दर्ज करें (रिफंड: ₹${returnMode === 'invoice' ? totalRefund.toFixed(2) : directRefundAmount.toFixed(2)})`)}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

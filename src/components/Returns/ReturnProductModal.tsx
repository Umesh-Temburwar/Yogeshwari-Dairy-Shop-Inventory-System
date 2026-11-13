import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  PackageCheck, 
  Wallet, 
  Smartphone, 
  BookOpen, 
  Eye,
  Receipt,
  Layers,
  Info,
  Check,
  Scissors
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { Button, Input, SearchInput, Badge, StatusBadge, SegmentedControl } from '../ui';

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
  const { products, sales, processSaleReturn } = useStore();
  const { language } = useLanguage();
  const isMr = language === 'mr';
  const isHi = language === 'hi';

  // Return Mode: 'invoice' (Return from Customer Bill) vs 'direct' (Return without Bill)
  const [returnMode, setReturnMode] = useState<'invoice' | 'direct'>(prefillInvoiceNo || sales.length > 0 ? 'invoice' : 'direct');

  // INVOICE RETURN CHOICE: 'full' (100% Full Return of entire bill) vs 'partial' (Selective items return)
  const [invoiceReturnChoice, setInvoiceReturnChoice] = useState<'full' | 'partial'>('full');

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

  // When selected sale changes, reset return quantities
  const handleSelectSale = useCallback((sale: Sale, targetProductId?: string) => {
    setSelectedSaleId(sale.id);
    setInvoiceSearch(sale.invoice_no);
    setCustomerName(sale.customer_name);
    setCustomerPhone(sale.customer_phone || '');
    if (sale.payment_mode === 'Udhar') {
      setRefundMode('Udhar_Credit');
    } else if (sale.payment_mode === 'Online_UPI') {
      setRefundMode('Online_UPI');
    } else {
      setRefundMode('Cash');
    }

    const initQtys: Record<string, number> = {};
    if (targetProductId) {
      setInvoiceReturnChoice('partial');
      sale.items?.forEach(i => {
        initQtys[i.product_id] = (i.product_id === targetProductId) ? i.quantity : 0;
      });
    } else {
      setInvoiceReturnChoice('full');
      sale.items?.forEach(i => {
        initQtys[i.product_id] = i.quantity;
      });
    }
    setItemReturnQtys(initQtys);
    setErrorMessage(null);
  }, []);

  // Auto-locate sale if prefillInvoiceNo was provided
  useEffect(() => {
    if (prefillInvoiceNo) {
      const matched = sales.find(s => s.invoice_no.trim().toLowerCase() === prefillInvoiceNo.trim().toLowerCase());
      if (matched) {
        handleSelectSale(matched, prefillProductId);
        setReturnMode('invoice');
      }
    }
  }, [prefillInvoiceNo, prefillProductId, sales, handleSelectSale]);

  // Find currently active selected sale
  const selectedSale = useMemo(() => {
    if (!selectedSaleId) return null;
    return sales.find(s => s.id === selectedSaleId) || null;
  }, [selectedSaleId, sales]);

  // Filter sales list based on search term
  const matchingSales = useMemo(() => {
    if (!invoiceSearch.trim()) {
      return sales.slice(0, 8);
    }
    const q = invoiceSearch.trim().toLowerCase();
    return sales.filter(s => 
      s.invoice_no.toLowerCase().includes(q) ||
      s.customer_name.toLowerCase().includes(q) ||
      (s.customer_phone && s.customer_phone.includes(q)) ||
      s.sale_date.includes(q)
    ).slice(0, 10);
  }, [sales, invoiceSearch]);

  // Switch to Full Return (100% All Items)
  const setFullReturnMode = () => {
    setInvoiceReturnChoice('full');
    if (selectedSale && selectedSale.items) {
      const allQtys: Record<string, number> = {};
      selectedSale.items.forEach(i => {
        allQtys[i.product_id] = i.quantity;
      });
      setItemReturnQtys(allQtys);
    }
  };

  // Switch to Partial Return Mode
  const setPartialReturnMode = () => {
    setInvoiceReturnChoice('partial');
  };

  // Adjust return qty for a specific item
  const setItemQty = (productId: string, qty: number, maxQty: number) => {
    const clamped = Math.min(Math.max(0, qty), maxQty);
    setItemReturnQtys(prev => ({
      ...prev,
      [productId]: clamped
    }));
  };

  // Toggle item in partial return checklist
  const toggleItemSelection = (productId: string, maxQty: number) => {
    setItemReturnQtys(prev => {
      const current = prev[productId] || 0;
      return {
        ...prev,
        [productId]: current > 0 ? 0 : maxQty
      };
    });
  };

  // Compute calculated amounts
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
    const cappedRefund = Math.min(refundSum, selectedSale.net_amount);
    const remSale = Math.max(0, Number((selectedSale.net_amount - cappedRefund).toFixed(2)));

    return {
      returnItemsList: list,
      totalRefund: Number(cappedRefund.toFixed(2)),
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
        setErrorMessage(err.message || 'थेट परतावा प्रक्रिया करताना त्रुटी आली.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Generate payload for PDF / Thermal printing
  const getReturnSlipPayload = () => {
    if (!completedSummary) return null;

    const returnTypeLabel = 
      completedSummary.returnType === 'Full' 
        ? (isMr ? 'संपूर्ण बिल परतावा (100% Full Return)' : isHi ? 'पूर्ण बिल वापसी (100% Full Return)' : 'Full Bill Return')
        : completedSummary.returnType === 'Partial'
        ? (isMr ? 'आंशिक / निवडक माल परतावा (Partial Return)' : isHi ? 'आंशिक सामान वापसी (Partial Return)' : 'Partial Return')
        : (isMr ? 'थेट परतावा (Direct Return)' : isHi ? 'सीधी वापसी (Direct Return)' : 'Direct Return');

    return {
      title: isMr 
        ? `ग्राहक माल परतावा पावती (${completedSummary.returnNo})` 
        : isHi 
        ? `ग्राहक सामान वापसी रसीद (${completedSummary.returnNo})` 
        : `Customer Return Voucher (${completedSummary.returnNo})`,
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: `${isMr ? 'व्हाउचर क्र.' : 'वाउचर सं.'}: ${completedSummary.returnNo} | ${isMr ? 'तारीख' : 'दिनांक'}: ${completedSummary.returnDate} | ${returnTypeLabel}`,
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
      notes: `${isMr ? 'ग्राहक नाव' : 'ग्राहक नाम'}: ${completedSummary.customerName} | ${isMr ? 'फोन' : 'फोन'}: ${completedSummary.customerPhone || '—'} | ${completedSummary.invoiceNo ? `${isMr ? 'मूळ पावती' : 'मूल बिल'}: #${completedSummary.invoiceNo}` : ''} | ${completedSummary.returnType === 'Full' ? (isMr ? 'पावती विक्री यादीतून कायमची रद्द झाली' : 'बिल बिक्री सूची से रद्द किया गया') : completedSummary.returnType === 'Partial' ? `${isMr ? 'सुधारित पावती शिल्लक' : 'संशोधित बिल शेष'}: ₹${completedSummary.remainingSaleAmount?.toFixed(2)}` : ''}`
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-pop border border-line my-auto space-y-4 max-h-[92vh] flex flex-col overflow-hidden text-ink">
        
        {/* ============================================================== */}
        {/* SUCCESS CONFIRMATION MODAL STATE                               */}
        {/* ============================================================== */}
        {completedSummary ? (
          <div className="overflow-y-auto space-y-4 py-2 pr-1">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center mx-auto text-ink">
              <CheckCircle2 className="w-6 h-6 text-ok" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                {isMr ? 'ग्राहक माल परतावा यशस्वीरित्या नोंदवला!' : isHi ? 'ग्राहक सामान वापसी सफलतापूर्वक दर्ज!' : 'Return Processed Successfully!'}
              </h3>
              <p className="text-xs text-ink-3 font-mono">
                {isMr ? 'व्हाउचर क्र:' : 'वाउचर सं:'} <span className="font-semibold text-ink">{completedSummary.returnNo}</span>
              </p>
            </div>

            {/* Status Highlight Banner */}
            <div className="p-4 rounded-xl border border-line bg-surface-2/60 text-xs space-y-1.5">
              <div className="font-semibold flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={completedSummary.returnType === 'Full' ? 'warn' : 'ok'}>
                    {completedSummary.returnType === 'Full' && '⚡ 100% Full Return'}
                    {completedSummary.returnType === 'Partial' && '✂️ Partial Return'}
                    {completedSummary.returnType === 'Direct' && '📦 Direct Item Return'}
                  </StatusBadge>
                </span>
                <span className="text-base font-semibold tabular-nums text-ink">
                  ₹{completedSummary.totalRefund.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-ink-2 leading-relaxed">
                {completedSummary.returnType === 'Full' && (
                  isMr 
                    ? `पावती #${completedSummary.invoiceNo} मधील सर्वच्या सर्व वस्तू परत झाल्यामुळे ही पावती विक्री यादीतून कायमची रद्द झाली आहे आणि सर्व परतावा Return & Refund मध्ये सुरक्षित नोंदवला गेला आहे.`
                    : `बिल #${completedSummary.invoiceNo} का संपूर्ण सामान वापस हो गया है। यह बिल बिक्री सूची से रद्द कर दिया गया है और संपूर्ण वापसी Return & Refund में दर्ज की गई है।`
                )}
                {completedSummary.returnType === 'Partial' && (
                  isMr 
                    ? `पावती #${completedSummary.invoiceNo} मधील फक्त निवडक वस्तू परत घेतल्या आहेत. शिल्लक मालाची सुधारित पावती रक्कम ₹${completedSummary.remainingSaleAmount?.toFixed(2)} विक्री यादीमध्ये चालू राहील आणि परत केलेल्या वस्तूंचा हिशोब Return & Refund मध्ये सेव्ह झाला आहे.`
                    : `बिल #${completedSummary.invoiceNo} में से कुछ सामान वापस लिया गया है। शेष सामान का संशोधित बिल ₹${completedSummary.remainingSaleAmount?.toFixed(2)} बिक्री सूची में सुरक्षित है और वापसी Return & Refund में दर्ज हुई है।`
                )}
                {completedSummary.returnType === 'Direct' && (
                  isMr ? 'थेट परतावा नोंदवला गेला असून रक्कम ग्राहकाला अदा करण्यात आली आहे.' : 'सीधी वापसी दर्ज कर राशि ग्राहक को वापस की गई।'
                )}
              </p>
            </div>

            {/* Returned Items Table */}
            <div className="bg-surface rounded-xl border border-line p-3.5 space-y-2 text-xs shadow-card">
              <div className="flex justify-between items-center font-medium text-ink pb-2 border-b border-line">
                <span>{isMr ? 'परत केलेल्या वस्तू' : 'वापस किया गया सामान'} ({completedSummary.items.length})</span>
                <span className="font-semibold text-sm tabular-nums">₹{completedSummary.totalRefund.toFixed(2)}</span>
              </div>
              
              <div className="divide-y divide-line">
                {completedSummary.items.map((it, idx) => (
                  <div key={idx} className="py-2 flex justify-between items-center text-ink-2">
                    <div>
                      <span className="font-medium text-ink">{it.product_name}</span>
                      <span className="text-[11px] text-ink-3 ml-1.5 tabular-nums">({it.quantity} {it.unit} &times; ₹{it.unit_price})</span>
                    </div>
                    <span className="font-semibold text-ink tabular-nums">₹{it.refund_amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 border-t border-line grid grid-cols-2 gap-2 text-[11px] text-ink-3">
                <div>
                  <span>{isMr ? 'ग्राहक:' : 'ग्राहक:'} </span>
                  <span className="font-medium text-ink">{completedSummary.customerName}</span>
                </div>
                <div>
                  <span>{isMr ? 'पद्धत:' : 'माध्यम:'} </span>
                  <span className="font-medium text-ink">{completedSummary.refundMode}</span>
                </div>
                <div>
                  <span>{isMr ? 'मालाची स्थिती:' : 'सामान स्थिति:'} </span>
                  <span className="font-medium text-ink">
                    {completedSummary.condition === 'Resellable' ? (isMr ? 'स्टॉकमध्ये जमा' : 'स्टॉक में जमा') : (isMr ? 'नुकसान नोंद' : 'नुकसान दर्ज')}
                  </span>
                </div>
                <div>
                  <span>{isMr ? 'तारीख:' : 'दिनांक:'} </span>
                  <span className="font-medium text-ink tabular-nums">{completedSummary.returnDate}</span>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                variant="primary"
                onClick={handlePrintSlip}
                leftIcon={<Printer className="w-4 h-4" />}
                className="w-full text-xs"
              >
                {isMr ? 'प्रिंट पावती' : 'प्रिंट रसीद'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleViewSlipPDF}
                leftIcon={<Eye className="w-4 h-4" />}
                className="w-full text-xs"
              >
                {isMr ? 'पहा' : 'देखें'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDownloadSlipPDF}
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full text-xs"
              >
                PDF
              </Button>
            </div>

            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full h-10 mt-2 font-medium"
            >
              {isMr ? 'पूर्ण झाले (बंद करा)' : isHi ? 'पूर्ण हुआ (बंद करें)' : 'Done (Close)'}
            </Button>
          </div>
        ) : (
          /* ============================================================== */
          /* MAIN RETURN ENTRY FORM                                         */
          /* ============================================================== */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center">
                  <RotateCcw className="w-4 h-4 text-ink-2" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink tracking-tight">
                    {isMr ? 'ग्राहक माल परतावा (Customer Returns)' : isHi ? 'ग्राहक सामान वापसी (Customer Returns)' : 'Customer Sales Return & Refund'}
                  </h2>
                  <p className="text-xs text-ink-3">
                    {isMr ? '१००% संपूर्ण बिल परतावा किंवा काही निवडक वस्तू परत घेणे' : '100% पूरा बिल वापसी अथवा कुछ चुनिंदा सामान की वापसी'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-2 text-ink-3 hover:text-ink transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-medium flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Top Source Switcher: From Bill (Primary) vs Direct Return (Secondary) */}
            <SegmentedControl
              options={[
                { value: 'invoice', label: isMr ? 'पावती / बिलावरून परतावा' : isHi ? 'बिल / रसीद से वापसी' : 'From Bill / Invoice' },
                { value: 'direct', label: isMr ? 'थेट परतावा (पावती विना)' : isHi ? 'सीधी वापसी (बिना बिल)' : 'Direct Item Return' },
              ]}
              value={returnMode}
              onChange={(val) => setReturnMode(val as any)}
              className="w-full shrink-0"
            />

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 pr-1 flex-1">

              {/* FLOW 1: INVOICE-LINKED RETURN */}
              {returnMode === 'invoice' && (
                <div className="space-y-4">
                  {/* Step 1: Search or Pick Bill */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-ink-2">
                      {isMr ? '१. ग्राहकाचे विक्री बिल / पावती निवडा:' : '१. ग्राहक का बिक्री बिल / रसीद चुनें:'}
                    </label>
                    <SearchInput
                      value={invoiceSearch}
                      onChange={e => {
                        setInvoiceSearch(e.target.value);
                        if (selectedSale && !e.target.value.includes(selectedSale.invoice_no)) {
                          setSelectedSaleId('');
                        }
                      }}
                      placeholder={isMr ? 'पावती क्र. (YD-...), ग्राहक नाव किंवा मोबाईल नंबर टाका...' : 'बिल सं. (YD-...), ग्राहक नाम या मोबाइल नंबर लिखें...'}
                      className="w-full"
                    />

                    {/* Dropdown list of matching sales */}
                    {(!selectedSale || invoiceSearch !== selectedSale.invoice_no) && matchingSales.length > 0 && (
                      <div className="border border-line rounded-xl bg-surface p-1.5 max-h-48 overflow-y-auto divide-y divide-line shadow-card">
                        <div className="p-1.5 text-[10px] font-medium text-ink-3 uppercase tracking-wider">
                          {isMr ? 'नुकतीच झालेली बिले (क्लिक करून निवडा):' : 'हाल के बिल (क्लिक करके चुनें):'}
                        </div>
                        {matchingSales.map(sale => (
                          <button
                            key={sale.id}
                            type="button"
                            onClick={() => handleSelectSale(sale)}
                            className="w-full p-2 text-left rounded-lg hover:bg-surface-2 transition flex items-center justify-between text-xs group"
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-ink">#{sale.invoice_no}</span>
                                <span className="font-medium text-ink truncate">{sale.customer_name}</span>
                              </div>
                              <div className="text-[10px] text-ink-3">
                                📅 {sale.sale_date} &bull; {sale.items?.length || 0} {isMr ? 'वस्तू' : 'सामान'} &bull; 💳 {sale.payment_mode}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-semibold text-ink tabular-nums block">₹{sale.net_amount}</span>
                              <span className="text-[10px] text-ink-2 font-medium group-hover:underline">निवडा &rarr;</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Selected Bill Details & Workflow */}
                  {selectedSale && (
                    <div className="space-y-3.5">
                      {/* Active Bill Summary Card */}
                      <div className="p-3 bg-surface-2/60 rounded-xl border border-line text-xs space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-ink text-sm">
                              #{selectedSale.invoice_no}
                            </span>
                            <Badge variant="default" className="text-[10px] h-5">
                              {selectedSale.payment_mode}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-ink-3 block">{isMr ? 'मूळ बिल रक्कम' : 'मूल बिल राशि'}</span>
                            <span className="font-semibold text-ink text-sm tabular-nums">
                              ₹{selectedSale.net_amount}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2 pt-1 border-t border-line">
                          <span>👤 <b>{selectedSale.customer_name}</b> {selectedSale.customer_phone ? `(${selectedSale.customer_phone})` : ''}</span>
                          <span>📅 {selectedSale.sale_date}</span>
                          <span>📦 {selectedSale.items?.length || 0} {isMr ? 'उत्पादने' : 'उत्पाद'}</span>
                          <span>📍 {selectedSale.counter_name || 'काऊंटर १'}</span>
                        </div>
                      </div>

                      {/* Choose Return Mode */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                          {isMr ? '२. परतावा प्रकार निवडा (Return Mode):' : '२. वापसी प्रकार चुनें (Return Mode):'}
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Option 1: 100% Full Bill Return */}
                          <button
                            type="button"
                            onClick={setFullReturnMode}
                            className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                              invoiceReturnChoice === 'full'
                                ? 'bg-surface shadow-card border-accent'
                                : 'bg-surface-2/40 border-line hover:bg-surface-2'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                                  <span>⚡</span>
                                  <span>{isMr ? 'संपूर्ण बिल वापसी' : 'संपूर्ण बिल वापसी'}</span>
                                </span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  invoiceReturnChoice === 'full' 
                                    ? 'bg-accent text-accent-fg' 
                                    : 'border border-line'
                                }`}>
                                  {invoiceReturnChoice === 'full' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                              </div>
                              <h4 className="font-semibold text-xs text-ink">
                                100% Full Return
                              </h4>
                              <p className="text-[11px] text-ink-3 leading-snug">
                                {isMr 
                                  ? 'ग्राहकाने घेतलेले सर्व सामान परत आणले आहे. हे बिल विक्रीतून रद्द होऊन संपूर्ण रिफंड मिळेल.' 
                                  : 'ग्राहक ने खरीदा हुआ सारा सामान वापस कर दिया। यह बिल बिक्री से रद्द होकर पूरा रिफंड मिलेगा।'}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-xs">
                              <span className="text-[10px] text-ink-3 font-medium">
                                {isMr ? '१००% रिफंड रक्कम:' : '100% रिफंड राशि:'}
                              </span>
                              <span className="font-semibold text-ink tabular-nums">
                                ₹{selectedSale.net_amount.toFixed(2)}
                              </span>
                            </div>
                          </button>

                          {/* Option 2: Partial / Selective Item Return */}
                          <button
                            type="button"
                            onClick={setPartialReturnMode}
                            className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                              invoiceReturnChoice === 'partial'
                                ? 'bg-surface shadow-card border-accent'
                                : 'bg-surface-2/40 border-line hover:bg-surface-2'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                                  <Scissors className="w-3.5 h-3.5" />
                                  <span>{isMr ? 'निवडक / आंशिक वापसी' : 'चुनिंदा / आंशिक वापसी'}</span>
                                </span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  invoiceReturnChoice === 'partial' 
                                    ? 'bg-accent text-accent-fg' 
                                    : 'border border-line'
                                }`}>
                                  {invoiceReturnChoice === 'partial' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                              </div>
                              <h4 className="font-semibold text-xs text-ink">
                                Selective / Partial Return
                              </h4>
                              <p className="text-[11px] text-ink-3 leading-snug">
                                {isMr 
                                  ? 'ग्राहकाने अनेक वस्तूंमधून फक्त काही वस्तू किंवा कमी प्रमाण परत आणले आहे. शिल्लक बिल चालू राहील.' 
                                  : 'ग्राहक ने कई सामानों में से कुछ सामान या कम मात्रा वापस की है। बाकी का बिल जारी रहेगा।'}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-xs">
                              <span className="text-[10px] text-ink-3 font-medium">
                                {isMr ? 'निवडलेल्या वस्तूंचा रिफंड:' : 'चुने गए सामान का रिफंड:'}
                              </span>
                              <span className="font-semibold text-ink tabular-nums">
                                ₹{totalRefund.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Items Return Table */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                            <PackageCheck className="w-4 h-4 text-ink-2" />
                            <span>
                              {invoiceReturnChoice === 'full' 
                                ? (isMr ? '३. बिलातील सर्व वस्तू (सर्व परत होत आहेत):' : '३. बिल के सभी सामान (सभी वापस हो रहे हैं):')
                                : (isMr ? '३. ज्या वस्तू परत करायच्या आहेत त्या निवडा व प्रमाण ठरवा:' : '३. जो सामान वापस करना है उसे चुनें व मात्रा तय करें:')}
                            </span>
                          </span>

                          {invoiceReturnChoice === 'partial' && (
                            <button
                              type="button"
                              onClick={setFullReturnMode}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-surface-2 text-ink border border-line hover:bg-surface transition"
                            >
                              ⚡ {isMr ? 'सर्व निवडा' : 'सभी चुनें'}
                            </button>
                          )}
                        </div>

                        {/* Item Cards */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                          {selectedSale.items?.map(item => {
                            const currentRetQty = itemReturnQtys[item.product_id] || 0;
                            const isFullyReturned = currentRetQty >= item.quantity;
                            const isPartial = currentRetQty > 0 && currentRetQty < item.quantity;
                            const isNotReturned = currentRetQty === 0;
                            const itemRefund = Number((currentRetQty * item.unit_price).toFixed(2));
                            const remainingQty = Math.max(0, Number((item.quantity - currentRetQty).toFixed(2)));

                            return (
                              <div 
                                key={item.id}
                                className={`p-3 rounded-xl border transition-all space-y-2 ${
                                  currentRetQty > 0
                                    ? 'bg-surface shadow-card border-line'
                                    : 'bg-surface-2/40 border-line/60 opacity-70'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5">
                                    {invoiceReturnChoice === 'partial' && (
                                      <input
                                        type="checkbox"
                                        checked={currentRetQty > 0}
                                        onChange={() => toggleItemSelection(item.product_id, item.quantity)}
                                        className="mt-0.5 rounded border-line text-accent focus:ring-ink/20 cursor-pointer w-4 h-4"
                                      />
                                    )}

                                    <div>
                                      <h4 className="font-semibold text-xs text-ink flex items-center gap-1.5 flex-wrap">
                                        <span>{item.product_name}</span>
                                        {isFullyReturned && (
                                          <StatusBadge status="warn">
                                            १००% परतावा
                                          </StatusBadge>
                                        )}
                                        {isPartial && (
                                          <StatusBadge status="info">
                                            आंशिक ({currentRetQty}/{item.quantity})
                                          </StatusBadge>
                                        )}
                                        {isNotReturned && (
                                          <Badge variant="default" className="text-[10px]">
                                            परत नाही
                                          </Badge>
                                        )}
                                      </h4>
                                      <p className="text-[11px] text-ink-3">
                                        {isMr ? 'खरेदी मात्रा:' : 'खरीद मात्रा:'} <b className="text-ink">{item.quantity} {item.unit}</b> &bull; {isMr ? 'दर:' : 'दर:'} <b className="text-ink">₹{item.unit_price}</b>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] text-ink-3 block">{isMr ? 'परतावा रक्कम:' : 'वापसी राशि:'}</span>
                                    <span className="text-xs font-semibold text-ink tabular-nums">
                                      ₹{itemRefund.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Stepper */}
                                <div className="flex items-center justify-between pt-1 border-t border-line">
                                  <span className="text-[11px] text-ink-2">
                                    {isMr ? 'परत प्रमाण:' : 'वापसी मात्रा:'} <span className="font-semibold text-ink">{currentRetQty} {item.unit}</span>
                                    {remainingQty > 0 && (
                                      <span className="text-ink-3 font-normal ml-1">
                                        ({isMr ? 'शिल्लक' : 'शेष'}: {remainingQty} {item.unit})
                                      </span>
                                    )}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <div className="inline-flex h-7 rounded-lg bg-surface-2 border border-line p-0.5 items-center">
                                      <button
                                        type="button"
                                        onClick={() => setItemQty(item.product_id, currentRetQty - 1, item.quantity)}
                                        disabled={currentRetQty <= 0}
                                        className="w-6 h-6 rounded flex items-center justify-center text-ink-2 hover:bg-surface disabled:opacity-30 transition"
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
                                        className="w-12 text-center bg-transparent text-xs font-semibold text-ink focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setItemQty(item.product_id, currentRetQty + 1, item.quantity)}
                                        disabled={currentRetQty >= item.quantity}
                                        className="w-6 h-6 rounded flex items-center justify-center text-ink-2 hover:bg-surface disabled:opacity-30 transition"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, item.quantity, item.quantity)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface-2 hover:bg-surface text-ink border border-line transition"
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

                      {/* Financial summary banner */}
                      {anyItemReturning && (
                        <div className="p-3.5 rounded-xl border border-line bg-surface-2/60 text-xs space-y-2">
                          <div className="flex items-center justify-between font-semibold text-sm">
                            <span className="flex items-center gap-1.5 text-ink">
                              {isFullReturn ? '⚡ 100% संपूर्ण बिल वापसी (Full Return)' : '✂️ आंशिक बिल वापसी (Partial Return)'}
                            </span>
                            <span className="text-base font-semibold tabular-nums text-ink">
                              रिफंड: ₹{totalRefund.toFixed(2)}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-surface border border-line text-center">
                            <div>
                              <div className="text-[10px] text-ink-3 uppercase font-medium">{isMr ? 'मूळ बिल' : 'मूल बिल'}</div>
                              <div className="text-xs font-semibold text-ink tabular-nums">₹{selectedSale.net_amount.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-danger uppercase font-medium">{isMr ? 'परतावा रिफंड' : 'वापसी रिफंड'}</div>
                              <div className="text-xs font-semibold text-danger tabular-nums">-₹{totalRefund.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-ink-3 uppercase font-medium">{isMr ? 'नवीन पावती बाकी' : 'नया बिल शेष'}</div>
                              <div className="text-xs font-semibold text-ink tabular-nums">
                                ₹{isFullReturn ? '0.00 (रद्द)' : remainingSaleAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* FLOW 2: DIRECT RETURN (WITHOUT INVOICE) */}
              {returnMode === 'direct' && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-surface-2/60 rounded-xl border border-line text-xs text-ink-2 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-ink-3" />
                    <span>{isMr ? 'ग्राहकाकडे मूळ बिल उपलब्ध नसल्यास येथून थेट वस्तूचा परतावा नोंदवता येतो.' : 'ग्राहक के पास मूल बिल न होने पर यहाँ से सीधे सामान की वापसी दर्ज करें।'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink-2 mb-1.5">
                      {isMr ? 'उत्पादन निवडा:' : 'उत्पाद चुनें:'}
                    </label>
                    <select
                      value={directProductId}
                      onChange={e => setDirectProductId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
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
                      <label className="block text-xs font-medium text-ink-2 mb-1.5">
                        {isMr ? 'परत प्रमाण:' : 'वापसी मात्रा:'}
                      </label>
                      <Input
                        type="number"
                        min="0.01"
                        step="any"
                        value={directQuantity}
                        onChange={e => setDirectQuantity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-2 mb-1.5">
                        {isMr ? 'एकूण परतावा रक्कम:' : 'कुल रिफंड राशि:'}
                      </label>
                      <div className="h-10 px-3 rounded-xl bg-surface-2 border border-line flex items-center text-xs font-semibold text-ink tabular-nums">
                        ₹{directRefundAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON RETURN FORM */}
              <div className="pt-2 border-t border-line space-y-3.5">
                {/* 1. Condition Selector */}
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    {isMr ? '४. परत घेतलेल्या मालाची स्थिती (Condition):' : '४. वापस लिए गए सामान की स्थिति:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCondition('Resellable')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        condition === 'Resellable'
                          ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                          : 'bg-surface-2/40 border-line text-ink-2 hover:bg-surface-2'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-ok shrink-0" />
                      <div>
                        <div className="text-xs">{isMr ? 'चांगला माल (पुन्हा साठ्यात)' : 'अच्छा माल (स्टॉक में)'}</div>
                        <div className="text-[10px] text-ink-3">{isMr ? 'साठ्यात आपोआप जोडला जाईल' : 'स्टॉक में स्वतः जुड़ जाएगा'}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCondition('Damaged_Waste')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        condition === 'Damaged_Waste'
                          ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                          : 'bg-surface-2/40 border-line text-ink-2 hover:bg-surface-2'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-warn shrink-0" />
                      <div>
                        <div className="text-xs">{isMr ? 'खराब / नासलेला (नुकसान)' : 'खराब (नुकसान)'}</div>
                        <div className="text-[10px] text-ink-3">{isMr ? 'नुकसान वहीत नोंदवला जाईल' : 'नुकसान रजिस्टर में दर्ज होगा'}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Refund Mode */}
                <div>
                  <label className="block text-xs font-medium text-ink-2 mb-1.5">
                    {isMr ? '५. परतावा पद्धत (Refund Mode):' : '५. रिफंड माध्यम:'}
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
                          className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                            active
                              ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                              : 'bg-surface-2/40 border-line text-ink-2 hover:bg-surface-2'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-ink-2" />
                          <span className="text-[11px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Reason & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-ink-2 mb-1.5">
                      {isMr ? '६. परतावा कारण (Reason):' : '६. वापसी कारण:'}
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value as ReturnReason)}
                      className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
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
                    <label className="block text-xs font-medium text-ink-2 mb-1.5">
                      {isMr ? 'नोंद / टीप (पर्यायी):' : 'टिप्पणी (वैकल्पिक):'}
                    </label>
                    <Input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={isMr ? 'उदा. गिऱ्हाईकाने पाकीट परत आणले...' : 'उदा. ग्राहक ने पैकेट वापस किया...'}
                    />
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-ink-3 mb-1">
                      {isMr ? 'ग्राहक नाव:' : 'ग्राहक नाम:'}
                    </label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-ink-3 mb-1">
                      {isMr ? 'ग्राहक मोबाईल:' : 'ग्राहक मोबाइल:'}
                    </label>
                    <Input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Mobile No."
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || (returnMode === 'invoice' ? (!anyItemReturning || totalRefund <= 0) : directRefundAmount <= 0)}
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  className="w-full h-11"
                >
                  {returnMode === 'invoice' ? (
                    isFullReturn ? (
                      isMr 
                        ? `⚡ संपूर्ण बिल रद्द करून परतावा निश्चित करा (रिफंड: ₹${totalRefund.toFixed(2)})`
                        : `⚡ संपूर्ण बिल रद्द करके वापसी दर्ज करें (रिफंड: ₹${totalRefund.toFixed(2)})`
                    ) : (
                      isMr 
                        ? `✂️ आंशिक परतावा नोंदवून बिल अपडेट करा (रिफंड: ₹${totalRefund.toFixed(2)})`
                        : `✂️ आंशिक वापसी दर्ज कर बिल अपडेट करें (रिफंड: ₹${totalRefund.toFixed(2)})`
                    )
                  ) : (
                    isMr 
                      ? `थेट परतावा निश्चित करा (रिफंड: ₹${directRefundAmount.toFixed(2)})`
                      : `सीधी वापसी दर्ज करें (रिफंड: ₹${directRefundAmount.toFixed(2)})`
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

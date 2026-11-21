import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  Wallet, 
  Smartphone, 
  BookOpen, 
  Eye,
  Receipt,
  Layers,
  Sparkles,
  Info,
  Check,
  Percent,
  Scissors
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { formatSaleDateTime, formatSaleDate, formatSaleTime } from '../../lib/dateUtils';

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
  const { language, tr } = useLanguage();

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

    // Default return qty: if targetProductId specified, set selective mode; else default to 100% full return
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

  // Switch to Full Return (100% All Items)
  const setFullReturnMode = () => {
    if (!selectedSale || !selectedSale.items) return;
    setInvoiceReturnChoice('full');
    const allQtys: Record<string, number> = {};
    selectedSale.items.forEach(i => {
      allQtys[i.product_id] = i.quantity;
    });
    setItemReturnQtys(allQtys);
  };

  // Switch to Partial / Selective Item Return
  const setPartialReturnMode = () => {
    if (!selectedSale || !selectedSale.items) return;
    setInvoiceReturnChoice('partial');
    // If all items were full, keep them or let user deselect
  };

  // Helper: Set return quantity for an item
  const setItemQty = (productId: string, val: number, maxQty: number) => {
    const num = isNaN(val) ? 0 : val;
    const clamped = Math.max(0, Math.min(Number(num.toFixed(2)), maxQty));
    
    setItemReturnQtys(prev => {
      const next = { ...prev, [productId]: clamped };
      // Check if not all items are 100%
      if (selectedSale?.items) {
        const isStillAllFull = selectedSale.items.every(i => (next[i.product_id] || 0) >= i.quantity);
        if (!isStillAllFull && invoiceReturnChoice === 'full') {
          setInvoiceReturnChoice('partial');
        } else if (isStillAllFull && invoiceReturnChoice === 'partial') {
          // If user manually set all to max
          setInvoiceReturnChoice('full');
        }
      }
      return next;
    });
  };

  // Toggle Item selection in Partial mode
  const toggleItemSelection = (productId: string, maxQty: number) => {
    const currentQty = itemReturnQtys[productId] || 0;
    if (currentQty > 0) {
      setItemQty(productId, 0, maxQty);
    } else {
      setItemQty(productId, maxQty, maxQty);
    }
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
    // Cap refund sum at original net amount
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
        setErrorMessage('Please select a customer sales bill / invoice.');
        return;
      }
      if (!anyItemReturning || totalRefund <= 0) {
        setErrorMessage('Please select a return quantity for at least one item.');
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
        setErrorMessage(err.message || 'Error processing return. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Direct return without invoice
      if (!directProduct || directNumQty <= 0) {
        setErrorMessage('Please select a product and enter a valid quantity.');
        return;
      }

      setIsSubmitting(true);
      try {
        const todayFormatted = new Date().toISOString().split('T')[0];
        const defaultWalkInCustomer = 'Walk-in Customer';
        const res = await processSaleReturn({
          customer_name: customerName.trim() || defaultWalkInCustomer,
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
          customerName: customerName.trim() || defaultWalkInCustomer,
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
        setErrorMessage(err.message || 'Error recording direct return.');
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
        ? '100% Full Bill Return'
        : completedSummary.returnType === 'Partial'
        ? 'Partial / Selective Return'
        : 'Direct Return';

    return {
      title: `Customer Return Voucher (${completedSummary.returnNo})`,
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: `${'Voucher No.'}: ${completedSummary.returnNo} | ${'Date'}: ${completedSummary.returnDate} | ${returnTypeLabel}`,
      language,
      kpis: [
        { label: 'Total Refund Amount', value: `₹${completedSummary.totalRefund.toFixed(2)}`, color: 'emerald' },
        { 
          label: 'Refund Mode', 
          value: completedSummary.refundMode === 'Cash' ? 'Cash' :
                 completedSummary.refundMode === 'Online_UPI' ? 'Online UPI' :
                 completedSummary.refundMode === 'Udhar_Credit' ? 'Credited to Udhar Khata' : completedSummary.refundMode, 
          color: 'blue' 
        },
        {
          label: 'Item Condition',
          value: completedSummary.condition === 'Resellable' ? 'Restocked' : 'Damaged / Waste',
          color: completedSummary.condition === 'Resellable' ? 'emerald' : 'amber'
        }
      ],
      table: {
        headers: ['Product Name', 'Returned Qty', 'Unit Price (₹)', 'Refund Amount (₹)'],
        alignments: ['left', 'center', 'right', 'right'] as ('left' | 'center' | 'right' | 'right')[],
        rows: completedSummary.items.map(item => [
          item.product_name,
          `${item.quantity} ${item.unit}`,
          `₹${item.unit_price.toFixed(2)}`,
          `₹${item.refund_amount.toFixed(2)}`
        ]),
        summaryRow: [
          'Total Refund', 
          '', 
          '', 
          `₹${completedSummary.totalRefund.toFixed(2)}`
        ]
      },
      notes: `${'Customer Name'}: ${completedSummary.customerName} | ${'Phone'}: ${completedSummary.customerPhone || '—'} | ${completedSummary.invoiceNo ? `${'Original Bill'}: #${completedSummary.invoiceNo}` : ''} | ${completedSummary.returnType === 'Full' ? 'Bill permanently cancelled from sales list' : completedSummary.returnType === 'Partial' ? `${'Revised Bill Balance'}: ₹${completedSummary.remainingSaleAmount?.toFixed(2)}` : ''}`
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

  const modalContent = (
    <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-2xl w-full p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6 shadow-2xl border border-slate-200 dark:border-[#24352F] my-auto space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ============================================================== */}
        {/* SUCCESS CONFIRMATION MODAL STATE                               */}
        {/* ============================================================== */}
        {completedSummary ? (
          <div className="overflow-y-auto space-y-4 py-2 pr-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                {'Return Processed Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-mono">
                {'Voucher No:'} <span className="font-bold text-purple-600 dark:text-purple-400">{completedSummary.returnNo}</span>
              </p>
            </div>

            {/* Status Highlight Banner */}
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
              completedSummary.returnType === 'Full'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : completedSummary.returnType === 'Partial'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="font-extrabold flex items-center justify-between text-sm">
                <span>
                  {completedSummary.returnType === 'Full' && '⚡ 100% Full Bill Return'}
                  {completedSummary.returnType === 'Partial' && '✂️ Partial / Selective Return'}
                  {completedSummary.returnType === 'Direct' && '📦 Direct Item Return'}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ₹{completedSummary.totalRefund.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {completedSummary.returnType === 'Full' && (
                  `All items from Bill #${completedSummary.invoiceNo} have been returned. This bill has been permanently cancelled from the sales list and the full return is recorded in Returns & Refunds.`
                )}
                {completedSummary.returnType === 'Partial' && (
                  `Selected items from Bill #${completedSummary.invoiceNo} have been returned. The revised bill balance of ₹${completedSummary.remainingSaleAmount?.toFixed(2)} remains active in sales, and returned items are saved in Returns & Refunds.`
                )}
                {completedSummary.returnType === 'Direct' && (
                  'Direct return has been recorded and the refund amount has been issued to the customer.'
                )}
              </p>
            </div>

            {/* Returned Items Table */}
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300 pb-1.5 border-b border-slate-200 dark:border-[#24352F]">
                <span>{'Returned Items'} ({completedSummary.items.length})</span>
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
                  <span>{'Customer:'} </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{completedSummary.customerName}</span>
                </div>
                <div>
                  <span>{'Mode:'} </span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {completedSummary.refundMode === 'Cash'
                      ? 'Cash'
                      : completedSummary.refundMode === 'Online_UPI'
                      ? 'Online UPI'
                      : completedSummary.refundMode === 'Udhar_Credit'
                      ? 'Udhar Credit'
                      : completedSummary.refundMode}
                  </span>
                </div>
                <div>
                  <span>{'Item Condition:'} </span>
                  <span className={`font-bold ${completedSummary.condition === 'Resellable' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {completedSummary.condition === 'Resellable' ? 'Restocked' : 'Damaged / Waste'}
                  </span>
                </div>
                <div>
                  <span>{'Date:'} </span>
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
                <span>{'Print Slip'}</span>
              </button>
              <button
                type="button"
                onClick={handleViewSlipPDF}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Eye className="w-4 h-4 text-purple-600" />
                <span>{'View'}</span>
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
              {'Done (Close)'}
            </button>
          </div>
        ) : (
          /* ============================================================== */
          /* MAIN RETURN ENTRY FORM                                         */
          /* ============================================================== */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#24352F] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                    {'Customer Sales Return & Refund'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {'100% full bill return or selective item return'}
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

            {/* Top Source Switcher: From Bill (Primary) vs Direct Return (Secondary) */}
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
                <span>{'From Bill / Invoice'}</span>
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
                <span>{'Direct Item Return'}</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 pr-1 flex-1">

              {/* ============================================================== */}
              {/* FLOW 1: INVOICE-LINKED RETURN                                  */}
              {/* ============================================================== */}
              {returnMode === 'invoice' && (
                <div className="space-y-4">
                  
                  {/* Step 1: Search or Pick Bill */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC]">
                      {'1. Select Customer Sales Bill / Invoice:'}
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
                        placeholder={'Enter invoice no. (YD-...), customer name or mobile...'}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC] focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                      />
                    </div>

                    {/* Dropdown list of matching sales */}
                    {(!selectedSale || invoiceSearch !== selectedSale.invoice_no) && matchingSales.length > 0 && (
                      <div className="border border-slate-200 dark:border-[#24352F] rounded-2xl bg-white dark:bg-[#1A2A25] p-1.5 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-[#24352F] shadow-lg">
                        <div className="p-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {'Recent Bills (Click to select):'}
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
                              <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5">
                                <span>📅 {formatSaleDate(sale.created_at, sale.sale_date)}</span>
                                {sale.created_at && <span>⏰ {formatSaleTime(sale.created_at)}</span>}
                                <span>&bull;</span>
                                <span>{sale.items?.length || 0} {'items'}</span>
                                <span>&bull;</span>
                                <span>💳 {sale.payment_mode}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-emerald-600 dark:text-emerald-400 block">₹{sale.net_amount}</span>
                              <span className="text-[9px] text-purple-600 font-bold group-hover:underline">{'Select'} &rarr;</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Selected Bill Details & The Two Core Return Options */}
                  {selectedSale && (
                    <div className="space-y-3.5">
                      
                      {/* Active Bill Summary Card */}
                      <div className="p-3 bg-slate-50 dark:bg-[#1A2A25] rounded-2xl border border-slate-200 dark:border-[#24352F] text-xs space-y-1.5 shadow-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-purple-700 dark:text-purple-400 text-sm">
                              #{selectedSale.invoice_no}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                              {selectedSale.payment_mode}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">{'Original Bill Amount'}</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                              ₹{selectedSale.net_amount}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-[#24352F]">
                          <span>👤 <b>{selectedSale.customer_name}</b> {selectedSale.customer_phone ? `(${selectedSale.customer_phone})` : ''}</span>
                          <span>📅 {formatSaleDate(selectedSale.created_at, selectedSale.sale_date)}</span>
                          {selectedSale.created_at && (
                            <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              ⏰ {formatSaleTime(selectedSale.created_at)}
                            </span>
                          )}
                          <span>📦 {selectedSale.items?.length || 0} {'products'}</span>
                          <span>📍 {selectedSale.counter_name || 'Counter 1'}</span>
                        </div>
                      </div>

                      {/* ======================================================= */}
                      {/* STEP 2: CHOOSE RETURN WORKFLOW (THE 2 USER MODES)        */}
                      {/* ======================================================= */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-800 dark:text-[#E7F0EC] uppercase tracking-wide">
                          {'2. Select Return Mode:'}
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Option 1: 100% Full Bill Return */}
                          <button
                            type="button"
                            onClick={setFullReturnMode}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                              invoiceReturnChoice === 'full'
                                ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500 shadow-md ring-2 ring-amber-500/30'
                                : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 font-black text-xs text-amber-600 dark:text-amber-400">
                                  <span>⚡</span>
                                  <span>{'Full Bill Return'}</span>
                                </span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  invoiceReturnChoice === 'full' 
                                    ? 'bg-amber-500 text-white font-bold' 
                                    : 'border border-slate-300 dark:border-slate-600'
                                }`}>
                                  {invoiceReturnChoice === 'full' && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {'100% Full Return'}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] leading-snug">
                                {'Customer returned all purchased items. This bill will be cancelled from sales with a full refund.'}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                {'100% Refund Amount:'}
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                ₹{selectedSale.net_amount.toFixed(2)}
                              </span>
                            </div>
                          </button>

                          {/* Option 2: Partial / Selective Item Return */}
                          <button
                            type="button"
                            onClick={setPartialReturnMode}
                            className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                              invoiceReturnChoice === 'partial'
                                ? 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                                : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 font-black text-xs text-blue-600 dark:text-blue-400">
                                  <Scissors className="w-3.5 h-3.5" />
                                  <span>{'Selective / Partial Return'}</span>
                                </span>
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                                  invoiceReturnChoice === 'partial' 
                                    ? 'bg-blue-500 text-white font-bold' 
                                    : 'border border-slate-300 dark:border-slate-600'
                                }`}>
                                  {invoiceReturnChoice === 'partial' && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {'Partial Item Return'}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] leading-snug">
                                {'Customer returned only selected items or partial quantity. The remaining bill stays active.'}
                              </p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs">
                              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                {'Selected Items Refund:'}
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                ₹{totalRefund.toFixed(2)}
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Items Return Table / Checklist */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <PackageCheck className="w-4 h-4 text-purple-600" />
                            <span>
                              {invoiceReturnChoice === 'full' 
                                ? '3. All Bill Items (Returning all):'
                                : '3. Select items to return & adjust quantity:'}
                            </span>
                          </span>

                          {invoiceReturnChoice === 'partial' && (
                            <button
                              type="button"
                              onClick={setFullReturnMode}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 transition"
                            >
                              ⚡ {'Select All'}
                            </button>
                          )}
                        </div>

                        {/* Item Cards */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
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
                                className={`p-3 rounded-2xl border transition-all space-y-2 ${
                                  currentRetQty > 0
                                    ? 'bg-purple-50/60 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800'
                                    : 'bg-slate-50/70 dark:bg-[#1A2A25]/40 border-slate-200 dark:border-[#24352F] opacity-75'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5">
                                    {invoiceReturnChoice === 'partial' && (
                                      <input
                                        type="checkbox"
                                        checked={currentRetQty > 0}
                                        onChange={() => toggleItemSelection(item.product_id, item.quantity)}
                                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer w-4 h-4"
                                      />
                                    )}

                                    <div>
                                      <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                        <span>{item.product_name}</span>
                                        {isFullyReturned && (
                                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                            {'100% Return'}
                                          </span>
                                        )}
                                        {isPartial && (
                                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                            {'Partial'} ({currentRetQty}/{item.quantity})
                                          </span>
                                        )}
                                        {isNotReturned && (
                                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            {'Not Returned'}
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                                        {'Purchased Qty:'} <b>{item.quantity} {item.unit}</b> &bull; {'Rate:'} <b>₹{item.unit_price}</b>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span className="text-[10px] text-slate-400 block">{'Refund Amount:'}</span>
                                    <span className={`text-xs font-black ${currentRetQty > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                                      ₹{itemRefund.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Quantity Control Buttons (Enabled in Partial mode, or visible in full) */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-[#24352F]">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {'Return Qty:'} <span className="text-purple-600 dark:text-purple-400 font-extrabold">{currentRetQty} {item.unit}</span>
                                    {remainingQty > 0 && (
                                      <span className="text-slate-400 font-normal ml-1">
                                        ({'Remaining'}: {remainingQty} {item.unit})
                                      </span>
                                    )}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, currentRetQty - 1, item.quantity)}
                                      disabled={currentRetQty <= 0}
                                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-white font-bold flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 transition active:scale-95"
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
                                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-white font-bold flex items-center justify-center disabled:opacity-30 hover:bg-slate-100 transition active:scale-95"
                                    >
                                      +
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setItemQty(item.product_id, item.quantity, item.quantity)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 hover:bg-purple-100 dark:bg-[#24352F] dark:hover:bg-purple-950 text-slate-700 dark:text-slate-200 transition"
                                    >
                                      {'Full'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* LIVE FINANCIAL IMPACT BANNER */}
                      {anyItemReturning && (
                        <div className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                          isFullReturn
                            ? 'bg-amber-500/10 dark:bg-amber-950/30 border-amber-400 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                            : 'bg-blue-500/10 dark:bg-blue-950/30 border-blue-400 dark:border-blue-800 text-blue-950 dark:text-blue-200'
                        }`}>
                          <div className="flex items-center justify-between font-black text-sm">
                            <span className="flex items-center gap-1.5">
                              {isFullReturn
                                ? '⚡ 100% Full Bill Return'
                                : '✂️ Partial Bill Return'}
                            </span>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {'Refund'}: ₹{totalRefund.toFixed(2)}
                            </span>
                          </div>

                          {/* Dynamic comparison table */}
                          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-[#131F1B]/70 border border-slate-200/50 dark:border-slate-800 text-center">
                            <div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase">{'Original Bill'}</div>
                              <div className="text-xs font-black text-slate-700 dark:text-slate-200">₹{selectedSale.net_amount.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-rose-500 font-bold uppercase">{'Return Refund'}</div>
                              <div className="text-xs font-black text-rose-600 dark:text-rose-400">-₹{totalRefund.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">{'Revised Bill Balance'}</div>
                              <div className="text-xs font-black text-purple-700 dark:text-purple-300">
                                ₹{isFullReturn ? '0.00 (Cancelled)' : remainingSaleAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <p className="text-[11px] leading-relaxed">
                            {isFullReturn ? (
                              '📢 All items in this bill are being returned. The original invoice will be permanently cancelled from the Sales Ledger and all details will be saved in Returns & Refunds.'
                            ) : (
                              `📢 The remaining items bill will stay updated in sales with ₹${remainingSaleAmount.toFixed(2)}. Returned goods will be recorded in the Return Ledger.`
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
                    <span>{'If the customer does not have the original bill, you can record a direct item return here.'}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                      {'Select Product:'}
                    </label>
                    <select
                      value={directProductId}
                      onChange={e => setDirectProductId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.selling_price} / {p.unit} ({'Stock'}: {p.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                        {'Return Quantity:'}
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
                        {'Total Refund Amount:'}
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
                    {'4. Returned Item Condition:'}
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
                        <div className="text-xs font-bold">{'Good Condition (Restock)'}</div>
                        <div className="text-[10px] opacity-75">{'Auto-added back to stock'}</div>
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
                        <div className="text-xs font-bold">{'Damaged / Spoiled (Waste)'}</div>
                        <div className="text-[10px] opacity-75">{'Recorded in spoilage register'}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Refund Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1.5">
                    {'5. Refund Mode:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: 'Cash Refund', icon: Wallet },
                      { id: 'Online_UPI', label: 'Online UPI', icon: Smartphone },
                      { id: 'Udhar_Credit', label: 'Udhar Credit', icon: BookOpen }
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
                      {'6. Return Reason:'}
                    </label>
                    <select
                      value={reason}
                      onChange={e => setReason(e.target.value as ReturnReason)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    >
                      <option value="Defective / Spoiled">{'Defective / Spoiled / Curdled'}</option>
                      <option value="Expired Product">{'Expired Product'}</option>
                      <option value="Customer Changed Mind">{'Customer Changed Mind'}</option>
                      <option value="Wrong Item Delivered">{'Wrong Item Delivered'}</option>
                      <option value="Weight / Quantity Discrepancy">{'Weight / Quantity Discrepancy'}</option>
                      <option value="Packaging Damaged / Leaked">{'Packaging Damaged / Leaked'}</option>
                      <option value="Other">{'Other Reason'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-[#E7F0EC] mb-1">
                      {'Notes / Remarks (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder={'e.g. Customer returned milk pouch...'}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-medium text-slate-800 dark:text-[#E7F0EC]"
                    />
                  </div>
                </div>

                {/* Customer Details Override */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] mb-1">
                      {'Customer Name:'}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder={'Customer Name'}
                      className="w-full p-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] mb-1">
                      {'Customer Mobile:'}
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder={'Mobile No.'}
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
                  className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition active:scale-95 shadow-md ${
                    isSubmitting || (returnMode === 'invoice' ? (!anyItemReturning || totalRefund <= 0) : directRefundAmount <= 0)
                      ? 'bg-slate-200 dark:bg-[#1A2A25] text-slate-400 cursor-not-allowed'
                      : invoiceReturnChoice === 'full'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30'
                  }`}
                >
                  <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>
                    {isSubmitting ? (
                      'Processing return...'
                    ) : returnMode === 'invoice' ? (
                      isFullReturn ? (
                        `⚡ Cancel Full Bill & Confirm Return (Refund: ₹${totalRefund.toFixed(2)})`
                      ) : (
                        `✂️ Confirm Partial Return & Update Bill (Refund: ₹${totalRefund.toFixed(2)})`
                      )
                    ) : (
                      `Confirm Direct Return (Refund: ₹${directRefundAmount.toFixed(2)})`
                    )}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

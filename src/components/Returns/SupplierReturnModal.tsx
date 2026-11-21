import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { SupplierReturnReason, SupplierRefundStatus, SupplierReturn } from '../../types';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Truck, 
  PackageX, 
  DollarSign, 
  RefreshCw, 
  Clock, 
  FileText,
  Download,
  BadgeAlert,
  Eye
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { YDO_LOGO_BASE64 } from '../../assets/logoBase64';

interface SupplierReturnModalProps {
  onClose: () => void;
  prefillProductId?: string;
  prefillSupplierName?: string;
  prefillBatchNo?: string;
  prefillQuantity?: number;
  prefillReason?: SupplierReturnReason;
}

export const SupplierReturnModal: React.FC<SupplierReturnModalProps> = ({
  onClose,
  prefillProductId,
  prefillSupplierName = '',
  prefillBatchNo = '',
  prefillQuantity,
  prefillReason
}) => {
  const { products, batches, purchases, createSupplierReturn } = useStore();
  const { language, tr } = useLanguage();

  const [selectedProductId, setSelectedProductId] = useState(prefillProductId || (products[0]?.id || ''));
  const [supplierName, setSupplierName] = useState(prefillSupplierName);
  const [batchNo, setBatchNo] = useState(prefillBatchNo);
  const [quantity, setQuantity] = useState(prefillQuantity ? String(prefillQuantity) : '1');
  const [purchasePrice, setPurchasePrice] = useState('0');
  const [reason, setReason] = useState<SupplierReturnReason>(prefillReason || 'Damaged / Leaked on Delivery');
  const [refundStatus, setRefundStatus] = useState<SupplierRefundStatus>('Pending');
  const [refundMode, setRefundMode] = useState<'Cash' | 'Online_UPI' | 'Credit_Deduction' | 'Replacement'>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<SupplierReturn | null>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Auto-populate purchase price & default supplier when product changes
  useEffect(() => {
    if (selectedProduct) {
      setPurchasePrice(String(selectedProduct.purchase_price || 0));
      
      // Look up supplier from latest purchase or batch of this product
      if (!supplierName) {
        const latestPur = purchases.find(p => p.product_id === selectedProduct.id);
        const latestBatch = batches.find(b => b.product_id === selectedProduct.id && b.supplier_name);
        if (latestPur?.supplier_name) {
          setSupplierName(latestPur.supplier_name);
        } else if (latestBatch?.supplier_name) {
          setSupplierName(latestBatch.supplier_name);
        }
      }
    }
  }, [selectedProductId, selectedProduct]);

  // Existing suppliers list for quick selection
  const uniqueSuppliers = Array.from(new Set([
    ...purchases.map(p => p.supplier_name).filter(Boolean),
    ...batches.map(b => b.supplier_name).filter(Boolean) as string[],
    'Amul Dairy',
    'Gokul Dairy',
    'Mother Dairy',
    'Local Dairy Farmer'
  ]));

  const numQty = parseFloat(quantity) || 0;
  const unitRate = parseFloat(purchasePrice) || selectedProduct?.purchase_price || 0;
  const totalRefund = Math.round(numQty * unitRate * 100) / 100;

  // Available batches for selected product
  const productBatches = batches.filter(b => b.product_id === selectedProductId && b.qty_remaining > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || numQty <= 0) return;

    setIsSubmitting(true);
    try {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const created = await createSupplierReturn({
        supplier_name: supplierName.trim() || 'Supplier / Vendor',
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        batch_no: batchNo.trim() || undefined,
        quantity: numQty,
        unit: selectedProduct.unit,
        purchase_price: unitRate,
        total_refund_amount: totalRefund,
        reason,
        refund_status: refundStatus,
        refund_mode: refundStatus === 'Replacement_Received' ? 'Replacement' : (refundStatus === 'Adjusted_In_Next_Bill' ? 'Credit_Deduction' : refundMode),
        refund_date: refundStatus !== 'Pending' ? todayFormatted : undefined,
        return_date: todayFormatted,
        notes: notes.trim() || undefined
      });
      setCompletedReturn(created);
    } catch (err) {
      console.error('Failed to create supplier return', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDebitNotePayload = () => {
    if (!completedReturn) return null;
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: `Supplier Return Debit Note (${completedReturn.return_no})`,
      subtitle: 'Yogeshwari Dairy Farm & Products ERP',
      periodText: `${'Debit Note No.'}: ${completedReturn.return_no} | ${'Date'}: ${completedReturn.return_date}`,
      language,
      kpis: [
        { label: 'Total Refund Claim', value: `₹${completedReturn.total_refund_amount.toLocaleString('en-IN')}`, color: 'rose' },
        { 
          label: 'Refund Status', 
          value: completedReturn.refund_status === 'Refund_Received' ? ('Refund Received') :
                 completedReturn.refund_status === 'Adjusted_In_Next_Bill' ? ('Adjusted in Bill') :
                 completedReturn.refund_status === 'Replacement_Received' ? ('Replacement Received') :
                 ('Pending'), 
          color: 'blue' 
        }
      ],
      table: {
        headers: ['Supplier Name', 'Product', 'Batch No.', 'Quantity', 'Rate (₹)', 'Total Claim (₹)', 'Reason'],
        rows: [
          [
            completedReturn.supplier_name,
            completedReturn.product_name,
            completedReturn.batch_no || '—',
            `${completedReturn.quantity} ${completedReturn.unit}`,
            `₹${completedReturn.purchase_price}`,
            `₹${completedReturn.total_refund_amount.toLocaleString('en-IN')}`,
            completedReturn.reason
          ]
        ],
        summaryRow: [
          'Total Claim', 
          '', 
          '', 
          '', 
          '', 
          `₹${completedReturn.total_refund_amount.toLocaleString('en-IN')}`, 
          ''
        ]
      },
      notes: 'Supplier Signature: ___________________ | Authorized Signatory: Yogeshwari Dairy. Debit note amount to be adjusted in next bill or refunded to bank.'
    };
  };

  const handleViewDebitNote = () => {
    const payload = getDebitNotePayload();
    if (payload) viewReportPDF(payload);
  };

  const handlePrintDebitNote = () => {
    const payload = getDebitNotePayload();
    if (payload) printReport(payload);
    else window.print();
  };

  const handleDownloadDebitNotePDF = () => {
    const payload = getDebitNotePayload();
    if (payload) downloadReportPDF(payload);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6 shadow-2xl border border-slate-200 dark:border-[#24352F] my-auto space-y-4">
        
        {completedReturn ? (
          /* SUCCESS CONFIRMATION & DEBIT NOTE VOUCHER */
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                {'Supplier Return Recorded!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 font-mono">
                {'Debit Note No:'} <span className="font-bold text-slate-900 dark:text-white">{completedReturn.return_no}</span>
              </p>
            </div>

            {/* Printable Voucher Card */}
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#24352F]">
                <div>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{completedReturn.product_name}</span>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {'Supplier:'} <span className="font-bold text-slate-700 dark:text-slate-300">{completedReturn.supplier_name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                    ₹{completedReturn.total_refund_amount.toLocaleString('en-IN')}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                    {completedReturn.quantity} {completedReturn.unit} @ ₹{completedReturn.purchase_price}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-slate-400 block font-semibold">{'Return Reason:'}</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">{completedReturn.reason}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">{'Refund Status:'}</span>
                  <span className={`font-black ${
                    completedReturn.refund_status === 'Refund_Received' 
                      ? 'text-emerald-600' 
                      : completedReturn.refund_status === 'Adjusted_In_Next_Bill'
                      ? 'text-blue-600'
                      : completedReturn.refund_status === 'Replacement_Received'
                      ? 'text-purple-600'
                      : 'text-amber-600'
                  }`}>
                    {completedReturn.refund_status === 'Refund_Received'
                      ? '✅ Refund Received'
                      : completedReturn.refund_status === 'Adjusted_In_Next_Bill'
                      ? '🧾 Adjusted in Next Bill'
                      : completedReturn.refund_status === 'Replacement_Received'
                      ? '🔄 Replacement Received'
                      : '⏳ Pending'}
                  </span>
                </div>
              </div>

              {completedReturn.batch_no && (
                <div className="text-[11px] text-slate-500 pt-1">
                  {'Batch No:'} <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{completedReturn.batch_no}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={handleViewDebitNote}
                className="py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs border border-slate-300 dark:border-slate-700"
                title={'View Debit Note PDF'}
              >
                <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{'View'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintDebitNote}
                className="py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs"
                title={'Print Debit Note'}
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{'Print'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadDebitNotePDF}
                className="py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                title={'Download Debit Note PDF'}
              >
                <Download className="w-4 h-4" />
                <span>{'Download PDF'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-700 dark:text-[#E7F0EC] font-bold text-xs transition active:scale-95 border border-slate-200 dark:border-[#24352F]"
              >
                {'Done'}
              </button>
            </div>
          </div>
        ) : (
          /* SUPPLIER RETURN FORM */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#24352F]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-[#E7F0EC]">
                    {'Supplier Return & Refund Claim'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {'Return damaged or expired stock to supplier and claim refund'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Product */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                {'Select Product *'}
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC] focus:ring-2 focus:ring-amber-500"
                required
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({'Available'}: {p.stock_quantity} {p.unit} &bull; {'Purchase Rate'}: ₹{p.purchase_price})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Name & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {'Supplier / Vendor Name *'}
                </label>
                <input
                  type="text"
                  list="supplier-suggestions"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder={'e.g. Amul, Gokul, Local Farmer'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
                  required
                />
                <datalist id="supplier-suggestions">
                  {uniqueSuppliers.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {'Batch No. (Optional)'}
                </label>
                {productBatches.length > 0 ? (
                  <select
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
                  >
                    <option value="">{'-- Select available batch or leave blank --'}</option>
                    {productBatches.map(b => (
                      <option key={b.id} value={b.batch_no}>
                        {b.batch_no} ({'Left'}: {b.qty_remaining} &bull; {'Expiry'}: {b.expiry_date})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                    placeholder={'e.g. BAT-2026-001'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
                  />
                )}
              </div>
            </div>

            {/* Quantity & Purchase Rate */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {`Return Qty (${selectedProduct?.unit || 'Unit'}) *`}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-black text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {'Purchase Rate per Unit (₹) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-black text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Reason for returning to supplier */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                {'Reason for Supplier Return *'}
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as SupplierReturnReason)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC]"
              >
                <option value="Damaged / Leaked on Delivery">
                  {'📦 Damaged / Leaked on Delivery'}
                </option>
                <option value="Expired on Delivery">
                  {'⚠️ Expired on Delivery'}
                </option>
                <option value="Curdled / Spoiled Milk">
                  {'🥛 Curdled / Spoiled Milk'}
                </option>
                <option value="Poor Quality / Bad Taste">
                  {'❌ Poor Quality / Bad Taste or Smell'}
                </option>
                <option value="Short Expiry (Near Expiry)">
                  {'⏳ Short Shelf-Life (Near Expiry)'}
                </option>
                <option value="Wrong Product Delivered">
                  {'🔄 Wrong Product Delivered'}
                </option>
                <option value="Other">
                  {'Other Reason'}
                </option>
              </select>
            </div>

            {/* Refund Settlement Mode */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-[#131F1B] dark:to-[#1A2A25] rounded-2xl border border-emerald-200 dark:border-emerald-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 block">
                    {'Total Refund Claim from Supplier'}
                  </span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{totalRefund.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[10px] text-right text-emerald-800 dark:text-emerald-300 font-bold bg-white/70 dark:bg-[#131F1B]/70 px-2 py-1 rounded-lg">
                  {numQty} {selectedProduct?.unit} &times; ₹{unitRate}
                </div>
              </div>

              {/* Settlement Options Grid */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
                  {'Refund Settlement Option:'}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setRefundStatus('Refund_Received');
                      setRefundMode('Cash');
                    }}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-1.5 ${
                      refundStatus === 'Refund_Received'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{'Refund Received Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Adjusted_In_Next_Bill')}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-1.5 ${
                      refundStatus === 'Adjusted_In_Next_Bill'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{'Adjust in Next Bill'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Replacement_Received')}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-1.5 ${
                      refundStatus === 'Replacement_Received'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{'Replacement Stock'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Pending')}
                    className={`p-2 rounded-xl border text-left font-bold transition flex items-center gap-1.5 ${
                      refundStatus === 'Pending'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{'Pending (Due)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes / Challan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                {'Notes or Challan No. (Optional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={'e.g. Returned pouches to delivery boy, deduct from next bill'}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-700 dark:text-[#8FA69C] font-bold text-xs transition active:scale-95"
              >
                {'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting || numQty <= 0}
                className="w-2/3 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? 'Recording...'
                    : 'Record Supplier Return & Claim'}
                </span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};


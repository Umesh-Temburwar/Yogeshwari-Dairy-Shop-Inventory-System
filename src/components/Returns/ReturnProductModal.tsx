import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ReturnReason, RefundMode, ReturnCondition } from '../../types';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Search, 
  PackageCheck, 
  Trash2, 
  Wallet, 
  Smartphone, 
  BookOpen, 
  Repeat
} from 'lucide-react';

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
  const { products, customers, createReturn } = useStore();
  const { language } = useLanguage();

  const [selectedProductId, setSelectedProductId] = useState(prefillProductId || (products[0]?.id || ''));
  const [invoiceNo, setInvoiceNo] = useState(prefillInvoiceNo);
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState<ReturnCondition>('Resellable');
  const [refundMode, setRefundMode] = useState<RefundMode>('Cash');
  const [reason, setReason] = useState<ReturnReason>('Defective / Spoiled');
  const [customerName, setCustomerName] = useState(prefillCustomerName);
  const [customerPhone, setCustomerPhone] = useState(prefillCustomerPhone);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReturn, setCompletedReturn] = useState<any>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const unitPrice = selectedProduct?.selling_price || 0;
  const numQty = parseFloat(quantity) || 0;
  const refundAmount = Math.round(unitPrice * numQty * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || numQty <= 0) return;

    setIsSubmitting(true);
    try {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const created = await createReturn({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: numQty,
        unit: selectedProduct.unit,
        unit_price: unitPrice,
        refund_amount: refundAmount,
        refund_mode: refundMode,
        reason,
        condition,
        invoice_no: invoiceNo.trim() || undefined,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        return_date: todayFormatted
      });
      setCompletedReturn(created);
    } catch (err) {
      console.error('Failed to create return', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] my-auto space-y-4">
        {completedReturn ? (
          /* SUCCESS CONFIRMATION & RETURN RECEIPT */
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-[#E7F0EC]">
                {language === 'mr' ? 'माल परतावा यशस्वीरित्या नोंदवला!' : language === 'hi' ? 'सामान वापसी सफलतापूर्वक दर्ज!' : 'Return Processed Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 font-mono">
                {language === 'mr' ? 'पावती क्र:' : language === 'hi' ? 'रसीद क्र:' : 'Return No:'} <span className="font-bold text-slate-800 dark:text-white">{completedReturn.return_no}</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'उत्पादन:' : language === 'hi' ? 'उत्पाद:' : 'Product:'}</span>
                <span className="font-bold text-slate-800 dark:text-white">{completedReturn.product_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'नग / प्रमाण:' : language === 'hi' ? 'मात्रा:' : 'Quantity:'}</span>
                <span className="font-bold text-slate-800 dark:text-white">{completedReturn.quantity} {completedReturn.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'परतावा रक्कम:' : language === 'hi' ? 'वापसी राशि:' : 'Refund Amount:'}</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{completedReturn.refund_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'पद्धत:' : language === 'hi' ? 'माध्यम:' : 'Refund Mode:'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{completedReturn.refund_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'मालाची स्थिती:' : language === 'hi' ? 'सामान स्थिति:' : 'Condition:'}</span>
                <span className={`font-bold ${completedReturn.condition === 'Resellable' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {completedReturn.condition === 'Resellable' 
                    ? (language === 'mr' ? '✅ स्टॉकमध्ये पुन्हा जोडला' : language === 'hi' ? '✅ स्टॉक में पुनः जोड़ा' : 'Restocked to Inventory')
                    : (language === 'mr' ? '⚠️ नुकसानीत नोंदवला' : language === 'hi' ? '⚠️ नुकसान में दर्ज' : 'Recorded in Damage')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintSlip}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'mr' ? 'पावती प्रिंट करा' : language === 'hi' ? 'रसीद प्रिंट करें' : 'Print Slip'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                {language === 'mr' ? 'पूर्ण (Done)' : language === 'hi' ? 'पूर्ण (Done)' : 'Done'}
              </button>
            </div>
          </div>
        ) : (
          /* FORM BODY */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-[#24352F] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-[#E7F0EC]">
                    {language === 'mr' ? 'माल परतावा (Customer Return)' : language === 'hi' ? 'सामान वापसी (Customer Return)' : 'Customer Sales Return'}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'ग्राहकाचा परत आलेला माल नोंदवा' : language === 'hi' ? 'ग्राहक द्वारा वापस किया गया सामान दर्ज करें' : 'Record returned goods from customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                {language === 'mr' ? 'परत आलेले उत्पादन निवडा *' : language === 'hi' ? 'वापस आया उत्पाद चुनें *' : 'Select Returned Product *'}
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC] focus:ring-2 focus:ring-purple-500"
                required
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₹{p.selling_price}/{p.unit} ({language === 'mr' ? 'शिल्लक:' : language === 'hi' ? 'शेष:' : 'Stock:'} {p.stock_quantity})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity and Invoice No Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'परतावा नग / प्रमाण *' : language === 'hi' ? 'वापसी मात्रा *' : 'Quantity to Return *'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-bold text-slate-800 dark:text-[#E7F0EC] focus:ring-2 focus:ring-purple-500"
                    placeholder="1"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-[11px] font-semibold text-slate-400">
                    {selectedProduct?.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'मूळ बिल क्र. (ऐच्छिक)' : language === 'hi' ? 'मूल बिल सं. (वैकल्पिक)' : 'Original Bill No. (Opt)'}
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={e => setInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
                  placeholder="INV-..."
                />
              </div>
            </div>

            {/* Condition: Resellable vs Waste */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block">
                {language === 'mr' ? 'परत आलेल्या मालाची स्थिती (मालाचे काय करायचे?) *' : language === 'hi' ? 'वापस आए माल की स्थिति (माल का क्या करना है?) *' : 'Product Condition (What to do with item?) *'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('Resellable')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 ${
                    condition === 'Resellable'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] opacity-75'
                  }`}
                >
                  <PackageCheck className={`w-4 h-4 mt-0.5 shrink-0 ${condition === 'Resellable' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      {language === 'mr' ? 'पुन्हा विक्रीयोग्य' : language === 'hi' ? 'पुनः बिक्री योग्य' : 'Resellable (Good)'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] block leading-tight">
                      {language === 'mr' ? 'स्टॉकमध्ये पुन्हा जोडले जाईल' : language === 'hi' ? 'स्टॉक में स्वतः जुड़ जाएगा' : 'Restocks to inventory'}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('Damaged_Waste')}
                  className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2 ${
                    condition === 'Damaged_Waste'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
                      : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] opacity-75'
                  }`}
                >
                  <Trash2 className={`w-4 h-4 mt-0.5 shrink-0 ${condition === 'Damaged_Waste' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-white block">
                      {language === 'mr' ? 'खराब / नासलेला' : language === 'hi' ? 'खराब / नुकसान' : 'Damaged / Waste'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] block leading-tight">
                      {language === 'mr' ? 'नुकसानीत नोंदवले जाईल' : language === 'hi' ? 'नुकसान खाते में जाएगा' : 'Logged as loss damage'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Refund Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block">
                {language === 'mr' ? 'परतावा पद्धत (Refund Mode) *' : language === 'hi' ? 'वापसी माध्यम (Refund Mode) *' : 'Refund Mode *'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'Cash' as RefundMode, labelMr: 'रोख', labelHi: 'नकद', labelEn: 'Cash', icon: Wallet },
                  { id: 'Online_UPI' as RefundMode, labelMr: 'UPI', labelHi: 'UPI', labelEn: 'UPI', icon: Smartphone },
                  { id: 'Udhar_Credit' as RefundMode, labelMr: 'उधार जमा', labelHi: 'उधार जमा', labelEn: 'Khata Credit', icon: BookOpen },
                  { id: 'Replacement' as RefundMode, labelMr: 'बदला', labelHi: 'बदला', labelEn: 'Replace', icon: Repeat },
                ].map(m => {
                  const Icon = m.icon;
                  const isSel = refundMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRefundMode(m.id)}
                      className={`py-2 px-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        isSel
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-500 text-purple-700 dark:text-purple-300 font-black ring-1 ring-purple-500/30'
                          : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[11px] leading-tight">
                        {language === 'mr' ? m.labelMr : language === 'hi' ? m.labelHi : m.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                {language === 'mr' ? 'परताव्याचे कारण *' : language === 'hi' ? 'वापसी का कारण *' : 'Return Reason *'}
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as ReturnReason)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
              >
                <option value="Defective / Spoiled">{language === 'mr' ? 'खराब / नासलेले दूध किंवा उत्पादन' : language === 'hi' ? 'खराब / फटा हुआ दूध या उत्पाद' : 'Defective / Spoiled'}</option>
                <option value="Customer Changed Mind">{language === 'mr' ? 'ग्राहकाचा विचार बदलला (जास्त घेतले)' : language === 'hi' ? 'ग्राहक का मन बदला' : 'Customer Changed Mind'}</option>
                <option value="Wrong Product Taken">{language === 'mr' ? 'चुकीचा माल नेला होता' : language === 'hi' ? 'गलत सामान ले गए थे' : 'Wrong Product Taken'}</option>
                <option value="Quality Issue">{language === 'mr' ? 'चव किंवा गुणवत्ता तक्रार' : language === 'hi' ? 'गुणवत्ता शिकायत' : 'Quality Issue'}</option>
                <option value="Other">{language === 'mr' ? 'इतर कारण' : language === 'hi' ? 'अन्य कारण' : 'Other'}</option>
              </select>
            </div>

            {/* Customer Details (Optional or for Khata) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {refundMode === 'Udhar_Credit' 
                    ? (language === 'mr' ? 'उधार खातेदाराचे नाव *' : language === 'hi' ? 'उधार खातेदार का नाम *' : 'Khata Customer Name *')
                    : (language === 'mr' ? 'ग्राहकाचे नाव (ऐच्छिक)' : language === 'hi' ? 'ग्राहक का नाम (वैकल्पिक)' : 'Customer Name (Opt)')}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
                  placeholder="उदा. रमेश पाटील"
                  required={refundMode === 'Udhar_Credit'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'मोबाईल नंबर' : language === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]"
                  placeholder={language === 'mr' ? 'उदा. 9822XXXXXX' : language === 'hi' ? 'उदा. 9822XXXXXX' : 'e.g. 9822XXXXXX'}
                />
              </div>
            </div>

            {/* Total Refund Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 block">
                  {language === 'mr' ? 'ग्राहकाला देय परतावा रक्कम' : language === 'hi' ? 'ग्राहक को देय वापसी राशि' : 'Refund Payable to Customer'}
                </span>
                <span className="text-[10px] text-purple-700 dark:text-purple-400">
                  {numQty} {selectedProduct?.unit} &times; ₹{unitPrice}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-purple-700 dark:text-purple-300">
                  ₹{refundAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] font-bold text-xs text-slate-700 dark:text-[#E7F0EC] transition"
              >
                {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || numQty <= 0}
                className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (language === 'mr' ? 'नोंद होत आहे...' : language === 'hi' ? 'दर्ज हो रहा है...' : 'Processing...')
                    : (language === 'mr' ? 'परतावा पूर्ण करा (Confirm Return)' : language === 'hi' ? 'वापसी दर्ज करें (Confirm Return)' : 'Confirm Return')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};


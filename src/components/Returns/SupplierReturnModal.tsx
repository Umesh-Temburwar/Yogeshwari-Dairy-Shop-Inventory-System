import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { SupplierReturnReason, SupplierRefundStatus, SupplierReturn } from '../../types';
import { 
  X, 
  CheckCircle2, 
  Printer, 
  Truck, 
  DollarSign, 
  RefreshCw, 
  Clock, 
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { YDO_LOGO_BASE64 } from '../../assets/logoBase64';
import { Button, Input, Badge, StatusBadge } from '../ui';

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
  const { language } = useLanguage();

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
    language === 'mr' ? 'स्थानिक दुग्ध उत्पादक शेतकरी' : language === 'hi' ? 'स्थानीय डेयरी किसान' : 'Local Dairy Farmer'
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
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        supplier_name: supplierName.trim() || 'स्थानिक पुरवठादार',
        batch_no: batchNo.trim() || undefined,
        quantity: numQty,
        unit: selectedProduct.unit,
        purchase_price: unitRate,
        total_refund_amount: totalRefund,
        reason,
        refund_status: refundStatus,
        refund_mode: refundMode,
        notes: notes.trim() || undefined,
        return_date: todayFormatted
      });

      setCompletedReturn(created);
    } catch (err: any) {
      console.error('Failed to create supplier return:', err);
      alert(err.message || 'सप्लायर परतावा नोंदवताना त्रुटी आली.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDebitNotePayload = () => {
    if (!completedReturn) return null;
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr 
        ? `सप्लायर डेबिट नोट / खरेदी परतावा पावती (${completedReturn.return_no})` 
        : isHi 
        ? `सप्लायर डेबिट नोट / खरीद वापसी वाउचर (${completedReturn.return_no})` 
        : `Supplier Debit Note Voucher (${completedReturn.return_no})`,
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: `${isMr ? 'डेबिट नोट क्र.' : 'डेबिट नोट सं.'}: ${completedReturn.return_no} | ${isMr ? 'तारीख' : 'दिनांक'}: ${completedReturn.return_date}`,
      language,
      kpis: [
        { label: isMr ? 'एकूण रिफंड रक्कम' : 'कुल रिफंड राशि', value: `₹${completedReturn.total_refund_amount.toLocaleString('en-IN')}`, color: 'emerald' },
        { 
          label: isMr ? 'रिफंड स्थिती' : 'रिफंड स्थिति', 
          value: completedReturn.refund_status === 'Refund_Received' ? (isMr ? 'जमा झाले' : 'प्राप्त हुआ') :
                 completedReturn.refund_status === 'Adjusted_In_Next_Bill' ? (isMr ? 'पुढील बिलात वजावट' : 'अगले बिल में कटौती') :
                 completedReturn.refund_status === 'Replacement_Received' ? (isMr ? 'माल बदलून मिळाला' : 'माल बदला गया') : (isMr ? 'बाकी (Pending)' : 'लंबित (Pending)'), 
          color: completedReturn.refund_status === 'Refund_Received' ? 'emerald' : 'amber' 
        },
        { label: isMr ? 'परत प्रमाण' : 'वापसी मात्रा', value: `${completedReturn.quantity} ${completedReturn.unit}`, color: 'blue' }
      ],
      table: {
        headers: isMr 
          ? ['सप्लायर नाव', 'उत्पादन', 'बॅच क्र.', 'प्रमाण', 'दर (₹)', 'एकूण दावा (₹)', 'कारण']
          : isHi
          ? ['सप्लायर नाम', 'उत्पाद', 'बैच सं.', 'मात्रा', 'दर (₹)', 'कुल दावा (₹)', 'कारण']
          : ['Supplier Name', 'Product', 'Batch No.', 'Quantity', 'Rate (₹)', 'Total Claim (₹)', 'Reason'],
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
          isMr ? 'एकूण रिफंड दावा' : isHi ? 'कुल रिफंड दावा' : 'Total Claim', 
          '', 
          '', 
          '', 
          '', 
          `₹${completedReturn.total_refund_amount.toLocaleString('en-IN')}`, 
          ''
        ]
      },
      notes: isMr 
        ? 'सप्लायर स्वाक्षरी: ___________________ | अधिकृत स्वाक्षरी: योगेश्वरी डेअरी. डेबिट नोट रक्कम पुढील बिलात वजावट करावी किंवा बँक खात्यात जमा करावी.'
        : isHi
        ? 'सप्लायर हस्ताक्षर: ___________________ | अधिकृत हस्ताक्षर: योगेश्वरी डेरी। डेबिट नोट राशि अगले खरीद बिल में समायोजित करें अथवा बैंक खाते में जमा करें।'
        : 'Supplier Signature: ___________________ | Authorized Signatory: Yogeshwari Dairy. Debit note amount to be adjusted in next bill or refunded to bank.'
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-pop border border-line my-auto space-y-4 text-ink">
        
        {completedReturn ? (
          /* SUCCESS CONFIRMATION & DEBIT NOTE VOUCHER */
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center mx-auto text-ink">
              <CheckCircle2 className="w-6 h-6 text-ok" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                {language === 'mr' ? 'सप्लायर माल परतावा नोंदवला!' : language === 'hi' ? 'सप्लायर माल वापसी दर्ज!' : 'Supplier Return Recorded!'}
              </h3>
              <p className="text-xs text-ink-3 mt-1 font-mono">
                {language === 'mr' ? 'डेबिट नोट क्र:' : 'डेबिट नोट क्र:'} <span className="font-semibold text-ink">{completedReturn.return_no}</span>
              </p>
            </div>

            {/* Printable Voucher Card */}
            <div className="bg-surface-2/60 p-4 rounded-xl border border-line text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-line">
                <div>
                  <span className="font-semibold text-ink text-sm">{completedReturn.product_name}</span>
                  <p className="text-[11px] text-ink-3">
                    सप्लायर: <span className="font-medium text-ink-2">{completedReturn.supplier_name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    ₹{completedReturn.total_refund_amount.toLocaleString('en-IN')}
                  </span>
                  <p className="text-[10px] text-ink-3 tabular-nums">
                    {completedReturn.quantity} {completedReturn.unit} @ ₹{completedReturn.purchase_price}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-ink-3 block font-medium">परतावा कारण:</span>
                  <span className="font-medium text-ink-2">{completedReturn.reason}</span>
                </div>
                <div>
                  <span className="text-ink-3 block font-medium">रिफंड स्थिती:</span>
                  <span className="font-medium text-ink">
                    {completedReturn.refund_status === 'Refund_Received' ? '✅ रिफंड जमा झाला' : 
                     completedReturn.refund_status === 'Adjusted_In_Next_Bill' ? '🧾 पुढील बिलातून वजावट' : 
                     completedReturn.refund_status === 'Replacement_Received' ? '🔄 बदलून माल मिळाला' : '⏳ येणे बाकी (Pending)'}
                  </span>
                </div>
              </div>

              {completedReturn.batch_no && (
                <div className="text-[11px] text-ink-3 pt-1">
                  बॅच क्रमांक: <span className="font-mono font-medium text-ink">{completedReturn.batch_no}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleViewDebitNote}
                leftIcon={<Eye className="w-4 h-4 text-ink-2" />}
              >
                {language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrintDebitNote}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                {language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadDebitNotePDF}
                leftIcon={<Download className="w-4 h-4 text-ink-2" />}
              >
                PDF
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
              >
                {language === 'mr' ? 'पूर्ण' : language === 'hi' ? 'संपन्न' : 'Done'}
              </Button>
            </div>
          </div>
        ) : (
          /* SUPPLIER RETURN FORM */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center">
                  <Truck className="w-4 h-4 text-ink-2" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-ink tracking-tight">
                    {language === 'mr' ? 'सप्लायर खरेदी परतावा नोंदवा' : language === 'hi' ? 'सप्लायर माल वापसी दर्ज करें' : 'Supplier Return & Refund Claim'}
                  </h2>
                  <p className="text-xs text-ink-3">
                    {language === 'mr' ? 'खराब / एक्सपायर माल परत पाठवून सप्लायरकडून रिफंड मिळवा' : 'खराब या एक्सपायर माल सप्लायर को लौटाकर रिफंड लें'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Select Product */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">
                {language === 'mr' ? 'परत करायचे उत्पादन निवडा *' : language === 'hi' ? 'वापस करने वाला प्रोडक्ट चुनें *' : 'Select Product *'}
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                required
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (उपलब्ध: {p.stock_quantity} {p.unit} &bull; खरेदी दर: ₹{p.purchase_price})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Name & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {language === 'mr' ? 'सप्लायर / वेंडर नाव *' : language === 'hi' ? 'सप्लायर / विक्रेता नाम *' : 'Supplier / Vendor Name *'}
                </label>
                <Input
                  type="text"
                  list="supplier-suggestions"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="उदा. Amul, Gokul, स्थानिक शेतकरी"
                  required
                />
                <datalist id="supplier-suggestions">
                  {uniqueSuppliers.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {language === 'mr' ? 'बॅच क्र. (ऐच्छिक)' : language === 'hi' ? 'बैच नंबर (वैकल्पिक)' : 'Batch No. (Optional)'}
                </label>
                {productBatches.length > 0 ? (
                  <select
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                  >
                    <option value="">{language === 'mr' ? '-- उपलब्ध बॅच निवडा किंवा रिकामे ठेवा --' : '-- बैच चुनें या खाली रखें --'}</option>
                    {productBatches.map(b => (
                      <option key={b.id} value={b.batch_no}>
                        {b.batch_no} (शिल्लक: {b.qty_remaining} &bull; एक्सपायरी: {b.expiry_date})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={batchNo}
                    onChange={e => setBatchNo(e.target.value)}
                    placeholder="उदा. BAT-2026-001"
                  />
                )}
              </div>
            </div>

            {/* Quantity & Purchase Rate */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {language === 'mr' ? `परत नग/प्रमाण (${selectedProduct?.unit || 'Unit'}) *` : `वापसी मात्रा (${selectedProduct?.unit || 'Unit'}) *`}
                </label>
                <Input
                  type="number"
                  step="any"
                  min="0.1"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">
                  {language === 'mr' ? 'खरेदी दर प्रति नग (₹) *' : 'खरीद दर प्रति नग (₹) *'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">
                {language === 'mr' ? 'परतावा / नुकसानीचे कारण *' : language === 'hi' ? 'वापसी का कारण *' : 'Reason for Supplier Return *'}
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as SupplierReturnReason)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
              >
                <option value="Damaged / Leaked on Delivery">
                  {language === 'mr' ? '📦 डिलिव्हरीच्या वेळी फुटलेले / पॅकेट लिक (Damaged/Leaked)' : '📦 डिलीवरी के समय फूटा हुआ / पैकेट लीक'}
                </option>
                <option value="Expired on Delivery">
                  {language === 'mr' ? '⚠️ एक्सपायरी तारीख संपलेली (Expired / Past Date)' : '⚠️ एक्सपायरी डेट खत्म मिला माल'}
                </option>
                <option value="Curdled / Spoiled Milk">
                  {language === 'mr' ? '🥛 दूध फाटले / आंबट झाले (Curdled / Spoiled)' : '🥛 दूध फट गया / खट्टा हो गया'}
                </option>
                <option value="Poor Quality / Bad Taste">
                  {language === 'mr' ? '❌ खराब गुणवत्ता / वास येणे (Poor Quality/Smell)' : '❌ खराब गुणवत्ता / दुर्गंध आ रही है'}
                </option>
                <option value="Short Expiry (Near Expiry)">
                  {language === 'mr' ? '⏳ कमी मुदत शिल्लक (Near Expiry)' : '⏳ कम शेल्फ-लाइफ वाला माल'}
                </option>
                <option value="Wrong Product Delivered">
                  {language === 'mr' ? '🔄 चुकीचा माल आला (Wrong Product)' : '🔄 गलत प्रोडक्ट आ गया'}
                </option>
                <option value="Other">
                  {language === 'mr' ? 'इतर कारण (Other)' : 'अन्य कारण (Other)'}
                </option>
              </select>
            </div>

            {/* Refund Settlement Mode */}
            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-line space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-ink-3 block">
                    {language === 'mr' ? 'सप्लायरकडून एकूण रिफंड दावा' : 'सप्लायर से कुल रिफंड दावा'}
                  </span>
                  <span className="text-xl font-semibold tabular-nums text-ink">
                    ₹{totalRefund.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-[11px] text-right text-ink-2 font-medium bg-surface border border-line px-2.5 py-1 rounded-lg tabular-nums">
                  {numQty} {selectedProduct?.unit} &times; ₹{unitRate}
                </div>
              </div>

              {/* Settlement Options Grid */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-ink block uppercase tracking-wider">
                  {language === 'mr' ? 'रिफंड तोडगा पर्याय (Settlement):' : 'रिफंड निपटान विकल्प:'}
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setRefundStatus('Refund_Received');
                      setRefundMode('Cash');
                    }}
                    className={`p-2 rounded-xl border text-left font-medium transition flex items-center gap-1.5 ${
                      refundStatus === 'Refund_Received'
                        ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                        : 'bg-surface-2/40 text-ink-2 border-line hover:bg-surface-2'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 shrink-0 text-ink-2" />
                    <span className="truncate">रिफंड लगेच मिळाला</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Adjusted_In_Next_Bill')}
                    className={`p-2 rounded-xl border text-left font-medium transition flex items-center gap-1.5 ${
                      refundStatus === 'Adjusted_In_Next_Bill'
                        ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                        : 'bg-surface-2/40 text-ink-2 border-line hover:bg-surface-2'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-ink-2" />
                    <span className="truncate">पुढील बिलात वजावट</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Replacement_Received')}
                    className={`p-2 rounded-xl border text-left font-medium transition flex items-center gap-1.5 ${
                      refundStatus === 'Replacement_Received'
                        ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                        : 'bg-surface-2/40 text-ink-2 border-line hover:bg-surface-2'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0 text-ink-2" />
                    <span className="truncate">बदल्यात नवीन माल</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundStatus('Pending')}
                    className={`p-2 rounded-xl border text-left font-medium transition flex items-center gap-1.5 ${
                      refundStatus === 'Pending'
                        ? 'bg-surface shadow-card border-accent text-ink font-semibold'
                        : 'bg-surface-2/40 text-ink-2 border-line hover:bg-surface-2'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0 text-ink-2" />
                    <span className="truncate">येणे बाकी (Pending)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notes / Challan */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">
                {language === 'mr' ? 'नोंद किंवा चलन क्र. (ऐच्छिक)' : 'टिप्पणी या चालान नंबर (वैकल्पिक)'}
              </label>
              <Input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="उदा. डिलिव्हरी बॉयकडे पाकिटे परत दिली, बिलातून वजा करणे"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="w-1/3"
              >
                {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
              </Button>

              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || numQty <= 0}
                leftIcon={<Truck className="w-4 h-4" />}
                className="w-2/3"
              >
                {language === 'mr' ? 'सप्लायर परतावा व रिफंड नोंदवा' : 'सप्लायर वापसी व रिफंड दर्ज करें'}
              </Button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

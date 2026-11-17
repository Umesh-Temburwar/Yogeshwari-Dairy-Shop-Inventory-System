import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductBatch } from '../../types';
import { useToast } from '../../motion/Toast';
import { 
  getShelfLifeDays, 
  getSuggestedExpiryDate, 
  generateBatchNumber, 
  computeExpiryStatus, 
  getExpiryBadgeInfo, 
  getShelfLifeNote 
} from '../../lib/shelfLifeUtils';
import { 
  X, 
  Layers, 
  Plus, 
  Clock, 
  ShieldAlert, 
  Trash2, 
  CheckCircle2,
  Sparkles,
  Edit3,
  Save,
  Tag
} from 'lucide-react';

interface ProductBatchesModalProps {
  product: Product;
  onClose: () => void;
  onOpenDamageForBatch?: (batch: ProductBatch) => void;
}

export const ProductBatchesModal: React.FC<ProductBatchesModalProps> = ({
  product,
  onClose,
  onOpenDamageForBatch
}) => {
  const { batches, addBatch, updateBatch, deleteBatch, recordDamage, products } = useStore();
  const { language } = useLanguage();
  const toast = useToast();

  // Keep product stock and details live in sync with central store state
  const liveProduct = products.find(p => p.id === product.id) || product;

  // Add Batch Form State
  const [showAddBatchForm, setShowAddBatchForm] = useState(false);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(liveProduct.purchase_price.toString());
  const [sellingPrice, setSellingPrice] = useState(liveProduct.selling_price.toString());
  const [supplierName, setSupplierName] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Batch Editing State (Inline Edit for specific batch)
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editBatchNo, setEditBatchNo] = useState('');
  const [editMfgDate, setEditMfgDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editQtyRemaining, setEditQtyRemaining] = useState('');
  const [editQtyReceived, setEditQtyReceived] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Default shelf life for this product variety
  const shelfDays = getShelfLifeDays(liveProduct.category, liveProduct.name);
  const shelfLifeTip = getShelfLifeNote(liveProduct.category, liveProduct.name, language);

  // Auto-fill suggested batch no and expiry date based on product variety
  useEffect(() => {
    const suggestedBatch = generateBatchNumber(liveProduct.name, inwardDate);
    const suggestedExp = getSuggestedExpiryDate(inwardDate, shelfDays);
    setNewBatchNo(suggestedBatch);
    setExpiryDate(suggestedExp);
  }, [liveProduct, inwardDate, shelfDays]);

  // Recalculate expiry if user alters inward date in add form
  const handleInwardDateChange = (newDate: string) => {
    setInwardDate(newDate);
    const suggestedExp = getSuggestedExpiryDate(newDate, shelfDays);
    setExpiryDate(suggestedExp);
  };

  // Get active batches for this product
  const productBatches = batches
    .filter(b => b.product_id === liveProduct.id)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  const totalRemainingInBatches = productBatches.reduce((acc, b) => acc + (b.qty_remaining > 0 ? b.qty_remaining : 0), 0);

  // Start editing a specific batch
  const handleStartEdit = (b: ProductBatch) => {
    setEditingBatchId(b.id);
    setEditBatchNo(b.batch_no || '');
    setEditMfgDate(b.mfg_date || new Date().toISOString().split('T')[0]);
    setEditExpiryDate(b.expiry_date || '');
    setEditQtyRemaining(b.qty_remaining.toString());
    setEditQtyReceived((b.qty_received || b.qty_remaining).toString());
    setEditPurchasePrice(b.purchase_price.toString());
    setEditSellingPrice((b.selling_price ?? liveProduct.selling_price).toString());
    setEditSupplierName(b.supplier_name || '');
    setEditNotes(b.notes || '');
  };

  // Quick adjust remaining quantity in edit mode
  const handleAdjustEditQty = (delta: number) => {
    const cur = parseFloat(editQtyRemaining) || 0;
    const next = Math.max(0, Number((cur + delta).toFixed(2)));
    setEditQtyRemaining(next.toString());
  };

  // Save edited batch
  const handleSaveBatchEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatchId || isSavingBatch) return;

    const remainingQty = parseFloat(editQtyRemaining);
    if (isNaN(remainingQty) || remainingQty < 0) {
      toast.error(language === 'mr' ? 'कृपया योग्य साठा मात्रा टाका' : 'कृपया मान्य स्टॉक मात्रा दर्ज करें');
      return;
    }

    try {
      setIsSavingBatch(true);
      await updateBatch(editingBatchId, {
        batch_no: editBatchNo.trim(),
        mfg_date: editMfgDate,
        expiry_date: editExpiryDate,
        qty_remaining: remainingQty,
        qty_received: Math.max(remainingQty, parseFloat(editQtyReceived) || remainingQty),
        purchase_price: Math.max(0, parseFloat(editPurchasePrice) || 0),
        selling_price: Math.max(0, parseFloat(editSellingPrice) || 0),
        supplier_name: editSupplierName.trim() || undefined,
        notes: editNotes.trim() || undefined
      });

      setFeedbackMessage(
        language === 'mr' 
          ? '✓ बॅच माहिती, साठा व दर यशस्वीरीत्या अद्ययावत झाला!' 
          : language === 'hi' 
          ? '✓ बैच विवरण, स्टॉक व दर सफलतापूर्वक सुरक्षित हो गया!' 
          : '✓ Batch stock & prices updated successfully!'
      );
      setTimeout(() => setFeedbackMessage(null), 3500);
      setEditingBatchId(null);
    } catch (err) {
      console.error('Failed to update batch:', err);
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Add new batch submit
  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    await addBatch({
      product_id: liveProduct.id,
      product_name: liveProduct.name,
      batch_no: newBatchNo.trim() || generateBatchNumber(liveProduct.name, inwardDate),
      mfg_date: inwardDate,
      expiry_date: expiryDate || getSuggestedExpiryDate(inwardDate, shelfDays),
      qty_received: qty,
      qty_remaining: qty,
      purchase_price: parseFloat(purchasePrice) || liveProduct.purchase_price,
      selling_price: parseFloat(sellingPrice) || liveProduct.selling_price,
      supplier_name: supplierName.trim() || (language === 'mr' ? 'स्थानिक पुरवठादार' : 'Local Supplier'),
      notes: batchNotes.trim() || undefined
    }, liveProduct);

    setShowAddBatchForm(false);
    setQuantity('');
    setBatchNotes('');
    setFeedbackMessage(
      language === 'mr' ? '✓ नवीन बॅच यशस्वीरीत्या जोडली!' : '✓ नया बैच सफलतापूर्वक जोड़ा गया!'
    );
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleQuickWriteOff = async (b: ProductBatch) => {
    if (window.confirm(language === 'mr' ? `या बॅचचा (${b.batch_no}) ${b.qty_remaining} ${liveProduct.unit} माल खराब / नासलेला म्हणून नोंद करायचा का?` : `Write off remaining ${b.qty_remaining} ${liveProduct.unit} of batch ${b.batch_no} as Spoilage/Damage?`)) {
      if (onOpenDamageForBatch) {
        onOpenDamageForBatch(b);
      } else {
        await recordDamage({
          product_id: liveProduct.id,
          product_name: liveProduct.name,
          quantity: b.qty_remaining,
          unit: liveProduct.unit,
          estimated_loss_amount: b.qty_remaining * b.purchase_price,
          reason: 'Expiry Date Over',
          damage_date: new Date().toISOString().split('T')[0],
          notes: `Batch ${b.batch_no} expired / spoiled`
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200/90 dark:border-[#24352F] my-6 max-h-[92vh] flex flex-col justify-between">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#24352F] pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {language === 'mr' && liveProduct.marathi_name ? liveProduct.marathi_name : language === 'hi' && liveProduct.hindi_name ? liveProduct.hindi_name : liveProduct.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] font-bold">
                  {liveProduct.unit}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5">
                {language === 'mr' ? 'एकूण शिल्लक साठा:' : language === 'hi' ? 'कुल उपलब्ध स्टॉक:' : 'Total Active Stock:'}{' '}
                <b className="text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">{liveProduct.stock_quantity} {liveProduct.unit}</b>
                {' '}&bull; {productBatches.length} {language === 'mr' ? 'बॅचेस' : language === 'hi' ? 'बैच' : 'batches'}
                {' '}&bull; <span className="text-slate-400">मूळ भाव: ₹{liveProduct.selling_price}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-xs font-black flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Variety Shelf-Life Rule Banner */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shelfLifeTip}</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 text-[11px] font-extrabold shrink-0">
            {shelfDays} {language === 'mr' ? 'दिवस शेल्फ लाईफ' : language === 'hi' ? 'दिन शेल्फ लाइफ' : 'days shelf-life'}
          </span>
        </div>

        {/* Scrollable Batches List */}
        <div className="overflow-y-auto space-y-3 pr-1 flex-1 min-h-[220px]">
          {productBatches.length > 0 ? (
            productBatches.map((b) => {
              const { status, daysToExpiry } = computeExpiryStatus(b.expiry_date);
              const badge = getExpiryBadgeInfo(status, daysToExpiry, language);
              const remainingPercent = Math.min(100, Math.round((b.qty_remaining / (b.qty_received || 1)) * 100));
              const isEditingThis = editingBatchId === b.id;

              // IF THIS BATCH IS BEING EDITED: Render in-place edit form
              if (isEditingThis) {
                const curEditQty = parseFloat(editQtyRemaining) || 0;
                const stockDelta = Number((curEditQty - b.qty_remaining).toFixed(2));

                return (
                  <form 
                    key={b.id} 
                    onSubmit={handleSaveBatchEdit} 
                    className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-[#1A2E26] border-2 border-emerald-500 shadow-lg space-y-3 animate-in fade-in duration-150"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-[#294237]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                          <Edit3 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-emerald-950 dark:text-emerald-300">
                            {language === 'mr' ? 'बॅच माहिती व साठा संपादन' : language === 'hi' ? 'बैच व स्टॉक विवरण संपादन' : 'Edit Batch Stock & Details'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] block font-mono">
                            #{b.batch_no}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingBatchId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity Remaining & Stock Delta Controls */}
                    <div className="bg-white dark:bg-[#131F1B] p-3 rounded-xl border border-emerald-200 dark:border-[#294237] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                          <span>{language === 'mr' ? `या बॅचचा शिल्लक साठा (${liveProduct.unit})` : language === 'hi' ? `इस बैच का उपलब्ध स्टॉक (${liveProduct.unit})` : `Batch Remaining Stock (${liveProduct.unit})`} *</span>
                        </label>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {language === 'mr' ? 'सध्याचा:' : 'Current:'} <b className="text-slate-800 dark:text-white">{b.qty_remaining}</b>
                        </span>
                      </div>

                      {/* Input + Quick Preset Buttons */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          value={editQtyRemaining}
                          onChange={(e) => setEditQtyRemaining(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl border-2 border-emerald-500 bg-white dark:bg-[#1A2A25] font-mono text-base font-black text-slate-900 dark:text-white text-center focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center gap-1 flex-1">
                          {[-10, -5, -1, 1, 5, 10].map((delta) => (
                            <button
                              key={delta}
                              type="button"
                              onClick={() => handleAdjustEditQty(delta)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
                                delta < 0 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40'
                              }`}
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Live Delta Explanation */}
                      <div className="text-[11px] pt-1 flex items-center justify-between text-slate-600 dark:text-[#8FA69C] border-t border-slate-100 dark:border-[#24352F]">
                        <span>
                          {language === 'mr' ? 'एकूण दुकानाच्या साठ्यावर परिणाम:' : language === 'hi' ? 'कुल दुकान स्टॉक पर असर:' : 'Impact on Total Shop Stock:'}
                        </span>
                        <span className={`font-black ${stockDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : stockDelta < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
                          {stockDelta > 0 ? `+${stockDelta} ${liveProduct.unit} (साठा वाढेल)` : stockDelta < 0 ? `${stockDelta} ${liveProduct.unit} (साठा कमी होईल)` : 'साठा स्थिर (बदल नाही)'}
                        </span>
                      </div>
                    </div>

                    {/* Dates & Batch Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'बॅच क्र.' : language === 'hi' ? 'बैच नंबर' : 'Batch No'}
                        </label>
                        <input
                          type="text"
                          required
                          value={editBatchNo}
                          onChange={(e) => setEditBatchNo(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'आवक/Mfg तारीख' : language === 'hi' ? 'आवक/Mfg तारीख' : 'Inward/Mfg Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={editMfgDate}
                          onChange={(e) => setEditMfgDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'मुदत (Expiry Date) *' : language === 'hi' ? 'एक्सपायरी तारीख *' : 'Expiry Date *'}
                        </label>
                        <input
                          type="date"
                          required
                          value={editExpiryDate}
                          onChange={(e) => setEditExpiryDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40 text-xs font-extrabold text-emerald-950 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Dual Pricing Row (Purchase & Custom Batch Selling Price) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'खरेदी भाव प्रति नग (₹)' : language === 'hi' ? 'खरीद भाव प्रति नग (₹)' : 'Purchase Cost (₹)'}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editPurchasePrice}
                          onChange={(e) => setEditPurchasePrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                          {language === 'mr' ? 'या बॅचचा विक्री दर (₹)' : language === 'hi' ? 'इस बैच का बिक्री भाव (₹)' : 'Batch Selling Rate (₹)'}
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editSellingPrice}
                          onChange={(e) => setEditSellingPrice(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-[#131F1B] text-xs font-black text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-[9px] text-slate-500 dark:text-[#8FA69C] block mt-0.5">
                          {language === 'mr' ? 'जुना माल सवलत किंवा नवीन माल अधिक भावात विकण्यासाठी' : language === 'hi' ? 'पुराना माल छूट या नया माल अधिक भाव में बेचने हेतु' : 'Custom price for this lot'}
                        </span>
                      </div>
                    </div>

                    {/* Supplier & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'पुरवठादार / शेतकरी' : language === 'hi' ? 'सप्लायर / किसान' : 'Supplier'}
                        </label>
                        <input
                          type="text"
                          placeholder="Supplier Name"
                          value={editSupplierName}
                          onChange={(e) => setEditSupplierName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                          {language === 'mr' ? 'बदलाचे कारण / टीप' : language === 'hi' ? 'कारण / नोट' : 'Reason / Notes'}
                        </label>
                        <input
                          type="text"
                          placeholder="उदा. साठा मोजणी दुरुस्ती / सवलत"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Submit & Cancel Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200 dark:border-[#294237]">
                      <button
                        type="button"
                        onClick={() => setEditingBatchId(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] text-xs font-semibold"
                      >
                        {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingBatch}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isSavingBatch ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{language === 'mr' ? 'बदल जतन होत आहेत...' : 'अपडेट हो रहा है...'}</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{language === 'mr' ? 'बॅच माहिती व साठा जतन करा' : language === 'hi' ? 'बैच व स्टॉक सुरक्षित करें' : 'Save Batch & Stock'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                );
              }

              // NORMAL BATCH VIEW CARD
              return (
                <div 
                  key={b.id} 
                  className={`p-3.5 rounded-2xl border transition-all ${
                    status === 'EXPIRED' 
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50' 
                      : status === 'EXPIRING_TODAY'
                      ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-[#1A2A25] border-slate-200/90 dark:border-[#24352F]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Batch Number & Inward Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {b.batch_no}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] border flex items-center gap-1 ${badge.badgeClass}`}>
                          <span>{badge.iconEmoji}</span>
                          <span>{badge.label}</span>
                        </span>
                        {Boolean(b.selling_price && b.selling_price > 0 && b.selling_price !== liveProduct.selling_price) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center gap-0.5">
                            <Tag className="w-3 h-3" />
                            <span>खास दर: ₹{b.selling_price}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-[#8FA69C]">
                        <span>{language === 'mr' ? 'आवक:' : language === 'hi' ? 'आवक:' : 'Inward:'} <b>{b.mfg_date}</b></span>
                        <span>&bull;</span>
                        <span>{language === 'mr' ? 'मुदत (Expiry):' : language === 'hi' ? 'एक्सपायरी:' : 'Expiry:'} <b className="text-slate-800 dark:text-white">{b.expiry_date}</b></span>
                        {b.supplier_name && (
                          <>
                            <span>&bull;</span>
                            <span>{b.supplier_name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Stock Remaining & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {b.qty_remaining} <span className="text-xs font-normal text-slate-500">{liveProduct.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'mr' ? 'एकूण प्राप्त:' : 'Received:'} {b.qty_received} {liveProduct.unit}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          {language === 'mr' ? 'विक्री:' : 'Sell:'} <b>₹{b.selling_price ?? liveProduct.selling_price}</b> | <span className="text-slate-500">खरेदी: ₹{b.purchase_price}</span>
                        </div>
                      </div>

                      {/* EDIT BATCH BUTTON */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(b)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 dark:bg-[#131F1B] dark:hover:bg-[#20332D] text-slate-700 dark:text-[#E7F0EC] hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-[#24352F] transition-all"
                        title={language === 'mr' ? 'बॅच साठा, मुदत व दर बदला' : 'बैच स्टॉक, एक्सपायरी व भाव बदलें'}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Quick Write-off / Spoilage button for expired or near-expiry */}
                      {b.qty_remaining > 0 && status === 'EXPIRED' && (
                        <button
                          type="button"
                          onClick={() => handleQuickWriteOff(b)}
                          className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1"
                          title="Record as damage"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'खराब' : 'डैमेज'}</span>
                        </button>
                      )}

                      {/* DELETE BATCH BUTTON */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(language === 'mr' ? `बॅच #${b.batch_no} कायमची हटवायची का? या बॅचचा शिल्लक साठा (${b.qty_remaining} ${liveProduct.unit}) एकूण दुकानाच्या साठ्यातून कमी होईल.` : `Delete batch #${b.batch_no}? Remaining stock (${b.qty_remaining} ${liveProduct.unit}) will be deducted from shop stock.`)) {
                            deleteBatch(b.id);
                          }
                        }}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete batch entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Quantity Visual Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-[#24352F] flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 dark:bg-[#131F1B] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${
                          status === 'EXPIRED' ? 'bg-rose-500' :
                          status === 'EXPIRING_TODAY' ? 'bg-amber-500' :
                          status === 'EXPIRING_TOMORROW' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${remainingPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">
                      {remainingPercent}% {language === 'mr' ? 'शिल्लक' : language === 'hi' ? 'शेष' : 'remaining'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
              {language === 'mr' ? 'या मालासाठी कोणतीही बॅच नोंदवलेली नाही.' : language === 'hi' ? 'इस उत्पाद के लिए कोई बैच दर्ज नहीं है।' : 'No batches logged for this product yet.'}
            </div>
          )}
        </div>

        {/* Inline Add New Batch Form / Toggle */}
        <div className="border-t border-slate-100 dark:border-[#24352F] pt-3 shrink-0">
          {!showAddBatchForm ? (
            <button
              onClick={() => setShowAddBatchForm(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {language === 'mr' ? '+ नवीन माल आवक / बॅच जोडा (Auto Shelf-Life Expiry)' : language === 'hi' ? '+ नया माल आवक / बैच जोड़ें (Auto Shelf-Life Expiry)' : '+ Add Inward Batch (Auto Variety Shelf-Life)'}
              </span>
            </button>
          ) : (
            <form onSubmit={handleAddBatchSubmit} className="bg-slate-50 dark:bg-[#1A2A25] p-3.5 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-2.5">
              <div className="flex items-center justify-between pb-1">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  {language === 'mr' ? 'नवीन बॅच नोंदणी (New Batch Entry)' : language === 'hi' ? 'नया बैच दर्ज करें (New Batch Entry)' : 'New Batch Entry'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddBatchForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                </button>
              </div>

              {/* Pahale ka tha ya abhi ka tha Quick Toggle */}
              <div className="flex items-center gap-2 p-1 bg-white dark:bg-[#131F1B] rounded-xl border border-slate-200 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => handleInwardDateChange(new Date().toISOString().split('T')[0])}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    inwardDate === new Date().toISOString().split('T')[0]
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900'
                  }`}
                >
                  🟢 {language === 'mr' ? 'आजचा ताजा माल' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's Fresh Lot"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInwardDateChange(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    inwardDate !== new Date().toISOString().split('T')[0]
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900'
                  }`}
                >
                  🟡 {language === 'mr' ? 'आधीचा / मागील माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous Lot'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'बॅच क्र.' : language === 'hi' ? 'बैच नंबर' : 'Batch No'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'आवक तारीख' : language === 'hi' ? 'आवक तारीख' : 'Inward Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={inwardDate}
                    onChange={(e) => handleInwardDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'मुदत (Expiry Date) ✨' : language === 'hi' ? 'एक्सपायरी तारीख ✨' : 'Expiry Date ✨'}
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/40 text-xs font-extrabold text-emerald-950 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? `आवक साठा (${liveProduct.unit})` : `मात्रा (${liveProduct.unit})`}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'खरेदी दर (₹)' : 'खरीद भाव (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                    {language === 'mr' ? 'विक्री दर (₹)' : 'बिक्री भाव (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-[#131F1B] text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'पुरवठादार' : 'सप्लायर'}
                  </label>
                  <input
                    type="text"
                    placeholder="Local Dairy"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddBatchForm(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] text-xs font-semibold"
                >
                  {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs active:scale-95 transition"
                >
                  {language === 'mr' ? 'बॅच नोंदवून साठा वाढवा' : language === 'hi' ? 'बैच दर्ज कर स्टॉक बढ़ाएं' : 'Save Batch & Update Stock'}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

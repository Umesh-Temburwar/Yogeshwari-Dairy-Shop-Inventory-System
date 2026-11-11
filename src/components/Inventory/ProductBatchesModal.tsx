import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductBatch, ExpiryStatus } from '../../types';
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
  Calendar, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Trash2, 
  Truck, 
  CheckCircle2,
  Sparkles
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
  const { batches, addBatch, deleteBatch, recordDamage } = useStore();
  const { language } = useLanguage();

  const [showAddBatchForm, setShowAddBatchForm] = useState(false);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(product.purchase_price.toString());
  const [supplierName, setSupplierName] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Default shelf life for this product variety
  const shelfDays = getShelfLifeDays(product.category, product.name);
  const shelfLifeTip = getShelfLifeNote(product.category, product.name, language);

  // Auto-fill suggested batch no and expiry date based on product variety
  useEffect(() => {
    const suggestedBatch = generateBatchNumber(product.name, inwardDate);
    const suggestedExp = getSuggestedExpiryDate(inwardDate, shelfDays);
    setNewBatchNo(suggestedBatch);
    setExpiryDate(suggestedExp);
  }, [product, inwardDate, shelfDays]);

  // Recalculate expiry if user alters inward date
  const handleInwardDateChange = (newDate: string) => {
    setInwardDate(newDate);
    const suggestedExp = getSuggestedExpiryDate(newDate, shelfDays);
    setExpiryDate(suggestedExp);
  };

  // Get active batches for this product
  const productBatches = batches
    .filter(b => b.product_id === product.id)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  const totalRemainingInBatches = productBatches.reduce((acc, b) => acc + (b.qty_remaining > 0 ? b.qty_remaining : 0), 0);

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    await addBatch({
      product_id: product.id,
      product_name: product.name,
      batch_no: newBatchNo.trim() || generateBatchNumber(product.name, inwardDate),
      mfg_date: inwardDate,
      expiry_date: expiryDate || getSuggestedExpiryDate(inwardDate, shelfDays),
      qty_received: qty,
      qty_remaining: qty,
      purchase_price: parseFloat(purchasePrice) || product.purchase_price,
      supplier_name: supplierName.trim() || (language === 'mr' ? 'स्थानिक पुरवठादार' : 'Local Supplier'),
      notes: batchNotes.trim() || undefined
    });

    setShowAddBatchForm(false);
    setQuantity('');
    setBatchNotes('');
  };

  const handleQuickWriteOff = async (b: ProductBatch) => {
    if (window.confirm(language === 'mr' ? `या बॅचचा (${b.batch_no}) ${b.qty_remaining} ${product.unit} माल खराब / नासलेला म्हणून नोंद करायचा का?` : `Write off remaining ${b.qty_remaining} ${product.unit} of batch ${b.batch_no} as Spoilage/Damage?`)) {
      await recordDamage({
        product_id: product.id,
        product_name: product.name,
        quantity: b.qty_remaining,
        unit: product.unit,
        estimated_loss_amount: b.qty_remaining * b.purchase_price,
        reason: 'Expiry Date Over',
        damage_date: new Date().toISOString().split('T')[0],
        notes: `Batch ${b.batch_no} expired / spoiled`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-200/90 dark:border-[#24352F] my-8 max-h-[90vh] flex flex-col justify-between">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#24352F] pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {language === 'mr' && product.marathi_name ? product.marathi_name : language === 'hi' && product.hindi_name ? product.hindi_name : product.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] font-bold">
                  {product.unit}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5">
                {language === 'mr' ? 'एकूण शिल्लक साठा:' : language === 'hi' ? 'कुल उपलब्ध स्टॉक:' : 'Total Active Stock:'}{' '}
                <b className="text-slate-900 dark:text-white">{product.stock_quantity} {product.unit}</b>
                {' '}&bull; {productBatches.length} {language === 'mr' ? 'बॅचेस नोंदवल्या आहेत' : language === 'hi' ? 'बैच दर्ज हैं' : 'batches logged'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Variety Shelf-Life Rule Banner */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between gap-3 text-xs shrink-0">
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
              const isDepleted = b.qty_remaining <= 0;
              const remainingPercent = Math.min(100, Math.round((b.qty_remaining / (b.qty_received || 1)) * 100));

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
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-[#8FA69C]">
                        <span>{language === 'mr' ? 'आवक:' : language === 'hi' ? 'आवक तारीख:' : 'Mfg/Inward:'} <b>{b.mfg_date}</b></span>
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
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {b.qty_remaining} <span className="text-xs font-normal text-slate-500">{product.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'mr' ? 'एकूण आले:' : language === 'hi' ? 'कुल प्राप्त:' : 'Received:'} {b.qty_received} {product.unit} (₹{b.purchase_price})
                        </div>
                      </div>

                      {/* Quick Write-off / Spoilage button for expired or near-expiry */}
                      {b.qty_remaining > 0 && status === 'EXPIRED' && (
                        <button
                          type="button"
                          onClick={() => handleQuickWriteOff(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1"
                          title="Record as damage"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{language === 'mr' ? 'खराब नोंद करा' : language === 'hi' ? 'डैमेज दर्ज करें' : 'Damage'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteBatch(b.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
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
        <div className="border-t border-slate-100 dark:border-[#24352F] pt-4 shrink-0">
          {!showAddBatchForm ? (
            <button
              onClick={() => setShowAddBatchForm(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-500/50 hover:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>
                {language === 'mr' ? '+ नवीन माल आवक / बॅच जोडा (Auto Shelf-Life Expiry)' : language === 'hi' ? '+ नया माल आवक / बैच जोड़ें (Auto Shelf-Life Expiry)' : '+ Add Inward Batch (Auto Variety Shelf-Life)'}
              </span>
            </button>
          ) : (
            <form onSubmit={handleAddBatchSubmit} className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] space-y-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? `आवक मात्रा (${product.unit})` : language === 'hi' ? `मात्रा (${product.unit})` : `Qty (${product.unit})`}
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
                    {language === 'mr' ? 'खरेदी दर (₹)' : language === 'hi' ? 'खरीद भाव (₹)' : 'Rate (₹)'}
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
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'शेतकरी / पुरवठादार' : language === 'hi' ? 'किसान / सप्लायर' : 'Supplier'}
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchForm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] text-xs font-semibold"
                >
                  {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
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


import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductBatch } from '../../types';
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
  ShieldAlert, 
  Trash2, 
  Sparkles
} from 'lucide-react';
import { Button, Input, Badge, StatusBadge } from '../ui';

interface ProductBatchesModalProps {
  product: Product;
  onClose: () => void;
  onOpenDamageForBatch?: (batch: ProductBatch) => void;
}

export const ProductBatchesModal: React.FC<ProductBatchesModalProps> = ({
  product,
  onClose
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

  const shelfDays = getShelfLifeDays(product.category, product.name);
  const shelfLifeTip = getShelfLifeNote(product.category, product.name, language);

  useEffect(() => {
    const suggestedBatch = generateBatchNumber(product.name, inwardDate);
    const suggestedExp = getSuggestedExpiryDate(inwardDate, shelfDays);
    setNewBatchNo(suggestedBatch);
    setExpiryDate(suggestedExp);
  }, [product, inwardDate, shelfDays]);

  const handleInwardDateChange = (newDate: string) => {
    setInwardDate(newDate);
    const suggestedExp = getSuggestedExpiryDate(newDate, shelfDays);
    setExpiryDate(suggestedExp);
  };

  const productBatches = batches
    .filter(b => b.product_id === product.id)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-pop border border-line my-auto space-y-4 max-h-[90vh] flex flex-col justify-between text-ink">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center">
              <Layers className="w-4 h-4 text-ink-2" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-ink tracking-tight">
                  {language === 'mr' && product.marathi_name ? product.marathi_name : language === 'hi' && product.hindi_name ? product.hindi_name : product.name}
                </h3>
                <Badge variant="default" className="text-[10px] h-5">
                  {product.unit}
                </Badge>
              </div>
              <p className="text-xs text-ink-3">
                {language === 'mr' ? 'एकूण शिल्लक साठा:' : language === 'hi' ? 'कुल उपलब्ध स्टॉक:' : 'Total Active Stock:'}{' '}
                <b className="text-ink font-semibold">{product.stock_quantity} {product.unit}</b>
                {' '}&bull; {productBatches.length} {language === 'mr' ? 'बॅचेस नोंदवल्या आहेत' : language === 'hi' ? 'बैच दर्ज हैं' : 'batches logged'}
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

        {/* Variety Shelf-Life Rule Banner */}
        <div className="bg-surface-2/60 p-3 rounded-xl border border-line flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-ink-2">
            <Sparkles className="w-4 h-4 text-ink-3 shrink-0" />
            <span>{shelfLifeTip}</span>
          </div>
          <Badge variant="outline" className="text-[11px] h-5 shrink-0">
            {shelfDays} {language === 'mr' ? 'दिवस शेल्फ लाईफ' : language === 'hi' ? 'दिन शेल्फ लाइफ' : 'days shelf-life'}
          </Badge>
        </div>

        {/* Scrollable Batches List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[220px]">
          {productBatches.length > 0 ? (
            productBatches.map((b) => {
              const { status, daysToExpiry } = computeExpiryStatus(b.expiry_date);
              const badge = getExpiryBadgeInfo(status, daysToExpiry, language);
              const remainingPercent = Math.min(100, Math.round((b.qty_remaining / (b.qty_received || 1)) * 100));

              return (
                <div 
                  key={b.id} 
                  className={`p-3 rounded-xl border transition ${
                    status === 'EXPIRED' 
                      ? 'bg-danger/5 border-danger/30' 
                      : status === 'EXPIRING_TODAY'
                      ? 'bg-warn/5 border-warn/30'
                      : 'bg-surface shadow-card border-line'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    
                    {/* Batch Number & Inward Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ink text-sm">
                          {b.batch_no}
                        </span>
                        <StatusBadge status={status === 'EXPIRED' ? 'danger' : status === 'EXPIRING_TODAY' ? 'warn' : 'ok'}>
                          {badge.label}
                        </StatusBadge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                        <span>{language === 'mr' ? 'आवक:' : language === 'hi' ? 'आवक तारीख:' : 'Mfg/Inward:'} <b className="text-ink">{b.mfg_date}</b></span>
                        <span>&bull;</span>
                        <span>{language === 'mr' ? 'मुदत (Expiry):' : language === 'hi' ? 'एक्सपायरी:' : 'Expiry:'} <b className="text-ink">{b.expiry_date}</b></span>
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
                        <div className="text-sm font-semibold tabular-nums text-ink">
                          {b.qty_remaining} <span className="text-xs font-normal text-ink-3">{product.unit}</span>
                        </div>
                        <div className="text-[10px] text-ink-3 tabular-nums">
                          {language === 'mr' ? 'एकूण आले:' : language === 'hi' ? 'कुल प्राप्त:' : 'Received:'} {b.qty_received} {product.unit} (₹{b.purchase_price})
                        </div>
                      </div>

                      {b.qty_remaining > 0 && status === 'EXPIRED' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleQuickWriteOff(b)}
                          leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                          className="text-xs h-7 px-2"
                        >
                          {language === 'mr' ? 'खराब नोंद' : 'डैमेज'}
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteBatch(b.id)}
                        className="text-ink-3 hover:text-danger p-1 transition"
                        title="Delete batch entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Quantity Visual Bar */}
                  <div className="mt-2 pt-2 border-t border-line flex items-center gap-2">
                    <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full ${
                          status === 'EXPIRED' ? 'bg-danger' :
                          status === 'EXPIRING_TODAY' ? 'bg-warn' : 'bg-ok'
                        }`}
                        style={{ width: `${remainingPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-3 font-medium tabular-nums shrink-0">
                      {remainingPercent}% {language === 'mr' ? 'शिल्लक' : language === 'hi' ? 'शेष' : 'remaining'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-ink-3 text-xs">
              {language === 'mr' ? 'या मालासाठी कोणतीही बॅच नोंदवलेली नाही.' : language === 'hi' ? 'इस उत्पाद के लिए कोई बैच दर्ज नहीं है।' : 'No batches logged for this product yet.'}
            </div>
          )}
        </div>

        {/* Inline Add New Batch Form / Toggle */}
        <div className="border-t border-line pt-3 shrink-0">
          {!showAddBatchForm ? (
            <Button
              variant="secondary"
              onClick={() => setShowAddBatchForm(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="w-full border-dashed"
            >
              {language === 'mr' ? '+ नवीन माल आवक / बॅच जोडा (Auto Shelf-Life)' : language === 'hi' ? '+ नया माल आवक / बैच जोड़ें (Auto Shelf-Life)' : '+ Add Inward Batch (Auto Shelf-Life)'}
            </Button>
          ) : (
            <form onSubmit={handleAddBatchSubmit} className="bg-surface-2/60 p-4 rounded-xl border border-line space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="font-semibold text-xs text-ink flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-ink-2" />
                  {language === 'mr' ? 'नवीन बॅच नोंदणी (New Batch Entry)' : language === 'hi' ? 'नया बैच दर्ज करें (New Batch Entry)' : 'New Batch Entry'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddBatchForm(false)}
                  className="text-xs text-ink-3 hover:text-ink transition"
                >
                  {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                </button>
              </div>

              {/* Pahale ka tha ya abhi ka tha Quick Toggle */}
              <div className="flex items-center gap-2 p-1 bg-surface rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => handleInwardDateChange(new Date().toISOString().split('T')[0])}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    inwardDate === new Date().toISOString().split('T')[0]
                      ? 'bg-surface shadow-card text-ink font-semibold border border-line'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  🟢 {language === 'mr' ? 'आजचा ताजा माल' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's Fresh Lot"}
                </button>
                <button
                  type="button"
                  onClick={() => handleInwardDateChange(new Date(Date.now() - 86400000).toISOString().split('T')[0])}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                    inwardDate !== new Date().toISOString().split('T')[0]
                      ? 'bg-surface shadow-card text-ink font-semibold border border-line'
                      : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  🟡 {language === 'mr' ? 'आधीचा / मागील माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous Lot'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'बॅच क्र.' : language === 'hi' ? 'बैच नंबर' : 'Batch No'}
                  </label>
                  <Input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'आवक तारीख' : language === 'hi' ? 'आवक तारीख' : 'Inward Date'}
                  </label>
                  <Input
                    type="date"
                    required
                    value={inwardDate}
                    onChange={(e) => handleInwardDateChange(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'मुदत (Expiry Date)' : language === 'hi' ? 'एक्सपायरी तारीख' : 'Expiry Date'}
                  </label>
                  <Input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? `आवक मात्रा (${product.unit})` : language === 'hi' ? `मात्रा (${product.unit})` : `Qty (${product.unit})`}
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    placeholder="10"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'खरेदी दर (₹)' : language === 'hi' ? 'खरीद भाव (₹)' : 'Rate (₹)'}
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'शेतकरी / पुरवठादार' : language === 'hi' ? 'किसान / सप्लायर' : 'Supplier'}
                  </label>
                  <Input
                    type="text"
                    placeholder="Local Dairy"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddBatchForm(false)}
                >
                  {language === 'mr' ? 'रद्द' : language === 'hi' ? 'रद्द' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  {language === 'mr' ? 'बॅच नोंदवून साठा वाढवा' : language === 'hi' ? 'बैच दर्ज कर स्टॉक बढ़ाएं' : 'Save Batch & Update Stock'}
                </Button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};

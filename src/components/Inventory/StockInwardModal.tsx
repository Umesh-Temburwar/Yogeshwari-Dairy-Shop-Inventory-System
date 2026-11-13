import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { 
  getShelfLifeDays, 
  getSuggestedExpiryDate, 
  generateBatchNumber, 
  getShelfLifeNote
} from '../../lib/shelfLifeUtils';
import { 
  X, 
  ArrowUpCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  Camera
} from 'lucide-react';
import { ExpiryOcrModal } from '../Scanner/ExpiryOcrModal';
import { Button, Input, Badge, StatusBadge } from '../ui';

interface StockInwardModalProps {
  product: Product | null;
  onClose: () => void;
}

type InwardMode = 'fresh_today' | 'previous_lot' | 'multi_lot';

interface MultiLotRow {
  id: string;
  lot_type: 'fresh_today' | 'previous_lot';
  quantity: string;
  mfg_date: string;
  expiry_date: string;
  batch_no: string;
}

export const StockInwardModal: React.FC<StockInwardModalProps> = ({ product, onClose }) => {
  const { batches, addStockEntries, adjustStock } = useStore();
  const { t, language } = useLanguage();

  if (!product) return null;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const shelfDays = useMemo(() => getShelfLifeDays(product.category, product.name), [product]);
  const shelfLifeTip = useMemo(() => getShelfLifeNote(product.category, product.name, language), [product, language]);

  // Active batches of this product (for top-up selection)
  const existingProductBatches = useMemo(() => {
    return batches
      .filter(b => b.product_id === product.id && b.qty_remaining > 0)
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }, [batches, product.id]);

  // Mode: fresh_today | previous_lot | multi_lot
  const [inwardMode, setInwardMode] = useState<InwardMode>('fresh_today');

  // Single Entry State (Fresh or Previous)
  const [quantity, setQuantity] = useState('10');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [mfgDate, setMfgDate] = useState(todayStr);
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Previous Lot Sub-type: 'new_previous_batch' | 'add_to_existing'
  const [previousSubtype, setPreviousSubtype] = useState<'new_previous_batch' | 'add_to_existing'>('new_previous_batch');
  const [selectedExistingBatchId, setSelectedExistingBatchId] = useState<string>(
    existingProductBatches.length > 0 ? existingProductBatches[0].id : ''
  );

  // Multi-lot State
  const [multiRows, setMultiRows] = useState<MultiLotRow[]>([
    {
      id: 'row-1',
      lot_type: 'fresh_today',
      quantity: '20',
      mfg_date: todayStr,
      expiry_date: getSuggestedExpiryDate(todayStr, shelfDays),
      batch_no: generateBatchNumber(product.name, todayStr)
    },
    {
      id: 'row-2',
      lot_type: 'previous_lot',
      quantity: '10',
      mfg_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      expiry_date: getSuggestedExpiryDate(new Date(Date.now() - 86400000).toISOString().split('T')[0], shelfDays),
      batch_no: generateBatchNumber(product.name, new Date(Date.now() - 86400000).toISOString().split('T')[0])
    }
  ]);

  // Auto-init single batch details when mode changes
  useEffect(() => {
    if (inwardMode === 'fresh_today') {
      setMfgDate(todayStr);
      setExpiryDate(getSuggestedExpiryDate(todayStr, shelfDays));
      setBatchNo(generateBatchNumber(product.name, todayStr));
    } else if (inwardMode === 'previous_lot') {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      setMfgDate(yesterday);
      setExpiryDate(getSuggestedExpiryDate(yesterday, shelfDays));
      setBatchNo(generateBatchNumber(product.name, yesterday));
      if (existingProductBatches.length > 0 && !selectedExistingBatchId) {
        setSelectedExistingBatchId(existingProductBatches[0].id);
      }
    }
  }, [inwardMode, product, shelfDays, todayStr, existingProductBatches, selectedExistingBatchId]);

  // Recalculate expiry if user alters mfg date in single mode
  const handleMfgDateChange = (date: string) => {
    setMfgDate(date);
    setExpiryDate(getSuggestedExpiryDate(date, shelfDays));
    setBatchNo(generateBatchNumber(product.name, date));
  };

  // Quick Preset Add
  const handlePresetAmount = (preset: number) => {
    setQuantity(preset.toString());
  };

  // Add Multi Row
  const handleAddMultiRow = (type: 'fresh_today' | 'previous_lot') => {
    const rowDate = type === 'fresh_today' ? todayStr : new Date(Date.now() - 86400000).toISOString().split('T')[0];
    setMultiRows(prev => [
      ...prev,
      {
        id: 'row-' + Date.now(),
        lot_type: type,
        quantity: '10',
        mfg_date: rowDate,
        expiry_date: getSuggestedExpiryDate(rowDate, shelfDays),
        batch_no: generateBatchNumber(product.name, rowDate)
      }
    ]);
  };

  // Update Multi Row
  const handleUpdateMultiRow = (id: string, updates: Partial<MultiLotRow>) => {
    setMultiRows(prev => prev.map(r => {
      if (r.id === id) {
        const updated = { ...r, ...updates };
        if (updates.mfg_date) {
          updated.expiry_date = getSuggestedExpiryDate(updates.mfg_date, shelfDays);
          updated.batch_no = generateBatchNumber(product.name, updates.mfg_date);
        }
        return updated;
      }
      return r;
    }));
  };

  // Remove Multi Row
  const handleRemoveMultiRow = (id: string) => {
    if (multiRows.length <= 1) return;
    setMultiRows(prev => prev.filter(r => r.id !== id));
  };

  // Calculate total inward quantity
  const totalInwardQty = useMemo(() => {
    if (inwardMode === 'multi_lot') {
      return multiRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
    }
    return parseFloat(quantity) || 0;
  }, [inwardMode, multiRows, quantity]);

  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalInwardQty <= 0) return;

    if (inwardMode === 'multi_lot') {
      const entries = multiRows.map(r => ({
        batch_no: r.batch_no.trim() || generateBatchNumber(product.name, r.mfg_date),
        mfg_date: r.mfg_date,
        expiry_date: r.expiry_date,
        quantity: parseFloat(r.quantity) || 0,
        lot_type: r.lot_type,
        purchase_price: product.purchase_price,
        supplier_name: supplierName.trim() || undefined,
        notes: r.lot_type === 'fresh_today' 
          ? (language === 'mr' ? 'आजचा ताजा माल आवक' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's fresh lot")
          : (language === 'mr' ? 'आधीचा / मागील शिल्लक माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous stock lot')
      })).filter(e => e.quantity > 0);

      await addStockEntries(product.id, entries);
    } else if (inwardMode === 'previous_lot' && previousSubtype === 'add_to_existing' && selectedExistingBatchId) {
      await adjustStock(product.id, totalInwardQty, undefined, {
        batch_id: selectedExistingBatchId
      });
    } else {
      await addStockEntries(product.id, [{
        batch_no: batchNo.trim() || generateBatchNumber(product.name, mfgDate),
        mfg_date: mfgDate,
        expiry_date: expiryDate || getSuggestedExpiryDate(mfgDate, shelfDays),
        quantity: totalInwardQty,
        lot_type: inwardMode,
        purchase_price: product.purchase_price,
        supplier_name: supplierName.trim() || undefined,
        notes: inwardMode === 'fresh_today'
          ? (language === 'mr' ? 'आजचा ताजा माल आवक' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's fresh lot")
          : (language === 'mr' ? 'आधीचा / मागील शिल्लक माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous stock lot')
      }]);
    }

    onClose();
  };

  const displayName = language === 'mr' && product.marathi_name ? product.marathi_name :
                      language === 'hi' && product.hindi_name ? product.hindi_name :
                      product.name;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-pop border border-line my-auto space-y-4 max-h-[92vh] overflow-y-auto text-ink">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-ink-2" />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-ink-3">
                {t('stockInModalTitle')}
              </span>
              <h3 className="text-base sm:text-lg font-semibold text-ink leading-tight">
                {displayName}
              </h3>
              <p className="text-xs text-ink-3">
                {language === 'mr' ? 'सध्या दुकानातील शिल्लक:' : language === 'hi' ? 'वर्तमान स्टॉक:' : 'Current Stock:'}{' '}
                <b className="text-ink font-semibold">{product.stock_quantity} {product.unit}</b>
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

        {/* VARIETY SHELF-LIFE HELPER TIP */}
        <div className="p-3 rounded-xl bg-surface-2/60 border border-line flex items-center gap-2.5 text-xs text-ink-2">
          <Clock className="w-4 h-4 text-ink-3 shrink-0" />
          <span className="flex-1">{shelfLifeTip}</span>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* SELECT LOT TYPE */}
          <div>
            <label className="text-xs font-semibold text-ink block mb-1.5 uppercase tracking-wider">
              {language === 'mr' ? 'माल कोणता आहे? (Lot Type):' : 
               language === 'hi' ? 'माल कौन सा है? (लॉट प्रकार):' : 
               'Lot Arrival Type:'}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: Fresh Today */}
              <button
                type="button"
                onClick={() => setInwardMode('fresh_today')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  inwardMode === 'fresh_today'
                    ? 'border-accent bg-surface shadow-card text-ink font-semibold'
                    : 'border-line bg-surface-2/40 text-ink-2 hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-ok" />
                  {inwardMode === 'fresh_today' && <Check className="w-3.5 h-3.5 text-ok" />}
                </div>
                <div>
                  <div className="text-xs leading-tight">
                    {language === 'mr' ? 'आजचा ताजा माल' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's Fresh"}
                  </div>
                  <div className="text-[10px] text-ink-3 mt-0.5">
                    {language === 'mr' ? 'आत्ता आलेला नवीन लॉट' : language === 'hi' ? 'अभी आया नया लॉट' : 'Fresh lot received'}
                  </div>
                </div>
              </button>

              {/* Option 2: Previous Lot */}
              <button
                type="button"
                onClick={() => setInwardMode('previous_lot')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  inwardMode === 'previous_lot'
                    ? 'border-accent bg-surface shadow-card text-ink font-semibold'
                    : 'border-line bg-surface-2/40 text-ink-2 hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-warn" />
                  {inwardMode === 'previous_lot' && <Check className="w-3.5 h-3.5 text-warn" />}
                </div>
                <div>
                  <div className="text-xs leading-tight">
                    {language === 'mr' ? 'आधीचा / मागील माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous Lot'}
                  </div>
                  <div className="text-[10px] text-ink-3 mt-0.5">
                    {language === 'mr' ? 'फ्रिजमधील मागील माल' : language === 'hi' ? 'फ्रिज में पहले का स्टॉक' : 'Backdated lot'}
                  </div>
                </div>
              </button>

              {/* Option 3: Multi-Lot Split */}
              <button
                type="button"
                onClick={() => setInwardMode('multi_lot')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  inwardMode === 'multi_lot'
                    ? 'border-accent bg-surface shadow-card text-ink font-semibold'
                    : 'border-line bg-surface-2/40 text-ink-2 hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  {inwardMode === 'multi_lot' && <Check className="w-3.5 h-3.5 text-accent" />}
                </div>
                <div>
                  <div className="text-xs leading-tight">
                    {language === 'mr' ? 'विविध लॉट नोंदी' : language === 'hi' ? 'मिक्स्ड लॉट्स' : 'Multi-Lot Split'}
                  </div>
                  <div className="text-[10px] text-ink-3 mt-0.5">
                    {language === 'mr' ? 'आजचा + कालचा दोन्ही' : language === 'hi' ? 'आज का + कल का दोनों' : 'Mixed expiries'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* SINGLE LOT ENTRY */}
          {inwardMode !== 'multi_lot' && (
            <div className="space-y-3.5">
              {inwardMode === 'previous_lot' && existingProductBatches.length > 0 && (
                <div className="p-3 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-[11px] font-medium text-ink-2 block">
                    {language === 'mr' ? 'हा माल आधीच्या कोणत्या लॉटमध्ये जोडायचा?' : language === 'hi' ? 'यह माल किस पुराने लॉट में जोड़ना है?' : 'How to record this previous lot?'}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviousSubtype('add_to_existing')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition ${
                        previousSubtype === 'add_to_existing'
                          ? 'bg-surface shadow-card border border-line text-ink font-semibold'
                          : 'bg-surface-2 text-ink-3 border border-line/40 hover:bg-surface'
                      }`}
                    >
                      {t('addToExistingBatch')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviousSubtype('new_previous_batch')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition ${
                        previousSubtype === 'new_previous_batch'
                          ? 'bg-surface shadow-card border border-line text-ink font-semibold'
                          : 'bg-surface-2 text-ink-3 border border-line/40 hover:bg-surface'
                      }`}
                    >
                      {t('createNewBatch')}
                    </button>
                  </div>

                  {previousSubtype === 'add_to_existing' && (
                    <div className="pt-2">
                      <label className="text-[10px] font-medium text-ink-3 block mb-1">
                        {t('selectBatch')}:
                      </label>
                      <select
                        value={selectedExistingBatchId}
                        onChange={(e) => setSelectedExistingBatchId(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
                      >
                        {existingProductBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batch_no} &bull; {b.qty_remaining} {product.unit} शिल्लक &bull; Expiry: {b.expiry_date}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Input with Presets */}
              <div>
                <label className="text-xs font-medium text-ink-2 block mb-1.5">
                  {language === 'mr' ? `किती ${product.unit} माल आला?` : language === 'hi' ? `कितना ${product.unit} माल आया?` : `Inward Quantity (${product.unit}):`}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    required
                    autoFocus
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="text-lg font-semibold tabular-nums pr-16 h-12"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-medium text-ink-3 text-xs pointer-events-none">
                    {product.unit}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 20, 50, 100].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePresetAmount(num)}
                      className="flex-1 py-1 rounded-lg bg-surface-2 hover:bg-surface text-xs font-medium text-ink-2 border border-line transition shadow-card"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manufacturing & Expiry Dates */}
              {(inwardMode === 'fresh_today' || previousSubtype === 'new_previous_batch') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-2/60 border border-line">
                  {/* OCR Trigger Button */}
                  <div className="sm:col-span-2 flex items-center justify-between pb-1">
                    <span className="text-[11px] font-medium text-ink-3">
                      {language === 'mr' ? 'तारीख व बॅच माहिती:' : 'तारीख व बैच विवरण:'}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowOcrModal(true)}
                      leftIcon={<Camera className="w-3.5 h-3.5 text-ink-2" />}
                      className="text-xs h-8"
                    >
                      {language === 'mr' ? 'पॅकेटवरील मुदत स्कॅन करा' : 'फोटो से एक्सपायरी स्कैन करें'}
                    </Button>
                  </div>

                  {/* Mfg Date */}
                  <div>
                    <label className="text-[11px] font-medium text-ink-2 block mb-1">
                      {inwardMode === 'fresh_today' 
                        ? (language === 'mr' ? 'आवक तारीख (आजची):' : language === 'hi' ? 'आवक तारीख (आज की):' : 'Mfg Date (Today):')
                        : (language === 'mr' ? 'मागील उत्पादन तारीख:' : language === 'hi' ? 'पिछली तारीख:' : 'Previous Mfg Date:')}
                    </label>
                    <Input
                      type="date"
                      value={mfgDate}
                      onChange={(e) => handleMfgDateChange(e.target.value)}
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-ink-2">
                        {t('expiryDate')}:
                      </label>
                      <Badge variant="default" className="text-[9px] h-4">
                        Auto
                      </Badge>
                    </div>
                    <Input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </div>

                  {/* Batch Number */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-medium text-ink-3 block mb-1">
                      {t('batchNo')} (Auto):
                    </label>
                    <Input
                      type="text"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MULTI-LOT SPLIT ENTRY */}
          {inwardMode === 'multi_lot' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-2">
                  {language === 'mr' ? 'एकाच उत्पादनाचे वेगवेगळे लॉट्स व एक्सपायरी:' : language === 'hi' ? 'एक ही माल के अलग-अलग लॉट्स व एक्सपायरी:' : 'Split lots with separate expiries:'}
                </span>

                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddMultiRow('fresh_today')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="text-xs h-7 px-2"
                  >
                    {language === 'mr' ? '+ आजचा लॉट' : language === 'hi' ? '+ आज का लॉट' : '+ Today Lot'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddMultiRow('previous_lot')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="text-xs h-7 px-2"
                  >
                    {language === 'mr' ? '+ आधीचा लॉट' : language === 'hi' ? '+ पहले का लॉट' : '+ Prev Lot'}
                  </Button>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {multiRows.map((row, index) => (
                  <div 
                    key={row.id}
                    className="p-3 rounded-xl bg-surface border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-card"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.lot_type === 'fresh_today' ? 'ok' : 'warn'}>
                        #{index + 1} {row.lot_type === 'fresh_today' ? (language === 'mr' ? 'आजचा' : 'आज') : (language === 'mr' ? 'आधीचा' : 'पहले')}
                      </StatusBadge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1 w-full sm:w-auto">
                      <div>
                        <label className="text-[9px] font-medium text-ink-3 block">
                          {product.unit}:
                        </label>
                        <Input
                          type="number"
                          step="0.5"
                          required
                          value={row.quantity}
                          onChange={(e) => handleUpdateMultiRow(row.id, { quantity: e.target.value })}
                          className="h-8 text-xs font-semibold tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-medium text-ink-3 block">
                          Mfg:
                        </label>
                        <Input
                          type="date"
                          value={row.mfg_date}
                          onChange={(e) => handleUpdateMultiRow(row.id, { mfg_date: e.target.value })}
                          className="h-8 text-[11px]"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-medium text-ink-3 block">
                          Expiry:
                        </label>
                        <Input
                          type="date"
                          required
                          value={row.expiry_date}
                          onChange={(e) => handleUpdateMultiRow(row.id, { expiry_date: e.target.value })}
                          className="h-8 text-[11px]"
                        />
                      </div>
                    </div>

                    {multiRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMultiRow(row.id)}
                        className="text-ink-3 hover:text-danger p-1 rounded-lg transition"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOTAL PREVIEW CARD */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line flex items-center justify-between text-xs">
            <div>
              <span className="font-medium text-ink-3 block">
                {language === 'mr' ? 'एकूण नवीन शिल्लक साठा होईल:' : language === 'hi' ? 'नया कुल स्टॉक बनेगा:' : 'New Total Shop Stock:'}
              </span>
              <span className="text-base font-semibold tabular-nums text-ink">
                {product.stock_quantity + totalInwardQty} {product.unit}
              </span>
            </div>

            <div className="text-right">
              <span className="font-medium text-ink-3 block">
                {language === 'mr' ? 'एकूण आवक साठा:' : language === 'hi' ? 'कुल आवक:' : 'Total Inward:'}
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                +{totalInwardQty} {product.unit}
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2.5 pt-2 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-1/2"
            >
              {t('cancel')}
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={totalInwardQty <= 0}
              className="w-1/2"
            >
              {language === 'mr' ? 'होय, साठा जमा करा' : language === 'hi' ? 'हाँ, स्टॉक दर्ज करें' : 'Confirm Stock In'}
            </Button>
          </div>

        </form>

      </div>

      {/* Expiry OCR Scanner Modal */}
      <ExpiryOcrModal
        isOpen={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onDatesExtracted={(extracted) => {
          if (extracted.batchNo) setBatchNo(extracted.batchNo);
          if (extracted.mfgDate) setMfgDate(extracted.mfgDate);
          if (extracted.expiryDate) setExpiryDate(extracted.expiryDate);
        }}
      />
    </div>
  );
};

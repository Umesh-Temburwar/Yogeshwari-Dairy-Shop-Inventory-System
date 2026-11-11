import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductBatch } from '../../types';
import { 
  getShelfLifeDays, 
  getSuggestedExpiryDate, 
  generateBatchNumber, 
  getShelfLifeNote,
  computeExpiryStatus
} from '../../lib/shelfLifeUtils';
import { 
  X, 
  ArrowUpCircle, 
  Clock, 
  Calendar, 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  History, 
  Sparkles,
  Info
} from 'lucide-react';

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
      mfg_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday
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
      // Multiple batch entries
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
      // Top up existing active batch
      await adjustStock(product.id, totalInwardQty, undefined, {
        batch_id: selectedExistingBatchId
      });
    } else {
      // Single new batch entry (fresh today or new previous batch)
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200/90 dark:border-[#24352F] my-8 animate-in fade-in duration-200">
        
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#24352F] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {t('stockInModalTitle')}
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'सध्या दुकानातील शिल्लक:' : language === 'hi' ? 'वर्तमान स्टॉक:' : 'Current Stock:'}{' '}
                <b className="text-slate-800 dark:text-[#E7F0EC]">{product.stock_quantity} {product.unit}</b>
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VARIETY SHELF-LIFE HELPER TIP */}
        <div className="my-3.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
          <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1">{shelfLifeTip}</span>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* SELECT LOT TYPE: "PAHALE KA THA YA ABHI KA THA?" */}
          <div>
            <label className="text-xs font-black text-slate-700 dark:text-[#E7F0EC] block mb-1.5">
              {language === 'mr' ? 'माल कोणता आहे? (Pahale ka tha ya abhi ka tha?):' : 
               language === 'hi' ? 'माल कौन सा है? (पहले का माल था या अभी का?):' : 
               'Lot Arrival Type (Pahale ka tha ya abhi ka tha?):'}
            </label>

            <div className="grid grid-cols-3 gap-2">
              
              {/* Option 1: आजचा ताजा माल (Fresh Today) */}
              <button
                type="button"
                onClick={() => setInwardMode('fresh_today')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  inwardMode === 'fresh_today'
                    ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-[#24352F] bg-slate-50/50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#20332D]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">🟢</span>
                  {inwardMode === 'fresh_today' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div>
                  <div className="text-xs font-black leading-tight">
                    {language === 'mr' ? 'आजचा ताजा माल' : language === 'hi' ? 'आज का ताज़ा माल' : "Today's Fresh"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#8FA69C] mt-0.5">
                    {language === 'mr' ? 'आत्ता आलेला नवीन लॉट' : language === 'hi' ? 'अभी आया नया लॉट' : 'Fresh lot received'}
                  </div>
                </div>
              </button>

              {/* Option 2: आधीचा शिल्लक माल (Previous Lot) */}
              <button
                type="button"
                onClick={() => setInwardMode('previous_lot')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  inwardMode === 'previous_lot'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-[#24352F] bg-slate-50/50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#20332D]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">🟡</span>
                  {inwardMode === 'previous_lot' && <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <div className="text-xs font-black leading-tight">
                    {language === 'mr' ? 'आधीचा / मागील माल' : language === 'hi' ? 'पहले का / पुराना माल' : 'Previous Lot'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#8FA69C] mt-0.5">
                    {language === 'mr' ? 'फ्रिजमधील मागील माल' : language === 'hi' ? 'फ्रिज में पहले का स्टॉक' : 'Backdated / fridge lot'}
                  </div>
                </div>
              </button>

              {/* Option 3: एकाच वेळी विविध नोंदी (Multi-Lot Split) */}
              <button
                type="button"
                onClick={() => setInwardMode('multi_lot')}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  inwardMode === 'multi_lot'
                    ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/50 text-purple-950 dark:text-purple-200 shadow-xs ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-[#24352F] bg-slate-50/50 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#20332D]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">➕</span>
                  {inwardMode === 'multi_lot' && <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                </div>
                <div>
                  <div className="text-xs font-black leading-tight">
                    {language === 'mr' ? 'विविध लॉट नोंदी' : language === 'hi' ? 'मिक्स्ड लॉट्स' : 'Multi-Lot Split'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-[#8FA69C] mt-0.5">
                    {language === 'mr' ? 'आजचा + कालचा दोन्ही' : language === 'hi' ? 'आज का + कल का दोनों' : 'Mixed expiries'}
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* MODE 1 & 2: SINGLE LOT ENTRY (FRESH OR PREVIOUS) */}
          {inwardMode !== 'multi_lot' && (
            <div className="space-y-3.5">
              
              {/* If Previous Lot: Sub-choice (Add to existing batch vs New previous batch entry) */}
              {inwardMode === 'previous_lot' && existingProductBatches.length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-[#8FA69C] block">
                    {language === 'mr' ? 'हा माल आधीच्या कोणत्या लॉटमध्ये जोडायचा?' : language === 'hi' ? 'यह माल किस पुराने लॉट में जोड़ना है?' : 'How to record this previous lot?'}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviousSubtype('add_to_existing')}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                        previousSubtype === 'add_to_existing'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                      }`}
                    >
                      {t('addToExistingBatch')}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviousSubtype('new_previous_batch')}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all ${
                        previousSubtype === 'new_previous_batch'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                      }`}
                    >
                      {t('createNewBatch')}
                    </button>
                  </div>

                  {previousSubtype === 'add_to_existing' && (
                    <div className="pt-2">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] block mb-1">
                        {t('selectBatch')}:
                      </label>
                      <select
                        value={selectedExistingBatchId}
                        onChange={(e) => setSelectedExistingBatchId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
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
                <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                  {language === 'mr' ? `किती ${product.unit} माल आला?` : language === 'hi' ? `कितना ${product.unit} माल आया?` : `Inward Quantity (${product.unit}):`}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    autoFocus
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border-2 border-emerald-500 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-black text-xl focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 dark:text-[#8FA69C] text-sm">
                    {product.unit}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex gap-2 mt-2">
                  {[5, 10, 20, 50, 100].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePresetAmount(num)}
                      className="flex-1 py-1 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#20332D] text-xs font-extrabold text-slate-700 dark:text-[#E7F0EC] border border-slate-200/80 dark:border-[#24352F] transition-all"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manufacturing & Expiry Dates (Hidden if just topping up existing batch) */}
              {(inwardMode === 'fresh_today' || previousSubtype === 'new_previous_batch') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/90 dark:border-[#24352F]">
                  
                  {/* Mfg Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                      {inwardMode === 'fresh_today' 
                        ? (language === 'mr' ? 'आवक / उत्पादन तारीख (आजची):' : language === 'hi' ? 'आवक तारीख (आज की):' : 'Mfg Date (Today):')
                        : (language === 'mr' ? 'मागील उत्पादन तारीख (Mfg):' : language === 'hi' ? 'पिछली तारीख (Mfg):' : 'Previous Mfg Date:')}
                    </label>
                    <input
                      type="date"
                      value={mfgDate}
                      onChange={(e) => handleMfgDateChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-bold focus:outline-none"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC]">
                        {t('expiryDate')}:
                      </label>
                      <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                        {language === 'mr' ? 'ऑटो सुचवलेली' : language === 'hi' ? 'ऑटो सुझाई' : 'Auto'}
                      </span>
                    </div>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border-2 border-emerald-500 dark:border-emerald-600 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-black focus:outline-none"
                    />
                  </div>

                  {/* Batch Number */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C] block mb-1">
                      {t('batchNo')} ({language === 'mr' ? 'सिस्टीमने आपोआप बनवलेला' : language === 'hi' ? 'ऑटो जनरेटेड' : 'Auto generated'}):
                    </label>
                    <input
                      type="text"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* MODE 3: MULTI-LOT SPLIT ENTRY */}
          {inwardMode === 'multi_lot' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'एकाच उत्पादनाचे वेगवेगळे लॉट्स व एक्सपायरी:' : language === 'hi' ? 'एक ही माल के अलग-अलग लॉट्स व एक्सपायरी:' : 'Split lots with separate expiries:'}
                </span>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddMultiRow('fresh_today')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? '+ आजचा लॉट' : language === 'hi' ? '+ आज का लॉट' : '+ Today Lot'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddMultiRow('previous_lot')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? '+ आधीचा लॉट' : language === 'hi' ? '+ पहले का लॉट' : '+ Prev Lot'}</span>
                  </button>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {multiRows.map((row, index) => (
                  <div 
                    key={row.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        row.lot_type === 'fresh_today'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                      }`}>
                        #{index + 1} {row.lot_type === 'fresh_today' ? (language === 'mr' ? 'आजचा' : 'आज') : (language === 'mr' ? 'आधीचा' : 'पहले')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1 w-full sm:w-auto">
                      {/* Quantity */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                          {product.unit}:
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          required
                          value={row.quantity}
                          onChange={(e) => handleUpdateMultiRow(row.id, { quantity: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-xl border border-emerald-400 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-black"
                        />
                      </div>

                      {/* Mfg Date */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                          Mfg:
                        </label>
                        <input
                          type="date"
                          value={row.mfg_date}
                          onChange={(e) => handleUpdateMultiRow(row.id, { mfg_date: e.target.value })}
                          className="w-full px-1.5 py-1.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-[11px] font-semibold"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                          Expiry:
                        </label>
                        <input
                          type="date"
                          required
                          value={row.expiry_date}
                          onChange={(e) => handleUpdateMultiRow(row.id, { expiry_date: e.target.value })}
                          className="w-full px-1.5 py-1.5 rounded-xl border border-emerald-400 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-[11px] font-black"
                        />
                      </div>
                    </div>

                    {/* Remove button */}
                    {multiRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMultiRow(row.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
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
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200/90 dark:border-[#24352F] flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-500 dark:text-[#8FA69C] block">
                {language === 'mr' ? 'एकूण नवीन शिल्लक साठा होईल:' : language === 'hi' ? 'नया कुल स्टॉक बनेगा:' : 'New Total Shop Stock:'}
              </span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                {product.stock_quantity + totalInwardQty} {product.unit}
              </span>
            </div>

            <div className="text-right">
              <span className="font-semibold text-slate-500 dark:text-[#8FA69C] block">
                {language === 'mr' ? 'एकूण आवक साठा:' : language === 'hi' ? 'कुल आवक:' : 'Total Inward:'}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                +{totalInwardQty} {product.unit}
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#20332D] text-slate-700 dark:text-[#E7F0EC] border border-slate-200 dark:border-[#24352F] font-bold text-xs transition-all"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              disabled={totalInwardQty <= 0}
              className="w-1/2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {language === 'mr' ? 'होय, साठा जमा करा' : language === 'hi' ? 'हाँ, स्टॉक दर्ज करें' : 'Confirm Stock In'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { translateProductNameSync } from '../../lib/productTranslator';
import { validateBarcode } from '../../utils/barcodeChecksum';
import { playSuccessChime } from '../../utils/audioUtils';
import { supabase } from '../../lib/supabase';
import { X, Barcode, Sparkles, Save, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

interface QuickProductRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  barcode: string;
  mode?: 'pos' | 'catalogue' | 'inventory';
  onProductCreated?: (product: Product) => void;
}

export const QuickProductRegisterModal: React.FC<QuickProductRegisterModalProps> = ({
  isOpen,
  onClose,
  barcode,
  mode = 'pos',
  onProductCreated
}) => {
  const { addProduct } = useStore();
  const { language } = useLanguage();

  const [name, setName] = useState('');
  const [marathiName, setMarathiName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Bakery & Extras');
  const [unit, setUnit] = useState<ProductUnit>('Piece');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState(mode === 'pos' ? '1' : '0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanBarcode = barcode.trim();
  const validation = validateBarcode(cleanBarcode);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setMarathiName('');
      setCategory('Bakery & Extras');
      setUnit('Piece');
      setSellingPrice('');
      setPurchasePrice('');
      setStockQuantity(mode === 'pos' ? '1' : '0');
      setErrorMsg(null);
    }
  }, [isOpen, barcode, mode]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (val.trim()) {
      const tr = translateProductNameSync(val);
      setMarathiName(tr.marathi);
    } else {
      setMarathiName('');
    }
  };

  const handleSellingPriceChange = (val: string) => {
    setSellingPrice(val);
    const sp = parseFloat(val);
    if (!isNaN(sp) && sp > 0 && !purchasePrice) {
      // Suggest realistic purchase price ~85% of selling price
      setPurchasePrice((sp * 0.85).toFixed(1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(language === 'mr' ? 'कृपया उत्पादनाचे नाव प्रविष्ट करा.' : 'कृपया उत्पाद का नाम दर्ज करें।');
      return;
    }

    const sPrice = parseFloat(sellingPrice);
    if (isNaN(sPrice) || sPrice <= 0) {
      setErrorMsg(language === 'mr' ? 'कृपया योग्य विक्री दर प्रविष्ट करा.' : 'कृपया मान्य बिक्री मूल्य दर्ज करें।');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || (sPrice * 0.85);
    const stockQty = parseFloat(stockQuantity) || (mode === 'pos' ? 1 : 0);

    setIsSubmitting(true);
    try {
      // 1. Add to StoreContext (local state + Supabase products table)
      const createdProd = await addProduct({
        name: trimmedName,
        marathi_name: marathiName.trim() || undefined,
        category,
        unit,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: stockQty,
        min_stock_alert: 5,
        barcode: cleanBarcode,
        is_active: true
      });

      // 2. Direct client-side upsert to public.product_barcodes (Dual Guarantee alongside DB trigger)
      if (supabase && cleanBarcode) {
        const bcType = cleanBarcode.length === 8 ? 'EAN-8' : cleanBarcode.length === 12 ? 'UPC-A' : cleanBarcode.length === 14 ? 'GTIN-14' : 'EAN-13';
        try {
          await supabase.from('product_barcodes').upsert([{
            product_id: createdProd.id,
            barcode: cleanBarcode,
            barcode_type: bcType,
            is_primary: true,
            source: 'QUICK_REGISTER_MODAL',
            is_active: true
          }], { onConflict: 'barcode' });
        } catch (bcErr) {
          console.warn('[QuickRegister] product_barcodes upsert:', bcErr);
        }
      }

      playSuccessChime();

      if (onProductCreated) {
        onProductCreated(createdProd);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to quick register product:', err);
      setErrorMsg(err?.message || (language === 'mr' ? 'नोंदणी अयशस्वी झाली. पुन्हा प्रयत्न करा.' : 'पंजीकरण विफल रहा। पुनः प्रयास करें।'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#131F1B] rounded-2xl border border-emerald-500/30 dark:border-emerald-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                {language === 'mr' ? 'नवीन बारकोड त्वरित नोंदणी' : 'नया बारकोड त्वरित पंजीकरण'}
              </h2>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                <Barcode className="w-3.5 h-3.5" />
                <span className="font-mono font-bold tracking-wider">{cleanBarcode}</span>
                {validation.type && (
                  <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-semibold">
                    {validation.type}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name (English) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {language === 'mr' ? 'उत्पादनाचे नाव (इंग्रजी)' : 'उत्पाद का नाम (अंग्रेजी)'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="उदा. Parle Monaco 50g / Britannia Good Day"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Marathi Name (Auto-Transliterated) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
              <span>{language === 'mr' ? 'मराठी नाव (आपोआप भाषांतर)' : 'मराठी / प्रादेशिक नाम'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Translated
              </span>
            </label>
            <input
              type="text"
              value={marathiName}
              onChange={(e) => setMarathiName(e.target.value)}
              placeholder="उदा. पार्ले मोनाको ५० ग्रॅम"
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category & Unit Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'mr' ? 'प्रवर्ग (Category)' : 'श्रेणी'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bakery & Extras">बेकरी आणि पॅकेट (Bakery & Extras)</option>
                <option value="Milk">दूध (Milk)</option>
                <option value="Curd & Chaas">दही आणि ताक (Curd & Chaas)</option>
                <option value="Paneer & Butter">पनीर आणि लोणी (Paneer & Butter)</option>
                <option value="Ghee">तूप (Ghee)</option>
                <option value="Sweets/Mithai">मिठाई (Sweets)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'mr' ? 'एकक (Unit)' : 'इकाई'}
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Piece">नग / Piece</option>
                <option value="Packet (500ml)">पाकीट (500ml)</option>
                <option value="Packet (1L)">पाकीट (1 Litre)</option>
                <option value="Litre">लिटर (Litre)</option>
                <option value="Kg">किलो (Kg)</option>
                <option value="Gram">ग्रॅम (Gram)</option>
              </select>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'mr' ? 'विक्री दर (₹ Selling Price)' : 'बिक्री मूल्य (₹)'} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => handleSellingPriceChange(e.target.value)}
                  placeholder="20.00"
                  className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {language === 'mr' ? 'खरेदी दर (₹ Purchase)' : 'खरीद मूल्य (₹)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="17.00"
                  className="w-full h-10 pl-7 pr-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Stock Input */}
          <div className="p-3 bg-slate-50 dark:bg-[#1A2A25]/60 rounded-xl border border-slate-200 dark:border-[#24352F] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {mode === 'pos' 
                  ? (language === 'mr' ? 'बिलात जोडण्यासाठी प्रारंभिक साठा' : 'बिल में जोड़ने हेतु प्रारंभिक स्टॉक')
                  : (language === 'mr' ? 'कॅटलॉग साठा (Stock)' : 'कैटलॉग स्टॉक')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                {mode === 'pos' 
                  ? (language === 'mr' ? 'उत्पादन तयार होताच थेट १ नग बिलात जोडला जाईल.' : 'उत्पाद बनते ही 1 नग बिल में जुड़ जाएगा।')
                  : (language === 'mr' ? 'नवीन कॅटलॉग माल ० साठ्यासह नोंदवला जाईल.' : 'नया उत्पाद 0 स्टॉक से दर्ज होगा।')}
              </span>
            </div>

            <div className="w-24 shrink-0">
              <input
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full h-9 px-2 text-center rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-xs font-bold transition-colors"
            >
              {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'mr' ? 'नोंदवत आहे...' : 'सहेज रहे हैं...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>
                    {mode === 'pos' 
                      ? (language === 'mr' ? '⚡ सेव्ह करा आणि बिलात घ्या' : '⚡ सहेजें और बिल में लें')
                      : (language === 'mr' ? '⚡ कॅटलॉगमध्ये त्वरित जोडा' : '⚡ कैटलॉग में तुरंत जोड़ें')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

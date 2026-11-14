import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { getShelfLifeNote } from '../../lib/shelfLifeUtils';
import { X, Save, PackagePlus, Clock, Camera, Sparkles } from 'lucide-react';
import { ProductPhotoModal } from '../Scanner/ProductPhotoModal';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ 
  isOpen, 
  onClose, 
  productToEdit 
}) => {
  const { addProduct, updateProduct } = useStore();
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [marathiName, setMarathiName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Milk');
  const [unit, setUnit] = useState<ProductUnit>('Litre');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [minStockAlert, setMinStockAlert] = useState<string>('15');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setHindiName(productToEdit.hindi_name || '');
      setMarathiName(productToEdit.marathi_name || '');
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setPurchasePrice(productToEdit.purchase_price.toString());
      setSellingPrice(productToEdit.selling_price.toString());
      setStockQuantity(productToEdit.stock_quantity.toString());
      setMinStockAlert(productToEdit.min_stock_alert.toString());
    } else {
      setName('');
      setHindiName('');
      setMarathiName('');
      setCategory('Milk');
      setUnit('Litre');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQuantity('0');
      setMinStockAlert('10');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const pPrice = Math.max(0, parseFloat(purchasePrice) || 0);
    const sPrice = Math.max(0, parseFloat(sellingPrice) || 0);
    const sQty = Math.max(0, parseFloat(stockQuantity) || 0);
    const minAlert = Math.max(0, parseFloat(minStockAlert) || 10);

    if (productToEdit) {
      await updateProduct(productToEdit.id, {
        name: cleanName,
        hindi_name: hindiName.trim() || undefined,
        marathi_name: marathiName.trim() || undefined,
        category,
        unit,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: sQty,
        min_stock_alert: minAlert
      });
    } else {
      await addProduct({
        name: cleanName,
        hindi_name: hindiName.trim() || undefined,
        marathi_name: marathiName.trim() || undefined,
        category,
        unit,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: sQty,
        min_stock_alert: minAlert,
        is_active: true
      });
    }

    onClose();
  };

  const marginPerUnit = (parseFloat(sellingPrice) || 0) - (parseFloat(purchasePrice) || 0);
  const marginPct = (parseFloat(purchasePrice) > 0)
    ? ((marginPerUnit / parseFloat(purchasePrice)) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-transparent dark:border-[#24352F] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-[#E7F0EC] text-base">
                {productToEdit 
                  ? (language === 'mr' ? 'मालाची माहिती बदला' : language === 'hi' ? 'माल की जानकारी अपडेट करें' : 'Edit Product Details')
                  : (language === 'mr' ? 'दुकानात नवीन माल जोडा' : language === 'hi' ? 'दुकान में नया माल जोड़ें' : 'Add New Dairy Product')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'दूध, पनीर, तूप, खवा, मिठाई किंवा इतर उत्पादने' : language === 'hi' ? 'दूध, पनीर, घी, खोया, मिठाई या अन्य डेरी उत्पाद' : 'Milk, Paneer, Ghee, Sweets or Dairy items'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Trilingual Names: English, Marathi, Hindi */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
              {language === 'mr' ? 'इंग्रजी नाव' : language === 'hi' ? 'अंग्रेजी नाम' : 'English Name'} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fresh Buffalo Milk Full Cream"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? 'मराठी नाव' : language === 'hi' ? 'मराठी नाम' : 'Marathi Name'}
              </label>
              <input
                type="text"
                placeholder="उदा. ताजे म्हशीचे दूध"
                value={marathiName}
                onChange={(e) => setMarathiName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? 'हिंदी नाव' : language === 'hi' ? 'हिंदी नाम' : 'Hindi Name'}
              </label>
              <input
                type="text"
                placeholder="उदा. ताज़ा भैंस का दूध"
                value={hindiName}
                onChange={(e) => setHindiName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {t('categoryCol')} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Milk">{t('catMilk')} (Milk)</option>
                <option value="Curd & Chaas">{t('catCurd')} (Curd & Chaas)</option>
                <option value="Paneer & Butter">{t('catPaneer')} (Paneer & Butter)</option>
                <option value="Ghee">{t('catGhee')} (Ghee)</option>
                <option value="Sweets/Mithai">{t('catSweets')} (Sweets & Khoya)</option>
                <option value="Bakery & Extras">{t('catBakery')} (Bakery & Extras)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {t('unitCol')} *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Litre">{language === 'mr' ? 'लिटर (Litre)' : language === 'hi' ? 'लीटर (Litre)' : 'Litre'}</option>
                <option value="Kg">{language === 'mr' ? 'किलो (Kg)' : language === 'hi' ? 'किलोग्राम (Kg)' : 'Kg'}</option>
                <option value="Packet (500ml)">{language === 'mr' ? 'पिशवी ५०० मिली' : language === 'hi' ? 'थैली ५०० मिली' : 'Packet (500ml)'}</option>
                <option value="Packet (1L)">{language === 'mr' ? 'पिशवी १ लिटर' : language === 'hi' ? 'थैली १ लीटर' : 'Packet (1L)'}</option>
                <option value="Piece">{language === 'mr' ? 'नग / पीस' : language === 'hi' ? 'नग / पीस' : 'Piece'}</option>
                <option value="Gram">{language === 'mr' ? 'ग्रॅम' : language === 'hi' ? 'ग्राम' : 'Gram'}</option>
              </select>
            </div>
          </div>

          {/* Purchase Price vs Selling Price */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F]">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `खरेदी दर प्रति ${unit} (₹)` : language === 'hi' ? `खरीद भाव प्रति ${unit} (₹)` : `Purchase Rate per ${unit} (₹)`} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="58"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `विक्री दर प्रति ${unit} (₹)` : language === 'hi' ? `बिक्री भाव प्रति ${unit} (₹)` : `Selling Rate per ${unit} (₹)`} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="70"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Live Profit Margin Calculator Indicator */}
            <div className="col-span-2 flex items-center justify-between text-xs font-semibold pt-1 text-slate-600 dark:text-[#8FA69C] border-t border-slate-200 dark:border-[#24352F]">
              <span>{language === 'mr' ? `प्रति ${unit} नफा:` : language === 'hi' ? `प्रति ${unit} अनुमानित लाभ:` : `Est Profit per ${unit}:`}</span>
              <span className={`font-bold ${marginPerUnit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                ₹{marginPerUnit.toFixed(2)} ({marginPct}% {language === 'mr' ? 'मार्जिन' : language === 'hi' ? 'मार्जिन' : 'Margin'})
              </span>
            </div>
          </div>

          {/* Current Stock & Low Stock Alert Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `सध्याचा साठा (${unit} मध्ये)` : language === 'hi' ? `मौजूदा स्टॉक (${unit} में)` : `Current Stock (in ${unit})`}
              </label>
              <input
                type="number"
                step="0.1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `कमी साठा मर्यादा (${unit})` : language === 'hi' ? `कम स्टॉक अलर्ट सीमा (${unit})` : `Low Stock Threshold (${unit})`}
              </label>
              <input
                type="number"
                step="0.1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-amber-700 dark:text-amber-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {!productToEdit && (
              <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{getShelfLifeNote(category, name, language)} &bull; {language === 'mr' ? 'आरंभीच्या साठ्याची बॅच आपोआप तयार होईल' : language === 'hi' ? 'आरंभिक स्टॉक का बैच स्वतः बन जाएगा' : 'Initial stock batch auto-created with variety expiry'}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{productToEdit ? (language === 'mr' ? 'माहिती जतन करा' : language === 'hi' ? 'अपडेट सुरक्षित करें' : 'Update Details') : t('save')}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

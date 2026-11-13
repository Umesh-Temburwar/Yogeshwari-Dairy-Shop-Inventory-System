import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { getShelfLifeNote } from '../../lib/shelfLifeUtils';
import { X, Save, PackagePlus, Clock } from 'lucide-react';
import { Button, Input } from '../ui';

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
      setStockQuantity('20');
      setMinStockAlert('15');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const sQty = parseFloat(stockQuantity) || 0;
    const minAlert = parseFloat(minStockAlert) || 10;

    if (productToEdit) {
      await updateProduct(productToEdit.id, {
        name: name.trim(),
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
        name: name.trim(),
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-pop border border-line my-auto space-y-4 max-h-[92vh] overflow-y-auto text-ink">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-2 border border-line text-ink flex items-center justify-center">
              <PackagePlus className="w-4 h-4 text-ink-2" />
            </div>
            <div>
              <h3 className="font-semibold text-ink text-base tracking-tight">
                {productToEdit 
                  ? (language === 'mr' ? 'मालाची माहिती बदला' : language === 'hi' ? 'माल की जानकारी अपडेट करें' : 'Edit Product Details')
                  : (language === 'mr' ? 'दुकानात नवीन माल जोडा' : language === 'hi' ? 'दुकान में नया माल जोड़ें' : 'Add New Dairy Product')}
              </h3>
              <p className="text-xs text-ink-3">
                {language === 'mr' ? 'दूध, पनीर, तूप, खवा, मिठाई किंवा इतर उत्पादने' : language === 'hi' ? 'दूध, पनीर, घी, खोया, मिठाई या अन्य डेरी उत्पाद' : 'Milk, Paneer, Ghee, Sweets or Dairy items'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Trilingual Names: English, Marathi, Hindi */}
          <div>
            <label className="text-xs font-medium text-ink-2 block mb-1.5">
              {language === 'mr' ? 'इंग्रजी नाव' : language === 'hi' ? 'अंग्रेजी नाम' : 'English Name'} *
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Fresh Buffalo Milk Full Cream"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'मराठी नाव' : language === 'hi' ? 'मराठी नाम' : 'Marathi Name'}
              </label>
              <Input
                type="text"
                placeholder="उदा. ताजे म्हशीचे दूध"
                value={marathiName}
                onChange={(e) => setMarathiName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? 'हिंदी नाव' : language === 'hi' ? 'हिंदी नाम' : 'Hindi Name'}
              </label>
              <Input
                type="text"
                placeholder="उदा. ताज़ा भैंस का दूध"
                value={hindiName}
                onChange={(e) => setHindiName(e.target.value)}
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {t('categoryCol')} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
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
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {t('unitCol')} *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full h-10 px-3 rounded-xl bg-surface border border-line text-xs font-medium text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-ink/15"
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
          <div className="grid grid-cols-2 gap-3 bg-surface-2/60 p-3.5 rounded-xl border border-line">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? `खरेदी दर प्रति ${unit} (₹)` : language === 'hi' ? `खरीद भाव प्रति ${unit} (₹)` : `Purchase Rate per ${unit} (₹)`} *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="58"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? `विक्री दर प्रति ${unit} (₹)` : language === 'hi' ? `बिक्री भाव प्रति ${unit} (₹)` : `Selling Rate per ${unit} (₹)`} *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="70"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>

            {/* Live Profit Margin Calculator Indicator */}
            <div className="col-span-2 flex items-center justify-between text-xs pt-2 border-t border-line text-ink-2">
              <span className="text-[11px]">{language === 'mr' ? `प्रति ${unit} नफा:` : language === 'hi' ? `प्रति ${unit} अनुमानित लाभ:` : `Est Profit per ${unit}:`}</span>
              <span className="font-semibold tabular-nums text-ink">
                ₹{marginPerUnit.toFixed(2)} ({marginPct}% {language === 'mr' ? 'मार्जिन' : language === 'hi' ? 'मार्जिन' : 'Margin'})
              </span>
            </div>
          </div>

          {/* Current Stock & Low Stock Alert Level */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? `सध्याचा साठा (${unit} मध्ये)` : language === 'hi' ? `मौजूदा स्टॉक (${unit} में)` : `Current Stock (in ${unit})`}
              </label>
              <Input
                type="number"
                step="0.1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1.5">
                {language === 'mr' ? `कमी साठा मर्यादा (${unit})` : language === 'hi' ? `कम स्टॉक अलर्ट सीमा (${unit})` : `Low Stock Threshold (${unit})`}
              </label>
              <Input
                type="number"
                step="0.1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
              />
            </div>

            {!productToEdit && (
              <div className="col-span-2 p-3 rounded-xl bg-surface-2 border border-line flex items-center gap-2 text-xs text-ink-2">
                <Clock className="w-4 h-4 text-ink-3 shrink-0" />
                <span>{getShelfLifeNote(category, name, language)} &bull; {language === 'mr' ? 'आरंभीच्या साठ्याची बॅच आपोआप तयार होईल' : language === 'hi' ? 'आरंभिक स्टॉक का बैच स्वतः बन जाएगा' : 'Initial stock batch auto-created with variety expiry'}</span>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-3 border-t border-line">
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
              leftIcon={<Save className="w-4 h-4" />}
              className="w-1/2"
            >
              {productToEdit ? (language === 'mr' ? 'माहिती जतन करा' : language === 'hi' ? 'अपडेट सुरक्षित करें' : 'Update Details') : t('save')}
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
};

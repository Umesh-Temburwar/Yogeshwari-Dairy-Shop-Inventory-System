import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  LayoutGrid, 
  List, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  X,
  Sparkles,
  Milk,
  Check
} from 'lucide-react';

interface ProductListProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  onOpenAddProduct, 
  onEditProduct 
}) => {
  const { products, deleteProduct, adjustStock, addProduct, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards'); // Default to ultra-simple cards!

  // Quick Stock In/Out Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('10');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');

  // Quick Inline Add Bar State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Milk');
  const [quickUnit, setQuickUnit] = useState<ProductUnit>('Litre');
  const [quickBuyPrice, setQuickBuyPrice] = useState('');
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickStock, setQuickStock] = useState('20');

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व माल' : language === 'hi' ? 'सभी माल' : 'All Products' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.hindi_name && p.hindi_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.marathi_name && p.marathi_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  // Handle Quick Adjust (Stock In / Out)
  const handleConfirmAdjust = () => {
    if (!adjustModalProduct) return;
    const qty = parseFloat(adjustAmount);
    if (isNaN(qty) || qty <= 0) return;

    const delta = adjustType === 'in' ? qty : -qty;
    adjustStock(adjustModalProduct.id, delta);
    setAdjustModalProduct(null);
    setAdjustAmount('10');
  };

  // Handle Quick Inline Add Submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    await addProduct({
      name: quickName.trim(),
      hindi_name: quickName.trim(),
      marathi_name: quickName.trim(),
      category: quickCategory,
      unit: quickUnit,
      purchase_price: parseFloat(quickBuyPrice) || 0,
      selling_price: parseFloat(quickSellPrice) || 0,
      stock_quantity: parseFloat(quickStock) || 0,
      min_stock_alert: 10,
      is_active: true
    });

    setQuickName('');
    setQuickBuyPrice('');
    setQuickSellPrice('');
    setQuickStock('20');
    setShowQuickAdd(false);
  };

  return (
    <div className="space-y-5">
      
      {/* SIMPLE HEADER BAR */}
      <div className="bg-white dark:bg-[#131F1B] p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#24352F] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {language === 'mr' ? 'दुकान माल व साठा (Inventory)' : language === 'hi' ? 'दुकान का माल और स्टॉक (Inventory)' : 'Dairy Stock & Inventory'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
                {language === 'mr' ? 'एकदम सोपे: माल आला की (+) दाबा, माल संपला की (-) दाबा' : 'एकदम सरल: माल आया तो (+) दबाएं, बिका तो (-) दबाएं'}
              </p>
            </div>
          </div>
        </div>

        {/* View Toggle & Add Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Card / Table Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-xl border border-slate-200 dark:border-[#24352F]">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs border dark:border-[#24352F]' : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'सोपा कार्ड व्ह्यू' : language === 'hi' ? 'सरल कार्ड व्यू' : 'Simple Cards'}</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs border dark:border-[#24352F]' : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'यादी व्ह्यू' : language === 'hi' ? 'लिस्ट व्यू' : 'Table View'}</span>
            </button>
          </div>

          {/* Quick Alert pill */}
          {(lowStockCount + outOfStockCount) > 0 && (
            <button
              onClick={() => setActiveView('reorder')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-xs font-black animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>{lowStockCount + outOfStockCount} {language === 'mr' ? 'माल संपत आला' : 'माल खत्म हो रहा है'}</span>
            </button>
          )}

          {/* New Product Button */}
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'mr' ? '+ नवीन माल जोडा' : '+ नया माल जोड़ें'}</span>
          </button>
        </div>
      </div>

      {/* QUICK INLINE ADD PRODUCT FORM (Expandable in 1 tap) */}
      {showQuickAdd && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-[#131F1B] dark:to-[#1A2A25] p-4 sm:p-5 rounded-3xl border border-emerald-200 dark:border-[#24352F] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-200 dark:border-[#24352F] pb-2">
            <h3 className="font-extrabold text-emerald-950 dark:text-emerald-300 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'mr' ? 'फक्त १ मिनिटात नवीन माल जोडा' : 'सिर्फ 1 मिनट में नया माल जोड़ें'}</span>
            </h3>
            <button onClick={() => setShowQuickAdd(false)} className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'मालाचे नाव (उदा. मलाई पनीर) *' : 'माल का नाम (उदा. मलाई पनीर) *'}
              </label>
              <input
                type="text"
                required
                placeholder="उदा. म्हशीचे दूध / पनीर / तूप"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'प्रवर्ग (Category)' : 'केटेगरी'}
              </label>
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value as ProductCategory)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
              >
                <option value="Milk">{t('catMilk')}</option>
                <option value="Paneer & Butter">{t('catPaneer')}</option>
                <option value="Curd & Chaas">{t('catCurd')}</option>
                <option value="Ghee">{t('catGhee')}</option>
                <option value="Sweets/Mithai">{t('catSweets')}</option>
                <option value="Bakery & Extras">{t('catBakery')}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'एकक (Unit)' : 'नाप (Unit)'}
              </label>
              <select
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value as ProductUnit)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
              >
                <option value="Litre">{language === 'mr' ? 'लिटर (Ltr)' : 'लीटर'}</option>
                <option value="Kg">{language === 'mr' ? 'किलो (Kg)' : 'किलो'}</option>
                <option value="Packet (500ml)">{language === 'mr' ? '५००ml पिशवी' : '500ml थैली'}</option>
                <option value="Piece">{language === 'mr' ? 'नग / पीस' : 'पीस'}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'विक्री भाव (₹ Rate) *' : 'बिक्री भाव (₹ Rate) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="उदा. 70"
                value={quickSellPrice}
                onChange={(e) => setQuickSellPrice(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-xs font-black text-emerald-900 dark:text-emerald-400 focus:outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                {language === 'mr' ? 'जतन करा' : 'जोड़ें'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SEARCH & FAST CATEGORY FILTER PILLS */}
      <div className="bg-white dark:bg-[#131F1B] p-3 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-2.5 transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
          <input
            type="text"
            placeholder={language === 'mr' ? 'दूध, पनीर, दही, तूप शोधा (Search)...' : 'दूध, पनीर, दही, घी खोजें (Search)...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: ULTRA-SIMPLE LARGE TOUCH CARDS VIEW (DEFAULT) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock_quantity <= 0;
            const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
            const displayName = getProductDisplayName(prod);

            return (
              <div 
                key={prod.id}
                className={`bg-white dark:bg-[#131F1B] rounded-3xl p-5 border-2 transition-all duration-150 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isOutOfStock 
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-[#1A2A25]' 
                    : isLowStock 
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-[#1A2A25]' 
                    : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500 dark:hover:border-emerald-500/60'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] font-bold text-[11px] uppercase tracking-wide border border-slate-200/60 dark:border-[#24352F]">
                      {prod.category} &bull; {prod.unit}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                      isOutOfStock 
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60' 
                        : isLowStock 
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' 
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                    }`}>
                      {isOutOfStock ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>{language === 'mr' ? 'माल संपला' : 'खत्म'}</span>
                        </>
                      ) : isLowStock ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{language === 'mr' ? 'कमी साठा' : 'कम स्टॉक'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{language === 'mr' ? 'उपलब्ध आहे' : 'उपलब्ध'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-snug">
                    {displayName}
                  </h3>
                  {displayName !== prod.name && (
                    <p className="text-xs text-slate-400 dark:text-[#8FA69C] font-medium truncate mt-0.5">
                      {prod.name}
                    </p>
                  )}

                  {/* Big Number: Current Stock In Hand */}
                  <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-slate-100 dark:border-[#24352F] my-3 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                        {language === 'mr' ? 'सध्या दुकानात शिल्लक:' : 'दुकान में कितना बचा है:'}
                      </span>
                      <span className={`text-2xl font-black ${isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {prod.stock_quantity} <span className="text-sm font-bold text-slate-500 dark:text-[#8FA69C]">{prod.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                        {language === 'mr' ? 'विक्री भाव:' : 'बिक्री भाव:'}
                      </span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                        ₹{prod.selling_price}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SIMPLE 1-CLICK ACTION BUTTONS */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* BUTTON 1: माल आया (+ STOCK IN) */}
                    <button
                      onClick={() => {
                        setAdjustModalProduct(prod);
                        setAdjustType('in');
                        setAdjustAmount('10');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-emerald-200" />
                      <span>{language === 'mr' ? '+ माल आला' : '+ माल आया'}</span>
                    </button>

                    {/* BUTTON 2: माल गया (- STOCK OUT) */}
                    <button
                      onClick={() => {
                        setAdjustModalProduct(prod);
                        setAdjustType('out');
                        setAdjustAmount('5');
                      }}
                      disabled={prod.stock_quantity <= 0}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-800 dark:text-[#E7F0EC] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-[#24352F] font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all"
                    >
                      <ArrowDownCircle className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] hover:text-rose-600" />
                      <span>{language === 'mr' ? '- माल गेला' : '- माल गया'}</span>
                    </button>

                  </div>

                  {/* Edit / Delete footer */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400 dark:text-[#8FA69C]">
                    <span>
                      {language === 'mr' ? 'खरेदी दर:' : 'खरीद भाव:'} ₹{prod.purchase_price}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="text-slate-600 dark:text-[#8FA69C] hover:text-emerald-700 dark:hover:text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t('edit')}</span>
                      </button>
                      <span>&bull;</span>
                      <button
                        onClick={() => {
                          const confirmMsg = language === 'mr' 
                            ? `तुम्हाला "${displayName}" हटवायचे आहे का?` 
                            : `क्या आप "${displayName}" को हटाना चाहते हैं?`;
                          if (window.confirm(confirmMsg)) {
                            deleteProduct(prod.id);
                          }
                        }}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold hover:underline"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TRADITIONAL DETAILED TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3">{t('unitCol')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">{t('sellingPriceCol')}</th>
                  <th className="px-4 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'साठा बदल (+/-)' : 'स्टॉक बदलें (+/-)'}</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
                  const displayName = getProductDisplayName(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {displayName}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">{prod.category}</td>
                      <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">{prod.unit}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-[#8FA69C]">₹{prod.purchase_price}</td>
                      <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">₹{prod.selling_price}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          isOutOfStock ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' :
                          isLowStock ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300' :
                          'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {prod.stock_quantity} {prod.unit}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-[#1A2A25] p-1 rounded-lg border border-slate-200/60 dark:border-[#24352F]">
                          <button
                            onClick={() => adjustStock(prod.id, -1)}
                            disabled={prod.stock_quantity <= 0}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-[#283C35] rounded text-slate-600 dark:text-[#8FA69C] disabled:opacity-30"
                            title="-1"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] px-1">1</span>
                          <button
                            onClick={() => adjustStock(prod.id, 1)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-[#283C35] rounded text-emerald-700 dark:text-emerald-400"
                            title="+1"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => onEditProduct(prod)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-[#8FA69C] hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#1A2A25]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`हटाएं ${displayName}?`)) deleteProduct(prod.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK STOCK IN / OUT MODAL (TAP ANY CARD BUTTON) */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  adjustType === 'in' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                }`}>
                  {adjustType === 'in' 
                    ? (language === 'mr' ? '+ नवीन माल आला (Stock In)' : '+ नया माल आया (Stock In)')
                    : (language === 'mr' ? '- माल गेला / विक्री (Stock Out)' : '- माल गया / बिक्री (Stock Out)')}
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-base mt-1">
                  {getProductDisplayName(adjustModalProduct)}
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'सध्याचा साठा:' : 'वर्तमान स्टॉक:'} <b>{adjustModalProduct.stock_quantity} {adjustModalProduct.unit}</b>
                </p>
              </div>

              <button onClick={() => setAdjustModalProduct(null)} className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {adjustType === 'in'
                  ? (language === 'mr' ? `किती ${adjustModalProduct.unit} माल आला?` : `कितनी ${adjustModalProduct.unit} माल आया?`)
                  : (language === 'mr' ? `किती ${adjustModalProduct.unit} माल गेला?` : `कितना ${adjustModalProduct.unit} माल गया?`)}
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  autoFocus
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white font-black text-lg focus:outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-[#8FA69C] text-sm">
                  {adjustModalProduct.unit}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2 mt-2">
                {[5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAdjustAmount(num.toString())}
                    className="flex-1 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#283C35] text-xs font-bold text-slate-700 dark:text-[#E7F0EC] border border-slate-200/60 dark:border-[#24352F]"
                  >
                    +{num}
                  </button>
                ))}
              </div>

              {/* Preview resulting stock */}
              <div className="mt-3 p-3 bg-slate-50 dark:bg-[#1A2A25] rounded-xl border border-slate-200 dark:border-[#24352F] flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'नवीन शिल्लक साठा होईल:' : 'नया कुल स्टॉक बनेगा:'}
                </span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {Math.max(0, adjustType === 'in' 
                    ? adjustModalProduct.stock_quantity + (parseFloat(adjustAmount) || 0)
                    : adjustModalProduct.stock_quantity - (parseFloat(adjustAmount) || 0)
                  )} {adjustModalProduct.unit}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModalProduct(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#283C35] text-slate-700 dark:text-[#E7F0EC] border border-slate-200/60 dark:border-[#24352F] font-bold text-xs"
              >
                {t('cancel')}
              </button>

              <button
                type="button"
                onClick={handleConfirmAdjust}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20"
              >
                {language === 'mr' ? 'होय, साठा अपडेट करा' : 'हाँ, स्टॉक अपडेट करें'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  AlertTriangle, 
  Package
} from 'lucide-react';

interface ProductListProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  onOpenAddProduct, 
  onEditProduct 
}) => {
  const { products, deleteProduct, adjustStock, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.hindi_name && p.hindi_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.marathi_name && p.marathi_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0;
      } else if (stockFilter === 'out') {
        matchesStock = p.stock_quantity <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const totalStockValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_quantity * p.purchase_price), 0);
  }, [products]);

  const totalSellingValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stock_quantity * p.selling_price), 0);
  }, [products]);

  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  return (
    <div className="space-y-5">
      
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>
              {language === 'mr' ? 'दुकानातील माल आणि साठा यादी (Stock & Catalog)' : language === 'hi' ? 'दुकान का माल & इन्वेंट्री लिस्ट (Stock & Catalog)' : 'Shop Inventory & Stock Catalog'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {language === 'mr' ? 'सर्व डेअरी उत्पादने, खरेदी दर, विक्री दर, चालू साठा आणि अलर्ट' : 'All dairy products, purchase rate, sell price, live stock and alerts'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('reorder')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{language === 'mr' ? 'मालाची गरज' : 'माल की ज़रूरत'} ({lowStockCount + outOfStockCount})</span>
          </button>

          <button
            onClick={onOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addNewMaal')}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'mr' ? 'एकूण उत्पादने' : 'कुल उत्पाद प्रकार'}
          </span>
          <span className="text-xl font-black text-slate-900">{products.length} {language === 'mr' ? 'आयटम' : 'आइटम्स'}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'mr' ? 'साठा खरेदी मूल्य (Cost)' : 'इन्वेंटरी खरीद मूल्य (Cost)'}
          </span>
          <span className="text-xl font-black text-slate-900">₹{Math.round(totalStockValue).toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'mr' ? 'अंदाजे विक्री मूल्य' : 'अनुमानित बिक्री मूल्य'}
          </span>
          <span className="text-xl font-black text-emerald-700">₹{Math.round(totalSellingValue).toLocaleString('en-IN')}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {language === 'mr' ? 'कमी / संपलेला साठा' : 'कम / खत्म स्टॉक अलर्ट'}
          </span>
          <span className={`text-xl font-black ${lowStockCount + outOfStockCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {lowStockCount + outOfStockCount} {language === 'mr' ? 'आयटम' : 'आइटम्स'}
          </span>
        </div>
      </div>

      {/* Search, Category & Stock Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {language === 'mr' ? 'सर्व' : 'सभी'} ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                stockFilter === 'low' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-600'
              }`}
            >
              {language === 'mr' ? 'कमी साठा' : 'कम स्टॉक'} ({lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                stockFilter === 'out' ? 'bg-rose-100 text-rose-900 font-bold' : 'text-slate-600'
              }`}
            >
              {language === 'mr' ? 'संपलेला साठा' : 'खत्म स्टॉक'} ({outOfStockCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{t('productNameCol')}</th>
                <th className="px-3 py-3">{t('categoryCol')}</th>
                <th className="px-3 py-3">{t('unitCol')}</th>
                <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                <th className="px-3 py-3 text-right">{t('sellingPriceCol')}</th>
                <th className="px-3 py-3 text-right">{t('marginCol')}</th>
                <th className="px-4 py-3 text-center">{t('currentStockCol')}</th>
                <th className="px-3 py-3 text-center">{t('quickStockAdjust')}</th>
                <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const margin = prod.selling_price - prod.purchase_price;
                const marginPct = prod.purchase_price > 0 ? ((margin / prod.purchase_price) * 100).toFixed(0) : 0;
                const isOutOfStock = prod.stock_quantity <= 0;
                const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
                const displayName = getProductDisplayName(prod);

                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{displayName}</div>
                      {displayName !== prod.name && (
                        <div className="text-[11px] text-slate-500 font-medium">{prod.name}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {prod.category}
                      </span>
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-3 font-semibold text-slate-600">
                      {prod.unit}
                    </td>

                    {/* Purchase Price */}
                    <td className="px-3 py-3 text-right font-medium text-slate-600">
                      ₹{prod.purchase_price}
                    </td>

                    {/* Selling Price */}
                    <td className="px-3 py-3 text-right font-black text-slate-900">
                      ₹{prod.selling_price}
                    </td>

                    {/* Margin */}
                    <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                      +₹{margin.toFixed(1)} <span className="text-[10px] text-slate-400">({marginPct}%)</span>
                    </td>

                    {/* Stock status badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        isOutOfStock ? 'bg-rose-100 text-rose-700' :
                        isLowStock ? 'bg-amber-100 text-amber-900' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {prod.stock_quantity} {prod.unit}
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      </span>
                    </td>

                    {/* Quick Stock Adjustment buttons */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => adjustStock(prod.id, -1)}
                          disabled={prod.stock_quantity <= 0}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"
                          title="-1 Unit"
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-slate-700 px-1">1</span>
                        <button
                          onClick={() => adjustStock(prod.id, 1)}
                          className="p-1 hover:bg-slate-200 rounded text-emerald-700"
                          title="+1 Unit"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => onEditProduct(prod)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title={t('edit')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const confirmMsg = language === 'mr' 
                            ? `तुम्हाला "${displayName}" हटवायचे आहे का?` 
                            : `क्या आप "${displayName}" को हटाना चाहते हैं?`;
                          if (window.confirm(confirmMsg)) {
                            deleteProduct(prod.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={t('delete')}
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

    </div>
  );
};

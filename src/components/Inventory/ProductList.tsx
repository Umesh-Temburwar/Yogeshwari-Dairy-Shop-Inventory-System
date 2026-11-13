import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit, ExpiryStatus } from '../../types';
import { BatchExpiryAlertBanner } from './BatchExpiryAlertBanner';
import { ProductBatchesModal } from './ProductBatchesModal';
import { StockInwardModal } from './StockInwardModal';
import { 
  getShelfLifeDays, 
  getSuggestedExpiryDate, 
  generateBatchNumber, 
  computeExpiryStatus, 
  getShelfLifeNote 
} from '../../lib/shelfLifeUtils';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  Package, 
  LayoutGrid, 
  List, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  X,
  Layers,
  Clock,
  Barcode, 
  Printer, 
  Download, 
  Eye
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { Button, Input, SearchInput, Card, StatusBadge, Modal, DataTable, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui';

interface ProductListProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  onOpenAddProduct, 
  onEditProduct 
}) => {
  const { products, batches, deleteProduct, adjustStock, addProduct, setActiveView } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<ExpiryStatus | 'ALL'>('ALL');
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [selectedProductForStockIn, setSelectedProductForStockIn] = useState<Product | null>(null);

  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('10');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustBatchNo, setAdjustBatchNo] = useState<string>('');
  const [adjustMfgDate, setAdjustMfgDate] = useState<string>('');
  const [adjustExpiryDate, setAdjustExpiryDate] = useState<string>('');

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Milk');
  const [quickUnit, setQuickUnit] = useState<ProductUnit>('Litre');
  const [quickBuyPrice, setQuickBuyPrice] = useState('');
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickStock, setQuickStock] = useState('20');

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व माल' : 'All Products' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.hindi_name && p.hindi_name.toLowerCase().includes(q)) ||
        (p.marathi_name && p.marathi_name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      if (!matchesSearch || !matchesCategory) return false;

      if (selectedExpiryFilter !== 'ALL') {
        const prodBatches = batches.filter(b => b.product_id === p.id && b.qty_remaining > 0);
        const matchesStatus = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === selectedExpiryFilter);
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedExpiryFilter, batches]);

  const totalStockCostValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);
  }, [products]);

  const totalStockRetailValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * p.selling_price), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => p.stock_quantity <= 0).length;
  }, [products]);

  const getStockReportPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दुकान शिल्लक माल व साठा मूल्यांकन अहवाल' : 'Dairy Inventory Stock Valuation Report',
      subtitle: `${t('shopName')} ERP`,
      periodText: 'Current Stock Valuation',
      language,
      kpis: [
        { label: isMr ? 'एकूण उत्पादने' : 'Total SKUs', value: `${products.length}`, color: 'emerald' },
        { label: isMr ? 'खरेदीनुसार साठा मूल्य' : 'Cost Valuation', value: `₹${totalStockCostValuation.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'विक्रीनुकसार साठा मूल्य' : 'Retail Valuation', value: `₹${totalStockRetailValuation.toLocaleString('en-IN')}`, color: 'purple' },
        { label: isMr ? 'कमी साठा उत्पादने' : 'Low Stock Items', value: `${lowStockCount + outOfStockCount}`, color: 'rose' }
      ],
      table: {
        headers: isMr 
          ? ['उत्पादनाचे नाव', 'प्रवर्ग', 'शिल्लक साठा', 'खरेदी दर (₹)', 'विक्री दर (₹)', 'किमान मर्यादा', 'साठा मूल्य (₹)']
          : ['Product Name', 'Category', 'Current Stock', 'Purchase Rate (₹)', 'Selling Rate (₹)', 'Min Alert', 'Valuation (₹)'],
        alignments: ['left', 'center', 'right', 'right', 'right', 'center', 'right'] as ('left' | 'center' | 'right' | 'right' | 'right' | 'center' | 'right')[],
        rows: filteredProducts.map(p => {
          const val = p.stock_quantity * p.purchase_price;
          return [
            getProductDisplayName(p),
            p.category,
            `${p.stock_quantity} ${p.unit}`,
            `₹${p.purchase_price}`,
            `₹${p.selling_price}`,
            `${p.min_stock_alert} ${p.unit}`,
            `₹${val.toLocaleString('en-IN')}`
          ];
        }),
        summaryRow: [
          isMr ? 'एकूण' : 'Total',
          `${filteredProducts.length} ${isMr ? 'उत्पादने' : 'Products'}`,
          '',
          '',
          '',
          '',
          `₹${filteredProducts.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0).toLocaleString('en-IN')}`
        ]
      },
      notes: 'Dairy inventory valuation statement.'
    };
  };

  const handleOpenAdjustModal = (prod: Product, type: 'in' | 'out') => {
    setAdjustModalProduct(prod);
    setAdjustType(type);
    setAdjustAmount(type === 'in' ? '10' : '5');
    if (type === 'in') {
      const todayStr = new Date().toISOString().split('T')[0];
      const generatedBatch = generateBatchNumber(prod.name, todayStr);
      const shelfDays = getShelfLifeDays(prod.category, prod.name);
      const autoExpiry = getSuggestedExpiryDate(todayStr, shelfDays);
      setAdjustBatchNo(generatedBatch);
      setAdjustMfgDate(todayStr);
      setAdjustExpiryDate(autoExpiry);
    } else {
      setAdjustBatchNo('');
      setAdjustMfgDate('');
      setAdjustExpiryDate('');
    }
  };

  const handleConfirmAdjust = () => {
    if (!adjustModalProduct) return;
    const qty = parseFloat(adjustAmount);
    if (isNaN(qty) || qty <= 0) return;

    const delta = adjustType === 'in' ? qty : -qty;
    adjustStock(
      adjustModalProduct.id, 
      delta,
      adjustType === 'in' ? {
        batch_no: adjustBatchNo,
        mfg_date: adjustMfgDate,
        expiry_date: adjustExpiryDate,
        qty_purchased: qty,
        purchase_rate: adjustModalProduct.purchase_price
      } : undefined
    );

    setAdjustModalProduct(null);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickSellPrice) return;

    const sell = parseFloat(quickSellPrice) || 0;
    const buy = parseFloat(quickBuyPrice) || Number((sell * 0.8).toFixed(2));
    const stock = parseFloat(quickStock) || 0;

    await addProduct({
      name: quickName.trim(),
      category: quickCategory,
      unit: quickUnit,
      purchase_price: buy,
      selling_price: sell,
      stock_quantity: stock,
      min_stock_alert: 5
    });

    setQuickName('');
    setQuickBuyPrice('');
    setQuickSellPrice('');
    setQuickStock('20');
    setShowQuickAdd(false);
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-2xl border border-line shadow-card">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-ink tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-ink-2" />
            <span>{t('inventoryTitle')}</span>
          </h2>
          <p className="text-xs text-ink-3 mt-0.5">
            {products.length} {language === 'mr' ? 'उत्पादने' : 'products'} &bull; {language === 'mr' ? 'मूल्यांकन' : 'Valuation'}: ₹{totalStockRetailValuation.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-surface-2 border border-line/40">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'cards' ? 'bg-surface shadow-card text-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'table' ? 'bg-surface shadow-card text-ink' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => viewReportPDF(getStockReportPayload())}
          >
            <Eye className="w-3.5 h-3.5 text-ink-2" />
            <span>{language === 'mr' ? 'पहा' : 'View'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => printReport(getStockReportPayload())}
          >
            <Printer className="w-3.5 h-3.5 text-ink-2" />
            <span>{language === 'mr' ? 'प्रिंट' : 'Print'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => downloadReportPDF(getStockReportPayload())}
          >
            <Download className="w-3.5 h-3.5 text-ink-2" />
            <span>PDF</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowQuickAdd(p => !p)}
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'mr' ? '+ माल जोडा' : '+ Add Product'}</span>
          </Button>
        </div>
      </div>

      {/* Quick Add Product Collapsible Panel */}
      {showQuickAdd && (
        <Card className="p-4 border-line animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-line/40 pb-2">
            <h3 className="font-semibold text-sm text-ink">
              {language === 'mr' ? 'नवीन उत्पादन जोडा' : 'Add New Product'}
            </h3>
            <button type="button" onClick={() => setShowQuickAdd(false)} className="text-ink-3 hover:text-ink">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
            <div className="col-span-2">
              <label className="text-[11px] font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'मालाचे नाव *' : 'Product Name *'}
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Malai Paneer"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'प्रवर्ग' : 'Category'}
              </label>
              <select
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value as ProductCategory)}
                className="w-full h-10 px-2.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink focus:outline-none"
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
              <label className="text-[11px] font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'एकक' : 'Unit'}
              </label>
              <select
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value as ProductUnit)}
                className="w-full h-10 px-2.5 rounded-xl bg-surface border border-line text-xs font-medium text-ink focus:outline-none"
              >
                <option value="Litre">Litre</option>
                <option value="Kg">Kg</option>
                <option value="Packet (500ml)">500ml Pouch</option>
                <option value="Piece">Piece</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-ink-2 block mb-1">
                {language === 'mr' ? 'विक्री भाव (₹) *' : 'Selling Price (₹) *'}
              </label>
              <Input
                type="number"
                step="0.01"
                required
                placeholder="70"
                value={quickSellPrice}
                onChange={(e) => setQuickSellPrice(e.target.value)}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <Button type="submit" variant="primary" className="w-full h-10">
                {language === 'mr' ? 'जतन करा' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Category Filter Pills */}
      <Card className="p-3 space-y-2.5">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              placeholder={language === 'mr' ? 'दूध, पनीर, दही, तूप शोधा...' : 'Search milk, paneer, curd, ghee...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowBarcodeScanner(true)}
            className="shrink-0"
          >
            <Barcode className="w-4 h-4 text-ink-2" />
            <span className="hidden sm:inline text-xs">{language === 'mr' ? 'बारकोड' : 'Barcode'}</span>
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all select-none shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-accent text-accent-fg font-semibold shadow-card'
                  : 'bg-surface shadow-card text-ink-2 hover:bg-surface-2 border border-line/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Expiry Alerts Banner */}
      <BatchExpiryAlertBanner 
        selectedStatusFilter={selectedExpiryFilter} 
        onSelectStatusFilter={setSelectedExpiryFilter} 
      />

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock_quantity <= 0;
            const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
            const displayName = getProductDisplayName(prod);
            const prodBatches = batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0);

            return (
              <Card
                key={prod.id}
                className="p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-ink-3 uppercase">
                      {prod.category} &bull; {prod.unit}
                    </span>

                    <StatusBadge
                      status={isOutOfStock ? 'danger' : isLowStock ? 'warn' : 'ok'}
                      label={isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                    />
                  </div>

                  <h3 className="text-base font-semibold text-ink leading-snug">
                    {displayName}
                  </h3>
                  {displayName !== prod.name && (
                    <p className="text-xs text-ink-3 font-normal truncate mt-0.5">
                      {prod.name}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProductForBatches(prod)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 text-ink-2 hover:text-ink text-xs font-medium transition border border-line/30"
                    >
                      <Layers className="w-3.5 h-3.5 text-ink-3" />
                      <span>{prodBatches.length} {t('batches')}</span>
                    </button>
                  </div>

                  <div className="bg-surface-2 p-2.5 rounded-xl border border-line/30 my-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-ink-3 block">
                        {language === 'mr' ? 'शिल्लक साठा:' : 'Current Stock:'}
                      </span>
                      <span className="text-xl font-semibold text-ink tabular-nums">
                        {prod.stock_quantity} <span className="text-xs font-normal text-ink-3">{prod.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-ink-3 block">
                        {language === 'mr' ? 'विक्री भाव:' : 'Selling Rate:'}
                      </span>
                      <span className="text-base font-semibold text-ink tabular-nums">
                        ₹{prod.selling_price}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-line/40">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedProductForStockIn(prod)}
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? '+ माल आला' : '+ Stock In'}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={prod.stock_quantity <= 0}
                      onClick={() => handleOpenAdjustModal(prod, 'out')}
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5 text-ink-3" />
                      <span>{language === 'mr' ? '- माल गेला' : '- Stock Out'}</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 px-1 text-ink-3">
                    <span>Rate: ₹{prod.purchase_price}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditProduct(prod)}
                        className="text-ink-2 hover:text-ink font-medium"
                      >
                        {t('edit')}
                      </button>
                      <span>&bull;</span>
                      <button
                        type="button"
                        onClick={() => {
                          const confirmDel = language === 'mr' ? `"${displayName}" हटवायचे?` : `Delete "${displayName}"?`;
                          if (window.confirm(confirmDel)) deleteProduct(prod.id);
                        }}
                        className="text-danger hover:underline font-medium"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <DataTable>
          <TableHeader>
            <tr>
              <TableHead>{t('productNameCol')}</TableHead>
              <TableHead>{t('categoryCol')}</TableHead>
              <TableHead>{t('unitCol')}</TableHead>
              <TableHead className="text-right">{t('costPriceCol')}</TableHead>
              <TableHead className="text-right">{t('sellingPriceCol')}</TableHead>
              <TableHead className="text-center">{t('currentStockCol')}</TableHead>
              <TableHead className="text-right">{t('actionsCol')}</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((prod) => {
              const displayName = getProductDisplayName(prod);
              return (
                <TableRow key={prod.id}>
                  <TableCell className="font-medium">{displayName}</TableCell>
                  <TableCell className="text-ink-2">{prod.category}</TableCell>
                  <TableCell className="text-ink-2">{prod.unit}</TableCell>
                  <TableCell className="text-right">₹{prod.purchase_price}</TableCell>
                  <TableCell className="text-right font-semibold">₹{prod.selling_price}</TableCell>
                  <TableCell className="text-center font-semibold">{prod.stock_quantity} {prod.unit}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditProduct(prod)}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-ink-2" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteProduct(prod.id)}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      {/* Adjust Modal */}
      {adjustModalProduct && (
        <Modal
          isOpen={!!adjustModalProduct}
          onClose={() => setAdjustModalProduct(null)}
          title={adjustType === 'in' ? '+ Stock In' : '- Stock Out'}
          subtitle={`${getProductDisplayName(adjustModalProduct)} (Current: ${adjustModalProduct.stock_quantity} ${adjustModalProduct.unit})`}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {language === 'mr' ? `प्रमाण (${adjustModalProduct.unit})` : `Quantity (${adjustModalProduct.unit})`}
              </label>
              <Input
                type="number"
                step="0.5"
                autoFocus
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-line/40">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdjustModalProduct(null)}
                className="w-1/2"
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmAdjust}
                className="w-1/2"
              >
                {language === 'mr' ? 'अपडेट करा' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedProductForStockIn && (
        <StockInwardModal 
          product={selectedProductForStockIn} 
          onClose={() => setSelectedProductForStockIn(null)} 
        />
      )}

      {selectedProductForBatches && (
        <ProductBatchesModal 
          product={selectedProductForBatches} 
          onClose={() => setSelectedProductForBatches(null)} 
        />
      )}

      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        mode="lookup"
        onProductSelected={(prod) => setSelectedProductForStockIn(prod)}
        onBarcodeScanned={(code) => setSearchQuery(code)}
      />

    </div>
  );
};

export default ProductList;

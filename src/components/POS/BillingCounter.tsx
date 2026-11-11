import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, PaymentMode, SaleItem, CustomerGender, CustomerAgeGroup } from '../../types';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Banknote, 
  Smartphone, 
  BookOpen, 
  Printer, 
  CheckCircle2, 
  X,
  CreditCard,
  Calculator,
  Clock,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const BillingCounter: React.FC = () => {
  const { products, batches, createSale } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('Counter Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGender, setCustomerGender] = useState<CustomerGender>('Male');
  const [customerAgeGroup, setCustomerAgeGroup] = useState<CustomerAgeGroup>('Adults (26-45)');
  const [customerAge, setCustomerAge] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [tenderedCash, setTenderedCash] = useState<number>(0);
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitOnlineAmount, setSplitOnlineAmount] = useState<number>(0);

  // Modals & Confirmation
  const [showQrModal, setShowQrModal] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);

  // Quick Amount to Quantity converter state
  const [quickCalcProduct, setQuickCalcProduct] = useState<Product | null>(null);
  const [calcRupees, setCalcRupees] = useState<string>('');

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.hindi_name && p.hindi_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.marathi_name && p.marathi_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory && p.is_active;
    });
  }, [products, searchQuery, selectedCategory]);

  // Helper display name
  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  // Add item to cart (with FEFO non-expired safety check)
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    const prodBatches = batches.filter(b => b.product_id === product.id && b.qty_remaining > 0);
    const validBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status !== 'EXPIRED');
    const availableNonExpiredStock = prodBatches.length > 0 
      ? validBatches.reduce((sum, b) => sum + b.qty_remaining, 0)
      : product.stock_quantity;

    if (availableNonExpiredStock <= 0) {
      alert(language === 'mr' 
        ? 'हा माल संपला आहे किंवा मुदत संपली (Expired) आहे. बिलात जोडता येणार नाही!' 
        : language === 'hi' 
        ? 'यह माल खत्म या एक्सपायर हो चुका है, बिल में नहीं जोड़ा जा सकता!' 
        : 'This item is out of stock or expired and cannot be billed!');
      return;
    }

    const displayName = getProductDisplayName(product);
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        const newQty = Number((existing.quantity + quantityToAdd).toFixed(2));
        return prev.map(item => item.product_id === product.id 
          ? { ...item, quantity: newQty, total_price: Number((newQty * item.unit_price).toFixed(2)) }
          : item
        );
      } else {
        return [...prev, {
          id: 'item-' + Date.now(),
          product_id: product.id,
          product_name: displayName,
          quantity: quantityToAdd,
          unit: product.unit,
          unit_price: product.selling_price,
          purchase_cost: product.purchase_price,
          total_price: Number((quantityToAdd * product.selling_price).toFixed(2))
        }];
      }
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: Number(newQty.toFixed(2)),
          total_price: Number((newQty * item.unit_price).toFixed(2))
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setTenderedCash(0);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total_price, 0);
  }, [cart]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - discount);
  }, [subtotal, discount]);

  const cashChange = Math.max(0, (tenderedCash || 0) - netTotal);

  // Quick Amount to Qty calculator handler
  const handleRupeeCalcApply = () => {
    if (!quickCalcProduct || !calcRupees) return;
    const rupees = parseFloat(calcRupees);
    if (isNaN(rupees) || rupees <= 0) return;

    const calculatedQty = Number((rupees / quickCalcProduct.selling_price).toFixed(3));
    addToCart(quickCalcProduct, calculatedQty);
    setQuickCalcProduct(null);
    setCalcRupees('');
  };

  // Process checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    let cashAmount = 0;
    let onlineAmount = 0;
    let udharAmount = 0;

    if (paymentMode === 'Cash') {
      cashAmount = netTotal;
    } else if (paymentMode === 'Online_UPI') {
      onlineAmount = netTotal;
    } else if (paymentMode === 'Udhar') {
      udharAmount = netTotal;
    } else if (paymentMode === 'Split') {
      cashAmount = splitCashAmount;
      onlineAmount = splitOnlineAmount || (netTotal - splitCashAmount);
    }

    const sale = await createSale({
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_gender: customerGender,
      customer_age_group: customerAgeGroup,
      customer_age: customerAge ? parseInt(customerAge) : undefined,
      total_amount: subtotal,
      discount,
      net_amount: netTotal,
      payment_mode: paymentMode,
      cash_amount: cashAmount,
      online_amount: onlineAmount,
      udhar_amount: udharAmount,
      items: cart
    });

    setLastCompletedSale(sale);
    setIsSuccessModalOpen(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });

    // Reset Form
    clearCart();
    setCustomerName('Counter Customer');
    setCustomerPhone('');
    setCustomerGender('Male');
    setCustomerAgeGroup('Adults (26-45)');
    setCustomerAge('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
      
      {/* LEFT COLUMN: Product Catalog & Fast Selection */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Search & Category Filter Pills */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-3 transition-colors">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#223630]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[600px] pr-1">
          {filteredProducts.map((prod) => {
            const prodBatches = batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0);
            const validBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status !== 'EXPIRED');
            const availableStock = prodBatches.length > 0 
              ? validBatches.reduce((sum, b) => sum + b.qty_remaining, 0)
              : prod.stock_quantity;

            const isOutOfStock = availableStock <= 0;
            const isLowStock = availableStock <= prod.min_stock_alert && !isOutOfStock;
            const hasExpiredOnly = prodBatches.length > 0 && validBatches.length === 0;
            const hasExpiringToday = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TODAY');
            const hasExpiringTomorrow = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TOMORROW');
            const displayName = getProductDisplayName(prod);

            return (
              <div
                key={prod.id}
                className={`relative bg-white dark:bg-[#131F1B] rounded-xl p-3.5 border transition-all duration-150 flex flex-col justify-between group ${
                  isOutOfStock || hasExpiredOnly
                    ? 'border-slate-200 dark:border-[#24352F] opacity-60 bg-slate-50/50 dark:bg-[#16221E]' 
                    : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:shadow-md cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] uppercase">
                      {prod.unit}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      hasExpiredOnly 
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' :
                      isOutOfStock ? 'bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-400' :
                      isLowStock ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {hasExpiredOnly 
                        ? (language === 'mr' ? 'मुदत संपली' : language === 'hi' ? 'एक्सपायर्ड' : 'Expired')
                        : `${availableStock} ${language === 'mr' ? 'शिल्लक' : language === 'hi' ? 'बचे' : 'left'}`}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-[#E7F0EC] text-sm leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {displayName}
                  </h4>
                  {prod.name !== displayName && (
                    <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium truncate mt-0.5">
                      {prod.name}
                    </p>
                  )}

                  {/* Near Expiry Warning Pill for Cashier */}
                  {hasExpiringToday && !hasExpiredOnly && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-extrabold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/50">
                      <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                      <span>{language === 'mr' ? 'आज संपत आहे (आधी विका)' : language === 'hi' ? 'आज एक्सपायर (पहले बेचें)' : 'Expiring Today (Sell first)'}</span>
                    </div>
                  )}
                  {hasExpiringTomorrow && !hasExpiringToday && !hasExpiredOnly && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{language === 'mr' ? 'उद्या एक्सपायर' : language === 'hi' ? 'कल एक्सपायर' : 'Exp. Tomorrow'}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-[#8FA69C]">{language === 'mr' ? 'दर:' : language === 'hi' ? 'भाव:' : 'Rate:'}</span>{' '}
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      ₹{prod.selling_price}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick ₹ Calculator button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickCalcProduct(prod);
                        setCalcRupees('');
                      }}
                      title={t('measureInRupees')}
                      className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-xs"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                    </button>

                    {/* Add to Cart button */}
                    <button
                      disabled={isOutOfStock || hasExpiredOnly}
                      onClick={() => addToCart(prod, 1)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-800 transition-colors"
                      title={hasExpiredOnly ? 'Expired Batch Blocked' : 'Add 1 Unit'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Info & Payment Checkout */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-sm p-5 justify-between transition-colors">
        <div className="space-y-4">
          
          {/* Header & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {t('currentBill')}
                </h3>
                <span className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {cart.length} {language === 'mr' ? 'वस्तू जोडल्या आहेत' : language === 'hi' ? 'प्रकार के सामान जुड़े हैं' : 'items added'}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('emptyCart')}</span>
              </button>
            )}
          </div>

          {/* Customer Selection & Demographic Tracking */}
          <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-xl border border-slate-200/80 dark:border-[#24352F] space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                  {t('customerName')}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Counter Customer"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C] block mb-1">
                  {t('customerPhone')}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="98XXXXXXXX"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Demographics 1-Tap Selectors: Gender & Age */}
            <div className="pt-2 border-t border-slate-200/70 dark:border-[#24352F] space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C]">
                  {t('customerGender')}
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'Male', label: language === 'mr' ? '👨 पुरुष' : language === 'hi' ? '👨 पुरुष' : '👨 Male' },
                    { id: 'Female', label: language === 'mr' ? '👩 महिला' : language === 'hi' ? '👩 महिला' : '👩 Female' },
                    { id: 'Other', label: language === 'mr' ? '🧑 इतर' : language === 'hi' ? '🧑 अन्य' : '🧑 Other' }
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCustomerGender(g.id as CustomerGender)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                        customerGender === g.id
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-[#8FA69C]">
                  {t('customerAgeGroup')}
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'Kids/Teens (<18)', label: '<18' },
                    { id: 'Youth (18-25)', label: '18-25' },
                    { id: 'Adults (26-45)', label: '26-45' },
                    { id: 'Seniors (45+)', label: '45+' }
                  ].map((ag) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setCustomerAgeGroup(ag.id as CustomerAgeGroup)}
                      className={`px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                        customerAgeGroup === ag.id
                          ? 'bg-teal-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630]'
                      }`}
                    >
                      {ag.label}
                    </button>
                  ))}
                  <input
                    type="number"
                    placeholder={language === 'mr' ? 'वय' : language === 'hi' ? 'उम्र' : 'Age'}
                    value={customerAge}
                    onChange={(e) => setCustomerAge(e.target.value)}
                    className="w-11 px-1 py-0.5 rounded border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-[10px] text-center font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div 
                  key={item.product_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-[#1A2A25] border border-slate-200/60 dark:border-[#24352F]"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
                      {item.product_name}
                    </h5>
                    <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium">
                      ₹{item.unit_price} &times; {item.quantity} {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Qty +/- Controls */}
                    <div className="flex items-center gap-1 bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 0.5)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-[#1A2A25] rounded text-slate-600 dark:text-[#8FA69C]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                        className="w-12 text-center text-xs font-bold text-slate-900 dark:text-white bg-transparent focus:outline-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 0.5)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-[#1A2A25] rounded text-slate-600 dark:text-[#8FA69C]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-black text-slate-900 dark:text-white w-14 text-right">
                      ₹{item.total_price}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-400 hover:text-rose-600 dark:text-[#8FA69C] dark:hover:text-rose-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 dark:text-[#8FA69C] text-xs">
                {t('cartEmptyMsg')}
              </div>
            )}
          </div>

          {/* Pricing Totals & Discount */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#24352F] space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-[#8FA69C]">
              <span>{t('subtotal')}</span>
              <span className="font-semibold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-[#8FA69C]">
              <span className="flex items-center gap-1">
                <span>{t('discount')}</span>
              </span>
              <div className="flex items-center gap-1">
                <span>₹</span>
                <input
                  type="number"
                  value={discount || ''}
                  placeholder="0"
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-16 px-1.5 py-0.5 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] rounded text-right font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200 dark:border-[#24352F] text-slate-900 dark:text-white">
              <span className="font-bold text-sm">{t('netAmount')}</span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">₹{netTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block mb-2">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'Cash', label: t('cash'), icon: Banknote, color: 'text-blue-600 dark:text-blue-400' },
                { id: 'Online_UPI', label: t('onlineUpi'), icon: Smartphone, color: 'text-purple-600 dark:text-purple-400' },
                { id: 'Split', label: t('splitPay'), icon: CreditCard, color: 'text-teal-600 dark:text-teal-400' },
                { id: 'Udhar', label: t('udharPay'), icon: BookOpen, color: 'text-amber-600 dark:text-amber-400' },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setPaymentMode(m.id as PaymentMode);
                      if (m.id === 'Online_UPI') setShowQrModal(true);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-50 dark:hover:bg-[#223630]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                    <span className="text-[11px] block leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Tender & Change Calculator */}
          {paymentMode === 'Cash' && (
            <div className="bg-blue-50/70 dark:bg-[#1A2A25] p-3 rounded-xl border border-blue-200/80 dark:border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                <span>{t('cashReceived')}</span>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input
                    type="number"
                    value={tenderedCash || ''}
                    placeholder={netTotal.toString()}
                    onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded bg-white dark:bg-[#131F1B] border border-blue-300 dark:border-blue-500/40 font-bold text-blue-950 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1.5">
                {[50, 100, 200, 500].map(val => (
                  <button
                    key={val}
                    onClick={() => setTenderedCash(val)}
                    className="px-2 py-0.5 bg-white dark:bg-[#131F1B] border border-blue-200 dark:border-blue-500/30 rounded text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-[#223630]"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {tenderedCash > netTotal && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-1 border-t border-blue-200 dark:border-blue-500/30">
                  <span>{t('changeToReturn')}</span>
                  <span className="text-sm">₹{cashChange.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment inputs */}
          {paymentMode === 'Split' && (
            <div className="grid grid-cols-2 gap-2 bg-teal-50/70 dark:bg-[#1A2A25] p-3 rounded-xl border border-teal-200/80 dark:border-teal-500/30">
              <div>
                <label className="text-[11px] font-bold text-teal-900 dark:text-teal-300 block mb-1">
                  {language === 'mr' ? 'रोख रक्कम (Cash):' : language === 'hi' ? 'कैश में कितना (Cash):' : 'Cash Amount:'}
                </label>
                <input
                  type="number"
                  value={splitCashAmount || ''}
                  onChange={(e) => {
                    const cashVal = parseFloat(e.target.value) || 0;
                    setSplitCashAmount(cashVal);
                    setSplitOnlineAmount(Math.max(0, netTotal - cashVal));
                  }}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-[#131F1B] border border-teal-300 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-teal-900 dark:text-teal-300 block mb-1">
                  {language === 'mr' ? 'ऑनलाईन रक्कम (UPI):' : language === 'hi' ? 'UPI में कितना (Online):' : 'UPI Online Amount:'}
                </label>
                <input
                  type="number"
                  value={splitOnlineAmount || ''}
                  onChange={(e) => setSplitOnlineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-[#131F1B] border border-teal-300 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

        </div>

        {/* Big Complete Sale / Checkout Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#24352F]">
          <button
            disabled={cart.length === 0}
            onClick={handleCheckout}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 text-white font-black text-base shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            <span>{t('completeAndPrint')} (Pay ₹{netTotal.toFixed(2)})</span>
          </button>
        </div>

      </div>

      {/* QUICK RUPEE TO QTY CALCULATOR MODAL */}
      {quickCalcProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-2">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  {t('measureInRupees')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {getProductDisplayName(quickCalcProduct)} (₹{quickCalcProduct.selling_price}/{quickCalcProduct.unit})
                </p>
              </div>
              <button 
                onClick={() => setQuickCalcProduct(null)}
                className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {t('enterRupees')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 dark:text-[#8FA69C]">₹</span>
                <input
                  type="number"
                  autoFocus
                  value={calcRupees}
                  placeholder="20, 50, 100"
                  onChange={(e) => setCalcRupees(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick shortcut chips */}
              <div className="flex gap-2 mt-2">
                {[20, 30, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setCalcRupees(amt.toString())}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] rounded-lg text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {calcRupees && parseFloat(calcRupees) > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-300">
                  <span>{t('calculatedQuantityIs')} </span>
                  <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                    {(parseFloat(calcRupees) / quickCalcProduct.selling_price).toFixed(3)} {quickCalcProduct.unit}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setQuickCalcProduct(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#E7F0EC]"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRupeeCalcApply}
                disabled={!calcRupees || parseFloat(calcRupees) <= 0}
                className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:bg-slate-300 dark:disabled:bg-slate-800"
              >
                {t('addToBasket')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR CODE POPUP MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 px-2 py-0.5 rounded-full">
                PhonePe / GooglePay / Paytm QR
              </span>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                ₹{netTotal.toFixed(2)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] font-medium">
                {t('shopName')} Merchant QR Code
              </p>
            </div>

            {/* Generated QR Code Graphic */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 dark:border-[#24352F] inline-block shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=yogeshwaridairy@okaxis%26pn=Yogeshwari%20Dairy%26am=${netTotal}%26cu=INR`}
                alt="UPI Payment QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
              {language === 'mr' ? 'ग्राहक कोणत्याही UPI ॲपवरून स्कॅन करून पैसे देऊ शकतात.' : language === 'hi' ? 'ग्राहक अपने किसी भी UPI ऐप से स्कैन करके भुगतान कर सकता है।' : 'Customer can scan using any UPI App to pay.'}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md"
            >
              {language === 'mr' ? 'पैसे मिळाले (Payment Done)' : language === 'hi' ? 'भुगतान प्राप्त हुआ (Payment Done)' : 'Payment Received'}
            </button>
          </div>
        </div>
      )}

      {/* SALE SUCCESS & PRINT RECEIPT MODAL */}
      {isSuccessModalOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {language === 'mr' ? 'विक्री यशस्वीपणे नोंदवली गेली!' : language === 'hi' ? 'बिक्री सफलतापूर्वक दर्ज हुई!' : 'Sale Recorded Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'बिल क्रमांक:' : language === 'hi' ? 'बिल क्रमांक:' : 'Invoice:'} <b className="text-slate-800 dark:text-white">{lastCompletedSale.invoice_no}</b>
              </p>
            </div>

            {/* Printable Thermal Receipt Container */}
            <div id="printable-receipt" className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#24352F] font-mono text-xs space-y-2">
              <div className="text-center border-b border-slate-200 dark:border-[#24352F] pb-2">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{t('shopName')}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : language === 'hi' ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Paneer, Curd, Pure Ghee'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-[#8FA69C]">FSSAI Lic: 21524012000341 &bull; Mo: 9823XXXXXX</div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC] pt-1">
                <span>{language === 'mr' ? 'बिल:' : language === 'hi' ? 'बिल:' : 'Bill:'} {lastCompletedSale.invoice_no}</span>
                <span>{lastCompletedSale.sale_date}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC]">
                <span>{t('customerName')}: {lastCompletedSale.customer_name}</span>
                {lastCompletedSale.customer_gender && (
                  <span className="text-[10px] text-slate-500">
                    {lastCompletedSale.customer_gender === 'Male' ? '👨 ' : lastCompletedSale.customer_gender === 'Female' ? '👩 ' : '🧑 '}
                    {lastCompletedSale.customer_gender} ({lastCompletedSale.customer_age_group || (lastCompletedSale.customer_age ? `${lastCompletedSale.customer_age}y` : '')})
                  </span>
                )}
              </div>

              <div className="border-t border-b border-slate-200 dark:border-[#24352F] py-1.5 space-y-1">
                {lastCompletedSale.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] text-slate-800 dark:text-[#E7F0EC]">
                    <span className="truncate max-w-[170px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs pt-1 text-slate-900 dark:text-white">
                {lastCompletedSale.discount > 0 && (
                  <div className="text-slate-500 dark:text-[#8FA69C]">{t('discount')} -₹{lastCompletedSale.discount}</div>
                )}
                <div className="text-sm text-emerald-700 dark:text-emerald-400">{t('netAmount')} ₹{lastCompletedSale.net_amount}</div>
                <div className="text-[10px] font-normal text-slate-500 dark:text-[#8FA69C]">
                  {t('paymentMethod')}: {lastCompletedSale.payment_mode}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 dark:text-[#8FA69C] pt-2 border-t border-slate-200 dark:border-[#24352F]">
                {language === 'mr' ? 'धन्यवाद! पुन्हा भेट द्या &bull; शुद्धता हीच आमची ओळख' : language === 'hi' ? 'धन्यवाद! फिर पधारें &bull; शुद्धता ही हमारी पहचान है' : 'Thank you! Visit again &bull; Purity is our identity'}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{t('print')}</span>
              </button>
              <button
                onClick={() => setIsSuccessModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {t('nextBill')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

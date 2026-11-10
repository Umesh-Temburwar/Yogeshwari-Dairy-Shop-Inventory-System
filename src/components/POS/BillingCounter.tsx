import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, PaymentMode, SaleItem } from '../../types';
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
  Calculator
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const BillingCounter: React.FC = () => {
  const { products, createSale } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('Counter Customer');
  const [customerPhone, setCustomerPhone] = useState('');
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

  // Add item to cart
  const addToCart = (product: Product, quantityToAdd: number = 1) => {
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
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
      
      {/* LEFT COLUMN: Product Catalog & Fast Selection */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Search & Category Filter Pills */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            const isOutOfStock = prod.stock_quantity <= 0;
            const isLowStock = prod.stock_quantity <= prod.min_stock_alert;
            const displayName = getProductDisplayName(prod);

            return (
              <div
                key={prod.id}
                className={`relative bg-white rounded-xl p-3.5 border transition-all duration-150 flex flex-col justify-between group ${
                  isOutOfStock 
                    ? 'border-slate-200 opacity-60' 
                    : 'border-slate-200/90 hover:border-emerald-500 hover:shadow-md cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {prod.unit}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isOutOfStock ? 'bg-red-100 text-red-700' :
                      isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {prod.stock_quantity} {language === 'mr' ? 'शिल्लक' : language === 'hi' ? 'बचे' : 'left'}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-emerald-700">
                    {displayName}
                  </h4>
                  {prod.name !== displayName && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {prod.name}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500">{language === 'mr' ? 'दर:' : language === 'hi' ? 'भाव:' : 'Rate:'}</span>{' '}
                    <span className="text-base font-extrabold text-slate-900">
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
                      className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                    </button>

                    {/* Add to Cart button */}
                    <button
                      disabled={isOutOfStock}
                      onClick={() => addToCart(prod, 1)}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300 transition-colors"
                      title="Add 1 Unit"
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
      <div className="lg:col-span-5 flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 justify-between">
        <div className="space-y-4">
          
          {/* Header & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {t('currentBill')}
                </h3>
                <span className="text-xs text-slate-500">
                  {cart.length} {language === 'mr' ? 'वस्तू जोडल्या आहेत' : language === 'hi' ? 'प्रकार के सामान जुड़े हैं' : 'items added'}
                </span>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('emptyCart')}</span>
              </button>
            )}
          </div>

          {/* Customer Selection / Udhar Lookup */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                {t('customerName')}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Counter Customer"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                {t('customerPhone')}
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Cart Item Rows */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div 
                  key={item.product_id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60"
                >
                  <div className="min-w-0 pr-2">
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      {item.product_name}
                    </h5>
                    <div className="text-[11px] text-slate-500 font-medium">
                      ₹{item.unit_price} &times; {item.quantity} {item.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Qty +/- Controls */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 0.5)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                        className="w-12 text-center text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 0.5)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-black text-slate-900 w-14 text-right">
                      ₹{item.total_price}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                {t('cartEmptyMsg')}
              </div>
            )}
          </div>

          {/* Pricing Totals & Discount */}
          <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{t('subtotal')}</span>
              <span className="font-semibold text-slate-900">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
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
                  className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-right font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-slate-200 text-slate-900">
              <span className="font-bold text-sm">{t('netAmount')}</span>
              <span className="text-2xl font-black text-emerald-700">₹{netTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'Cash', label: t('cash'), icon: Banknote, color: 'text-blue-600' },
                { id: 'Online_UPI', label: t('onlineUpi'), icon: Smartphone, color: 'text-purple-600' },
                { id: 'Split', label: t('splitPay'), icon: CreditCard, color: 'text-teal-600' },
                { id: 'Udhar', label: t('udharPay'), icon: BookOpen, color: 'text-amber-600' },
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
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                <span>{t('cashReceived')}</span>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input
                    type="number"
                    value={tenderedCash || ''}
                    placeholder={netTotal.toString()}
                    onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 rounded bg-white border border-blue-300 font-bold text-blue-950 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1.5">
                {[50, 100, 200, 500].map(val => (
                  <button
                    key={val}
                    onClick={() => setTenderedCash(val)}
                    className="px-2 py-0.5 bg-white border border-blue-200 rounded text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {tenderedCash > netTotal && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 pt-1 border-t border-blue-200">
                  <span>{t('changeToReturn')}</span>
                  <span className="text-sm">₹{cashChange.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment inputs */}
          {paymentMode === 'Split' && (
            <div className="grid grid-cols-2 gap-2 bg-teal-50/70 p-3 rounded-xl border border-teal-200/80">
              <div>
                <label className="text-[11px] font-bold text-teal-900 block mb-1">
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
                  className="w-full px-2 py-1 rounded bg-white border border-teal-300 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-teal-900 block mb-1">
                  {language === 'mr' ? 'ऑनलाईन रक्कम (UPI):' : language === 'hi' ? 'UPI में कितना (Online):' : 'UPI Online Amount:'}
                </label>
                <input
                  type="number"
                  value={splitOnlineAmount || ''}
                  onChange={(e) => setSplitOnlineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 rounded bg-white border border-teal-300 text-xs font-bold"
                />
              </div>
            </div>
          )}

        </div>

        {/* Big Complete Sale / Checkout Button */}
        <div className="pt-4 border-t border-slate-100">
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t('measureInRupees')}
                </h4>
                <p className="text-xs text-slate-500">
                  {getProductDisplayName(quickCalcProduct)} (₹{quickCalcProduct.selling_price}/{quickCalcProduct.unit})
                </p>
              </div>
              <button 
                onClick={() => setQuickCalcProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {t('enterRupees')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  autoFocus
                  value={calcRupees}
                  placeholder="20, 50, 100"
                  onChange={(e) => setCalcRupees(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border rounded-xl font-bold text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Quick shortcut chips */}
              <div className="flex gap-2 mt-2">
                {[20, 30, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setCalcRupees(amt.toString())}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {calcRupees && parseFloat(calcRupees) > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <span>{t('calculatedQuantityIs')} </span>
                  <span className="text-base font-extrabold text-emerald-700">
                    {(parseFloat(calcRupees) / quickCalcProduct.selling_price).toFixed(3)} {quickCalcProduct.unit}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setQuickCalcProduct(null)}
                className="w-1/2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleRupeeCalcApply}
                disabled={!calcRupees || parseFloat(calcRupees) <= 0}
                className="w-1/2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:bg-slate-300"
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
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                PhonePe / GooglePay / Paytm QR
              </span>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                ₹{netTotal.toFixed(2)}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t('shopName')} Merchant QR Code
              </p>
            </div>

            {/* Generated QR Code Graphic */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=yogeshwaridairy@okaxis%26pn=Yogeshwari%20Dairy%26am=${netTotal}%26cu=INR`}
                alt="UPI Payment QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            </div>

            <p className="text-xs text-slate-500">
              {language === 'mr' ? 'ग्राहक कोणत्याही UPI ॲपवरून स्कॅन करून पैसे देऊ शकतात.' : language === 'hi' ? 'ग्राहक अपने किसी भी UPI ऐप से स्कैन करके भुगतान कर सकता है।' : 'Customer can scan using any UPI App to pay.'}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
            >
              {language === 'mr' ? 'पैसे मिळाले (Payment Done)' : language === 'hi' ? 'भुगतान प्राप्त हुआ (Payment Done)' : 'Payment Received'}
            </button>
          </div>
        </div>
      )}

      {/* SALE SUCCESS & PRINT RECEIPT MODAL */}
      {isSuccessModalOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {language === 'mr' ? 'विक्री यशस्वीपणे नोंदवली गेली!' : language === 'hi' ? 'बिक्री सफलतापूर्वक दर्ज हुई!' : 'Sale Recorded Successfully!'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'mr' ? 'बिल क्रमांक:' : language === 'hi' ? 'बिल क्रमांक:' : 'Invoice:'} <b className="text-slate-800">{lastCompletedSale.invoice_no}</b>
              </p>
            </div>

            {/* Printable Thermal Receipt Container */}
            <div id="printable-receipt" className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-xs space-y-2">
              <div className="text-center border-b pb-2">
                <div className="font-bold text-sm">{t('shopName')}</div>
                <div className="text-[10px] text-slate-500">
                  {language === 'mr' ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : language === 'hi' ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Paneer, Curd, Pure Ghee'}
                </div>
                <div className="text-[10px] text-slate-500">FSSAI Lic: 21524012000341 &bull; Mo: 9823XXXXXX</div>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>{language === 'mr' ? 'बिल:' : language === 'hi' ? 'बिल:' : 'Bill:'} {lastCompletedSale.invoice_no}</span>
                <span>{lastCompletedSale.sale_date}</span>
              </div>
              <div className="text-[11px]">{t('customerName')} {lastCompletedSale.customer_name}</div>

              <div className="border-t border-b py-1.5 space-y-1">
                {lastCompletedSale.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[170px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-bold text-xs pt-1">
                {lastCompletedSale.discount > 0 && (
                  <div className="text-slate-500">{t('discount')} -₹{lastCompletedSale.discount}</div>
                )}
                <div className="text-sm">{t('netAmount')} ₹{lastCompletedSale.net_amount}</div>
                <div className="text-[10px] font-normal text-slate-500">
                  {t('paymentMethod')} {lastCompletedSale.payment_mode}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t">
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

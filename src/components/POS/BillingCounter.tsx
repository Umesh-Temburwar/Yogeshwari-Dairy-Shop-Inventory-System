import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, PaymentMode, SaleItem, CustomerGender, CustomerAgeGroup } from '../../types';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import { 
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
  Barcode, 
  Download, 
  QrCode, 
  Copy, 
  Package, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Eye 
} from 'lucide-react';
import { printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, SearchInput, Card, SegmentedControl, Kbd, StatusBadge } from '../ui';

export const BillingCounter: React.FC = () => {
  const { products, batches, createSale, setActiveView } = useStore();
  const { t, language } = useLanguage();
  const { role, adminSlot, user } = useAuth();

  const activeOperator = useMemo(() => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';
    const email = (user?.email || '').toLowerCase().trim();

    if (email === 'nilusakhare2003@gmail.com' || role === 'Admin' || adminSlot === 1) {
      return {
        role: 'Admin' as const,
        slot: 1 as const,
        email: 'nilusakhare2003@gmail.com',
        name: isMr ? 'निलेश सखारे' : isHi ? 'निलेश सखारे' : 'Nilesh Sakhare',
        counter: isMr ? 'काऊंटर १' : isHi ? 'काउंटर १' : 'Counter 1'
      };
    }

    return {
      role: 'Owner' as const,
      slot: null,
      email: 'yogeshwaridairy9896@gmail.com',
      name: isMr ? 'निखिल सखारे' : isHi ? 'निखिल सखारे' : 'Nikhil Sakhare',
      counter: isMr ? 'मुख्य मालक काऊंटर' : isHi ? 'मुख्य मालिक काउंटर' : 'Owner Master Counter'
    };
  }, [role, adminSlot, user?.email, language]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Mobile responsive tab (Products vs Cart/Checkout)
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  // Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
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
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);

  // Quick Amount to Quantity converter state
  const [quickCalcProduct, setQuickCalcProduct] = useState<Product | null>(null);
  const [calcRupees, setCalcRupees] = useState<string>('');

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Keyboard shortcut "/" focuses product search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Buttermilk', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Ice Cream & Kulfi', label: t('catIceCream') },
    { id: 'Amul Products', label: t('catAmul') },
    { id: 'Bakery & Snacks', label: t('catBakery') },
  ];

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        prod.name.toLowerCase().includes(q) ||
        (prod.marathi_name && prod.marathi_name.toLowerCase().includes(q)) ||
        (prod.hindi_name && prod.hindi_name.toLowerCase().includes(q)) ||
        (prod.brand && prod.brand.toLowerCase().includes(q)) ||
        (prod.barcode && prod.barcode.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product_id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: Number((item.quantity + quantity).toFixed(3)),
                total_price: Number(((item.quantity + quantity) * item.unit_price).toFixed(2))
              }
            : item
        );
      }
      return [
        ...prevCart,
        {
          product_id: product.id,
          product_name: getProductDisplayName(product),
          unit: product.unit,
          unit_price: product.selling_price,
          quantity: Number(quantity.toFixed(3)),
          total_price: Number((quantity * product.selling_price).toFixed(2))
        }
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: Number(quantity.toFixed(3)),
              total_price: Number((quantity * item.unit_price).toFixed(2))
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setTenderedCash(0);
    setSplitCashAmount(0);
    setSplitOnlineAmount(0);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total_price, 0);
  }, [cart]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - (discount || 0));
  }, [subtotal, discount]);

  const cashChange = Math.max(0, (tenderedCash || 0) - netTotal);

  const handleRupeeCalcApply = () => {
    if (!quickCalcProduct || !calcRupees) return;
    const rupees = parseFloat(calcRupees);
    if (isNaN(rupees) || rupees <= 0) return;

    const calculatedQty = Number((rupees / quickCalcProduct.selling_price).toFixed(3));
    addToCart(quickCalcProduct, calculatedQty);
    setQuickCalcProduct(null);
    setCalcRupees('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMode === 'Udhar' && !customerName.trim()) {
      alert(language === 'mr' 
        ? 'कृपया उधार खात्यासाठी ग्राहकाचे नाव प्रविष्ट करा!' 
        : language === 'hi' 
        ? 'कृपया उधार खाते के लिए ग्राहक का नाम दर्ज करें!' 
        : 'Please enter customer name for credit/udhar sale!');
      return;
    }

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

    const defaultCustomerName = language === 'mr' ? 'थेट ग्राहक' : language === 'hi' ? 'काउंटर ग्राहक' : 'Counter Customer';

    const sale = await createSale({
      customer_name: customerName.trim() || defaultCustomerName,
      customer_phone: customerPhone.trim() || undefined,
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
      created_by_name: activeOperator.name,
      created_by_email: activeOperator.email,
      created_by_role: activeOperator.role,
      admin_slot: activeOperator.slot,
      counter_name: activeOperator.counter,
      items: cart
    });

    setLastCompletedSale(sale);
    setIsSuccessModalOpen(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });

    clearCart();
    setMobileTab('products');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGender('Male');
    setCustomerAgeGroup('Adults (26-45)');
    setCustomerAge('');
  };

  const getInvoiceReportPayload = (sale: any) => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: `${t('shopName')} - ${isMr ? 'अधिकृत विक्री पावती' : isHi ? 'अधिकृत बिक्री रसीद' : 'Cash Memo & Tax Invoice'}`,
      subtitle: `${isMr ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : isHi ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Dairy & Sweets'} | FSSAI: 21524012000341`,
      periodText: `${isMr ? 'बिल क्र.' : isHi ? 'बिल क्र.' : 'Invoice No.'}: ${sale.invoice_no} | ${isMr ? 'तारीख' : isHi ? 'दिनांक' : 'Date'}: ${sale.sale_date}`,
      language,
      kpis: [
        { label: isMr ? 'निव्वळ देय रक्कम' : isHi ? 'कुल देय राशि' : 'Net Payable', value: `₹${sale.net_amount.toLocaleString('en-IN')}`, color: 'emerald' },
        { 
          label: isMr ? 'पेमेंट पद्धत' : isHi ? 'भुगतान माध्यम' : 'Payment Mode', 
          value: sale.payment_mode === 'Cash' ? (isMr ? 'रोख' : isHi ? 'रोकड़' : 'Cash') :
                 sale.payment_mode === 'Online_UPI' ? (isMr ? 'ऑनलाईन UPI' : isHi ? 'ऑनलाइन UPI' : 'Online UPI') :
                 sale.payment_mode === 'Udhar' ? (isMr ? 'उधारी' : isHi ? 'उधार' : 'Credit') :
                 sale.payment_mode === 'Split' ? (isMr ? 'विभागून' : isHi ? 'विभाजित' : 'Split') : sale.payment_mode, 
          color: 'blue' 
        },
        { label: isMr ? 'काऊंटर' : isHi ? 'काउंटर' : 'Counter', value: sale.counter_name || (sale.admin_slot === 2 ? 'काऊंटर २' : 'काऊंटर १'), color: 'teal' },
        { label: isMr ? 'ऑपरेटर' : isHi ? 'ऑपरेटर' : 'Operator', value: sale.created_by_name || 'Admin', color: 'purple' },
        { label: isMr ? 'ग्राहक नाव' : isHi ? 'ग्राहक नाम' : 'Customer Name', value: sale.customer_name || (isMr ? 'काउंटर ग्राहक' : isHi ? 'काउंटर ग्राहक' : 'Counter Customer'), color: 'blue' }
      ],
      table: {
        headers: isMr 
          ? ['अ.क्र.', 'मालाचे नाव / तपशील', 'प्रमाण', 'दर (₹)', 'एकूण रक्कम (₹)']
          : isHi
          ? ['क्र.', 'सामान का नाम / विवरण', 'मात्रा', 'दर (₹)', 'कुल राशि (₹)']
          : ['Sr.', 'Item Description', 'Qty', 'Rate (₹)', 'Total (₹)'],
        alignments: ['center', 'left', 'right', 'right', 'right'] as ('center' | 'left' | 'right' | 'right' | 'right')[],
        rows: (sale.items || []).map((it: any, idx: number) => [
          idx + 1,
          it.product_name,
          `${it.quantity} ${it.unit}`,
          `₹${it.unit_price}`,
          `₹${it.total_price.toLocaleString('en-IN')}`
        ]),
        summaryRow: [
          isMr ? 'एकूण निव्वळ रक्कम' : isHi ? 'कुल देय राशि' : 'Net Total',
          `${sale.items?.length || 0} ${isMr ? 'वस्तू' : isHi ? 'सामान' : 'Items'}`,
          '',
          sale.discount > 0 ? `${isMr ? 'सवलत' : isHi ? 'छूट' : 'Discount'}: ₹${sale.discount}` : '',
          `₹${sale.net_amount.toLocaleString('en-IN')}`
        ]
      },
      notes: `${isMr ? 'धन्यवाद! पुन्हा भेट द्या • शुद्धता हीच आमची ओळख' : isHi ? 'धन्यवाद! फिर पधारें • शुद्धता ही हमारी पहचान है' : 'Thank you! Visit again • Purity is our identity'} | UPI ID: Q226038088@ybl (IDFC FIRST Bank)`
    };
  };

  const paymentOptions = [
    { value: 'Cash' as PaymentMode, label: t('cash'), icon: <Banknote className="w-3.5 h-3.5" /> },
    { value: 'Online_UPI' as PaymentMode, label: t('onlineUpi'), icon: <Smartphone className="w-3.5 h-3.5" /> },
    { value: 'Udhar' as PaymentMode, label: t('udharPay'), icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="relative">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden mb-3 sticky top-0 z-20">
        <SegmentedControl
          className="w-full justify-center grid grid-cols-2"
          options={[
            { value: 'products', label: `${language === 'mr' ? '१. माल निवडा' : '1. Products'}` },
            { value: 'cart', label: `${language === 'mr' ? '२. बिल' : '2. Bill'} (${cart.length})${netTotal > 0 ? ` · ₹${netTotal.toFixed(0)}` : ''}` },
          ]}
          value={mobileTab}
          onChange={(val) => setMobileTab(val as any)}
        />
      </div>

      {/* Operator Status Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-surface border border-line shadow-card text-xs mb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ok shrink-0" />
          <span className="text-ink-3">
            {language === 'mr' ? 'सक्रिय काऊंटर:' : 'Active Counter:'}
          </span>
          <span className="font-semibold text-ink">
            {activeOperator.counter}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-3">
            {language === 'mr' ? 'ऑपरेटर:' : 'Operator:'}
          </span>
          <span className="font-semibold text-ink">
            {activeOperator.name}
          </span>
        </div>
      </div>

      {/* Two Pane Layout: [1fr | 400px] */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 items-start">
        
        {/* LEFT COLUMN: Product Catalog */}
        <div className={`flex flex-col space-y-3 ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Search, Scanner & Category Bar */}
          <Card className="p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <SearchInput
                ref={searchInputRef}
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                shortcutHint="/"
              />

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowBarcodeScanner(true)}
                className="shrink-0"
                title="Camera Barcode Scanner"
              >
                <Barcode className="w-4 h-4 text-ink-2" />
                <span className="hidden sm:inline text-xs">{language === 'mr' ? 'बारकोड' : 'Barcode'}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setActiveView('returns')}
                className="shrink-0"
                title="माल परतावा (Customer Returns)"
              >
                <RotateCcw className="w-4 h-4 text-ink-2" />
                <span className="hidden sm:inline text-xs">{language === 'mr' ? 'परतावा' : 'Return'}</span>
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

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 overflow-y-auto max-h-[calc(100vh-14rem)] pr-0.5">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 px-4 bg-surface rounded-2xl border border-line text-center flex flex-col items-center justify-center">
                <Package className="w-10 h-10 text-ink-3 mb-2" />
                <p className="font-semibold text-sm text-ink">
                  {language === 'mr' ? 'कोणतेही उत्पादन उपलब्ध नाही' : 'No Products Found'}
                </p>
                <p className="text-xs text-ink-3 mt-1">
                  {language === 'mr' ? 'सर्च किंवा कॅटेगरी फिल्टर तपासा.' : 'Check your search query or filter.'}
                </p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const prodBatches = batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0);
                const validBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status !== 'EXPIRED');
                const availableStock = prodBatches.length > 0 
                  ? validBatches.reduce((sum, b) => sum + b.qty_remaining, 0)
                  : prod.stock_quantity;

                const isOutOfStock = availableStock <= 0;
                const isLowStock = availableStock <= prod.min_stock_alert && !isOutOfStock;
                const hasExpiredOnly = prodBatches.length > 0 && validBatches.length === 0;
                const displayName = getProductDisplayName(prod);

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (!isOutOfStock && !hasExpiredOnly) addToCart(prod, 1);
                    }}
                    className={`rounded-2xl bg-surface shadow-card p-3 text-left border border-line/40 flex flex-col justify-between transition-all select-none ${
                      isOutOfStock || hasExpiredOnly
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-pop active:scale-[.98] cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-ink-3 mb-1">
                        <span className="truncate">{prod.brand || 'Dairy'}</span>
                        <span className={`inline-flex items-center gap-1 font-medium ${
                          isOutOfStock || hasExpiredOnly
                            ? 'text-danger'
                            : isLowStock
                            ? 'text-warn'
                            : 'text-ink-3'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isOutOfStock || hasExpiredOnly ? 'bg-danger' : isLowStock ? 'bg-warn' : 'bg-ok'
                          }`} />
                          <span className="tabular-nums">{availableStock} {prod.unit}</span>
                        </span>
                      </div>

                      <h4 className="font-semibold text-sm text-ink line-clamp-2 leading-tight">
                        {displayName}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-line/30 flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-semibold text-ink tabular-nums">
                          ₹{prod.selling_price}
                        </span>
                        <span className="text-[11px] text-ink-3">
                          /{prod.unit}
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickCalcProduct(prod);
                            setCalcRupees('');
                          }}
                          title={t('measureInRupees')}
                          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-line text-ink-2 grid place-items-center transition"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isOutOfStock || hasExpiredOnly}
                          onClick={() => addToCart(prod, 1)}
                          className="w-7 h-7 rounded-lg bg-accent text-accent-fg grid place-items-center transition hover:opacity-90 disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart Panel */}
        <div className={`flex flex-col bg-surface rounded-2xl border border-line shadow-card p-4 sm:p-5 justify-between transition-colors sticky top-16 ${
          mobileTab === 'products' ? 'hidden lg:flex' : 'flex'
        }`}>
          <div className="space-y-3.5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('products')}
                  className="lg:hidden p-1.5 rounded-lg text-ink-2 hover:bg-surface-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-surface-2 grid place-items-center text-ink">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink text-sm">
                    {t('currentBill')}
                  </h3>
                  <span className="text-xs text-ink-3">
                    {cart.length} {language === 'mr' ? 'वस्तू' : 'items'}
                  </span>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs font-medium text-danger hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('emptyCart')}</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div 
                    key={item.product_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-2 border border-line/30"
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <h5 className="text-xs font-semibold text-ink truncate">
                        {item.product_name}
                      </h5>
                      <div className="text-[11px] text-ink-3 font-medium tabular-nums">
                        ₹{item.unit_price} &times; {item.quantity} {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Qty Stepper */}
                      <div className="inline-flex items-center h-7 rounded-lg bg-surface border border-line/50 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 0.5)}
                          className="w-6 h-6 rounded grid place-items-center text-ink-2 hover:bg-surface-2"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-10 text-center text-xs font-semibold text-ink bg-transparent focus:outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 0.5)}
                          className="w-6 h-6 rounded grid place-items-center text-ink-2 hover:bg-surface-2"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-semibold text-ink w-14 text-right tabular-nums">
                        ₹{item.total_price}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-ink-3 hover:text-danger p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-ink-3 text-xs">
                  {t('cartEmptyMsg')}
                </div>
              )}
            </div>

            {/* Subtotal, Discount & Net Payable */}
            <div className="pt-2 border-t border-line/40 space-y-1 text-xs">
              <div className="flex justify-between text-ink-2">
                <span>{t('subtotal')}</span>
                <span className="font-semibold text-ink tabular-nums">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-ink-2">
                <span>{t('discount')}</span>
                <div className="flex items-center gap-1">
                  <span>₹</span>
                  <input
                    type="number"
                    value={discount || ''}
                    placeholder="0"
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-16 h-7 px-1.5 border border-line rounded-lg bg-surface-2 text-right font-medium text-ink focus:outline-none tabular-nums text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-line/40 text-ink">
                <span className="font-semibold text-sm">{t('netAmount')}</span>
                <span className="text-2xl font-semibold tabular-nums text-ink">₹{netTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Segmented Control */}
            <div>
              <label className="text-xs font-medium text-ink-3 block mb-1.5">
                {t('paymentMethod')}
              </label>
              <SegmentedControl
                className="w-full justify-between grid grid-cols-3"
                options={paymentOptions}
                value={paymentMode as any}
                onChange={(val) => {
                  setPaymentMode(val as PaymentMode);
                  if (val === 'Online_UPI') setShowQrModal(true);
                }}
                size="sm"
              />
            </div>

            {/* Online UPI Preview */}
            {paymentMode === 'Online_UPI' && (
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-line overflow-hidden p-0.5 shrink-0">
                    <img src="/QR.jpg" alt="QR" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-ink block">UPI: Q226038088@ybl</span>
                    <span className="text-[10px] text-ink-3">IDFC FIRST Bank</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQrModal(true)}
                  className="h-7 text-xs px-2"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR</span>
                </Button>
              </div>
            )}

            {/* Cash Tender Input */}
            {paymentMode === 'Cash' && (
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium text-ink">
                  <span>{t('cashReceived')}</span>
                  <div className="flex items-center gap-1">
                    <span>₹</span>
                    <input
                      type="number"
                      value={tenderedCash || ''}
                      placeholder={netTotal.toString()}
                      onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                      className="w-20 h-7 px-2 rounded-lg bg-surface border border-line font-medium text-ink text-right focus:outline-none tabular-nums text-xs"
                    />
                  </div>
                </div>
                {tenderedCash > netTotal && (
                  <div className="flex justify-between items-center text-xs font-semibold text-ok pt-1 border-t border-line/30">
                    <span>{t('changeToReturn')}</span>
                    <span className="tabular-nums">₹{cashChange.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Udhar Customer Input */}
            {paymentMode === 'Udhar' && (
              <div className="p-2.5 rounded-xl bg-surface-2 border border-line/40 space-y-1.5">
                <span className="text-xs font-semibold text-ink block">
                  {language === 'mr' ? 'उधार खाते / ग्राहक नाव*' : 'Customer Name for Credit*'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={language === 'mr' ? 'उदा. रमेश पाटील' : 'Customer Name'}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={language === 'mr' ? 'मोबाईल' : 'Phone'}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Customer Demographics (Optional) */}
            <div className="p-2.5 rounded-xl bg-surface-2 border border-line/40 space-y-2">
              <span className="text-[10px] font-medium text-ink-3 uppercase tracking-wider block">
                {language === 'mr' ? 'ग्राहक माहिती (ऐच्छिक)' : 'Customer Info (Optional)'}
              </span>
              <div className="flex gap-1">
                {(['Male', 'Female', 'Other'] as CustomerGender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setCustomerGender(g)}
                    className={`flex-1 h-7 rounded-lg text-xs font-medium transition ${
                      customerGender === g
                        ? 'bg-surface shadow-card text-ink font-semibold border border-line/50'
                        : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {g === 'Male' ? '👨 Male' : g === 'Female' ? '👩 Female' : '🧑 Other'}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Checkout CTA Button */}
          <div className="pt-3 border-t border-line/40">
            <Button
              type="button"
              variant="checkout"
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              <Printer className="w-4 h-4" />
              <span>{t('completeAndPrint')} · ₹{netTotal.toFixed(2)}</span>
              <Kbd className="bg-accent-fg/20 text-accent-fg border-none">Enter</Kbd>
            </Button>
          </div>
        </div>

      </div>

      {/* Floating Bottom Cart Bar for Mobile */}
      {cart.length > 0 && mobileTab === 'products' && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-fadeIn">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full h-12 px-4 rounded-2xl bg-accent text-accent-fg shadow-pop flex items-center justify-between border border-line active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent-fg text-accent flex items-center justify-center text-xs font-bold tabular-nums">
                {cart.length}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                ₹{netTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span>{language === 'mr' ? 'बिल पहा' : 'View Bill'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Quick ₹ Calculator Modal */}
      {quickCalcProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-pop border border-line space-y-3">
            <div className="flex items-center justify-between border-b border-line/40 pb-2">
              <div>
                <h4 className="font-semibold text-ink text-sm">
                  {t('measureInRupees')}
                </h4>
                <p className="text-xs text-ink-3">
                  {getProductDisplayName(quickCalcProduct)} (₹{quickCalcProduct.selling_price}/{quickCalcProduct.unit})
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setQuickCalcProduct(null)}
                className="text-ink-3 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-2 block mb-1">
                {t('enterRupees')}
              </label>
              <Input
                type="number"
                autoFocus
                value={calcRupees}
                placeholder="20, 50, 100"
                onChange={(e) => setCalcRupees(e.target.value)}
                leftIcon={<span className="font-semibold text-ink-3">₹</span>}
              />

              <div className="flex gap-1.5 mt-2">
                {[20, 30, 50, 100, 200].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCalcRupees(amt.toString())}
                    className="flex-1 h-7 bg-surface-2 hover:bg-line border border-line/40 rounded-lg text-xs font-medium text-ink tabular-nums transition"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              {calcRupees && parseFloat(calcRupees) > 0 && (
                <div className="mt-3 p-2.5 bg-surface-2 rounded-xl border border-line/40 text-xs text-ink">
                  <span>{t('calculatedQuantityIs')} </span>
                  <span className="text-base font-semibold text-ink tabular-nums">
                    {(parseFloat(calcRupees) / quickCalcProduct.selling_price).toFixed(3)} {quickCalcProduct.unit}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setQuickCalcProduct(null)}
                className="w-1/2"
              >
                {t('cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleRupeeCalcApply}
                disabled={!calcRupees || parseFloat(calcRupees) <= 0}
                className="w-1/2"
              >
                {t('addToBasket')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* UPI QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-pop border border-line text-center space-y-3 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-ink-2 bg-surface-2 px-2.5 py-0.5 rounded-full border border-line/40">
                PhonePe &bull; GPay &bull; Paytm &bull; BHIM
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-ink-3 hover:text-ink"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface-2 p-3 rounded-xl border border-line/40">
              <span className="text-[11px] text-ink-3 block">
                {language === 'mr' ? 'एकूण देय रक्कम' : 'Total Bill Payable'}
              </span>
              <div className="text-3xl font-semibold text-ink tracking-tight tabular-nums">
                ₹{netTotal.toFixed(2)}
              </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-line inline-block max-w-[240px] mx-auto shadow-card">
              <img
                src="/QR.jpg"
                alt="Yogeshwari Dairy UPI QR"
                className="w-full object-contain rounded-lg"
              />
            </div>

            <div className="bg-surface-2 p-2 rounded-xl border border-line/40 flex items-center justify-between gap-2 text-left">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-medium text-ink-3 block leading-tight">
                  UPI ID:
                </span>
                <span className="text-xs font-mono font-semibold text-ink truncate select-all block">
                  Q226038088@ybl
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText('Q226038088@ybl');
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
              >
                {copiedUpi ? <CheckCircle2 className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={() => setShowQrModal(false)}
              className="w-full"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === 'mr' ? 'पेमेंट मिळाले ✓' : 'Payment Received ✓'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Sale Success & Print Modal */}
      {isSuccessModalOpen && lastCompletedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-pop border border-line space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-ok/10 text-ok rounded-full flex items-center justify-center mx-auto border border-ok/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-ink">
                {language === 'mr' ? 'विक्री यशस्वीपणे नोंदवली गेली!' : 'Sale Recorded Successfully!'}
              </h3>
              <p className="text-xs text-ink-3">
                {language === 'mr' ? 'बिल क्र.' : 'Invoice:'} <b className="text-ink font-mono">{lastCompletedSale.invoice_no}</b>
              </p>
            </div>

            {/* Printable Thermal Receipt (Hidden on Screen, Visible on Print) */}
            <div id="printable-receipt" className="bg-surface-2 p-3.5 rounded-xl border border-line/60 font-mono text-xs space-y-2">
              <div className="text-center border-b border-line/40 pb-2">
                <div className="font-semibold text-sm text-ink">{t('shopName')}</div>
                <div className="text-[10px] text-ink-3">Fresh Milk, Paneer, Curd & Ghee</div>
                <div className="text-[10px] text-ink-3">FSSAI Lic: 21524012000341</div>
              </div>

              <div className="flex justify-between text-[11px] text-ink">
                <span>Bill: {lastCompletedSale.invoice_no}</span>
                <span>{lastCompletedSale.sale_date}</span>
              </div>
              <div className="flex justify-between text-[11px] text-ink">
                <span>{t('customerName')}: {lastCompletedSale.customer_name}</span>
              </div>

              <div className="border-t border-b border-line/40 py-1.5 space-y-1">
                {lastCompletedSale.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px] text-ink">
                    <span className="truncate max-w-[170px]">{it.product_name}</span>
                    <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-0.5 text-right font-semibold text-xs pt-1 text-ink">
                {lastCompletedSale.discount > 0 && (
                  <div className="text-ink-3">Discount -₹{lastCompletedSale.discount}</div>
                )}
                <div className="text-sm font-semibold">Net Total ₹{lastCompletedSale.net_amount}</div>
                <div className="text-[10px] font-normal text-ink-3">
                  Mode: {lastCompletedSale.payment_mode}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => viewReportPDF(getInvoiceReportPayload(lastCompletedSale))}
              >
                <Eye className="w-3.5 h-3.5 text-ink-2" />
                <span>{language === 'mr' ? 'पहा' : 'View'}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => printReport(getInvoiceReportPayload(lastCompletedSale))}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'mr' ? 'प्रिंट' : 'Print'}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => downloadReportPDF(getInvoiceReportPayload(lastCompletedSale))}
              >
                <Download className="w-3.5 h-3.5 text-ink-2" />
                <span>PDF</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                {t('nextBill')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        mode="pos"
        onProductSelected={(prod) => {
          addToCart(prod, 1);
        }}
        onBarcodeScanned={(code) => {
          setSearchQuery(code);
        }}
      />

    </div>
  );
};

export default BillingCounter;

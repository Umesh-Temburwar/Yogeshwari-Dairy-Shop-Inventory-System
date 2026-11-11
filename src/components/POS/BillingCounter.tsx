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
  AlertTriangle,
  Barcode,
  FileText,
  Download,
  QrCode,
  Copy,
  Package,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import confetti from 'canvas-confetti';

export const BillingCounter: React.FC = () => {
  const { products, batches, createSale, setActiveView } = useStore();
  const { t, language } = useLanguage();

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
      items: cart
    });

    setLastCompletedSale(sale);
    setIsSuccessModalOpen(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });

    // Reset Form
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
        { label: isMr ? 'ग्राहक नाव' : isHi ? 'ग्राहक नाम' : 'Customer Name', value: sale.customer_name || (isMr ? 'काउंटर ग्राहक' : isHi ? 'काउंटर ग्राहक' : 'Counter Customer'), color: 'purple' }
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

  const handleViewInvoicePDF = (sale: any) => {
    if (!sale) return;
    viewReportPDF(getInvoiceReportPayload(sale));
  };

  const handlePrintInvoicePDF = (sale: any) => {
    if (!sale) return;
    printReport(getInvoiceReportPayload(sale));
  };

  const handleDownloadInvoicePDF = (sale: any) => {
    if (!sale) return;
    downloadReportPDF(getInvoiceReportPayload(sale));
  };

  return (
    <div className="relative">
      {/* Mobile Tab Switcher: Products vs Bill Checkout (Native App Feel) */}
      <div className="lg:hidden grid grid-cols-2 p-1 bg-slate-200/80 dark:bg-[#1A2A25] rounded-2xl border border-slate-300/60 dark:border-[#24352F] mb-3 sticky top-0 z-20 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'products'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-[#8FA69C]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? '१. माल निवडा' : language === 'hi' ? '१. सामान चुनें' : '1. Products'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-[#8FA69C]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? '२. बिल' : language === 'hi' ? '२. बिल' : '2. Bill'} ({cart.length}) {netTotal > 0 ? `• ₹${netTotal.toFixed(0)}` : ''}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
        
        {/* LEFT COLUMN: Product Catalog & Fast Selection */}
        <div className={`lg:col-span-7 flex flex-col space-y-4 ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Search & Category Filter Pills */}
        <div className="bg-white dark:bg-[#131F1B] p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs space-y-3 transition-colors">
          <div className="flex gap-2">
            <div className="relative flex-1">
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

            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors shadow-2xs"
              title="Camera Barcode Scanner"
            >
              <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">{language === 'mr' ? 'बारकोड स्कॅन' : 'बारकोड स्कैन'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('returns')}
              className="px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 flex items-center gap-1.5 text-xs font-bold shrink-0 transition shadow-2xs active:scale-95"
              title="माल परतावा (Customer Returns)"
            >
              <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">{language === 'mr' ? 'माल परत' : language === 'hi' ? 'माल वापसी' : 'Return'}</span>
            </button>
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
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 px-4 bg-white dark:bg-[#131F1B] rounded-2xl border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                {language === 'mr' ? 'कोणतेही उत्पादन उपलब्ध नाही' : language === 'hi' ? 'कोई उत्पाद उपलब्ध नहीं है' : 'No Products Available for Billing'}
              </p>
              <p className="text-xs text-slate-400 dark:text-[#8FA69C] mt-1">
                {language === 'mr' ? 'प्रथम "Products & Stock" मध्ये माल किंवा उत्पादन जोडा.' : language === 'hi' ? 'पहले "Products & Stock" में जाकर उत्पाद जोड़ें।' : 'Add your products in "Products & Stock" first.'}
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
          })
        )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Info & Payment Checkout */}
      <div className={`lg:col-span-5 flex flex-col bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-sm p-4 sm:p-5 justify-between transition-colors ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="space-y-4">
          
          {/* Header & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('products')}
                className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:text-slate-900 flex items-center gap-1 text-xs font-bold"
                title="Back to products"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'mr' ? 'माल' : 'सामान'}</span>
              </button>

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

          {/* Online UPI Quick Card with QR Preview */}
          {paymentMode === 'Online_UPI' && (
            <div className="bg-purple-50/80 dark:bg-purple-950/25 p-3 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-xs border border-purple-200 dark:border-purple-800/60 overflow-hidden flex items-center justify-center shrink-0">
                    <img src="/QR.jpg" alt="UPI QR" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 block">
                      {language === 'mr' ? 'QR कोड पेमेंट तयार' : language === 'hi' ? 'QR कोड पेमेंट तैयार' : 'QR Payment Ready'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-400 block">
                      UPI: Q226038088@ybl
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'QR उघडा' : language === 'hi' ? 'QR खोलें' : 'View QR'}</span>
                </button>
              </div>
            </div>
          )}

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
                  {language === 'mr' ? 'रोख रक्कम:' : language === 'hi' ? 'रोकड़ राशि:' : 'Cash Amount:'}
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
                  {language === 'mr' ? 'ऑनलाईन UPI रक्कम:' : language === 'hi' ? 'ऑनलाइन UPI राशि:' : 'UPI Online Amount:'}
                </label>
                <input
                  type="number"
                  value={splitOnlineAmount || ''}
                  onChange={(e) => setSplitOnlineAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 rounded bg-white dark:bg-[#131F1B] border border-teal-300 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="mt-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" />
                  <span>{language === 'mr' ? 'ऑनलाइन QR कोड उघडा' : language === 'hi' ? 'ऑनलाइन QR कोड देखें' : 'View Online QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Udhar / Credit Customer Input */}
          {paymentMode === 'Udhar' && (
            <div className="bg-amber-50/80 dark:bg-amber-950/25 p-3 rounded-xl border border-amber-300 dark:border-amber-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  {language === 'mr' ? 'उधार खाते / ग्राहकाचे नाव' : language === 'hi' ? 'उधार खाता / ग्राहक का नाम' : 'Customer Name for Credit / Udhar'}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                  {language === 'mr' ? '* नाव आवश्यक' : language === 'hi' ? '* नाम आवश्यक' : '* Name Required'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={language === 'mr' ? 'उदा. रमेश पाटील' : language === 'hi' ? 'उदा. रमेश वर्मा' : 'e.g. Ramesh Patil'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={language === 'mr' ? 'मोबाईल क्र. (ऐच्छिक)' : language === 'hi' ? 'मोबाइल नंबर (वैकल्पिक)' : 'Phone (Optional)'}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
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

      </div>

      {/* Floating Bottom Cart Bar on Mobile (Appears when products are selected on phone) */}
      {cart.length > 0 && mobileTab === 'products' && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-fadeIn">
          <button
            type="button"
            onClick={() => setMobileTab('cart')}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-between border border-white/20 active:scale-98 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                {cart.length}
              </div>
              <div className="text-left">
                <span className="text-[10px] text-emerald-100 font-bold block leading-tight">
                  {language === 'mr' ? 'बिल तयार आहे' : language === 'hi' ? 'बिल तैयार है' : 'Cart Ready'}
                </span>
                <span className="text-sm font-black leading-tight">
                  ₹{netTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black bg-white/20 px-3 py-1.5 rounded-xl">
              <span>{language === 'mr' ? 'बिल पहा व भरा' : language === 'hi' ? 'बिल देखें व भुगतान करें' : 'View Bill & Pay'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

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

      {/* UPI QR CODE POPUP MODAL (Official QR.jpg Merchant Standee) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-6 shadow-2xl text-center space-y-3.5 border border-slate-200/90 dark:border-[#24352F] max-h-[92vh] overflow-y-auto">
            {/* Header: App badges + Close */}
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/40 px-2.5 py-0.5 rounded-full">
                PhonePe &bull; GPay &bull; Paytm &bull; BHIM
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Net Amount Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-[#1A2A25] dark:to-[#131F1B] p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">
                {language === 'mr' ? 'एकूण देय रक्कम (Total Bill Amount)' : language === 'hi' ? 'कुल देय राशि (Total Bill Amount)' : 'Total Bill Payable'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                ₹{(paymentMode === 'Split' ? (splitOnlineAmount || netTotal) : netTotal).toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 font-medium">
                {t('shopName')} Official Merchant QR
              </p>
            </div>

            {/* The Authentic Cropped High-Res QR.jpg Display */}
            <div className="bg-white p-2 sm:p-3 rounded-2xl border-2 border-emerald-500/40 shadow-md inline-block max-w-[280px] sm:max-w-[320px] mx-auto overflow-hidden">
              <img
                src="/QR.jpg"
                alt="Yogeshwari Dairy Official UPI QR Code"
                className="w-full max-h-[300px] sm:max-h-[340px] object-contain rounded-xl"
              />
            </div>

            {/* Copyable Official UPI ID Box */}
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-2.5 rounded-2xl border border-slate-200 dark:border-[#24352F] flex items-center justify-between gap-2 text-left">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#8FA69C] block leading-tight">
                  {language === 'mr' ? 'अधिकृत UPI आयडी:' : language === 'hi' ? 'अधिकृत UPI आईडी:' : 'Official UPI ID:'}
                </span>
                <span className="text-xs sm:text-sm font-black font-mono text-purple-700 dark:text-purple-300 truncate select-all block">
                  Q226038088@ybl
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('Q226038088@ybl');
                  setCopiedUpi(true);
                  setTimeout(() => setCopiedUpi(false), 2000);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  copiedUpi
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs active:scale-95'
                }`}
                title="Copy UPI ID"
              >
                {copiedUpi ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>{language === 'mr' ? 'कॉपी झाले!' : language === 'hi' ? 'कॉपी हुआ!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'UPI कॉपी' : language === 'hi' ? 'UPI कॉपी' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruction Footer */}
            <p className="text-xs text-slate-600 dark:text-[#8FA69C] font-medium leading-relaxed">
              {language === 'mr'
                ? 'ग्राहक कोणत्याही UPI ॲपवरून हा QR स्कॅन करून थेट पेमेंट करू शकतात.'
                : language === 'hi'
                ? 'ग्राहक किसी भी UPI ऐप से यह QR स्कैन करके भुगतान कर सकते हैं।'
                : 'Customer can scan this merchant QR code with any UPI app to pay.'}
            </p>

            {/* Confirmation & Done Button */}
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'mr'
                  ? 'पेमेंट मिळाले (Payment Received ✓)'
                  : language === 'hi'
                  ? 'भुगतान प्राप्त हुआ (Payment Received ✓)'
                  : 'Payment Received ✓'}
              </span>
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
                  {lastCompletedSale.payment_mode === 'Online_UPI' && (
                    <span className="block font-mono text-[9px] text-purple-700 dark:text-purple-400 font-bold">UPI ID: Q226038088@ybl</span>
                  )}
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-500 dark:text-[#8FA69C] pt-2 border-t border-slate-200 dark:border-[#24352F]">
                {language === 'mr' ? 'धन्यवाद! पुन्हा भेट द्या &bull; शुद्धता हीच आमची ओळख' : language === 'hi' ? 'धन्यवाद! फिर पधारें &bull; शुद्धता ही हमारी पहचान है' : 'Thank you! Visit again &bull; Purity is our identity'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleViewInvoicePDF(lastCompletedSale)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-xs border border-slate-300 dark:border-slate-700"
                title="View Invoice PDF"
              >
                <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintInvoicePDF(lastCompletedSale)}
                className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                title="Print Invoice"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadInvoicePDF(lastCompletedSale)}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                title="Download Bill as PDF"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'mr' ? 'बिल PDF' : language === 'hi' ? 'बिल PDF' : 'Bill PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSuccessModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-800 dark:text-white font-bold text-xs active:scale-95"
              >
                {t('nextBill')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Camera Modal */}
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

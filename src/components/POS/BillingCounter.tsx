import React, { useState, useMemo, useCallback, useDeferredValue, useEffect } from 'react';
import nikhilAvatar from '../../assets/nikhil_avatar.png';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDebounce } from '../../hooks/useDebounce';
import { Product, ProductBatch, PaymentMode, SaleItem, CustomerGender, CustomerAgeGroup } from '../../types';
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
  Eye,
  Loader2,
  Sparkles
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF } from '../../lib/exportUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { QuickProductRegisterModal } from '../Scanner/QuickProductRegisterModal';
import { ProductImage } from '../Common/ProductImage';
import { HoldableImageBox } from '../Common/HoldableImageBox';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { requestMotionPermission, isMobileDevice } from '../../hooks/useShakeDetector';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import confetti from 'canvas-confetti';
import { playSuccessChime, playBeepSound } from '../../utils/audioUtils';
import { useAuth } from '../../context/AuthContext';
import { formatSaleDateTime, formatSaleDate, formatSaleTime } from '../../lib/dateUtils';

interface ProductCardProps {
  prod: Product;
  batches: ProductBatch[];
  displayName: string;
  language: string;
  t: (key: string) => string;
  onAddToCart: (prod: Product, qty?: number) => void;
  onQuickCalc: (prod: Product) => void;
  onPreviewImage: (prod: Product) => void;
}

const ProductCard = React.memo<ProductCardProps>(({
  prod,
  batches,
  displayName,
  language,
  t,
  onAddToCart,
  onQuickCalc,
  onPreviewImage
}) => {
  const prodBatches = useMemo(() => batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0), [batches, prod.id]);
  const validBatches = useMemo(() => prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status !== 'EXPIRED'), [prodBatches]);
  const availableStock = prodBatches.length > 0 
    ? validBatches.reduce((sum, b) => sum + b.qty_remaining, 0)
    : prod.stock_quantity;

  const earliestBatch = useMemo(() => {
    if (validBatches.length === 0) return null;
    return [...validBatches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
  }, [validBatches]);

  const effectiveSellingPrice = (earliestBatch && earliestBatch.selling_price && earliestBatch.selling_price > 0)
    ? earliestBatch.selling_price
    : prod.selling_price;

  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock <= prod.min_stock_alert && !isOutOfStock;
  const hasExpiredOnly = prodBatches.length > 0 && validBatches.length === 0;
  const hasExpiringToday = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TODAY');
  const hasExpiringTomorrow = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TOMORROW');

  return (
    <div
      onClick={() => {
        if (!isOutOfStock && !hasExpiredOnly) {
          onAddToCart(prod, 1);
        }
      }}
      className={`relative bg-white dark:bg-[#131F1B] rounded-2xl p-3 sm:p-3.5 border transition-all duration-150 flex flex-col justify-between group select-none shadow-2xs ${
        isOutOfStock || hasExpiredOnly
          ? 'border-slate-200 dark:border-[#24352F] opacity-60 bg-slate-50/50 dark:bg-[#16221E]' 
          : 'border-slate-200/90 dark:border-[#24352F] hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:shadow-md cursor-pointer'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] uppercase truncate max-w-[85px]">
            {prod.unit}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
            hasExpiredOnly 
              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' :
            isOutOfStock ? 'bg-red-100 dark:bg-rose-950/60 text-red-700 dark:text-rose-400' :
            isLowStock ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
          }`}>
            {(isLowStock || hasExpiredOnly) && (
              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            )}
            <span>
              {hasExpiredOnly 
                ? (language === 'mr' ? 'मुदत संपली' : language === 'hi' ? 'एक्सपायर्ड' : 'Expired')
                : `${availableStock} ${language === 'mr' ? 'शिल्लक' : language === 'hi' ? 'बचे' : 'left'}`}
            </span>
          </span>
        </div>

        {/* Standardized 1:1 Square Product Image Showcase — Hold image to change URL, tap card to add */}
        <HoldableImageBox
          onHold={() => onPreviewImage(prod)}
          title={language === 'mr' ? 'इमेज URL बदलण्यासाठी फोटोवर होल्ड करा' : language === 'hi' ? 'इमेज URL बदलने के लिए फोटो पर होल्ड करें' : 'Hold image to view & update URL'}
          className="group/posimg relative w-full aspect-square flex justify-center items-center mb-2.5 bg-white rounded-2xl border border-slate-200/80 dark:border-[#24352F] overflow-hidden shadow-2xs cursor-pointer"
        >
          <ProductImage 
            src={prod.image_url} 
            alt={prod.name} 
            category={prod.category} 
            fill
            className="group-hover/posimg:scale-[1.03] transition-transform duration-200"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewImage(prod);
            }}
            title={language === 'mr' ? 'इमेज URL बदला' : language === 'hi' ? 'इमेज URL बदलें' : 'Edit image URL'}
            className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 hover:bg-emerald-700 text-white text-[9px] font-bold opacity-85 sm:opacity-0 sm:group-hover/posimg:opacity-100 transition-opacity cursor-pointer"
          >
            <Eye className="w-2.5 h-2.5" />
            <span>URL</span>
          </button>
        </HoldableImageBox>

        {/* Product Title */}
        <div className="mb-1">
          <h4 className="font-extrabold text-slate-900 dark:text-[#E7F0EC] text-xs sm:text-sm leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 min-h-[2.2rem]">
            {displayName}
          </h4>
          {prod.name !== displayName && (
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium truncate mt-0.5">
              {prod.name}
            </p>
          )}
        </div>

        {/* Near Expiry Warning Pill for Cashier */}
        {hasExpiringToday && !hasExpiredOnly && (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-extrabold text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
            <Clock className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
            <span className="truncate">{language === 'mr' ? 'आज संपत आहे' : language === 'hi' ? 'आज एक्सपायर' : 'Exp. Today'}</span>
          </div>
        )}
        {hasExpiringTomorrow && !hasExpiringToday && !hasExpiredOnly && (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">{language === 'mr' ? 'उद्या एक्सपायर' : language === 'hi' ? 'कल एक्सपायर' : 'Exp. Tomorrow'}</span>
          </div>
        )}
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-1">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 dark:text-[#8FA69C] block leading-none font-semibold">
            {language === 'mr' ? 'दर' : language === 'hi' ? 'भाव' : 'Rate'}
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 leading-tight">
            ₹{effectiveSellingPrice}
          </span>
          {Boolean(earliestBatch && earliestBatch.selling_price && earliestBatch.selling_price > 0 && earliestBatch.selling_price !== prod.selling_price) && (
            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block leading-none">
              ({language === 'mr' ? 'बॅच दर' : language === 'hi' ? 'बैच दर' : 'Batch Rate'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick ₹ Calculator button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickCalc(prod);
            }}
            title={t('measureInRupees')}
            className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>

          {/* Add to Cart button */}
          <button
            type="button"
            disabled={isOutOfStock || hasExpiredOnly}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(prod, 1);
            }}
            className="h-8 px-2.5 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs disabled:bg-slate-300 dark:disabled:bg-slate-800 transition active:scale-95 flex items-center gap-1 shadow-xs cursor-pointer"
            title={hasExpiredOnly ? (language === 'mr' ? 'मुदत संपलेली बॅच ब्लॉक' : language === 'hi' ? 'एक्सपायर्ड बैच ब्लॉक' : 'Expired Batch Blocked') : (language === 'mr' ? '१ नग जोडा' : language === 'hi' ? '१ नग जोड़ें' : 'Add 1 Unit')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{language === 'mr' ? 'जोडा' : language === 'hi' ? 'जोड़ें' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export const BillingCounter: React.FC = () => {
  const { 
    products, 
    batches, 
    createSale, 
    setActiveView,
    globalScannerRequest,
    isBillingScannerRequested,
    consumeBillingScannerRequest,
    setIsBarcodeScannerOpen
  } = useStore();
  const { t, language, tr } = useLanguage();
  const { role, adminSlot, user } = useAuth();
  const [previewImageProduct, setPreviewImageProduct] = useState<Product | null>(null);

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
        counter: isMr ? 'काऊंटर १ - मुख्य बिलिंग' : isHi ? 'काउंटर १ - मुख्य बिलिंग' : 'Counter 1 - Main Billing'
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
  const debouncedSearchQuery = useDebounce(searchQuery, 120);
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);
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
  const [showCustomerDetails, setShowCustomerDetails] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);

  // Modals & Confirmation
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [quickRegisterBarcode, setQuickRegisterBarcode] = useState<string | null>(null);
  const [showQuickRegisterModal, setShowQuickRegisterModal] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<any>(null);
  const [onlineSearchedProduct, setOnlineSearchedProduct] = useState<Product | null>(null);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Product[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Global Shake-to-Scan integration for Billing Page (Preference & Auto-Open Request Consumption)
  const [shakeToScanEnabled, setShakeToScanEnabled] = useLocalStorage<boolean>('ydo_shake_to_scan_enabled', true);

  // Auto-open scanner if triggered globally by shake gesture from any page
  useEffect(() => {
    if (isBillingScannerRequested || globalScannerRequest === 'billing') {
      consumeBillingScannerRequest();
      setShowBarcodeScanner(true);
    }
  }, [isBillingScannerRequested, globalScannerRequest, consumeBillingScannerRequest]);

  // Keep StoreContext updated with modal open status so global shake knows when camera is active
  useEffect(() => {
    setIsBarcodeScannerOpen(showBarcodeScanner);
  }, [showBarcodeScanner, setIsBarcodeScannerOpen]);

  // Live online product & barcode search from Supabase
  // Barcode lookups run immediately (zero artificial checkout delay); text searches stay debounced with request cancellation
  useEffect(() => {
    const q = deferredSearchQuery.trim();
    if (!q || q.length < 2) {
      setOnlineSearchedProduct(null);
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const isBarcodeLike = /^\d{5,}$/.test(q);
    const controller = new AbortController();
    let cancelled = false;
    setIsSearchingOnline(true);

    const executeSearch = async () => {
      try {
        if (isBarcodeLike) {
          const res = await searchProductByBarcodeOnline(q);
          if (!cancelled) {
            if (res.found && res.product) {
              setOnlineSearchedProduct(res.product);
              setOnlineSearchResults([res.product]);
            } else {
              setOnlineSearchedProduct(null);
              setOnlineSearchResults([]);
            }
          }
        } else if (q.length >= 2 && supabase) {
          const safeQ = q.replace(/[%_]/g, '');
          const { data, error } = await supabase
            .from('products')
            .select('id, name, hindi_name, marathi_name, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, brand, pack_size, is_active')
            .or(`name.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`)
            .limit(20)
            .abortSignal(controller.signal);

          if (!cancelled) {
            if (!error && data && data.length > 0) {
              setOnlineSearchResults(data as Product[]);
            } else {
              setOnlineSearchResults([]);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setOnlineSearchedProduct(null);
          setOnlineSearchResults([]);
        }
      } finally {
        if (!cancelled) setIsSearchingOnline(false);
      }
    };

    if (isBarcodeLike) {
      void executeSearch();
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    const timer = setTimeout(() => {
      void executeSearch();
    }, 280);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [deferredSearchQuery]);

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

  // Filtered products for selection (fast deferred evaluation with barcode normalization)
  const filteredProducts = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const isBarcodeQuery = /^\d{5,}$/.test(q);

    // When querying by barcode, prioritize exact barcode resolution
    if (isBarcodeQuery) {
      if (onlineSearchedProduct) {
        return [onlineSearchedProduct];
      }
      const localBarcodeMatches = products.filter(p =>
        p.is_active && p.stock_quantity > 0 && p.barcode && (
          p.barcode.toLowerCase() === q ||
          p.barcode.toLowerCase() === ('0' + q) ||
          p.barcode.toLowerCase().replace(/^0+/, '') === q.replace(/^0+/, '') ||
          p.barcode.toLowerCase().includes(q)
        )
      );
      if (localBarcodeMatches.length > 0) {
        return localBarcodeMatches;
      }
    }

    const base = products.filter(p => {
      if (!p.is_active) return false;
      // Strictly show ONLY products physically in stock in the shop (stock_quantity > 0)
      if (!q && p.stock_quantity <= 0) return false;

      const barcodeMatches = Boolean(
        p.barcode && (
          p.barcode.toLowerCase() === q ||
          p.barcode.toLowerCase() === ('0' + q) ||
          p.barcode.toLowerCase().replace(/^0+/, '') === q.replace(/^0+/, '') ||
          p.barcode.toLowerCase().includes(q)
        )
      );

      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) || 
        (p.hindi_name && p.hindi_name.toLowerCase().includes(q)) ||
        (p.marathi_name && p.marathi_name.toLowerCase().includes(q)) ||
        barcodeMatches;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    let result = base;
    if (onlineSearchResults && onlineSearchResults.length > 0) {
      const existingIds = new Set(base.map(p => p.id));
      const additional = onlineSearchResults.filter(p => !existingIds.has(p.id));
      if (additional.length > 0) {
        result = [...additional, ...base];
      }
    } else if (onlineSearchedProduct && !base.some(p => p.id === onlineSearchedProduct.id)) {
      result = [onlineSearchedProduct, ...base];
    }

    return result.slice(0, 30);
  }, [products, deferredSearchQuery, selectedCategory, onlineSearchedProduct, onlineSearchResults]);

  // Fast thumbnail and category lookup map for Cart items
  const productThumbMap = useMemo(() => {
    const map = new Map<string, { image_url?: string; category?: string }>();
    products.forEach(p => map.set(p.id, { image_url: p.image_url, category: p.category }));
    onlineSearchResults.forEach(p => map.set(p.id, { image_url: p.image_url, category: p.category }));
    if (onlineSearchedProduct) map.set(onlineSearchedProduct.id, { image_url: onlineSearchedProduct.image_url, category: onlineSearchedProduct.category });
    return map;
  }, [products, onlineSearchResults, onlineSearchedProduct]);

  // Unit helper for fractional vs discrete item quantities
  const isFractionalUnit = useCallback((unit?: string) => {
    const u = (unit || '').toLowerCase().trim();
    return ['kg', 'gm', 'g', 'l', 'litre', 'ltr', 'ml', 'किलो', 'ग्रॅम', 'लिटर'].includes(u);
  }, []);

  // Helper display name
  const getProductDisplayName = useCallback((prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  }, [language]);

  // Add item to cart (with FEFO non-expired safety check)
  const addToCart = useCallback((product: Product, quantityToAdd: number = 1) => {
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

    // Dynamic Batch Pricing: Use earliest non-expired batch selling price if defined
    const earliestValidBatch = [...validBatches].sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
    const unitPriceToUse = (earliestValidBatch && earliestValidBatch.selling_price && earliestValidBatch.selling_price > 0)
      ? earliestValidBatch.selling_price
      : product.selling_price;
    const purchaseCostToUse = (earliestValidBatch && earliestValidBatch.purchase_price && earliestValidBatch.purchase_price > 0)
      ? earliestValidBatch.purchase_price
      : product.purchase_price;

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
          unit_price: unitPriceToUse,
          purchase_cost: purchaseCostToUse,
          total_price: Number((quantityToAdd * unitPriceToUse).toFixed(2))
        }];
      }
    });
  }, [batches, language, getProductDisplayName]);

  const handleQuickCalc = useCallback((product: Product) => {
    setQuickCalcProduct(product);
    setCalcRupees('');
  }, []);

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

  // Process checkout with double-submit guard & atomic transaction
  const handleCheckout = async () => {
    if (cart.length === 0 || isCheckingOut) return;

    if (paymentMode === 'Udhar' && !customerName.trim()) {
      alert(language === 'mr' 
        ? 'कृपया उधार खात्यासाठी ग्राहकाचे नाव प्रविष्ट करा!' 
        : language === 'hi' 
        ? 'कृपया उधार खाते के लिए ग्राहक का नाम दर्ज करें!' 
        : 'Please enter customer name for credit/udhar sale!');
      return;
    }

    setIsCheckingOut(true);

    try {
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
      playSuccessChime();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });

      // Reset Form
      clearCart();
      setMobileTab('products');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerGender('Male');
      setCustomerAgeGroup('Adults (26-45)');
      setCustomerAge('');
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getInvoiceReportPayload = (sale: any) => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';
    const { dateFormatted, timeFormatted, dateTimeFormatted } = formatSaleDateTime(sale.created_at, sale.sale_date);

    return {
      title: `${t('shopName')} - ${isMr ? 'अधिकृत विक्री पावती' : isHi ? 'अधिकृत बिक्री रसीद' : 'Cash Memo & Tax Invoice'}`,
      subtitle: `${isMr ? 'ताजे दूध, पनीर, दही, शुद्ध साजूक तूप' : isHi ? 'ताज़ा दूध, पनीर, दही, शुद्ध देसी घी' : 'Fresh Milk, Dairy & Sweets'} | FSSAI: 21524012000341`,
      periodText: `${isMr ? 'बिल क्र.' : isHi ? 'बिल क्र.' : 'Invoice No.'}: ${sale.invoice_no} | ${isMr ? 'बिल तयार दिनांक व वेळ' : isHi ? 'बिल दिनांक व समय' : 'Bill Date & Time'}: ${dateTimeFormatted}`,
      createdAt: sale.created_at,
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
        { label: isMr ? 'बिल दिनांक' : isHi ? 'बिल दिनांक' : 'Bill Date', value: dateFormatted, color: 'teal' },
        { label: isMr ? 'बिल तयार वेळ' : isHi ? 'बिल समय' : 'Bill Time', value: timeFormatted || '—', color: 'purple' },
        { label: isMr ? 'काऊंटर' : isHi ? 'काउंटर' : 'Counter', value: sale.counter_name || (sale.admin_slot === 2 ? 'काऊंटर २' : 'काऊंटर १'), color: 'teal' },
        { label: isMr ? 'बिलिंग ऑपरेटर' : isHi ? 'बिलिंग ऑपरेटर' : 'Operator', value: sale.created_by_name || 'Admin 1', color: 'purple' },
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
    <div className="relative max-w-7xl mx-auto pb-24 sm:pb-8">
      {/* Mobile Tab Switcher: Products vs Bill Checkout */}
      <div className="lg:hidden grid grid-cols-2 p-1.5 bg-slate-200/90 dark:bg-[#1A2A25] rounded-2xl border border-slate-300/60 dark:border-[#24352F] mb-3 sticky top-0 z-20 backdrop-blur-md shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('products')}
          className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'products'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 font-black shadow-xs'
              : 'text-slate-600 dark:text-[#8FA69C]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{language === 'mr' ? '१. माल निवडा' : language === 'hi' ? '१. सामान चुनें' : '1. Products'}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`h-11 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'cart'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-700 dark:text-emerald-400 font-black shadow-xs'
              : 'text-slate-600 dark:text-[#8FA69C]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{language === 'mr' ? '२. बिल' : language === 'hi' ? '२. बिल' : '2. Bill'} ({cart.length}) {netTotal > 0 ? `• ₹${netTotal.toFixed(0)}` : ''}</span>
        </button>
      </div>

      {/* Active Counter & Operator Badge Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F] text-xs mb-2.5 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-semibold text-slate-600 dark:text-[#8FA69C] hidden sm:inline">
            {language === 'mr' ? 'सक्रिय काऊंटर:' : language === 'hi' ? 'सक्रिय काउंटर:' : 'Counter:'}
          </span>
          <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-[11px]">
            📍 {activeOperator.counter}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-600 dark:text-[#8FA69C] hidden sm:inline">
            {language === 'mr' ? 'ऑपरेटर:' : language === 'hi' ? 'ऑपरेटर:' : 'Operator:'}
          </span>
          <span className={`inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-lg text-[11px] ${
            activeOperator.slot === 1 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40' 
              : activeOperator.slot === 2 
              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40' 
              : 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40'
          }`}>
            {activeOperator.role === 'Owner' || activeOperator.email === 'yogeshwaridairy9896@gmail.com' ? (
              <img src={nikhilAvatar} alt="" className="w-4 h-4 rounded-full object-cover border border-amber-400 shrink-0" />
            ) : (
              <span>👤</span>
            )}
            <span>{activeOperator.name}</span>
            <span className="text-[10px] font-normal opacity-80 hidden sm:inline">({activeOperator.email})</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:min-h-[calc(100vh-8rem)]">
        
        {/* LEFT COLUMN: Product Catalog & Fast Selection */}
        <div className={`lg:col-span-7 flex flex-col space-y-2.5 sm:space-y-3 ${mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Sticky Search & Category Filter Pills */}
        <div className="sticky top-0 z-20 -mx-3 px-3 pt-1.5 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28] lg:static lg:mx-0 lg:bg-white lg:dark:bg-[#131F1B] lg:p-3.5 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:dark:border-[#24352F] lg:shadow-xs space-y-2 transition-colors">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = searchQuery.trim();
                    if (filteredProducts.length === 1) {
                      addToCart(filteredProducts[0], 1);
                      setSearchQuery('');
                    } else if (filteredProducts.length === 0 && /^\d{5,}$/.test(q)) {
                      setQuickRegisterBarcode(q);
                      setShowQuickRegisterModal(true);
                    }
                  }
                }}
                className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] lg:dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-transparent text-xs sm:text-sm font-medium"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="w-7 h-7 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowBarcodeScanner(true)}
              aria-label="Camera Barcode Scanner"
              className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs active:scale-[0.97] transition-all shrink-0 cursor-pointer"
              title={tr('Camera Barcode Scanner', 'कैमरा बारकोड स्कैनर', 'कॅमेरा बारकोड स्कॅनर')}
            >
              <Barcode className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">{tr('Scan', 'स्कैन', 'स्कॅन')}</span>
            </button>

            {isMobileDevice() && (
              <button
                type="button"
                onClick={async () => {
                  await requestMotionPermission();
                  setShakeToScanEnabled(!shakeToScanEnabled);
                }}
                aria-label="Toggle Shake to Scan"
                className={`w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.97] shrink-0 cursor-pointer ${
                  shakeToScanEnabled
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400'
                    : 'bg-white dark:bg-[#131F1B] border-slate-200 dark:border-[#24352F] text-slate-500 dark:text-slate-400'
                }`}
                title={tr('Global Shake to Scan', 'फोन हिलाकर स्कैन (Global Shake to Scan)', 'फोन हलवून स्कॅन (Global Shake to Scan)')}
              >
                <Smartphone className={`w-4 h-4 ${shakeToScanEnabled ? 'text-amber-500' : ''}`} />
                <span className="hidden sm:inline">
                  {tr('Shake', 'शेक', 'शेक')}: {shakeToScanEnabled ? tr('ON', 'चालू', 'चालू') : tr('OFF', 'बंद', 'बंद')}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveView('returns')}
              aria-label="Customer Returns"
              className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/40 text-purple-700 dark:text-purple-300 flex items-center justify-center gap-1.5 text-xs font-bold shrink-0 transition active:scale-[0.97]"
              title={tr('Customer Returns', 'माल वापसी (Customer Returns)', 'माल परतावा (Customer Returns)')}
            >
              <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="hidden sm:inline">{language === 'mr' ? 'माल परत' : language === 'hi' ? 'माल वापसी' : 'Return'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center shrink-0 snap-start transition-all duration-150 active:scale-[0.97] ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-[#131F1B] lg:bg-slate-50 lg:dark:bg-[#1A2A25] border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#A3B8AF] hover:border-slate-300 dark:hover:border-[#324A42]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] lg:from-white lg:dark:from-[#131F1B] to-transparent"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 lg:overflow-y-auto lg:max-h-[calc(100vh-14rem)] lg:min-h-[420px] pr-1 pb-6 lg:pb-0">
          {filteredProducts.length === 0 ? (
            /^\d{5,}$/.test(searchQuery.trim()) ? (
              <div className="col-span-full py-10 px-5 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/20 dark:via-[#131F1B] dark:to-[#1A2A25] rounded-2xl border-2 border-dashed border-emerald-500/50 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Barcode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                    {tr('New Barcode Found!', 'नया बारकोड मिला!', 'नवीन बारकोड सापडला!')}
                  </h3>
                  <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {searchQuery.trim()}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 max-w-sm">
                    {tr(
                      'This barcode is not in the system. Enter name and price to add it to the bill in 1 second.',
                      'यह बारकोड सिस्टम में नहीं है। तुरंत नाम और मूल्य दर्ज कर 1 सेकंड में बिल में लें।',
                      'हा बारकोड सिस्टिममध्ये नाही. त्वरित नाव आणि दर भरून १ सेकंदात बिलात जोडा.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickRegisterBarcode(searchQuery.trim());
                    setShowQuickRegisterModal(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>{tr('⚡ Quick Add to Catalog & Bill', '⚡ तुरंत कैटलॉग में जोड़ें और बिल में लें', '⚡ त्वरित कॅटलॉगमध्ये जोडा आणि बिलात घ्या')}</span>
                </button>
              </div>
            ) : (
              <div className="col-span-full py-16 px-4 bg-white dark:bg-[#131F1B] rounded-2xl border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
                <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  {language === 'mr' ? 'कोणतेही उत्पादन उपलब्ध नाही' : language === 'hi' ? 'कोई उत्पाद उपलब्ध नहीं है' : 'No Products Available for Billing'}
                </p>
                <p className="text-xs text-slate-400 dark:text-[#8FA69C] mt-1">
                  {language === 'mr' ? 'प्रथम "Products & Stock" मध्ये माल किंवा उत्पादन जोडा.' : language === 'hi' ? 'पहले "Products & Stock" में जाकर उत्पाद जोड़ें।' : 'Add your products in "Products & Stock" first.'}
                </p>
              </div>
            )
          ) : (
            filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                prod={prod}
                batches={batches}
                displayName={getProductDisplayName(prod)}
                language={language}
                t={t}
                onAddToCart={addToCart}
                onQuickCalc={handleQuickCalc}
                onPreviewImage={setPreviewImageProduct}
              />
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Info & Payment Checkout */}
      <div className={`lg:col-span-5 flex flex-col bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-sm p-4 sm:p-5 justify-between transition-colors ${mobileTab === 'products' ? 'hidden lg:flex' : 'flex'} pb-24 sm:pb-5`}>
        <div className="space-y-4">
          
          {/* Header & Clear */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#24352F]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileTab('products')}
                className="lg:hidden p-1.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:text-slate-900 flex items-center gap-1 text-xs font-bold"
                title={tr('Back to products', 'सामान सूची पर लौटें', 'मालाच्या यादीवर जा')}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{tr('Products', 'सामान', 'माल')}</span>
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
          <div className="space-y-2 max-h-[300px] lg:max-h-[340px] overflow-y-auto pr-1">
            {cart.length > 0 ? (
              cart.map((item) => {
                const prodThumb = productThumbMap.get(item.product_id);
                const isFractional = isFractionalUnit(item.unit);
                const step = isFractional ? 0.5 : 1;

                return (
                  <div 
                    key={item.product_id}
                    className="flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] hover:border-emerald-500/30 transition shadow-2xs group"
                  >
                    {/* Thumbnail Image */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      <ProductImage
                        src={prodThumb?.image_url}
                        alt={item.product_name}
                        category={prodThumb?.category}
                        fill
                      />
                    </div>

                    {/* Name & Rate */}
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-[#E7F0EC] truncate leading-tight">
                        {item.product_name}
                      </h5>
                      <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-semibold mt-0.5 flex items-center gap-1">
                        <span>₹{item.unit_price}</span>
                        <span>&times;</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{item.quantity} {item.unit}</span>
                      </div>
                    </div>

                    {/* Quantity Controls & Line Total */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, Number((item.quantity - step).toFixed(2)))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] active:scale-90 transition cursor-pointer"
                          title={tr('Decrease', 'कम करें', 'कमी करा')}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step={isFractional ? "0.1" : "1"}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product_id, parseFloat(e.target.value) || 0)}
                          className="w-11 text-center text-xs font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, Number((item.quantity + step).toFixed(2)))}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] active:scale-90 transition cursor-pointer"
                          title={tr('Increase', 'बढ़ाएं', 'वाढवा')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-14 sm:w-16 text-right font-black text-xs text-slate-900 dark:text-white tabular-nums">
                        ₹{item.total_price.toLocaleString('en-IN')}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product_id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title={tr('Remove', 'हटाएं', 'काढून टाका')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-slate-400 dark:text-[#8FA69C] text-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1A2A25] text-slate-300 dark:text-slate-600 mx-auto flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="font-bold">{t('cartEmptyMsg')}</p>
                <button
                  type="button"
                  onClick={() => setMobileTab('products')}
                  className="lg:hidden inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'mr' ? 'बिलामध्ये माल जोडा' : language === 'hi' ? 'बिल में सामान जोड़ें' : 'Add Products'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pricing Totals & Discount Card */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#24352F] space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-[#8FA69C]">
              <span className="font-semibold">{t('subtotal')}</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-600 dark:text-[#8FA69C] gap-2">
              <span className="font-semibold flex items-center gap-1 shrink-0">
                <span>{t('discount')}</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[5, 10, 20].map(disc => (
                  <button
                    key={disc}
                    type="button"
                    onClick={() => setDiscount(disc)}
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 text-slate-600 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]"
                  >
                    -₹{disc}
                  </button>
                ))}
                {discount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscount(0)}
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 hover:bg-rose-100"
                  >
                    0
                  </button>
                )}
                <div className="flex items-center gap-1 bg-white dark:bg-[#1A2A25] border border-slate-300 dark:border-[#24352F] rounded-lg px-1.5 py-0.5">
                  <span className="text-[11px] font-bold">₹</span>
                  <input
                    type="number"
                    value={discount || ''}
                    placeholder="0"
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-12 text-right font-bold text-slate-900 dark:text-white focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Net Total Display Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-[#1A2A25] dark:to-emerald-950/40 border border-emerald-500/30 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block leading-tight">
                  {language === 'mr' ? 'एकूण देय रक्कम' : language === 'hi' ? 'कुल देय राशि' : 'Net Payable Amount'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#8FA69C]">
                  {cart.length} {language === 'mr' ? 'वस्तूंचे बिल' : language === 'hi' ? 'सामान का बिल' : 'items'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                ₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1.5">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-4 gap-1.5 relative">
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
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-500/30'
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
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{language === 'mr' ? 'QR उघडा' : language === 'hi' ? 'QR खोलें' : 'View QR'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Cash Tender & Change Calculator */}
          {paymentMode === 'Cash' && (
            <div className="bg-blue-50/70 dark:bg-[#1A2A25] p-3 rounded-2xl border border-blue-200/80 dark:border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
                <span>{t('cashReceived')}</span>
                <div className="flex items-center gap-1">
                  <span className="font-bold">₹</span>
                  <input
                    type="number"
                    value={tenderedCash || ''}
                    placeholder={netTotal.toString()}
                    onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 rounded-xl bg-white dark:bg-[#131F1B] border border-blue-300 dark:border-blue-500/40 font-bold text-blue-950 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTenderedCash(Math.round(netTotal))}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition cursor-pointer shadow-2xs"
                >
                  {language === 'mr' ? 'बरोबर (Exact)' : language === 'hi' ? 'सटीक (Exact)' : 'Exact'}
                </button>
                {[50, 100, 200, 500].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTenderedCash(val)}
                    className="px-2.5 py-1 bg-white dark:bg-[#131F1B] border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-[#223630] active:scale-95 transition cursor-pointer"
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {tenderedCash > netTotal && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-1.5 border-t border-blue-200 dark:border-blue-500/30">
                  <span>{t('changeToReturn')}</span>
                  <span className="text-base font-black">₹{cashChange.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Split Payment inputs */}
          {paymentMode === 'Split' && (
            <div className="grid grid-cols-2 gap-2 bg-teal-50/70 dark:bg-[#1A2A25] p-3 rounded-2xl border border-teal-200/80 dark:border-teal-500/30">
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
                  className="w-full px-2 py-1 rounded-xl bg-white dark:bg-[#131F1B] border border-teal-300 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white"
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
                  className="w-full px-2 py-1 rounded-xl bg-white dark:bg-[#131F1B] border border-teal-300 dark:border-teal-500/40 text-xs font-bold text-slate-900 dark:text-white"
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
            <div className="bg-amber-50/80 dark:bg-amber-950/25 p-3 rounded-2xl border border-amber-300 dark:border-amber-700/50 space-y-2">
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
                  className="w-full px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={language === 'mr' ? 'मोबाईल क्र. (ऐच्छिक)' : language === 'hi' ? 'मोबाइल नंबर (वैकल्पिक)' : 'Phone (Optional)'}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Customer Details & Demographics (Collapsible Accordion) */}
          <div className="border border-slate-200/90 dark:border-[#24352F] rounded-2xl overflow-hidden bg-slate-50/70 dark:bg-[#1A2A25]/50">
            <button
              type="button"
              onClick={() => setShowCustomerDetails(!showCustomerDetails)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-[#20332D] transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-emerald-600 dark:text-emerald-400">👤</span>
                <span className="truncate">{language === 'mr' ? 'ग्राहक माहिती (ऐच्छिक)' : language === 'hi' ? 'ग्राहक जानकारी (वैकल्पिक)' : 'Customer Info (Optional)'}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-500 font-semibold shrink-0">
                  {customerGender === 'Male' ? '👨' : customerGender === 'Female' ? '👩' : '🧑'} {customerAgeGroup.split(' ')[0]}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <span>{showCustomerDetails ? tr('Hide', 'छुपाएं', 'लपवा') : tr('Edit', 'बदलें', 'बदला')}</span>
                <span className="text-xs transition-transform duration-200" style={{ transform: showCustomerDetails ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>
            </button>

            {showCustomerDetails && (
              <div className="p-3 pt-2 border-t border-slate-200/80 dark:border-[#24352F] space-y-2.5 bg-white dark:bg-[#131F1B]">
                {/* Customer Name & Phone (Optional for Cash/Online) */}
                {paymentMode !== 'Udhar' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={language === 'mr' ? 'ग्राहकाचे नाव (ऐच्छिक)' : language === 'hi' ? 'ग्राहक का नाम (वैकल्पिक)' : 'Customer Name'}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={language === 'mr' ? 'मोबाईल नंबर' : language === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Gender Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'लिंग:' : language === 'hi' ? 'लिंग:' : 'Gender:'}
                  </label>
                  <div className="flex gap-1.5">
                    {([
                      { value: 'Male',   emoji: '👨', labelMr: 'पुरुष',  labelHi: 'पुरुष',  labelEn: 'Male'   },
                      { value: 'Female', emoji: '👩', labelMr: 'महिला',  labelHi: 'महिला',  labelEn: 'Female' },
                      { value: 'Other',  emoji: '🧑', labelMr: 'इतर',    labelHi: 'अन्य',   labelEn: 'Other'  },
                    ] as { value: CustomerGender; emoji: string; labelMr: string; labelHi: string; labelEn: string }[]).map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setCustomerGender(g.value)}
                        className={`flex-1 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                          customerGender === g.value
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shadow-xs'
                            : 'border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630]'
                        }`}
                      >
                        <span>{g.emoji}</span>
                        <span>{language === 'mr' ? g.labelMr : language === 'hi' ? g.labelHi : g.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Group Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'वयोगट:' : language === 'hi' ? 'आयु वर्ग:' : 'Age Group:'}
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {([
                      { value: 'Kids (<18)',      labelMr: '<18',      labelHi: '<18',      labelEn: '<18'    },
                      { value: 'Youth (18-25)',   labelMr: '18-25',    labelHi: '18-25',    labelEn: '18-25'  },
                      { value: 'Adults (26-45)',  labelMr: '26-45',    labelHi: '26-45',    labelEn: '26-45'  },
                      { value: 'Senior (45+)',    labelMr: '45+',      labelHi: '45+',      labelEn: '45+'    },
                    ] as { value: CustomerAgeGroup; labelMr: string; labelHi: string; labelEn: string }[]).map((ag) => (
                      <button
                        key={ag.value}
                        type="button"
                        onClick={() => setCustomerAgeGroup(ag.value)}
                        className={`py-1 rounded-lg border text-[11px] font-bold transition-all text-center cursor-pointer active:scale-95 ${
                          customerAgeGroup === ag.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 shadow-xs'
                            : 'border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-500 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630]'
                        }`}
                      >
                        {language === 'mr' ? ag.labelMr : language === 'hi' ? ag.labelHi : ag.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Big Complete Sale / Checkout Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#24352F]">
          <button
            disabled={cart.length === 0 || isCheckingOut}
            onClick={handleCheckout}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white font-black text-base shadow-lg shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{language === 'mr' ? 'बिलिंग नोंदवत आहे...' : language === 'hi' ? 'बिलिंग हो रहा है...' : 'Processing Sale...'}</span>
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                <span>{t('completeAndPrint')} ({tr('Pay', 'भुगतान', 'देय')} ₹{netTotal.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>

      </div>

      </div>

      {/* Floating Bottom Cart Bar on Mobile (Appears when products are selected on phone) */}
      {cart.length > 0 && mobileTab === 'products' && (
        <div className="lg:hidden fixed bottom-20 left-3 right-3 z-30 animate-fadeIn">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {language === 'mr' ? 'विक्री यशस्वीपणे नोंदवली गेली!' : language === 'hi' ? 'बिक्री सफलतापूर्वक दर्ज हुई!' : 'Sale Recorded Successfully!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
              {language === 'mr' ? 'बिल क्रमांक:' : language === 'hi' ? 'बिल क्रमांक:' : 'Invoice:'} <b className="text-slate-800 dark:text-white">{lastCompletedSale?.invoice_no}</b>
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

            <div className="flex justify-between items-center text-[11px] text-slate-700 dark:text-[#E7F0EC] pt-1">
              <span>{language === 'mr' ? 'बिल:' : language === 'hi' ? 'बिल:' : 'Bill:'} <b className="font-mono text-slate-900 dark:text-white">{lastCompletedSale?.invoice_no}</b></span>
              <span className="font-bold">{formatSaleDate(lastCompletedSale?.created_at, lastCompletedSale?.sale_date)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-[#8FA69C]">
              <span>{tr('Counter:', 'काउंटर:', 'काऊंटर:')} {lastCompletedSale?.counter_name || (lastCompletedSale?.admin_slot === 2 ? tr('Counter 2', 'काउंटर २', 'काऊंटर २') : tr('Counter 1', 'काउंटर १', 'काऊंटर १'))}</span>
              <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>{formatSaleTime(lastCompletedSale?.created_at) || '—'}</span>
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-700 dark:text-[#E7F0EC]">
              <span>{t('customerName')}: {lastCompletedSale?.customer_name}</span>
              {lastCompletedSale?.customer_gender && (
                <span className="text-[10px] text-slate-500">
                  {lastCompletedSale.customer_gender === 'Male' ? '👨 ' : lastCompletedSale.customer_gender === 'Female' ? '👩 ' : '🧑 '}
                  {lastCompletedSale.customer_gender} ({lastCompletedSale.customer_age_group || (lastCompletedSale.customer_age ? `${lastCompletedSale.customer_age}y` : '')})
                </span>
              )}
            </div>

            <div className="border-t border-b border-slate-200 dark:border-[#24352F] py-1.5 space-y-1">
              {lastCompletedSale?.items?.map((it: any, i: number) => (
                <div key={i} className="flex justify-between text-[11px] text-slate-800 dark:text-[#E7F0EC]">
                  <span className="truncate max-w-[170px]">{it.product_name}</span>
                  <span>{it.quantity} {it.unit} &times; ₹{it.unit_price} = ₹{it.total_price}</span>
                </div>
              ))}
            </div>

            <div className="space-y-0.5 text-right font-bold text-xs pt-1 text-slate-900 dark:text-white">
              {lastCompletedSale?.discount > 0 && (
                <div className="text-slate-500 dark:text-[#8FA69C]">{t('discount')} -₹{lastCompletedSale.discount}</div>
              )}
              <div className="text-sm text-emerald-700 dark:text-emerald-400">{t('netAmount')} ₹{lastCompletedSale?.net_amount}</div>
              <div className="text-[10px] font-normal text-slate-500 dark:text-[#8FA69C]">
                {t('paymentMethod')}: {lastCompletedSale?.payment_mode}
                {lastCompletedSale?.payment_mode === 'Online_UPI' && (
                  <span className="block font-mono text-[9px] text-purple-700 dark:text-purple-400 font-bold">UPI ID: Q226038088@ybl</span>
                )}
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 dark:text-[#8FA69C] pt-2 border-t border-slate-200 dark:border-[#24352F]">
              {tr('Thank you! Visit again • Purity is our identity', 'धन्यवाद! फिर पधारें • शुद्धता ही हमारी पहचान है', 'धन्यवाद! पुन्हा भेट द्या • शुद्धता हीच आमची ओळख')}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleViewInvoicePDF(lastCompletedSale)}
              className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs border border-slate-300 dark:border-slate-700"
              title="View Invoice PDF"
            >
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrintInvoicePDF(lastCompletedSale)}
              className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              title="Print Invoice"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadInvoicePDF(lastCompletedSale)}
              className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              title="Download Bill as PDF"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'mr' ? 'बिल PDF' : language === 'hi' ? 'बिल PDF' : 'Bill PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSuccessModalOpen(false)}
              className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-800 dark:text-white font-bold text-xs"
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
          playBeepSound();
          if (prod.stock_quantity > 0) {
            addToCart(prod, 1);
            setShowBarcodeScanner(false);
          } else {
            const confirmBill = confirm(
              tr(
                `Product found: "${prod.name}", but stock is 0 in system. Add 1 unit to the bill anyway?`,
                `यह उत्पाद मिला: "${prod.name}", लेकिन सिस्टम में स्टॉक 0 है। क्या बिल में 1 नग जोड़ना है?`,
                `हा माल सापडला: "${prod.name}", पण सिस्टिममध्ये शिल्लक साठा ० आहे. तरीही बिलात १ नग जोडू का?`
              )
            );
            if (confirmBill) {
              addToCart({ ...prod, stock_quantity: 999 }, 1);
              setShowBarcodeScanner(false);
            }
          }
        }}
        onBarcodeScanned={async (code) => {
          playBeepSound();
          setSearchQuery(code);
          const clean = code.trim();
          const candidates = [clean, '0' + clean, clean.replace(/^0+/, '')];

          // 1. Instant local products cache lookup (0ms latency)
          const localMatch = products.find(p => p.barcode && candidates.includes(p.barcode.trim()));
          if (localMatch) {
            if (localMatch.stock_quantity > 0) {
              addToCart(localMatch, 1);
              setShowBarcodeScanner(false);
              return;
            } else {
              const confirmBill = confirm(
                tr(
                  `Product found: "${localMatch.name}", but stock is 0 in system. Add 1 unit to the bill anyway?`,
                  `यह उत्पाद मिला: "${localMatch.name}", लेकिन सिस्टम में स्टॉक 0 है। क्या बिल में 1 नग जोड़ना है?`,
                  `हा माल सापडला: "${localMatch.name}", पण सिस्टिममध्ये शिल्लक साठा ० आहे. तरीही बिलात १ नग जोडू का?`
                )
              );
              if (confirmBill) {
                addToCart({ ...localMatch, stock_quantity: 999 }, 1);
                setShowBarcodeScanner(false);
              }
              return;
            }
          }

          // 2. Supabase Online Catalogue fallback
          try {
            const res = await searchProductByBarcodeOnline(clean);
            if (res.found && res.product) {
              if (res.product.stock_quantity > 0) {
                addToCart(res.product, 1);
                setShowBarcodeScanner(false);
              } else {
                const confirmBill = confirm(
                  tr(
                    `Product found: "${res.product.name}", but stock is 0 in system. Add 1 unit to the bill anyway?`,
                    `यह उत्पाद मिला: "${res.product.name}", लेकिन सिस्टम में स्टॉक 0 है। क्या बिल में 1 नग जोड़ना है?`,
                    `हा माल सापडला: "${res.product.name}", पण सिस्टिममध्ये शिल्लक साठा ० आहे. तरीही बिलात १ नग जोडू का?`
                  )
                );
                if (confirmBill) {
                  addToCart({ ...res.product, stock_quantity: 999 }, 1);
                  setShowBarcodeScanner(false);
                }
              }
            } else {
              // Not found online either -> Auto open Quick Register Modal
              setQuickRegisterBarcode(clean);
              setShowQuickRegisterModal(true);
              setShowBarcodeScanner(false);
            }
          } catch (e) {}
        }}
      />

      {/* Quick Register Modal for Unknown Barcodes */}
      {showQuickRegisterModal && quickRegisterBarcode && (
        <QuickProductRegisterModal
          isOpen={showQuickRegisterModal}
          onClose={() => {
            setShowQuickRegisterModal(false);
            setQuickRegisterBarcode(null);
          }}
          barcode={quickRegisterBarcode}
          mode="pos"
          onProductCreated={(createdProd) => {
            addToCart(createdProd, 1);
            setShowQuickRegisterModal(false);
            setQuickRegisterBarcode(null);
            setSearchQuery('');
          }}
        />
      )}

      {/* Click-on-Photo Lightbox + Image URL Viewer & Updater */}
      <ProductImagePreviewModal
        product={previewImageProduct}
        onClose={() => setPreviewImageProduct(null)}
        onImageUpdated={(productId, newUrl) => {
          const nextImg = newUrl || undefined;
          setOnlineSearchResults(prev => prev.map(p => p.id === productId ? { ...p, image_url: nextImg } : p));
          setOnlineSearchedProduct(prev => prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev);
          setPreviewImageProduct(prev => prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev);
        }}
      />

    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
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
  Check,
  Layers,
  Calendar,
  Clock,
  Barcode,
  FileText,
  FileSpreadsheet,
  Printer,
  Download,
  Eye,
  Image as ImageIcon,
  Mic
} from 'lucide-react';
import { exportReportToPDF, printReport, downloadReportPDF, viewReportPDF, exportProductsToCSV } from '../../lib/exportUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { BarcodeStockInModal } from '../Scanner/BarcodeStockInModal';
import { ProductImage } from '../Common/ProductImage';
import { HoldableImageBox } from '../Common/HoldableImageBox';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { ProductImageManagerModal } from '../Admin/ProductImageManagerModal';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { supabase } from '../../lib/supabase';
import { translateProductName } from '../../lib/productTranslator';
import { playBeepSound, playSuccessChime } from '../../utils/audioUtils';
import { isSpeechRecognitionSupported, processVoiceTranscript } from '../../lib/voiceProductRecognizer';

interface ProductListProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  onOpenAddProduct, 
  onEditProduct 
}) => {
  const { 
    products, 
    batches, 
    deleteProduct, 
    adjustStock, 
    addProduct, 
    setActiveView,
    totalCatalogCount = 33518,
    totalBarcodesCount = 23320,
    inStockCount: storeInStockCount,
    lowStockCount: storeLowStockCount,
    outOfStockCount: storeOutOfStockCount,
    setIsBarcodeScannerOpen
  } = useStore();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards'); // Default to ultra-simple cards!

  // Expiry Filter & Batch Modal states
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<ExpiryStatus | 'ALL'>('ALL');
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [selectedProductForStockIn, setSelectedProductForStockIn] = useState<Product | null>(null);

  // Quick Stock In/Out Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('10');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustBatchNo, setAdjustBatchNo] = useState<string>('');
  const [adjustMfgDate, setAdjustMfgDate] = useState<string>('');
  const [adjustExpiryDate, setAdjustExpiryDate] = useState<string>('');

  // Quick Inline Add Bar State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeStockIn, setShowBarcodeStockIn] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const [previewImageProduct, setPreviewImageProduct] = useState<Product | null>(null);
  const [inventoryViewTab, setInventoryViewTab] = useState<'IN_STOCK' | 'CATALOGUE' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('IN_STOCK');
  const [onlineSearchedProduct, setOnlineSearchedProduct] = useState<Product | null>(null);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Product[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickCategory, setQuickCategory] = useState<ProductCategory>('Milk');
  const [quickUnit, setQuickUnit] = useState<ProductUnit>('Litre');
  const [quickBuyPrice, setQuickBuyPrice] = useState('');
  const [quickSellPrice, setQuickSellPrice] = useState('');
  const [quickStock, setQuickStock] = useState('0');

  // Keep StoreContext updated with modal open status so global shake knows when camera is active
  useEffect(() => {
    setIsBarcodeScannerOpen(showBarcodeScanner || showBarcodeStockIn);
  }, [showBarcodeScanner, showBarcodeStockIn, setIsBarcodeScannerOpen]);

  // Live online search from Supabase database (supports both Barcodes and Product Names)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setOnlineSearchedProduct(null);
      setOnlineSearchResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const isBarcodeLike = /^\d{5,}$/.test(q);
    let cancelled = false;
    setIsSearchingOnline(true);

    const timer = setTimeout(async () => {
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
        } else if (q.length >= 2) {
          const { data, error } = await supabase
            .from('products')
            .select('id, name, hindi_name, marathi_name, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, brand, pack_size, is_active')
            .or(`name.ilike.%${q}%,brand.ilike.%${q}%`)
            .limit(30);

          if (!cancelled) {
            if (!error && data && data.length > 0) {
              setOnlineSearchResults(data as Product[]);
            } else {
              setOnlineSearchResults([]);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setOnlineSearchedProduct(null);
          setOnlineSearchResults([]);
        }
      } finally {
        if (!cancelled) setIsSearchingOnline(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Server-side paginated Catalogue state (keeps 46k master items separate from 13 store items)
  const [catalogueItems, setCatalogueItems] = useState<Product[]>([]);
  const [catalogueOffset, setCatalogueOffset] = useState(0);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);
  const [hasMoreCatalogue, setHasMoreCatalogue] = useState(true);

  // Fetch initial catalogue page when CATALOGUE tab is selected
  useEffect(() => {
    if (inventoryViewTab !== 'CATALOGUE' || searchQuery.trim().length > 0) return;
    let cancelled = false;
    const fetchCatalogue = async () => {
      setIsLoadingCatalogue(true);
      try {
        let query = supabase
          .from('products')
          .select('id, name, hindi_name, marathi_name, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, brand, pack_size, is_active')
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(0, 39);

        if (selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        const { data, error } = await query;
        if (!cancelled && !error && data) {
          setCatalogueItems(data as Product[]);
          setCatalogueOffset(40);
          setHasMoreCatalogue(data.length === 40);
        }
      } catch (err) {
        console.warn('Catalogue query error:', err);
      } finally {
        if (!cancelled) setIsLoadingCatalogue(false);
      }
    };
    fetchCatalogue();
    return () => { cancelled = true; };
  }, [inventoryViewTab, selectedCategory, searchQuery]);

  const handleLoadMoreCatalogue = async () => {
    if (isLoadingCatalogue || !hasMoreCatalogue) return;
    setIsLoadingCatalogue(true);
    try {
        let query = supabase
        .from('products')
        .select('id, name, hindi_name, marathi_name, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, brand, pack_size, is_active')
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(catalogueOffset, catalogueOffset + 39);

      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setCatalogueItems(prev => [...prev, ...(data as Product[])]);
        setCatalogueOffset(prev => prev + data.length);
        setHasMoreCatalogue(data.length === 40);
      } else {
        setHasMoreCatalogue(false);
      }
    } catch (err) {
      console.warn('Load more catalogue error:', err);
    } finally {
      setIsLoadingCatalogue(false);
    }
  };

  const categories = [
    { id: 'All', label: language === 'mr' ? 'सर्व माल' : language === 'hi' ? 'सभी माल' : 'All Products' },
    { id: 'Milk', label: t('catMilk') },
    { id: 'Paneer & Butter', label: t('catPaneer') },
    { id: 'Curd & Chaas', label: t('catCurd') },
    { id: 'Ghee', label: t('catGhee') },
    { id: 'Sweets/Mithai', label: t('catSweets') },
    { id: 'Bakery & Extras', label: t('catBakery') }
  ];

  // Filtered products (Search + Category + Expiry Status + Inventory Tab + Online Barcode Result)
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. If actively searching: Return matching search results (local items + online search results)
    if (q.length > 0) {
      const baseFiltered = products.filter(p => {
        const barcodeMatches = Boolean(
          p.barcode && (
            p.barcode.toLowerCase() === q ||
            p.barcode.toLowerCase() === ('0' + q) ||
            p.barcode.toLowerCase().replace(/^0+/, '') === q.replace(/^0+/, '') ||
            p.barcode.toLowerCase().includes(q)
          )
        );

        const matchesSearch = 
          p.name.toLowerCase().includes(q) || 
          (p.hindi_name && p.hindi_name.toLowerCase().includes(q)) ||
          (p.marathi_name && p.marathi_name.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          barcodeMatches;

        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });

      if (onlineSearchResults && onlineSearchResults.length > 0) {
        // Synchronize with real-time in-memory products state (so stock inward/batch updates reflect immediately)
        const syncedOnlineResults = onlineSearchResults.map(os => {
          const fresh = products.find(p => p.id === os.id);
          return fresh || os;
        });
        const existingIds = new Set(baseFiltered.map(p => p.id));
        const additional = syncedOnlineResults.filter(p => !existingIds.has(p.id));
        return [...baseFiltered, ...additional];
      } else if (onlineSearchedProduct) {
        const fresh = products.find(p => p.id === onlineSearchedProduct.id) || onlineSearchedProduct;
        if (!baseFiltered.some(p => p.id === fresh.id)) {
          return [fresh, ...baseFiltered];
        }
      }
      return baseFiltered;
    }

    // 2. If viewing master Product Catalogue tab: Return server paginated catalogue items
    if (inventoryViewTab === 'CATALOGUE') {
      return catalogueItems;
    }

    // 3. Tab-based store inventory filtering (for in-stock, low-stock, and out-of-stock)
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      let matchesTab = true;
      if (inventoryViewTab === 'IN_STOCK') {
        matchesTab = p.stock_quantity > 0;
      } else if (inventoryViewTab === 'OUT_OF_STOCK') {
        matchesTab = p.stock_quantity <= 0;
      } else if (inventoryViewTab === 'LOW_STOCK') {
        matchesTab = p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert;
      }

      // Expiry filter
      if (selectedExpiryFilter !== 'ALL') {
        const prodBatches = batches.filter(b => b.product_id === p.id && b.qty_remaining > 0);
        const hasMatchingBatch = prodBatches.some(b => computeExpiryStatus(b.expiry_date).status === selectedExpiryFilter);
        return matchesCategory && matchesTab && hasMatchingBatch;
      }

      return matchesCategory && matchesTab;
    });
  }, [products, searchQuery, selectedCategory, selectedExpiryFilter, batches, inventoryViewTab, onlineSearchedProduct, onlineSearchResults, catalogueItems]);

  const inStockCount = storeInStockCount ?? useMemo(() => products.filter(p => p.stock_quantity > 0).length, [products]);
  const lowStockCount = storeLowStockCount ?? useMemo(() => products.filter(p => p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0).length, [products]);
  const totalCatalogueCount = Math.max(totalCatalogCount || 0, products.length);
  const outOfStockCount = storeOutOfStockCount ?? useMemo(() => products.filter(p => p.stock_quantity <= 0).length, [products]);

  const totalStockCostValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);
  }, [products]);

  const totalStockRetailValuation = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.stock_quantity * p.selling_price), 0);
  }, [products]);

  const getStockReportPayload = () => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    return {
      title: isMr ? 'दुकान शिल्लक माल व साठा मूल्यांकन अहवाल' : isHi ? 'दुकान स्टॉक व मूल्यांकन रिपोर्ट' : 'Dairy Inventory Stock Valuation & Catalog Report',
      subtitle: isMr ? 'योगेश्वरी डेअरी फार्म & उत्पादने ERP' : isHi ? 'योगेश्वरी डेरी फार्म & उत्पाद ERP' : 'Yogeshwari Dairy Farm & Products ERP',
      periodText: isMr ? 'सद्यस्थिती साठा मूल्य' : isHi ? 'वर्तमान स्टॉक इन्वेंटरी' : 'Current Stock & Inventory Valuation',
      language,
      kpis: [
        { label: isMr ? 'एकूण उत्पादने' : isHi ? 'कुल उत्पाद संख्या' : 'Total SKUs', value: `${products.length}`, color: 'emerald' },
        { label: isMr ? 'खरेदीनुसार साठा मूल्य' : isHi ? 'खरीद भाव अनुसार स्टॉक मूल्य' : 'Cost Valuation', value: `₹${totalStockCostValuation.toLocaleString('en-IN')}`, color: 'blue' },
        { label: isMr ? 'विक्रीनुकसार साठा मूल्य' : isHi ? 'बिक्री भाव अनुसार स्टॉक मूल्य' : 'Retail Valuation', value: `₹${totalStockRetailValuation.toLocaleString('en-IN')}`, color: 'purple' },
        { label: isMr ? 'कमी साठा उत्पादने' : isHi ? 'कम स्टॉक उत्पाद' : 'Low Stock Items', value: `${lowStockCount}`, color: 'rose' }
      ],
      table: {
        headers: isMr 
          ? ['उत्पादनाचे नाव', 'प्रवर्ग', 'शिल्लक साठा', 'खरेदी दर (₹)', 'विक्री दर (₹)', 'किमान मर्यादा', 'साठा मूल्य (₹)']
          : isHi
          ? ['सामान का नाम', 'वर्ग', 'वर्तमान स्टॉक', 'खरीद दर (₹)', 'बिक्री दर (₹)', 'न्यूनतम सीमा', 'स्टॉक मूल्य (₹)']
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
          isMr ? 'एकूण' : isHi ? 'कुल योग' : 'Total',
          `${filteredProducts.length} ${isMr ? 'उत्पादने' : isHi ? 'उत्पाद' : 'Products'}`,
          '',
          '',
          '',
          '',
          `₹${filteredProducts.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0).toLocaleString('en-IN')}`
        ]
      },
      notes: isMr 
        ? 'दुकान साठा तपशील. कमी साठा असलेली उत्पादने वेळेत खरेदी करावीत.'
        : isHi
        ? 'दुकान स्टॉक विवरण। कम स्टॉक वाले उत्पाद समय रहते खरीद लें।'
        : 'Dairy inventory valuation statement. Ensure timely replenishment for items reaching reorder thresholds.'
    };
  };

  const handleViewStockPDF = () => {
    viewReportPDF(getStockReportPayload());
  };

  const handlePrintStockPDF = () => {
    printReport(getStockReportPayload());
  };

  const handleDownloadStockPDF = () => {
    downloadReportPDF(getStockReportPayload());
  };

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  // Open Quick Stock Modal with auto-calculated batch & expiry for Stock In
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

  // Handle Quick Adjust (Stock In / Out)
  const handleConfirmAdjust = () => {
    if (!adjustModalProduct) return;
    const qty = parseFloat(adjustAmount);
    if (isNaN(qty) || qty <= 0) return;

    const delta = adjustType === 'in' ? qty : -qty;
    const todayStr = new Date().toISOString().split('T')[0];
    const shelfDays = getShelfLifeDays(adjustModalProduct.category, adjustModalProduct.name);

    const batchInfo = adjustType === 'in' ? {
      batch_no: adjustBatchNo.trim() || generateBatchNumber(adjustModalProduct.name, todayStr),
      mfg_date: adjustMfgDate || todayStr,
      expiry_date: adjustExpiryDate || getSuggestedExpiryDate(todayStr, shelfDays)
    } : undefined;

    adjustStock(adjustModalProduct.id, delta, undefined, batchInfo);
    setAdjustModalProduct(null);
    setAdjustAmount('10');
  };

  // Handle Quick Inline Add Submit
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;

    const { marathi, hindi } = await translateProductName(quickName.trim());

    await addProduct({
      name: quickName.trim(),
      hindi_name: hindi || quickName.trim(),
      marathi_name: marathi || quickName.trim(),
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
    setQuickStock('0');
    setShowQuickAdd(false);
  };

  // Quick Add Voice-to-Text Recognition
  const [isQuickVoiceListening, setIsQuickVoiceListening] = useState(false);
  const quickVoiceRecognitionRef = React.useRef<any>(null);

  const handleQuickVoiceClick = () => {
    if (isQuickVoiceListening) {
      if (quickVoiceRecognitionRef.current) {
        try { quickVoiceRecognitionRef.current.stop(); } catch {}
      }
      setIsQuickVoiceListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) return;

    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechClass();
      quickVoiceRecognitionRef.current = recognition;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'mr-IN';
      recognition.interimResults = true;
      recognition.continuous = true;

      playBeepSound();
      setIsQuickVoiceListening(true);

      let accumulated = '';
      let stopTimer: any = null;

      const resetStopTimer = () => {
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
          try { recognition.stop(); } catch {}
        }, 2500);
      };

      recognition.onresult = async (e: any) => {
        resetStopTimer();
        let interim = '';
        for (let i = 0; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            accumulated += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        const text = (accumulated + interim).trim();
        if (text) {
          const processed = await processVoiceTranscript(text, recognition.lang);
          if (processed.englishName) {
            setQuickName(processed.englishName);
            if (processed.detectedCategory) setQuickCategory(processed.detectedCategory);
            if (processed.detectedUnit) setQuickUnit(processed.detectedUnit);
          }
        }
      };

      recognition.onerror = () => setIsQuickVoiceListening(false);
      recognition.onend = () => {
        if (stopTimer) clearTimeout(stopTimer);
        setIsQuickVoiceListening(false);
        playSuccessChime();
      };

      recognition.start();
    } catch {
      setIsQuickVoiceListening(false);
    }
  };

  const { metrics } = useStore();
  const {
    expiredBatchesCount,
    expiringTodayBatchesCount,
    expiringTomorrowBatchesCount,
    expiring3DaysBatchesCount,
    freshBatchesCount,
    totalActiveBatches
  } = metrics;

  // Pagination / Lazy-Loading for 46,000+ catalog items (prevents mobile UI freezing)
  const INITIAL_PAGE_SIZE = 40;
  const [displayLimit, setDisplayLimit] = useState(INITIAL_PAGE_SIZE);

  // Reset display limit when user filters or searches
  useEffect(() => {
    setDisplayLimit(INITIAL_PAGE_SIZE);
  }, [searchQuery, selectedCategory, selectedExpiryFilter, inventoryViewTab]);

  const isCatalogueView = inventoryViewTab === 'CATALOGUE' && !searchQuery.trim();

  const visibleProducts = useMemo(() => {
    if (isCatalogueView) return filteredProducts;
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit, isCatalogueView]);

  const hasMore = isCatalogueView ? hasMoreCatalogue : (displayLimit < filteredProducts.length);

  const handleLoadMore = () => {
    if (isCatalogueView) {
      handleLoadMoreCatalogue();
    } else {
      setDisplayLimit((prev) => Math.min(prev + INITIAL_PAGE_SIZE, filteredProducts.length));
    }
  };

  const statusTabs: Array<{
    key: 'IN_STOCK' | 'CATALOGUE' | 'OUT_OF_STOCK' | 'LOW_STOCK';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: string;
    iconColor: string;
  }> = [
    {
      key: 'IN_STOCK',
      label: language === 'mr' ? 'उपलब्ध साठा' : language === 'hi' ? 'उपलब्ध स्टॉक' : 'Current Inventory',
      icon: Package,
      count: inStockCount.toLocaleString('en-IN'),
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      key: 'CATALOGUE',
      label: language === 'mr' ? 'सर्व कॅटलॉग' : language === 'hi' ? 'उत्पाद कैटलॉग' : 'Product Catalogue',
      icon: Layers,
      count: totalCatalogueCount.toLocaleString('en-IN'),
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      key: 'OUT_OF_STOCK',
      label: language === 'mr' ? 'साठा संपला' : language === 'hi' ? 'स्टॉक समाप्त' : 'Out of Stock',
      icon: MinusCircle,
      count: outOfStockCount.toLocaleString('en-IN'),
      iconColor: 'text-rose-600 dark:text-rose-400'
    },
    {
      key: 'LOW_STOCK',
      label: language === 'mr' ? 'कमी साठा' : language === 'hi' ? 'कम स्टॉक' : 'Low Stock',
      icon: AlertTriangle,
      count: lowStockCount.toLocaleString('en-IN'),
      iconColor: 'text-amber-600 dark:text-amber-400'
    }
  ];

  const expiryFilterOptions: Array<{
    id: ExpiryStatus | 'ALL';
    label: string;
    count?: number;
  }> = [
    {
      id: 'ALL',
      label: language === 'mr' ? 'सर्व' : language === 'hi' ? 'सभी' : 'All',
      count: totalActiveBatches
    },
    {
      id: 'EXPIRED',
      label: language === 'mr' ? '🔴 कालबाह्य' : language === 'hi' ? '🔴 एक्सपायर्ड' : '🔴 Expired',
      count: expiredBatchesCount
    },
    {
      id: 'EXPIRING_TODAY',
      label: language === 'mr' ? '🟠 आज' : language === 'hi' ? '🟠 आज' : '🟠 Today',
      count: expiringTodayBatchesCount
    },
    {
      id: 'EXPIRING_TOMORROW',
      label: language === 'mr' ? '🟡 उद्या' : language === 'hi' ? '🟡 कल' : '🟡 Tomorrow',
      count: expiringTomorrowBatchesCount
    },
    {
      id: 'EXPIRING_IN_3_DAYS',
      label: language === 'mr' ? '🟢 ३ दिवस' : language === 'hi' ? '🟢 3 दिन' : '🟢 3 Days',
      count: expiring3DaysBatchesCount
    },
    {
      id: 'FRESH',
      label: language === 'mr' ? '🔵 ताजा' : language === 'hi' ? '🔵 ताज़ा' : '🔵 Fresh',
      count: freshBatchesCount
    }
  ];

  return (
    <div className="space-y-3 px-1 sm:px-0 pb-36 sm:pb-8 max-w-5xl mx-auto">
      
      {/* 1. COMPACT PAGE HEADER (ONE ROW) */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#131F1B] p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/40 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
              {language === 'mr' ? 'दुकान माल व साठा' : language === 'hi' ? 'दुकान का माल और स्टॉक' : 'Dairy Stock & Inventory'}
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] font-medium truncate hidden sm:block">
              {language === 'mr' ? 'एकदम सोपे: माल आला (+) दाबा, माल संपला (-) दाबा' : language === 'hi' ? 'सरल: माल आया (+) दबाएं, बिका (-) दबाएं' : 'Simple: (+) for Stock In, (-) for Stock Out'}
            </p>
          </div>
        </div>

        {/* Single + Add Primary Button */}
        <button
          type="button"
          onClick={() => setShowQuickAdd((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-sm shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'mr' ? '+ नवीन माल' : language === 'hi' ? '+ नया माल' : '+ Add'}</span>
        </button>
      </div>

      {/* QUICK INLINE ADD PRODUCT FORM (Expandable in 1 tap) */}
      {showQuickAdd && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-[#131F1B] dark:to-[#1A2A25] p-3.5 sm:p-5 rounded-2xl border border-emerald-200 dark:border-[#24352F] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-200 dark:border-[#24352F] pb-2">
            <h3 className="font-extrabold text-emerald-950 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{language === 'mr' ? 'फक्त १ मिनिटात नवीन माल जोडा' : language === 'hi' ? 'सिर्फ 1 मिनट में नया माल जोड़ें' : 'Add New Product in 1 Minute'}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={onOpenAddProduct} 
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 underline hover:text-emerald-800"
              >
                {language === 'mr' ? 'पूर्ण फॉर्म →' : language === 'hi' ? 'विस्तृत फॉर्म →' : 'Full Form →'}
              </button>
              <button 
                type="button"
                onClick={() => setShowQuickAdd(false)} 
                className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'मालाचे नाव *' : language === 'hi' ? 'माल का नाम *' : 'Product Name *'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={language === 'mr' ? 'उदा. म्हशीचे दूध / पनीर / तूप' : language === 'hi' ? 'उदा. भैंस का दूध / पनीर / घी' : 'e.g. Buffalo Milk / Paneer / Ghee'}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full pl-3 pr-20 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleQuickVoiceClick}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition ${
                    isQuickVoiceListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                  title="बोलून नाव भरा (Voice Input)"
                >
                  <Mic className={`w-3 h-3 ${isQuickVoiceListening ? 'animate-bounce' : ''}`} />
                  <span className="text-[10px] font-black">{isQuickVoiceListening ? 'ऐकत आहे...' : 'बोला'}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'प्रवर्ग' : language === 'hi' ? 'केटेगरी' : 'Category'}
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
                {language === 'mr' ? 'एकक' : language === 'hi' ? 'नाप' : 'Unit'}
              </label>
              <select
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value as ProductUnit)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-slate-900 dark:text-white text-xs font-semibold focus:outline-none"
              >
                <option value="Litre">{language === 'mr' ? 'लिटर (Ltr)' : language === 'hi' ? 'लीटर' : 'Litre (Ltr)'}</option>
                <option value="Kg">{language === 'mr' ? 'किलो (Kg)' : language === 'hi' ? 'किलो' : 'Kg'}</option>
                <option value="Packet (500ml)">{language === 'mr' ? '५००ml पिशवी' : language === 'hi' ? '500ml थैली' : '500ml Pouch'}</option>
                <option value="Piece">{language === 'mr' ? 'नग / पीस' : language === 'hi' ? 'पीस' : 'Piece'}</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {language === 'mr' ? 'विक्री भाव (₹) *' : language === 'hi' ? 'बिक्री भाव (₹) *' : 'Selling Price (₹) *'}
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="70"
                value={quickSellPrice}
                onChange={(e) => setQuickSellPrice(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-[#24352F] text-xs font-black text-emerald-900 dark:text-emerald-400 focus:outline-none"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {language === 'mr' ? 'जतन करा' : language === 'hi' ? 'जोड़ें' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. QUICK ACTIONS ROW (ONE HORIZONTALLY SCROLLABLE ROW) */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none snap-x py-0.5 px-0.5 -mx-0.5">
        
        {/* Chip 1: Barcode Stock-In (Primary filled green) */}
        <button
          type="button"
          onClick={() => setShowBarcodeStockIn(true)}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Scan & Stock In"
        >
          <Barcode className="w-4 h-4 shrink-0" />
          <span>{language === 'mr' ? 'बारकोड आवक' : language === 'hi' ? 'बारकोड आवक' : 'Barcode Stock-In'}</span>
        </button>

        {/* Chip 2: Stock PDF */}
        <button
          type="button"
          onClick={handleDownloadStockPDF}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-50 dark:hover:bg-[#1A2A25] active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Download Stock Valuation PDF"
        >
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{language === 'mr' ? 'साठा PDF' : language === 'hi' ? 'स्टॉक PDF' : 'Stock PDF'}</span>
        </button>

        {/* Chip 3: Print */}
        <button
          type="button"
          onClick={handlePrintStockPDF}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-50 dark:hover:bg-[#1A2A25] active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Print Stock Valuation Report"
        >
          <Printer className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
          <span>{language === 'mr' ? 'प्रिंट' : language === 'hi' ? 'प्रिंट' : 'Print'}</span>
        </button>

        {/* Chip 4: Photo Database (Images) */}
        <button
          type="button"
          onClick={() => setShowImageManager(true)}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-purple-50/50 dark:hover:bg-purple-950/30 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="Product Image Database Manager"
        >
          <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>{language === 'mr' ? 'फोटो डेटाबेस' : language === 'hi' ? 'फोटो डेटाबेस' : 'Photo Database'}</span>
        </button>

        {/* Chip 5: Report/doc icon (CSV / Excel) */}
        <button
          type="button"
          onClick={() => exportProductsToCSV(filteredProducts, language as any)}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-50 dark:hover:bg-[#1A2A25] active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          title={language === 'mr' ? 'सर्व मालाचा अहवाल Excel/CSV डाउनलोड करा' : 'Export Products to CSV/Excel'}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>CSV / Excel</span>
        </button>

        {/* Chip 6: Show/Hide Eye (View PDF) */}
        <button
          type="button"
          onClick={handleViewStockPDF}
          className="h-10 shrink-0 snap-start px-3.5 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-50 dark:hover:bg-[#1A2A25] active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#24352F] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          title="View Stock Valuation PDF"
        >
          <Eye className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] shrink-0" />
          <span>{language === 'mr' ? 'पहा' : language === 'hi' ? 'देखें' : 'View PDF'}</span>
        </button>

      </div>

      {/* 3. VIEW TOGGLE: SEGMENTED CONTROL (FULL WIDTH, 2 EQUAL HALVES) */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#1A2A25] rounded-xl border border-slate-200/80 dark:border-[#24352F]">
        <button
          type="button"
          onClick={() => setViewMode('cards')}
          className={`h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            viewMode === 'cards'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? 'सोपा कार्ड व्ह्यू' : language === 'hi' ? 'सरल कार्ड व्यू' : 'Simple Cards'}</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('table')}
          className={`h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
            viewMode === 'table'
              ? 'bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>{language === 'mr' ? 'यादी व्ह्यू' : language === 'hi' ? 'लिस्ट व्यू' : 'Table View'}</span>
        </button>
      </div>

      {/* 4. STATUS TABS: 2x2 EQUAL-SIZE GRID */}
      <div className="grid grid-cols-2 gap-2">
        {statusTabs.map((tab) => {
          const isActive = inventoryViewTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setInventoryViewTab(tab.key)}
              className={`p-2.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-2 active:scale-[0.98] cursor-pointer min-w-0 ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-[#24352F] hover:bg-slate-50 dark:hover:bg-[#1A2A25]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : tab.iconColor}`} />
                <span className="text-xs font-bold truncate leading-tight">{tab.label}</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black shrink-0 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* STICKY SEARCH & FILTERS HEADER AREA (sticky on tablet/desktop; scrolls freely on mobile so full In-Stock list is visible) */}
      <div className="sm:sticky sm:top-0 z-20 bg-[#f8fafc] dark:bg-[#0B1210] pt-1 pb-2 space-y-2 -mx-1 px-1 transition-colors">
        
        {/* 5. LOW-STOCK SLIM ALERT STRIP (ONLY IF lowStockCount > 0) */}
        {lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => setInventoryViewTab('LOW_STOCK')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 text-xs font-bold transition-all hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-[0.99] cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 truncate">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
              <span className="truncate">
                {lowStockCount.toLocaleString('en-IN')}{' '}
                {language === 'mr'
                  ? 'उत्पादनाचा साठा कमी आहे (Low Stock)'
                  : language === 'hi'
                  ? 'उत्पाद का स्टॉक कम है (Low Stock)'
                  : 'item running low on stock'}
              </span>
            </div>
            <span className="text-[11px] font-black underline shrink-0 text-amber-700 dark:text-amber-400">
              {language === 'mr' ? 'पहा →' : language === 'hi' ? 'देखें →' : 'View →'}
            </span>
          </button>
        )}

        {/* 6. SEARCH + SCAN ROW (HEIGHT h-11) */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C]" />
            <input
              type="text"
              placeholder={
                language === 'mr'
                  ? 'दूध, पनीर, दही, तूप शोधा...'
                  : language === 'hi'
                  ? 'दूध, पनीर, दही, घी खोजें...'
                  : 'Search milk, paneer, curd, ghee...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            aria-label={language === 'mr' ? 'बारकोड स्कॅन' : 'बारकोड स्कैन'}
            title={language === 'mr' ? 'लाईव्ह बारकोड स्कॅनर सुरू करा' : 'लाइव बारकोड स्कैनर शुरू करें'}
            className="w-11 h-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <Barcode className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Live Barcode Search Feedback Banner (if user typed/scanned a numeric barcode) */}
        {searchQuery && /^\d{5,}$/.test(searchQuery.trim()) && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between gap-2 text-xs animate-fadeIn shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'mr' ? 'बारकोड: ' : 'बारकोड: '}
                  <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">{searchQuery.trim()}</span>
                </span>
                {isSearchingOnline && (
                  <span className="ml-2 text-slate-500 italic">
                    {language === 'mr' ? '(डेटाबेस शोधत आहे...)' : '(डेटाबेस खोज रहे हैं...)'}
                  </span>
                )}
                {!isSearchingOnline && filteredProducts.length > 0 && (
                  <span className="ml-2 font-bold text-emerald-600 dark:text-emerald-400">
                    ✓ {filteredProducts[0].name} {filteredProducts[0].stock_quantity > 0 ? `(साठा: ${filteredProducts[0].stock_quantity})` : '(कॅटलॉग साठा: ०)'}
                  </span>
                )}
                {!isSearchingOnline && filteredProducts.length === 0 && (
                  <span className="ml-2 font-medium text-amber-600 dark:text-amber-400">
                    {language === 'mr' ? 'हा बारकोड सापडला नाही.' : 'यह बारकोड नहीं मिला।'}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (filteredProducts.length > 0) {
                  setSelectedProductForStockIn(filteredProducts[0]);
                } else {
                  setShowBarcodeStockIn(true);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 shadow-2xs transition active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>{language === 'mr' ? '+ माल आवक' : '+ स्टॉक आवक'}</span>
            </button>
          </div>
        )}

        {/* 7. FILTERS: CATEGORIES & BATCH EXPIRY */}
        {/* Category Chips in a Single Horizontally Scrollable Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {categories.map((cat) => {
            const count =
              cat.id === 'All'
                ? totalCatalogueCount
                : products.filter((p) => p.category === cat.id).length;
            const isCatSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
                  isCatSelected
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200/80 dark:border-[#24352F]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isCatSelected
                      ? 'bg-emerald-800/60 text-white'
                      : 'bg-slate-100 dark:bg-[#24352F] text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {count.toLocaleString('en-IN')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch Expiry Filters in a Second Compact Scrollable Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#8FA69C] shrink-0 uppercase tracking-wider">
            {language === 'mr' ? 'बॅच:' : language === 'hi' ? 'बैच:' : 'BATCH EXPIRY:'}
          </span>
          {expiryFilterOptions.map((opt) => {
            const isSelected = selectedExpiryFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedExpiryFilter(opt.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-200/80 dark:border-[#24352F]'
                }`}
              >
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-black/20 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Critical Urgent Expired Batches Warning (if any) */}
      {expiredBatchesCount > 0 && (
        <div className="p-3 rounded-2xl bg-rose-50/95 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2 shadow-2xs text-rose-950 dark:text-rose-200 animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-xs font-bold truncate">
              {expiredBatchesCount} {language === 'mr' ? 'बॅच कालबाह्य (विक्री बंद आहे)' : 'बैच एक्सपायर (बिलिंग ब्लॉक)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('damages')}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            {language === 'mr' ? 'खराब नोंदवा' : 'डैमेज दर्ज करें'}
          </button>
        </div>
      )}

      {/* VIEW 1: ULTRA-SIMPLE LARGE TOUCH CARDS VIEW (DEFAULT) */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-[#131F1B] rounded-2xl p-12 border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
              <Package className="w-14 h-14 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                {language === 'mr' ? 'कोणतेही उत्पादन उपलब्ध नाही' : language === 'hi' ? 'कोई उत्पाद उपलब्ध नहीं है' : 'No Products in Inventory'}
              </h3>
              <p className="text-xs text-slate-400 dark:text-[#8FA69C] mt-1 mb-4 max-w-sm">
                {language === 'mr' ? 'नवीन उत्पादन जोडण्यासाठी खालील बटनावर क्लिक करा.' : language === 'hi' ? 'नया उत्पाद जोड़ने के लिए नीचे दिए गए बटन पर क्लिक करें।' : 'Click the button below to add your first dairy product.'}
              </p>
              <button
                type="button"
                onClick={onOpenAddProduct}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addProduct')}</span>
              </button>
            </div>
          ) : (
            visibleProducts.map((prod) => {
            const isOutOfStock = prod.stock_quantity <= 0;
            const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
            const displayName = getProductDisplayName(prod);

            const prodBatches = batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0);
            const validProdBatches = prodBatches
              .filter(b => computeExpiryStatus(b.expiry_date).status !== 'EXPIRED')
              .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
            const earliestActiveBatch = validProdBatches[0];
            const activeBatchSellingPrice = (earliestActiveBatch && earliestActiveBatch.selling_price && earliestActiveBatch.selling_price > 0)
              ? earliestActiveBatch.selling_price
              : prod.selling_price;
            const hasCustomBatchPrice = Boolean(earliestActiveBatch && earliestActiveBatch.selling_price && earliestActiveBatch.selling_price > 0 && earliestActiveBatch.selling_price !== prod.selling_price);

            const expiredBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRED');
            const expiringTodayBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TODAY');
            const expiringTomorrowBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_TOMORROW');
            const expiring3DaysBatches = prodBatches.filter(b => computeExpiryStatus(b.expiry_date).status === 'EXPIRING_IN_3_DAYS');

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
                          <span>{language === 'mr' ? 'माल संपला' : language === 'hi' ? 'खत्म' : 'Out of Stock'}</span>
                        </>
                      ) : isLowStock ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{language === 'mr' ? 'कमी साठा' : language === 'hi' ? 'कम स्टॉक' : 'Low Stock'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{language === 'mr' ? 'उपलब्ध आहे' : language === 'hi' ? 'उपलब्ध' : 'In Stock'}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Compact 1:1 Square Product Image Showcase — Hold Photo to View Full Image & Edit URL */}
                  <div className="my-2 space-y-2">
                    <HoldableImageBox
                      onHold={() => setPreviewImageProduct(prod)}
                      className="group/img relative w-36 h-36 sm:w-40 sm:h-40 mx-auto aspect-square rounded-2xl bg-white border border-slate-200/80 dark:border-[#24352F] shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer"
                      title={language === 'mr' ? 'इमेज URL बदलण्यासाठी फोटोवर होल्ड करा' : language === 'hi' ? 'इमेज URL बदलने के लिए फोटो पर होल्ड करें' : 'Hold image to view & edit URL'}
                    >
                      <ProductImage 
                        src={prod.image_url} 
                        alt={prod.name} 
                        category={prod.category} 
                        fill
                        className="group-hover/img:scale-[1.03] transition-transform duration-200"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageProduct(prod);
                        }}
                        className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 hover:bg-emerald-700 text-white text-[9px] font-bold opacity-85 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity backdrop-blur-xs cursor-pointer"
                        title={language === 'mr' ? 'फोटो / URL बदला' : language === 'hi' ? 'फोटो / URL बदलें' : 'Photo / URL'}
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>URL</span>
                      </button>
                    </HoldableImageBox>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {displayName}
                      </h3>
                      {displayName !== prod.name && (
                        <p className="text-xs text-slate-400 dark:text-[#8FA69C] font-medium truncate mt-0.5">
                          {prod.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* BATCH & EXPIRY STATUS STRIP */}
                  <div className="mt-2.5 mb-2 flex items-center justify-between gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedProductForBatches(prod)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-[#1A2A25] dark:hover:bg-[#223630] text-slate-700 hover:text-emerald-800 dark:text-[#E7F0EC] dark:hover:text-emerald-300 border border-slate-200/80 dark:border-[#24352F] text-[11px] font-black transition-all group"
                      title={language === 'mr' ? 'सर्व बॅचेस व एक्सपायरी तपशील पहा' : language === 'hi' ? 'सभी बैचेस व एक्सपायरी विवरण देखें' : 'View batches & expiry details'}
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>{prodBatches.length} {t('batches')}</span>
                      <span className="text-[10px] text-slate-400 dark:text-[#8FA69C]">&bull; {t('viewBatches')} &rarr;</span>
                    </button>

                    {expiredBatches.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-black border border-rose-300 dark:border-rose-800/80 text-[10px] animate-pulse">
                        🔴 {expiredBatches.length} {language === 'mr' ? 'मुदत संपली' : language === 'hi' ? 'एक्सपायर्ड' : 'Expired'}
                      </span>
                    ) : expiringTodayBatches.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-900 dark:text-orange-300 font-black border border-orange-300 dark:border-orange-800/80 text-[10px]">
                        🟠 {language === 'mr' ? 'आज संपत आहे' : language === 'hi' ? 'आज एक्सपायर' : 'Expiring Today'}
                      </span>
                    ) : expiringTomorrowBatches.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 font-black border border-amber-300 dark:border-amber-800/80 text-[10px]">
                        🟡 {language === 'mr' ? 'उद्या संपेल' : language === 'hi' ? 'कल एक्सपायर' : 'Exp. Tomorrow'}
                      </span>
                    ) : expiring3DaysBatches.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800/80 text-[10px]">
                        🟢 3 {language === 'mr' ? 'दिवसांत' : language === 'hi' ? 'दिनों में' : 'Days'}
                      </span>
                    ) : prodBatches.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-[#1A2A25] text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                        ✅ {language === 'mr' ? 'ताजा माल' : language === 'hi' ? 'ताज़ा माल' : 'Fresh'}
                      </span>
                    ) : null}
                  </div>

                  {/* Big Number: Current Stock In Hand */}
                  <div className="bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-slate-100 dark:border-[#24352F] my-2 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                        {language === 'mr' ? 'सध्या दुकानात शिल्लक:' : language === 'hi' ? 'दुकान में कितना बचा है:' : 'Stock in Shop:'}
                      </span>
                      <span className={`text-2xl font-black ${isOutOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {prod.stock_quantity} <span className="text-sm font-bold text-slate-500 dark:text-[#8FA69C]">{prod.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">
                        {language === 'mr' ? 'विक्री भाव:' : language === 'hi' ? 'बिक्री भाव:' : 'Selling Rate:'}
                      </span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                        ₹{activeBatchSellingPrice}
                      </span>
                      {hasCustomBatchPrice && (
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block leading-none">
                          ({language === 'mr' ? 'बॅच दर' : 'बैच दर'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* SIMPLE 1-CLICK ACTION BUTTONS */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* BUTTON 1: माल आया (+ STOCK IN) */}
                    <button
                      onClick={() => setSelectedProductForStockIn(prod)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <ArrowUpCircle className="w-4 h-4 text-emerald-200" />
                      <span>{language === 'mr' ? '+ माल आला' : language === 'hi' ? '+ माल आया' : '+ Stock In'}</span>
                    </button>

                    {/* BUTTON 2: माल गया (- STOCK OUT) */}
                    <button
                      onClick={() => handleOpenAdjustModal(prod, 'out')}
                      disabled={prod.stock_quantity <= 0}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-800 dark:text-[#E7F0EC] hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-[#24352F] font-extrabold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all"
                    >
                      <ArrowDownCircle className="w-4 h-4 text-slate-500 dark:text-[#8FA69C] hover:text-rose-600" />
                      <span>{language === 'mr' ? '- माल गेला' : language === 'hi' ? '- माल गया' : '- Stock Out'}</span>
                    </button>

                  </div>

                  {/* Edit / Delete footer */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-400 dark:text-[#8FA69C]">
                    <span>
                      {language === 'mr' ? 'खरेदी दर:' : language === 'hi' ? 'खरीद भाव:' : 'Cost Price:'} ₹{prod.purchase_price}
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
                            : language === 'hi'
                            ? `क्या आप "${displayName}" को हटाना चाहते हैं?`
                            : `Are you sure you want to delete "${displayName}"?`;
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
          })
        )}

        {hasMore && (
          <div className="col-span-full pt-3 pb-2 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white dark:bg-[#1A2A25] hover:bg-emerald-50 dark:hover:bg-[#24352F] border border-slate-200 dark:border-[#24352F] text-emerald-700 dark:text-emerald-400 font-extrabold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {language === 'mr'
                  ? `आणखी उत्पादने दाखवा (उर्वरित ${(filteredProducts.length - displayLimit).toLocaleString('en-IN')})`
                  : language === 'hi'
                  ? `और उत्पाद दिखाएं (शेष ${(filteredProducts.length - displayLimit).toLocaleString('en-IN')})`
                  : `Load More (${(filteredProducts.length - displayLimit).toLocaleString('en-IN')} remaining)`}
              </span>
            </button>
            <span className="text-[10px] text-slate-400 dark:text-[#8FA69C]">
              {visibleProducts.length.toLocaleString('en-IN')} / {filteredProducts.length.toLocaleString('en-IN')} {language === 'mr' ? 'उत्पादने दाखवली' : 'उत्पाद प्रदर्शित'}
            </span>
          </div>
        )}
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
                  <th className="px-3 py-3 text-center">{language === 'mr' ? 'साठा बदल (+/-)' : language === 'hi' ? 'स्टॉक बदलें (+/-)' : 'Stock Adjust (+/-)'}</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      {language === 'mr' ? 'कोणतेही उत्पादन उपलब्ध नाही. "+ नवीन उत्पादन जोडा" वर क्लिक करा.' : language === 'hi' ? 'कोई उत्पाद उपलब्ध नहीं है। "+ नया उत्पाद जोड़ें" पर क्लिक करें।' : 'No products available. Click "+ Add Product".'}
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((prod) => {
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
                  const displayName = getProductDisplayName(prod);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewImageProduct(prod)}
                            className="shrink-0 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition"
                            title={language === 'mr' ? 'फोटो पहा व इमेज URL बदला' : language === 'hi' ? 'फोटो देखें व इमेज URL बदलें' : 'View image & edit URL'}
                          >
                            <ProductImage
                              src={prod.image_url}
                              alt={prod.name}
                              category={prod.category}
                              size="xs"
                              className="shrink-0"
                            />
                          </button>
                          <span className="truncate">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">{prod.category}</td>
                      <td className="px-3 py-3 font-semibold text-slate-600 dark:text-[#8FA69C]">{prod.unit}</td>
                      <td className="px-3 py-3 text-right font-medium text-slate-600 dark:text-[#8FA69C]">₹{prod.purchase_price}</td>
                      <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white">₹{prod.selling_price}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            isOutOfStock ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300' :
                            isLowStock ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300' :
                            'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {prod.stock_quantity} {prod.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedProductForBatches(prod)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                            title={t('viewBatches')}
                          >
                            <Layers className="w-3 h-3" />
                            <span>{batches.filter(b => b.product_id === prod.id && b.qty_remaining > 0).length} {t('batches')}</span>
                          </button>
                        </div>
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
                            onClick={() => setSelectedProductForStockIn(prod)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-[#283C35] rounded text-emerald-700 dark:text-emerald-400"
                            title="+ माल आला (Stock In)"
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
                            const confirmDel = language === 'mr' ? `"${displayName}" हटवायचे?` : language === 'hi' ? `हटाएं ${displayName}?` : `Delete ${displayName}?`;
                            if (window.confirm(confirmDel)) deleteProduct(prod.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="pt-3 pb-4 border-t border-slate-100 dark:border-[#24352F] flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMore}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white dark:bg-[#1A2A25] hover:bg-emerald-50 dark:hover:bg-[#24352F] border border-slate-200 dark:border-[#24352F] text-emerald-700 dark:text-emerald-400 font-extrabold text-xs shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {language === 'mr'
                    ? `आणखी उत्पादने दाखवा (उर्वरित ${(filteredProducts.length - displayLimit).toLocaleString('en-IN')})`
                    : language === 'hi'
                    ? `और उत्पाद दिखाएं (शेष ${(filteredProducts.length - displayLimit).toLocaleString('en-IN')})`
                    : `Load More (${(filteredProducts.length - displayLimit).toLocaleString('en-IN')} remaining)`}
                </span>
              </button>
              <span className="text-[10px] text-slate-400 dark:text-[#8FA69C]">
                {visibleProducts.length.toLocaleString('en-IN')} / {filteredProducts.length.toLocaleString('en-IN')} {language === 'mr' ? 'उत्पादने दाखवली' : 'उत्पाद प्रदर्शित'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* QUICK STOCK IN / OUT MODAL (TAP ANY CARD BUTTON) */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#131F1B] rounded-2xl sm:rounded-3xl max-w-sm w-full max-h-[90dvh] overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200/80 dark:border-[#24352F]">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
              <div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  adjustType === 'in' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                }`}>
                  {adjustType === 'in' 
                    ? (language === 'mr' ? '+ नवीन माल आला (Stock In)' : language === 'hi' ? '+ नया माल आया (Stock In)' : '+ Stock In')
                    : (language === 'mr' ? '- माल गेला / विक्री (Stock Out)' : language === 'hi' ? '- माल गया / बिक्री (Stock Out)' : '- Stock Out')}
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-base mt-1">
                  {getProductDisplayName(adjustModalProduct)}
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'सध्याचा साठा:' : language === 'hi' ? 'वर्तमान स्टॉक:' : 'Current Stock:'} <b>{adjustModalProduct.stock_quantity} {adjustModalProduct.unit}</b>
                </p>
              </div>

              <button onClick={() => setAdjustModalProduct(null)} className="text-slate-400 hover:text-slate-600 dark:text-[#8FA69C] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                {adjustType === 'in'
                  ? (language === 'mr' ? `किती ${adjustModalProduct.unit} माल आला?` : language === 'hi' ? `कितनी ${adjustModalProduct.unit} माल आया?` : `How many ${adjustModalProduct.unit} arrived?`)
                  : (language === 'mr' ? `किती ${adjustModalProduct.unit} माल गेला?` : language === 'hi' ? `कितना ${adjustModalProduct.unit} माल गया?` : `How many ${adjustModalProduct.unit} dispensed?`)}
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

              {/* BATCH & EXPIRY INPUT (When Stock In) */}
              {adjustType === 'in' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-[#24352F]">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-300 font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{getShelfLifeNote(adjustModalProduct.category, adjustModalProduct.name, language)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                        {t('batchNo')}
                      </label>
                      <input
                        type="text"
                        value={adjustBatchNo}
                        onChange={(e) => setAdjustBatchNo(e.target.value)}
                        placeholder="BN-..."
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-700 dark:text-[#E7F0EC] block mb-1">
                        {t('expiryDate')}
                      </label>
                      <input
                        type="date"
                        value={adjustExpiryDate}
                        onChange={(e) => setAdjustExpiryDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-400 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Preview resulting stock */}
              <div className="mt-3 p-3 bg-slate-50 dark:bg-[#1A2A25] rounded-xl border border-slate-200 dark:border-[#24352F] flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'नवीन शिल्लक साठा होईल:' : language === 'hi' ? 'नया कुल स्टॉक बनेगा:' : 'Resulting Total Stock:'}
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
                {language === 'mr' ? 'होय, साठा अपडेट करा' : language === 'hi' ? 'हाँ, स्टॉक अपडेट करें' : 'Confirm Stock Update'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* COMPREHENSIVE STOCK INWARD & LOT ENTRY MODAL */}
      {selectedProductForStockIn && (
        <StockInwardModal 
          product={selectedProductForStockIn} 
          onClose={() => {
            const closedProd = selectedProductForStockIn;
            setSelectedProductForStockIn(null);
            if (closedProd) {
              // Immediately sync searched card with latest in-memory product state
              const fresh = products.find(p => p.id === closedProd.id);
              if (fresh) {
                setOnlineSearchedProduct(fresh);
                setOnlineSearchResults(prev => {
                  const exists = prev.some(p => p.id === fresh.id);
                  return exists ? prev.map(p => p.id === fresh.id ? fresh : p) : [fresh, ...prev];
                });
              }
            }
          }} 
        />
      )}

      {/* PRODUCT BATCHES & EXPIRY MANAGEMENT MODAL */}
      {selectedProductForBatches && (
        <ProductBatchesModal 
          product={selectedProductForBatches} 
          onClose={() => setSelectedProductForBatches(null)} 
        />
      )}

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        mode="lookup"
        onProductSelected={(prod) => {
          setSelectedProductForStockIn(prod);
        }}
        onBarcodeScanned={(code) => {
          setSearchQuery(code);
        }}
      />

      {/* BARCODE STOCK-IN MODAL (PHASE 7) */}
      <BarcodeStockInModal
        isOpen={showBarcodeStockIn}
        onClose={() => setShowBarcodeStockIn(false)}
        initialBarcode={/^\d{5,}$/.test(searchQuery.trim()) ? searchQuery.trim() : undefined}
      />

      {/* PRODUCT IMAGE DATABASE INTEGRATION MANAGER */}
      <ProductImageManagerModal
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
      />

      {/* CLICK-ON-PHOTO LIGHTBOX + IMAGE URL VIEWER & UPDATER */}
      <ProductImagePreviewModal
        product={previewImageProduct}
        onClose={() => setPreviewImageProduct(null)}
        onImageUpdated={(productId, newUrl) => {
          const nextImg = newUrl || undefined;
          setCatalogueItems(prev => prev.map(p => p.id === productId ? { ...p, image_url: nextImg } : p));
          setOnlineSearchResults(prev => prev.map(p => p.id === productId ? { ...p, image_url: nextImg } : p));
          setOnlineSearchedProduct(prev => prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev);
          setPreviewImageProduct(prev => prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev);
        }}
      />

    </div>
  );
};

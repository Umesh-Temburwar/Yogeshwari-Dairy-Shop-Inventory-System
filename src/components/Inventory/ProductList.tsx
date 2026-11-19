import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ExpiryStatus } from '../../types';
import { ProductBatchesModal } from './ProductBatchesModal';
import { StockInwardModal } from './StockInwardModal';
import {
  InventoryProductCard,
  InventoryListRow,
  InventorySkeletonCard
} from './InventoryProductCard';
import { ProductDetailBottomSheet } from './ProductDetailBottomSheet';
import { InventoryMoreSheet, InventoryViewMode } from './InventoryMoreSheet';
import { computeExpiryStatus } from '../../lib/shelfLifeUtils';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Package,
  X,
  Layers,
  Barcode,
  MoreVertical,
  RotateCcw,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  printReport,
  downloadReportPDF,
  viewReportPDF,
  abbreviateUnitForPDF,
  stripEmojisForPDF,
  PDFReportOptions,
  PDFSortOption
} from '../../lib/exportUtils';
import { exportInventoryToExcel } from '../../lib/excelExport';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { BarcodeStockInModal } from '../Scanner/BarcodeStockInModal';
import { ProductImage } from '../Common/ProductImage';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { ProductImageManagerModal } from '../Admin/ProductImageManagerModal';
import { ActiveOperatorBar } from '../Common/ActiveOperatorBar';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { supabase } from '../../lib/supabase';

interface ProductListProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
}

type InventoryFilterTab = 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'OUT_OF_STOCK' | 'ALL';

interface StockToastState {
  productId: string;
  productName: string;
  delta: number;
  unit: string;
  message: string;
}

interface StockBatchInput {
  batch_no: string;
  mfg_date: string;
  expiry_date: string;
}

const PAGE_SIZE = 50;
const LOW_STOCK_DISMISS_KEY = 'ydo_low_stock_banner_dismissed';
const PRODUCT_SELECT_COLS =
  'id, name, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, brand, pack_size, is_active, created_at';

export const ProductList: React.FC<ProductListProps> = ({
  onOpenAddProduct,
  onEditProduct
}) => {
  const {
    products,
    batches,
    metrics,
    deleteProduct,
    adjustStock,
    totalCatalogCount = 0,
    inStockCount: storeInStockCount,
    lowStockCount: storeLowStockCount,
    outOfStockCount: storeOutOfStockCount,
    setIsBarcodeScannerOpen
  } = useStore();
  const { t, language } = useLanguage();

  // Primary Filter State (Default = In Stock so 19k master catalog does not bury real inventory)
  const [activeTab, setActiveTab] = useState<InventoryFilterTab>('IN_STOCK');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<ExpiryStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<InventoryViewMode>('cards');

  // Dismissible Low Stock Banner (session-scoped)
  const [lowStockDismissed, setLowStockDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(LOW_STOCK_DISMISS_KEY) === 'true';
  });

  // Modals & Sheets
  const [detailSheetState, setDetailSheetState] = useState<{
    product: Product;
    initialMode: 'in' | 'out';
  } | null>(null);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [selectedProductForBatches, setSelectedProductForBatches] = useState<Product | null>(null);
  const [selectedProductForStockIn, setSelectedProductForStockIn] = useState<Product | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodeStockIn, setShowBarcodeStockIn] = useState(false);
  const [pendingNewBarcode, setPendingNewBarcode] = useState<string | undefined>(undefined);
  const [forceRegisterNewBarcode, setForceRegisterNewBarcode] = useState(false);
  const [showImageManager, setShowImageManager] = useState(false);
  const [previewImageProduct, setPreviewImageProduct] = useState<Product | null>(null);

  // Stock update flash & 5-second Undo Toast
  const [flashingProductId, setFlashingProductId] = useState<string | null>(null);
  const [stockToast, setStockToast] = useState<StockToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online Search State (300ms debounced)
  const [onlineSearchedProduct, setOnlineSearchedProduct] = useState<Product | null>(null);
  const [onlineSearchResults, setOnlineSearchResults] = useState<Product[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  // Server-side Paginated State (50/page via Supabase .range() for ALL & OUT_OF_STOCK tabs)
  const [pagedItems, setPagedItems] = useState<Product[]>([]);
  const [pagedOffset, setPagedOffset] = useState(0);
  const [isLoadingPaged, setIsLoadingPaged] = useState(false);
  const [hasMorePaged, setHasMorePaged] = useState(true);

  // Client windowing for in-memory tabs (renders 50 at a time, expands on scroll)
  const [localDisplayLimit, setLocalDisplayLimit] = useState(PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Keep StoreContext updated with camera modal status for global shake guard
  useEffect(() => {
    setIsBarcodeScannerOpen(showBarcodeScanner || showBarcodeStockIn);
  }, [showBarcodeScanner, showBarcodeStockIn, setIsBarcodeScannerOpen]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live online search from Supabase (barcodes & product names, 300ms debounced)
  useEffect(() => {
    const q = debouncedQuery;
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

    const runSearch = async () => {
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
        } else if (supabase) {
          const safeQ = q.replace(/[%_]/g, '');
          const { data, error } = await supabase
            .from('products')
            .select(PRODUCT_SELECT_COLS)
            .or(`name.ilike.%${safeQ}%,brand.ilike.%${safeQ}%`)
            .limit(PAGE_SIZE)
            .abortSignal(controller.signal);

          if (!cancelled) {
            if (!error && data) {
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

    runSearch();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  const isServerPagedTab =
    (activeTab === 'ALL' || activeTab === 'OUT_OF_STOCK') && debouncedQuery.length === 0;

  // Fetch initial page (50 items) when ALL or OUT_OF_STOCK tab is active
  useEffect(() => {
    const client = supabase;
    if (!isServerPagedTab || !client) return;
    let cancelled = false;

    const fetchFirstPage = async () => {
      setIsLoadingPaged(true);
      setPagedItems([]);
      setPagedOffset(0);
      setHasMorePaged(true);

      try {
        let query = client
          .from('products')
          .select(PRODUCT_SELECT_COLS)
          .order('stock_quantity', { ascending: false })
          .order('name', { ascending: true })
          .order('id', { ascending: true })
          .range(0, PAGE_SIZE - 1);

        if (activeTab === 'OUT_OF_STOCK') {
          query = query.lte('stock_quantity', 0);
        }
        if (selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        const { data, error } = await query;
        if (!cancelled && !error && data) {
          const rows = data as Product[];
          setPagedItems(rows);
          setPagedOffset(rows.length);
          setHasMorePaged(rows.length === PAGE_SIZE);
        }
      } catch (err: unknown) {
        console.warn('Paged inventory query error:', err);
      } finally {
        if (!cancelled) setIsLoadingPaged(false);
      }
    };

    fetchFirstPage();
    return () => {
      cancelled = true;
    };
  }, [isServerPagedTab, activeTab, selectedCategory]);

  const handleLoadMorePaged = useCallback(async () => {
    if (!supabase || isLoadingPaged || !hasMorePaged || !isServerPagedTab) return;
    setIsLoadingPaged(true);
    try {
      let query = supabase
        .from('products')
        .select(PRODUCT_SELECT_COLS)
        .order('stock_quantity', { ascending: false })
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(pagedOffset, pagedOffset + PAGE_SIZE - 1);

      if (activeTab === 'OUT_OF_STOCK') {
        query = query.lte('stock_quantity', 0);
      }
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const rows = data as Product[];
        setPagedItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const unique = rows.filter((r) => !seen.has(r.id));
          return [...prev, ...unique];
        });
        setPagedOffset((prev) => prev + rows.length);
        setHasMorePaged(rows.length === PAGE_SIZE);
      } else {
        setHasMorePaged(false);
      }
    } catch (err: unknown) {
      console.warn('Load more inventory error:', err);
    } finally {
      setIsLoadingPaged(false);
    }
  }, [isLoadingPaged, hasMorePaged, isServerPagedTab, pagedOffset, activeTab, selectedCategory]);

  // Reset local window when filters change
  useEffect(() => {
    setLocalDisplayLimit(PAGE_SIZE);
  }, [debouncedQuery, selectedCategory, selectedExpiryFilter, activeTab]);

  // Fast lookup map of active batches per product (avoids O(N*M) scans on every render)
  const activeBatchesByProduct = useMemo(() => {
    const map = new Map<string, typeof batches>();
    for (const b of batches) {
      if (b.qty_remaining <= 0) continue;
      const list = map.get(b.product_id);
      if (list) list.push(b);
      else map.set(b.product_id, [b]);
    }
    return map;
  }, [batches]);

  const expiringProductIds = useMemo(() => {
    const set = new Set<string>();
    for (const [productId, list] of activeBatchesByProduct.entries()) {
      for (const b of list) {
        const st = computeExpiryStatus(b.expiry_date).status;
        if (
          st === 'EXPIRED' ||
          st === 'EXPIRING_TODAY' ||
          st === 'EXPIRING_TOMORROW' ||
          st === 'EXPIRING_IN_3_DAYS'
        ) {
          set.add(productId);
          break;
        }
      }
    }
    return set;
  }, [activeBatchesByProduct]);

  const getProductDisplayName = useCallback(
    (prod: Product): string => {
      if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
      if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
      return prod.name;
    },
    [language]
  );

  const getEffectiveSellingPrice = useCallback(
    (prod: Product): number => {
      const prodBatches = activeBatchesByProduct.get(prod.id);
      if (!prodBatches || prodBatches.length === 0) return prod.selling_price;
      let earliestTime = Number.POSITIVE_INFINITY;
      let earliestPrice = prod.selling_price;
      for (const b of prodBatches) {
        if (computeExpiryStatus(b.expiry_date).status === 'EXPIRED') continue;
        const ts = new Date(b.expiry_date).getTime();
        if (ts < earliestTime) {
          earliestTime = ts;
          earliestPrice = b.selling_price && b.selling_price > 0 ? b.selling_price : prod.selling_price;
        }
      }
      return earliestPrice;
    },
    [activeBatchesByProduct]
  );

  // Filtered list combining search, active tab, category & batch expiry filter
  const filteredProducts = useMemo(() => {
    const q = debouncedQuery.toLowerCase();

    // 1. Active Search Mode (local store + Supabase results)
    if (q.length > 0) {
      const baseFiltered = products.filter((p) => {
        const barcodeMatches = Boolean(
          p.barcode &&
            (p.barcode.toLowerCase() === q ||
              p.barcode.toLowerCase() === '0' + q ||
              p.barcode.toLowerCase().replace(/^0+/, '') === q.replace(/^0+/, '') ||
              p.barcode.toLowerCase().includes(q))
        );
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          Boolean(p.hindi_name && p.hindi_name.toLowerCase().includes(q)) ||
          Boolean(p.marathi_name && p.marathi_name.toLowerCase().includes(q)) ||
          Boolean(p.brand && p.brand.toLowerCase().includes(q)) ||
          barcodeMatches;

        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });

      const merged = [...baseFiltered];
      const existingIds = new Set(merged.map((p) => p.id));

      for (const os of onlineSearchResults) {
        const fresh = products.find((p) => p.id === os.id) || os;
        if (!existingIds.has(fresh.id) && (selectedCategory === 'All' || fresh.category === selectedCategory)) {
          existingIds.add(fresh.id);
          merged.push(fresh);
        }
      }

      if (onlineSearchedProduct) {
        const fresh = products.find((p) => p.id === onlineSearchedProduct.id) || onlineSearchedProduct;
        if (!existingIds.has(fresh.id)) {
          merged.unshift(fresh);
        }
      }

      return merged;
    }

    // 2. Server-paginated tabs (ALL & OUT_OF_STOCK) synced with live in-memory updates
    if (isServerPagedTab) {
      return pagedItems.map((item) => products.find((p) => p.id === item.id) || item);
    }

    // 3. In-memory shop tabs (IN_STOCK, LOW_STOCK, EXPIRING)
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;

      if (activeTab === 'IN_STOCK' && p.stock_quantity <= 0) return false;
      if (activeTab === 'LOW_STOCK' && !(p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert)) {
        return false;
      }
      if (activeTab === 'EXPIRING' && !expiringProductIds.has(p.id)) return false;

      if (selectedExpiryFilter !== 'ALL') {
        const prodBatches = activeBatchesByProduct.get(p.id) || [];
        const hasMatch = prodBatches.some(
          (b) => computeExpiryStatus(b.expiry_date).status === selectedExpiryFilter
        );
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [
    products,
    debouncedQuery,
    selectedCategory,
    selectedExpiryFilter,
    activeTab,
    isServerPagedTab,
    pagedItems,
    onlineSearchResults,
    onlineSearchedProduct,
    expiringProductIds,
    activeBatchesByProduct
  ]);

  const visibleProducts = useMemo(() => {
    if (isServerPagedTab) return filteredProducts;
    return filteredProducts.slice(0, localDisplayLimit);
  }, [filteredProducts, isServerPagedTab, localDisplayLimit]);

  const hasMore = isServerPagedTab
    ? hasMorePaged
    : localDisplayLimit < filteredProducts.length;

  const handleLoadMore = useCallback(() => {
    if (isServerPagedTab) {
      handleLoadMorePaged();
    } else {
      setLocalDisplayLimit((prev) => Math.min(prev + PAGE_SIZE, filteredProducts.length));
    }
  }, [isServerPagedTab, handleLoadMorePaged, filteredProducts.length]);

  // Infinite scroll IntersectionObserver (50 per page, never mounts 19k DOM nodes)
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore();
        }
      },
      { rootMargin: '240px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

  // Accurate Counts
  const localInStockCount = useMemo(
    () => products.filter((p) => p.stock_quantity > 0).length,
    [products]
  );
  const localLowStockCount = useMemo(
    () => products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_alert).length,
    [products]
  );
  const localOutOfStockCount = useMemo(
    () => products.filter((p) => p.stock_quantity <= 0).length,
    [products]
  );

  const inStockCount = storeInStockCount ?? localInStockCount;
  const lowStockCount = storeLowStockCount ?? localLowStockCount;
  const totalCatalogueCount = Math.max(totalCatalogCount || 0, products.length);
  const outOfStockCount = storeOutOfStockCount ?? localOutOfStockCount;
  const expiringSoonCount = expiringProductIds.size;

  const {
    expiredBatchesCount,
    expiringTodayBatchesCount,
    expiringTomorrowBatchesCount,
    expiring3DaysBatchesCount,
    freshBatchesCount,
    totalActiveBatches
  } = metrics;

  const totalStockCostValuation = useMemo(
    () => products.reduce((sum, p) => sum + p.stock_quantity * p.purchase_price, 0),
    [products]
  );
  const totalStockRetailValuation = useMemo(
    () => products.reduce((sum, p) => sum + p.stock_quantity * p.selling_price, 0),
    [products]
  );

  // Sync currently open bottom sheet product when stock updates live
  const activeDetailProduct = useMemo(() => {
    if (!detailSheetState) return null;
    return products.find((p) => p.id === detailSheetState.product.id) || detailSheetState.product;
  }, [detailSheetState, products]);

  // Stock Adjust Handler with Count Flash + 5-Second Undo Toast
  const triggerStockFlashAndToast = useCallback(
    (prod: Product, delta: number, isUndo = false) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setFlashingProductId(prod.id);
      flashTimerRef.current = setTimeout(() => setFlashingProductId(null), 900);

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      const dispName = getProductDisplayName(prod);
      const absQty = Math.abs(delta);
      const message = isUndo
        ? `Undid stock change for ${dispName}`
        : delta > 0
        ? `+${absQty} added to ${dispName}`
        : `−${absQty} removed from ${dispName}`;

      setStockToast(
        isUndo
          ? { productId: prod.id, productName: dispName, delta: 0, unit: prod.unit, message }
          : { productId: prod.id, productName: dispName, delta, unit: prod.unit, message }
      );
      toastTimerRef.current = setTimeout(() => setStockToast(null), 5000);
    },
    [getProductDisplayName]
  );

  const handleConfirmStockAdjust = useCallback(
    (prod: Product, delta: number, batchInfo?: StockBatchInput) => {
      adjustStock(prod.id, delta, undefined, batchInfo, prod);
      setPagedItems((prev) =>
        prev.map((item) =>
          item.id === prod.id
            ? { ...item, stock_quantity: Math.max(0, Number((item.stock_quantity + delta).toFixed(2))) }
            : item
        )
      );
      triggerStockFlashAndToast(prod, delta, false);
    },
    [adjustStock, triggerStockFlashAndToast]
  );

  const handleUndoToast = () => {
    if (!stockToast || stockToast.delta === 0) return;
    const prod =
      products.find((p) => p.id === stockToast.productId) ||
      pagedItems.find((p) => p.id === stockToast.productId);
    const reverseDelta = -stockToast.delta;
    adjustStock(stockToast.productId, reverseDelta, 'Undo quick stock adjust', undefined, prod);
    setPagedItems((prev) =>
      prev.map((item) =>
        item.id === stockToast.productId
          ? { ...item, stock_quantity: Math.max(0, Number((item.stock_quantity + reverseDelta).toFixed(2))) }
          : item
      )
    );
    if (prod) {
      triggerStockFlashAndToast(prod, reverseDelta, true);
    } else {
      setStockToast(null);
    }
  };

  const handleOpenDetail = useCallback((prod: Product, initialMode: 'in' | 'out' = 'in') => {
    setDetailSheetState({ product: prod, initialMode });
  }, []);

  const handleDeleteProduct = useCallback(
    (prod: Product) => {
      deleteProduct(prod.id);
      setPagedItems((prev) => prev.filter((item) => item.id !== prod.id));
    },
    [deleteProduct]
  );

  // Dynamic Official A4 PDF / Print / CSV Report Payload (adapts to active tab, category & search filters without changing valuation math)
  const getStockReportPayload = (): PDFReportOptions => {
    const isMr = language === 'mr';
    const isHi = language === 'hi';

    const formatIN = (value: number): string => {
      const rounded = Math.round(value * 100) / 100;
      return rounded.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    };

    const reportItems = filteredProducts;
    const isFilteredView =
      activeTab !== 'IN_STOCK' || selectedCategory !== 'All' || debouncedQuery.length > 0;

    // Exact same stock valuation formulas (cost = stock * purchase_price, retail = stock * selling_price)
    const reportCostValuation = isFilteredView
      ? reportItems.reduce((sum, p) => sum + p.stock_quantity * p.purchase_price, 0)
      : totalStockCostValuation;
    const reportRetailValuation = isFilteredView
      ? reportItems.reduce((sum, p) => sum + p.stock_quantity * p.selling_price, 0)
      : totalStockRetailValuation;
    const reportPotentialProfit = reportRetailValuation - reportCostValuation;
    const reportLowStockCount = isFilteredView
      ? reportItems.filter((p) => p.stock_quantity <= p.min_stock_alert).length
      : lowStockCount;
    const reportSkuCount = isFilteredView ? reportItems.length : products.length;

    // Dynamic report title & period reflecting active inventory filter/need
    const tabTitle =
      activeTab === 'LOW_STOCK'
        ? 'Low Stock & Reorder Valuation Report'
        : activeTab === 'OUT_OF_STOCK'
        ? 'Out of Stock Catalog Report'
        : activeTab === 'EXPIRING'
        ? 'Expiring Soon Inventory Report'
        : 'Stock Valuation & Catalog Report';

    const periodParts: string[] = [];
    if (activeTab === 'LOW_STOCK') {
      periodParts.push('Low Stock Items');
    } else if (activeTab === 'OUT_OF_STOCK') {
      periodParts.push('Out of Stock');
    } else if (activeTab === 'EXPIRING') {
      periodParts.push('Expiring Soon');
    } else if (activeTab === 'ALL') {
      periodParts.push('All Loaded Catalog');
    } else {
      periodParts.push(
        'Current Stock & Inventory Valuation'
      );
    }
    if (selectedCategory !== 'All') {
      periodParts.push(`${'Category'}: ${selectedCategory}`);
    }
    if (debouncedQuery.length > 0) {
      periodParts.push(`${'Search'}: "${debouncedQuery}"`);
    }

    const buildRowsFromList = (list: Product[]): { rows: (string | number)[][]; rowClasses: string[] } => {
      const rows: (string | number)[][] = [];
      const rowClasses: string[] = [];

      list.forEach((p, idx) => {
        const stockVal = p.stock_quantity * p.purchase_price;
        const isLow = p.stock_quantity <= p.min_stock_alert;
        const shortUnit = abbreviateUnitForPDF(p.unit);
        const cleanName = stripEmojisForPDF(getProductDisplayName(p)) || stripEmojisForPDF(p.name);

        rows.push([
          idx + 1,
          cleanName,
          p.category,
          `${formatIN(p.stock_quantity)} ${shortUnit}`,
          formatIN(p.purchase_price),
          formatIN(p.selling_price),
          `${formatIN(p.min_stock_alert)} ${shortUnit}`,
          formatIN(stockVal),
          isLow ? 'LOW' : 'OK'
        ]);
        rowClasses.push(isLow ? 'row-low' : '');
      });

      return { rows, rowClasses };
    };

    const initialTable = buildRowsFromList(reportItems);

    const sortOptions: PDFSortOption[] = [
      {
        id: 'default',
        label: 'Sort: Default',
        sortRows: () => buildRowsFromList(reportItems)
      },
      {
        id: 'stock_desc',
        label: 'Stock: High → Low',
        sortRows: () =>
          buildRowsFromList([...reportItems].sort((a, b) => b.stock_quantity - a.stock_quantity))
      },
      {
        id: 'name_asc',
        label: 'Name: A → Z',
        sortRows: () =>
          buildRowsFromList(
            [...reportItems].sort((a, b) =>
              stripEmojisForPDF(getProductDisplayName(a)).localeCompare(
                stripEmojisForPDF(getProductDisplayName(b))
              )
            )
          )
      },
      {
        id: 'category_asc',
        label: 'Category: A → Z',
        sortRows: () =>
          buildRowsFromList(
            [...reportItems].sort(
              (a, b) =>
                a.category.localeCompare(b.category) ||
                stripEmojisForPDF(a.name).localeCompare(stripEmojisForPDF(b.name))
            )
          )
      },
      {
        id: 'low_first',
        label: 'Low Stock First',
        sortRows: () =>
          buildRowsFromList(
            [...reportItems].sort((a, b) => {
              const aLow = a.stock_quantity <= a.min_stock_alert ? 0 : 1;
              const bLow = b.stock_quantity <= b.min_stock_alert ? 0 : 1;
              if (aLow !== bLow) return aLow - bLow;
              return a.stock_quantity - b.stock_quantity;
            })
          )
      }
    ];

    const grandTotalCostVal = reportItems.reduce(
      (sum, p) => sum + p.stock_quantity * p.purchase_price,
      0
    );
    const grandTotalRetailVal = reportItems.reduce(
      (sum, p) => sum + p.stock_quantity * p.selling_price,
      0
    );

    return {
      title: tabTitle,
      toolbarTitle: 'Stock Valuation Report',
      subtitle: 'Dairy Farm & Products ERP',
      periodText: periodParts.join(' • '),
      language,
      kpis: [
        {
          label: 'Total SKUs',
          value: `${reportSkuCount}`,
          color: 'emerald'
        },
        {
          label: 'Cost Valuation',
          value: `₹${formatIN(reportCostValuation)}`,
          color: 'blue'
        },
        {
          label: 'Retail Valuation',
          value: `₹${formatIN(reportRetailValuation)}`,
          color: 'purple'
        },
        {
          label: 'Low Stock Items',
          value: `${reportLowStockCount}`,
          color: 'rose'
        }
      ],
      summaryNote: `Potential Profit = Retail - Cost: ₹${formatIN(reportPotentialProfit)}`,
      table: {
        headers: ['Sr. No.', 'Product Name', 'Category', 'Stock', 'Purchase Rate ₹', 'Selling Rate ₹', 'Min Alert', 'Stock Value ₹', 'Status'],
        columnWidths: ['6%', '24%', '13%', '10%', '10%', '10%', '9%', '11%', '7%'],
        alignments: ['center', 'left', 'left', 'right', 'right', 'right', 'right', 'right', 'center'],
        nowrapColumns: [0, 3, 6, 8],
        boldColumns: [7],
        statusColumnIndex: 8,
        rows: initialTable.rows,
        rowClasses: initialTable.rowClasses,
        sortOptions,
        summaryRow: [
          '',
          'Grand Total',
          `${reportItems.length} SKUs`,
          '',
          `₹${formatIN(grandTotalCostVal)}`,
          `₹${formatIN(grandTotalRetailVal)}`,
          '',
          `₹${formatIN(grandTotalCostVal)}`,
          ''
        ]
      },
      notes: 'Official inventory valuation statement. Items marked LOW are at or below minimum alert threshold.'
    };
  };

  const categories = useMemo(
    () => [
      { id: 'All', label: 'All Categories' },
      { id: 'Milk', label: t('catMilk') },
      { id: 'Paneer & Butter', label: t('catPaneer') },
      { id: 'Curd & Chaas', label: t('catCurd') },
      { id: 'Ghee', label: t('catGhee') },
      { id: 'Sweets/Mithai', label: t('catSweets') },
      { id: 'Bakery & Extras', label: t('catBakery') }
    ],
    [language, t]
  );

  const expiryOptions = useMemo(
    () => [
      { id: 'ALL' as const, label: 'All', count: totalActiveBatches },
      { id: 'EXPIRED' as const, label: 'Expired', count: expiredBatchesCount },
      { id: 'EXPIRING_TODAY' as const, label: 'Today', count: expiringTodayBatchesCount },
      { id: 'EXPIRING_TOMORROW' as const, label: 'Tomorrow', count: expiringTomorrowBatchesCount },
      { id: 'EXPIRING_IN_3_DAYS' as const, label: '3 Days', count: expiring3DaysBatchesCount },
      { id: 'FRESH' as const, label: 'Fresh', count: freshBatchesCount }
    ],
    [
      language,
      totalActiveBatches,
      expiredBatchesCount,
      expiringTodayBatchesCount,
      expiringTomorrowBatchesCount,
      expiring3DaysBatchesCount,
      freshBatchesCount
    ]
  );

  const filterChips: Array<{ id: InventoryFilterTab; label: string; count: number }> = [
    {
      id: 'IN_STOCK',
      label: 'In Stock',
      count: inStockCount
    },
    {
      id: 'LOW_STOCK',
      label: 'Low Stock',
      count: lowStockCount
    },
    {
      id: 'EXPIRING',
      label: 'Expiring',
      count: expiringSoonCount
    },
    {
      id: 'OUT_OF_STOCK',
      label: 'Out of Stock',
      count: outOfStockCount
    },
    {
      id: 'ALL',
      label: 'All',
      count: totalCatalogueCount
    }
  ];

  const hasSecondaryFilters = selectedCategory !== 'All' || selectedExpiryFilter !== 'ALL';
  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedCategory('All');
    setSelectedExpiryFilter('ALL');
    setActiveTab('IN_STOCK');
  };

  return (
    <div className="max-w-7xl mx-auto pb-28 lg:pb-10 space-y-2">
      {/* 0. POS-STYLE ACTIVE OPERATOR & STORE BADGE BAR */}
      <ActiveOperatorBar
        locationName="Inventory Master Catalog"
        pulseColor="emerald"
        className="mb-1"
      />

      {/* 1. COMPACT SCROLL-AWAY HEADER (Row 1 + Slim 3-Stat Strip + Dismissible Low Stock Alert) */}
      <div className="space-y-1.5">
        {/* Row 1: Icon + Title + More (⋮) + Round "+ Add" Button */}
        <div className="flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h1 className="text-[16px] sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate">
              {'Stock & Inventory'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowMoreSheet(true)}
              aria-label="More inventory options"
              title="View, Filters & Exports"
              className="relative w-9 h-9 rounded-full bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] flex items-center justify-center active:scale-[0.97] transition-transform cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
              {hasSecondaryFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenAddProduct}
              aria-label="Add new product"
              className="h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{'Add'}</span>
            </button>
          </div>
        </div>

        {/* Slim 3-Stat Summary Strip: ONLY In Stock, Low Stock, Expiring Soon */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('IN_STOCK')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              {'In Stock'}
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {inStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOW_STOCK')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              {'Low'}
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {lowStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPIRING')}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-1 text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] truncate">
              {'Expiring'}
            </span>
            <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              {expiringSoonCount}
            </span>
          </button>
        </div>

        {/* Dismissible 1-Line Low Stock Alert Banner */}
        {lowStockCount > 0 && !lowStockDismissed && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200/90 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                {`${lowStockCount} ${lowStockCount === 1 ? 'item' : 'items'} low on stock`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('LOW_STOCK')}
                className="font-bold underline text-amber-800 dark:text-amber-300 cursor-pointer"
              >
                {'View'}
              </button>
              <button
                type="button"
                aria-label="Dismiss low stock alert"
                onClick={() => {
                  setLowStockDismissed(true);
                  sessionStorage.setItem(LOW_STOCK_DISMISS_KEY, 'true');
                }}
                className="p-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-900/40 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. STICKY SEARCH + CATEGORY CHIPS + STATUS TABS (POS DNA) */}
      <div className="sticky top-0 z-20 -mx-2.5 sm:-mx-6 px-2.5 sm:px-6 pt-1 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] border-b border-slate-200/70 dark:border-[#1E2E28] space-y-1.5">
        {/* Search Input + Inline Barcode Scan Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8FA69C] pointer-events-none" />
            <input
              id="inventory-search-input"
              name="inventorySearch"
              type="text"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or barcode..."
              aria-label="Search inventory products"
              className="w-full h-10 pl-9 pr-14 rounded-xl border border-slate-300/90 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-[#6F877D] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isSearchingOnline && (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              )}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBarcodeScanner(true)}
            aria-label="Scan barcode to search"
            title="Scan Barcode"
            className="w-10 sm:w-auto h-10 px-0 sm:px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 text-xs font-bold shadow-xs active:scale-[0.97] transition-all shrink-0 cursor-pointer"
          >
            <Barcode className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Category Filter Chips Snap-Scroller (POS DNA) */}
        <div className="relative">
          <div
            role="tablist"
            aria-label="Product categories"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center shrink-0 snap-start transition-all duration-150 active:scale-[0.97] cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-[#131F1B] border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#A3B8AF] hover:border-slate-300 dark:hover:border-[#324A42]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
        </div>

        {/* Status Filter Chips Row (In Stock / Low / Expiring / Out / All) */}
        <div className="relative">
          <div
            role="tablist"
            aria-label="Inventory filters"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5"
          >
            {filterChips.map((chip) => {
              const isActive = activeTab === chip.id && !debouncedQuery;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    if (debouncedQuery) {
                      setSearchQuery('');
                      setDebouncedQuery('');
                    }
                    setActiveTab(chip.id);
                  }}
                  className={`snap-start shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 border transition-colors duration-150 active:scale-[0.97] cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-700 dark:border-emerald-700 shadow-xs'
                      : 'bg-white/90 dark:bg-[#131F1B] text-slate-600 dark:text-[#8FA69C] border-slate-200/90 dark:border-[#24352F] hover:border-slate-300'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-[#1E2E28] text-slate-600 dark:text-[#8FA69C]'
                    }`}
                  >
                    {chip.count.toLocaleString('en-IN')}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
        </div>

        {/* Active Secondary Filter Indicator (Category / Expiry) */}
        {hasSecondaryFilters && (
          <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 font-semibold">
                  <span>{selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    aria-label="Clear category filter"
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedExpiryFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50 font-semibold">
                  <span>{selectedExpiryFilter.replace(/_/g, ' ')}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedExpiryFilter('ALL')}
                    aria-label="Clear expiry filter"
                    className="cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline shrink-0 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* 3. PRODUCTS DISPLAY: CARDS (2-COL MOBILE / 3 TABLET / 4-5 DESKTOP), LIST, OR TABLE */}
      {isLoadingPaged && visibleProducts.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pt-0.5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <InventorySkeletonCard key={idx} />
          ))}
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl p-8 sm:p-12 border border-dashed border-slate-200 dark:border-[#24352F] text-center flex flex-col items-center justify-center">
          <Package className="w-11 h-11 text-slate-300 dark:text-[#354E45] mb-2.5" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#E7F0EC]">
            {'No products match'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-1 mb-4 max-w-xs">
            {'Try clearing your search or filters, or add a new product to your shop inventory.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/^\d{5,}$/.test(searchQuery.trim()) && !isSearchingOnline && (
              <button
                type="button"
                onClick={() => {
                  setPendingNewBarcode(searchQuery.trim());
                  setForceRegisterNewBarcode(true);
                  setShowBarcodeStockIn(true);
                }}
                className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition active:scale-[0.97] cursor-pointer shadow-xs"
              >
                <Barcode className="w-4 h-4" />
                <span>
                  {'Register New Barcode'}
                </span>
              </button>
            )}
            {(searchQuery || hasSecondaryFilters || activeTab !== 'IN_STOCK') && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold cursor-pointer"
              >
                {'Clear filters'}
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddProduct}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{'Add Product'}</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pt-0.5">
          {visibleProducts.map((prod) => (
            <InventoryProductCard
              key={prod.id}
              product={prod}
              displayName={getProductDisplayName(prod)}
              sellingPrice={getEffectiveSellingPrice(prod)}
              hasExpiringSoon={expiringProductIds.has(prod.id)}
              isFlashing={flashingProductId === prod.id}
              onOpenDetail={handleOpenDetail}
              onPreviewImage={setPreviewImageProduct}
              onEditProduct={onEditProduct}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-2 pt-0.5">
          {visibleProducts.map((prod) => (
            <InventoryListRow
              key={prod.id}
              product={prod}
              displayName={getProductDisplayName(prod)}
              sellingPrice={getEffectiveSellingPrice(prod)}
              hasExpiringSoon={expiringProductIds.has(prod.id)}
              isFlashing={flashingProductId === prod.id}
              onOpenDetail={handleOpenDetail}
              onPreviewImage={setPreviewImageProduct}
              onEditProduct={onEditProduct}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#1A2A25] border-b border-slate-200 dark:border-[#24352F] text-slate-600 dark:text-[#8FA69C] font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t('productNameCol')}</th>
                  <th className="px-3 py-3">{t('categoryCol')}</th>
                  <th className="px-3 py-3 text-right">{t('costPriceCol')}</th>
                  <th className="px-3 py-3 text-right">{t('sellingPriceCol')}</th>
                  <th className="px-4 py-3 text-center">{t('currentStockCol')}</th>
                  <th className="px-3 py-3 text-center">Adjust</th>
                  <th className="px-4 py-3 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#24352F]">
                {visibleProducts.map((prod) => {
                  const isOutOfStock = prod.stock_quantity <= 0;
                  const isLowStock = prod.stock_quantity <= prod.min_stock_alert && !isOutOfStock;
                  const displayName = getProductDisplayName(prod);
                  const prodBatchesCount = activeBatchesByProduct.get(prod.id)?.length || 0;

                  return (
                    <tr
                      key={prod.id}
                      onClick={() => handleOpenDetail(prod)}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#1A2A25]/60 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImageProduct(prod);
                            }}
                            aria-label={`Preview photo for ${displayName}`}
                            className="shrink-0 rounded-xl overflow-hidden cursor-pointer"
                          >
                            <ProductImage
                              src={prod.image_url}
                              alt={prod.name}
                              category={prod.category}
                              size="xs"
                            />
                          </button>
                          <span className="truncate">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-[#8FA69C]">{prod.category}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 dark:text-[#8FA69C] tabular-nums">
                        ₹{prod.purchase_price}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        ₹{getEffectiveSellingPrice(prod)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                              isOutOfStock
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                : isLowStock
                                ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {prod.stock_quantity} {prod.unit}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForBatches(prod);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            <span>{prodBatchesCount}</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => handleConfirmStockAdjust(prod, -1)}
                            aria-label={`Remove 1 ${displayName}`}
                            className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-[#8FA69C] disabled:opacity-30 cursor-pointer"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(prod, 'in')}
                            aria-label={`Stock in ${displayName}`}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td
                        className="px-4 py-2.5 text-right space-x-1 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onEditProduct(prod)}
                          aria-label={`Edit ${displayName}`}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-[#8FA69C] hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${displayName}"?`)) {
                              handleDeleteProduct(prod);
                            }
                          }}
                          aria-label={`Delete ${displayName}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
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

      {/* Infinite Scroll Sentinel + Manual Fallback */}
      {hasMore && (
        <div ref={loadMoreSentinelRef} className="pt-3 pb-2 flex flex-col items-center gap-2">
          {isLoadingPaged ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {'Loading more products...'}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-5 py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-emerald-50 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-emerald-700 dark:text-emerald-400 text-xs font-bold active:scale-[0.97] transition-transform cursor-pointer"
            >
              {`Load More (${visibleProducts.length.toLocaleString('en-IN')} shown)`}
            </button>
          )}
        </div>
      )}

      {/* FLOATING ACTION BUTTON (FAB): Barcode Stock-In (Bottom Right, above Mobile Bottom Nav) */}
      <button
        type="button"
        onClick={() => setShowBarcodeStockIn(true)}
        aria-label="Barcode Stock-In"
        title={'Barcode Stock-In'}
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] lg:bottom-6 lg:right-6 z-30 h-14 px-4 sm:px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white shadow-lg shadow-emerald-900/30 border border-emerald-400/30 inline-flex items-center gap-2 font-bold text-xs transition-transform duration-150 ease-out motion-reduce:transition-none cursor-pointer"
      >
        <Barcode className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline">
          {'Barcode Stock-In'}
        </span>
      </button>

      {/* 5-SECOND UNDO TOAST AFTER STOCK IN / OUT */}
      {stockToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:bottom-6 z-40 max-w-[92vw] sm:max-w-md px-3.5 py-2.5 rounded-2xl bg-[#131F1B] dark:bg-[#1E312B] text-white border border-emerald-500/40 shadow-xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{stockToast.message}</span>
          {stockToast.delta !== 0 && (
            <button
              type="button"
              onClick={handleUndoToast}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] inline-flex items-center gap-1 shrink-0 active:scale-[0.97] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{'Undo'}</span>
            </button>
          )}
        </div>
      )}

      {/* PRODUCT DETAIL & STOCK STEPPER BOTTOM SHEET */}
      <ProductDetailBottomSheet
        product={activeDetailProduct}
        displayName={activeDetailProduct ? getProductDisplayName(activeDetailProduct) : ''}
        initialMode={detailSheetState?.initialMode || 'in'}
        batches={batches}
        language={language}
        onClose={() => setDetailSheetState(null)}
        onConfirmAdjust={handleConfirmStockAdjust}
        onOpenFullStockIn={(prod) => setSelectedProductForStockIn(prod)}
        onOpenBatches={(prod) => setSelectedProductForBatches(prod)}
        onEdit={onEditProduct}
        onDelete={handleDeleteProduct}
        onPreviewImage={(prod) => setPreviewImageProduct(prod)}
      />

      {/* MORE OPTIONS SHEET (View Mode, Category, Expiry, PDF, Print, CSV, Photo DB) */}
      <InventoryMoreSheet
        isOpen={showMoreSheet}
        viewMode={viewMode}
        selectedCategory={selectedCategory}
        selectedExpiryFilter={selectedExpiryFilter}
        categories={categories}
        expiryOptions={expiryOptions}
        onClose={() => setShowMoreSheet(false)}
        onChangeViewMode={setViewMode}
        onChangeCategory={setSelectedCategory}
        onChangeExpiryFilter={setSelectedExpiryFilter}
        onDownloadPDF={() => downloadReportPDF(getStockReportPayload())}
        onViewPDF={() => viewReportPDF(getStockReportPayload())}
        onPrintPDF={() => printReport(getStockReportPayload())}
        onExportCSV={() => {
          const scopeParts: string[] = [];
          if (activeTab === 'LOW_STOCK') scopeParts.push('Low Stock Items');
          else if (activeTab === 'OUT_OF_STOCK') scopeParts.push('Out of Stock');
          else if (activeTab === 'EXPIRING') scopeParts.push('Expiring Soon');
          else if (activeTab === 'ALL') scopeParts.push('All Loaded Catalog');
          else scopeParts.push('Current Stock');

          if (selectedCategory !== 'All') scopeParts.push(`Category: ${selectedCategory}`);
          if (debouncedQuery.length > 0) scopeParts.push(`Search: ${debouncedQuery}`);

          exportInventoryToExcel({
            products: filteredProducts,
            scopeLabel: scopeParts.join(' | '),
            filenamePrefix: 'Yogeshwari_Dairy_Inventory'
          });
        }}
        onOpenPhotoDatabase={() => setShowImageManager(true)}
      />

      {/* EXISTING MODALS (PRESERVED 100% UNCHANGED) */}
      {selectedProductForStockIn && (
        <StockInwardModal
          product={selectedProductForStockIn}
          onClose={() => {
            const closedProd = selectedProductForStockIn;
            setSelectedProductForStockIn(null);
            if (closedProd) {
              const fresh = products.find((p) => p.id === closedProd.id);
              if (fresh) {
                setOnlineSearchedProduct(fresh);
                setOnlineSearchResults((prev) =>
                  prev.some((p) => p.id === fresh.id)
                    ? prev.map((p) => (p.id === fresh.id ? fresh : p))
                    : [fresh, ...prev]
                );
              }
            }
          }}
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
        onBarcodeNotFound={(code) => {
          setSearchQuery(code);
          setPendingNewBarcode(code);
          setForceRegisterNewBarcode(true);
          setShowBarcodeScanner(false);
          setShowBarcodeStockIn(true);
        }}
      />

      <BarcodeStockInModal
        isOpen={showBarcodeStockIn}
        onClose={() => {
          setShowBarcodeStockIn(false);
          setPendingNewBarcode(undefined);
          setForceRegisterNewBarcode(false);
        }}
        initialBarcode={
          pendingNewBarcode || (/^\d{5,}$/.test(searchQuery.trim()) ? searchQuery.trim() : undefined)
        }
        forceRegisterNew={forceRegisterNewBarcode}
      />

      <ProductImageManagerModal
        isOpen={showImageManager}
        onClose={() => setShowImageManager(false)}
      />

      <ProductImagePreviewModal
        product={previewImageProduct}
        onClose={() => setPreviewImageProduct(null)}
        onImageUpdated={(productId, newUrl) => {
          const nextImg = newUrl || undefined;
          setPagedItems((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, image_url: nextImg } : p))
          );
          setOnlineSearchResults((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, image_url: nextImg } : p))
          );
          setOnlineSearchedProduct((prev) =>
            prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev
          );
          setPreviewImageProduct((prev) =>
            prev && prev.id === productId ? { ...prev, image_url: nextImg } : prev
          );
        }}
      />
    </div>
  );
};

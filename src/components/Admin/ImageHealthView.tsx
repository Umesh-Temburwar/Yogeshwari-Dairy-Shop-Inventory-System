import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Upload,
  RefreshCw,
  AlertTriangle,
  ImageOff,
  Maximize2,
  CheckCircle2,
  Loader2,
  X,
  Sparkles,
  Lock
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ProductImage, clearFailedImageUrl } from '../Common/ProductImage';
import { ProductImagePreviewModal } from '../Common/ProductImagePreviewModal';
import { SquareImageCropperModal } from '../Common/SquareImageCropperModal';
import { CompactPageHeader } from '../Common/CompactPageHeader';
import {
  lookupOfficialImages,
  validateImageFile,
  uploadProcessedProductImage,
  removeManagedStorageImage,
  probeImageHealth,
  OfficialImageCandidate,
  ProcessedSquareImage,
  ImageProbeResult,
  ImageHealthStatus
} from '../../lib/productImageService';

type HealthFilter = 'issues' | ImageHealthStatus;
type ScopeMode = 'in_stock' | 'out_of_stock';

interface RowLookupState {
  loading: boolean;
  candidates: OfficialImageCandidate[];
  notFound: boolean;
  error?: string;
  pendingConfirm?: OfficialImageCandidate | null;
  saving?: boolean;
}

const PROBE_CONCURRENCY = 6;
const INITIAL_VISIBLE_ROWS = 40;
const LOAD_MORE_STEP = 40;
const OUT_OF_STOCK_PAGE_SIZE = 60;

export const ImageHealthView: React.FC = () => {
  const { products, updateProduct, outOfStockCount, refreshData } = useStore();
  const { user, role } = useAuth();
  const isAdmin = Boolean(user) && (role === 'Owner' || role === 'Admin');

  const [scope, setScope] = useState<ScopeMode>('in_stock');
  const [filter, setFilter] = useState<HealthFilter>('issues');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ROWS);
  const [rescanNonce, setRescanNonce] = useState(0);

  // Paginated out-of-stock products loaded directly from Supabase when scope === 'out_of_stock'
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [outOfStockOffset, setOutOfStockOffset] = useState(0);
  const [hasMoreOutOfStock, setHasMoreOutOfStock] = useState(true);
  const [isLoadingOutOfStock, setIsLoadingOutOfStock] = useState(false);

  // Health map keyed by product.id
  const [healthMap, setHealthMap] = useState<Record<string, ImageProbeResult>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const scanRunIdRef = useRef(0);

  // Per-row official image lookup state
  const [rowLookupMap, setRowLookupMap] = useState<Record<string, RowLookupState>>({});
  const [rowMessage, setRowMessage] = useState<{
    productId: string;
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Shared file input & square cropper state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadTargetRef = useRef<Product | null>(null);
  const [cropTarget, setCropTarget] = useState<{ product: Product; file: File } | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch out-of-stock catalogue products directly from Supabase (paginated + searchable)
  const fetchOutOfStockPage = useCallback(
    async (nextOffset: number, append: boolean, term: string) => {
      if (!supabase || !isAdmin) return;
      setIsLoadingOutOfStock(true);
      try {
        let query = supabase
          .from('products')
          .select(
            'id, name, hindi_name, marathi_name, brand, category, unit, purchase_price, selling_price, stock_quantity, min_stock_alert, barcode, image_url, is_active, created_at'
          )
          .eq('stock_quantity', 0)
          .order('selling_price', { ascending: false })
          .order('name', { ascending: true })
          .range(nextOffset, nextOffset + OUT_OF_STOCK_PAGE_SIZE - 1);

        const cleanTerm = term.trim();
        if (cleanTerm.length >= 2) {
          const escaped = cleanTerm.replace(/[%_]/g, '');
          query = query.or(`name.ilike.%${escaped}%,brand.ilike.%${escaped}%,barcode.ilike.%${escaped}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          const rows = data as Product[];
          setOutOfStockProducts((prev) => (append ? [...prev, ...rows] : rows));
          setOutOfStockOffset(nextOffset + rows.length);
          setHasMoreOutOfStock(rows.length === OUT_OF_STOCK_PAGE_SIZE);
        }
      } finally {
        setIsLoadingOutOfStock(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (scope !== 'out_of_stock' || !isAdmin) return;
    const timer = window.setTimeout(() => {
      fetchOutOfStockPage(0, false, searchQuery);
    }, searchQuery.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [scope, searchQuery, isAdmin, fetchOutOfStockPage]);

  const scopedProducts = useMemo(() => {
    if (scope === 'out_of_stock') {
      return outOfStockProducts;
    }
    return products.filter((p) => p.is_active !== false && (Number(p.stock_quantity) || 0) > 0);
  }, [products, outOfStockProducts, scope]);

  const runHealthScan = useCallback(async (items: Product[]) => {
    const runId = ++scanRunIdRef.current;
    setIsScanning(true);
    setScanProgress({ done: 0, total: items.length });

    // Immediate classification for missing URLs without network wait
    const initialResults: Record<string, ImageProbeResult> = {};
    const toProbe: Product[] = [];
    for (const p of items) {
      if (!p.image_url || !p.image_url.trim()) {
        initialResults[p.id] = { status: 'missing', width: 0, height: 0 };
      } else {
        toProbe.push(p);
      }
    }

    setHealthMap((prev) => ({ ...prev, ...initialResults }));
    let completed = items.length - toProbe.length;
    setScanProgress({ done: completed, total: items.length });

    for (let i = 0; i < toProbe.length; i += PROBE_CONCURRENCY) {
      if (scanRunIdRef.current !== runId) return;
      const chunk = toProbe.slice(i, i + PROBE_CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (prod) => {
          const result = await probeImageHealth(prod.image_url);
          return { id: prod.id, result };
        })
      );

      if (scanRunIdRef.current !== runId) return;

      setHealthMap((prev) => {
        const next = { ...prev };
        for (const entry of chunkResults) {
          next[entry.id] = entry.result;
        }
        return next;
      });

      completed += chunk.length;
      setScanProgress({ done: completed, total: items.length });
    }

    if (scanRunIdRef.current === runId) {
      setIsScanning(false);
    }
  }, []);

  // Automatically scan scoped products on mount / scope change / manual re-scan (read-only inspection)
  useEffect(() => {
    if (!isAdmin) return;
    setVisibleLimit(INITIAL_VISIBLE_ROWS);
    runHealthScan(scopedProducts);
    return () => {
      scanRunIdRef.current += 1;
    };
  }, [isAdmin, scopedProducts, runHealthScan, rescanNonce]);

  const handleRescan = async () => {
    if (!isAdmin || isScanning || isLoadingOutOfStock) return;
    // Cancel any in-flight scan and visibly clear stale statuses & broken-URL cache
    scanRunIdRef.current += 1;
    setIsScanning(true);
    setHealthMap({});
    setRowLookupMap({});
    setRowMessage(null);
    for (const p of scopedProducts) {
      clearFailedImageUrl(p.image_url);
    }

    try {
      if (scope === 'out_of_stock') {
        await fetchOutOfStockPage(0, false, searchQuery);
      } else {
        await refreshData();
      }
    } finally {
      setRescanNonce((n) => n + 1);
    }
  };

  const counts = useMemo(() => {
    let missing = 0;
    let broken = 0;
    let unofficial = 0;
    let nonSquare = 0;
    let healthy = 0;

    for (const p of scopedProducts) {
      const h = healthMap[p.id];
      if (!h) continue;
      if (h.status === 'missing') missing += 1;
      else if (h.status === 'broken') broken += 1;
      else if (h.status === 'unofficial') unofficial += 1;
      else if (h.status === 'non_square') nonSquare += 1;
      else healthy += 1;
    }

    return {
      missing,
      broken,
      unofficial,
      nonSquare,
      healthy,
      issues: missing + broken + unofficial + nonSquare
    };
  }, [scopedProducts, healthMap]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return scopedProducts.filter((prod) => {
      const h = healthMap[prod.id];
      if (!h) {
        // Show unscanned rows under All Issues only if URL is empty
        if (filter === 'healthy') return false;
      } else {
        if (filter === 'issues' && h.status === 'healthy') return false;
        if (filter === 'missing' && h.status !== 'missing') return false;
        if (filter === 'broken' && h.status !== 'broken') return false;
        if (filter === 'unofficial' && h.status !== 'unofficial') return false;
        if (filter === 'non_square' && h.status !== 'non_square') return false;
        if (filter === 'healthy' && h.status !== 'healthy') return false;
      }

      if (!q) return true;
      return (
        prod.name.toLowerCase().includes(q) ||
        (prod.brand || '').toLowerCase().includes(q) ||
        (prod.barcode || '').toLowerCase().includes(q) ||
        (prod.category || '').toLowerCase().includes(q)
      );
    });
  }, [scopedProducts, healthMap, filter, searchQuery]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleLimit),
    [filteredProducts, visibleLimit]
  );

  // STEP 2 per-row action: Find Official Image
  const handleFindOfficial = async (prod: Product) => {
    if (!isAdmin) return;
    setRowMessage(null);
    setRowLookupMap((prev) => ({
      ...prev,
      [prod.id]: {
        loading: true,
        candidates: [],
        notFound: false,
        pendingConfirm: null
      }
    }));

    const result = await lookupOfficialImages({
      barcode: prod.barcode,
      name: prod.name,
      brand: prod.brand
    });

    setRowLookupMap((prev) => ({
      ...prev,
      [prod.id]: {
        loading: false,
        candidates: result.candidates,
        notFound: result.candidates.length === 0,
        error: result.error,
        pendingConfirm: null
      }
    }));
  };

  const persistSelectedOfficialUrl = async (prod: Product, candidate: OfficialImageCandidate) => {
    if (!isAdmin) return;
    setRowLookupMap((prev) => ({
      ...prev,
      [prod.id]: {
        ...(prev[prod.id] || { loading: false, candidates: [], notFound: false }),
        saving: true
      }
    }));

    try {
      const oldUrl = prod.image_url;
      clearFailedImageUrl(candidate.url);
      await updateProduct(prod.id, { image_url: candidate.url });
      if (scope === 'out_of_stock') {
        setOutOfStockProducts((prev) =>
          prev.map((item) => (item.id === prod.id ? { ...item, image_url: candidate.url } : item))
        );
      }

      if (oldUrl && oldUrl.trim() !== candidate.url) {
        await removeManagedStorageImage(oldUrl);
      }

      const recheck = await probeImageHealth(candidate.url);
      setHealthMap((prev) => ({ ...prev, [prod.id]: recheck }));
      setRowLookupMap((prev) => {
        const next = { ...prev };
        delete next[prod.id];
        return next;
      });
      setRowMessage({
        productId: prod.id,
        type: 'success',
        text: 'Official image saved.'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update product image.';
      setRowMessage({ productId: prod.id, type: 'error', text: msg });
      setRowLookupMap((prev) => ({
        ...prev,
        [prod.id]: {
          ...(prev[prod.id] || { loading: false, candidates: [], notFound: false }),
          saving: false
        }
      }));
    }
  };

  const handleCandidateClick = (prod: Product, candidate: OfficialImageCandidate) => {
    const existing = (prod.image_url || '').trim();
    if (existing && existing !== candidate.url) {
      // Never overwrite an existing URL without explicit admin confirmation
      setRowLookupMap((prev) => ({
        ...prev,
        [prod.id]: {
          ...(prev[prod.id] || { loading: false, candidates: [], notFound: false }),
          pendingConfirm: candidate
        }
      }));
      return;
    }
    persistSelectedOfficialUrl(prod, candidate);
  };

  // STEP 3 per-row action: Upload & Square Crop
  const triggerRowUpload = (prod: Product) => {
    if (!isAdmin) return;
    uploadTargetRef.current = prod;
    setRowMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetProd = uploadTargetRef.current;
    if (!file || !targetProd || !isAdmin) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setRowMessage({
        productId: targetProd.id,
        type: 'error',
        text: validation.error || 'Invalid image file.'
      });
      return;
    }

    setUploadError(null);
    setCropTarget({ product: targetProd, file });
  };

  const handleConfirmCroppedUpload = async (processed: ProcessedSquareImage) => {
    if (!cropTarget || !isAdmin) return;
    const { product } = cropTarget;
    setIsUploading(true);
    setUploadError(null);

    try {
      const { publicUrl } = await uploadProcessedProductImage({
        processed,
        productId: product.id,
        oldImageUrl: product.image_url,
        isAdmin
      });

      await updateProduct(product.id, { image_url: publicUrl });
      if (scope === 'out_of_stock') {
        setOutOfStockProducts((prev) =>
          prev.map((item) => (item.id === product.id ? { ...item, image_url: publicUrl } : item))
        );
      }

      setHealthMap((prev) => ({
        ...prev,
        [product.id]: {
          status: 'healthy',
          width: processed.width,
          height: processed.height
        }
      }));
      setRowLookupMap((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setRowMessage({
        productId: product.id,
        type: 'success',
        text: `Uploaded ${processed.width}×${processed.height} WebP image.`
      });
      setCropTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-center space-y-2">
        <Lock className="w-8 h-8 mx-auto text-amber-500" />
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Admin Access Required</h2>
        <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
          Only authenticated Shop Owner or Admin accounts can inspect and update product images.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-3 pb-28 lg:pb-8">
      {/* Shared Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Compact Header */}
      <CompactPageHeader
        icon={<ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        title="Product Image Health"
        subtitle="Fix missing, broken, or non-square images one by one. Nothing is modified automatically."
        primaryAction={{
          label: isScanning || isLoadingOutOfStock ? 'Scanning...' : 'Re-scan',
          icon: <RefreshCw className={`w-4 h-4 ${isScanning || isLoadingOutOfStock ? 'animate-spin' : ''}`} />,
          onClick: () => {
            if (!isScanning && !isLoadingOutOfStock) handleRescan();
          },
          ariaLabel: 'Re-scan product images',
        }}
      />

      {/* Scope Switcher + Progress / Tip Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex p-0.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F]">
          <button
            type="button"
            onClick={() => setScope('in_stock')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
              scope === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#8FA69C]'
            }`}
          >
            In-Stock ({products.filter((p) => (Number(p.stock_quantity) || 0) > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setScope('out_of_stock')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
              scope === 'out_of_stock'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-[#8FA69C]'
            }`}
          >
            Out-of-Stock ({outOfStockCount > 0 ? outOfStockCount.toLocaleString('en-IN') : 'Catalogue'})
          </button>
        </div>

        {isScanning && scanProgress.total > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking {scanProgress.done} / {scanProgress.total}...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Tap any photo to preview
          </span>
        )}
      </div>

      {/* Slim 4-Col Interactive KPI Strip */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
        <button
          type="button"
          onClick={() => setFilter('missing')}
          className={`px-2.5 py-2 rounded-xl border text-left transition active:scale-[0.97] ${
            filter === 'missing'
              ? 'bg-slate-900 text-white border-emerald-500 dark:bg-[#1A2A25]'
              : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F]'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8FA69C] truncate">Missing</div>
          <div className={`text-base sm:text-lg font-extrabold tabular-nums leading-tight mt-0.5 ${filter === 'missing' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{counts.missing}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('broken')}
          className={`px-2.5 py-2 rounded-xl border text-left transition active:scale-[0.97] ${
            filter === 'broken'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400'
              : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F]'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 truncate">Broken</div>
          <div className="text-base sm:text-lg font-extrabold tabular-nums leading-tight mt-0.5 text-rose-700 dark:text-rose-300">{counts.broken}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('non_square')}
          className={`px-2.5 py-2 rounded-xl border text-left transition active:scale-[0.97] ${
            filter === 'non_square'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400'
              : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F]'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 truncate">Ratio</div>
          <div className="text-base sm:text-lg font-extrabold tabular-nums leading-tight mt-0.5 text-amber-700 dark:text-amber-300">{counts.nonSquare}</div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('healthy')}
          className={`px-2.5 py-2 rounded-xl border text-left transition active:scale-[0.97] ${
            filter === 'healthy'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
              : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F]'
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 truncate">OK</div>
          <div className="text-base sm:text-lg font-extrabold tabular-nums leading-tight mt-0.5 text-emerald-700 dark:text-emerald-400">{counts.healthy}</div>
        </button>
      </div>

      {/* Sticky Search + Single-Row Snap Filter Chips */}
      <div className="sticky top-0 z-20 -mx-3 px-3 pt-1.5 pb-2 bg-[#f8fafc] dark:bg-[#0B1210] space-y-2 border-b border-slate-200/70 dark:border-[#1E2E28] transition-colors">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, brand, barcode..."
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-xs sm:text-sm font-medium text-slate-900 dark:text-[#E7F0EC] focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="w-7 h-7 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8 py-0.5">
            {(
              [
                { id: 'issues', label: 'All Issues', count: counts.issues },
                { id: 'unofficial', label: 'Unofficial', count: counts.unofficial },
                { id: 'missing', label: 'Missing', count: counts.missing },
                { id: 'broken', label: 'Broken', count: counts.broken },
                { id: 'non_square', label: 'Non-Square', count: counts.nonSquare },
                { id: 'healthy', label: 'Healthy', count: counts.healthy }
              ] as const
            ).map((tab) => {
              const isActive = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 shrink-0 snap-start transition-all duration-150 active:scale-[0.97] ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-[#131F1B] border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#A3B8AF] hover:border-slate-300 dark:hover:border-[#324A42]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#f8fafc] dark:from-[#0B1210] to-transparent"
          />
        </div>
      </div>

      {/* Product Rows */}
      <div className="space-y-2.5">
        {visibleProducts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200/90 dark:border-[#24352F]">
            <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isScanning ? 'Scanning product images...' : 'No products match this filter'}
            </p>
            <p className="text-xs text-slate-500 dark:text-[#8FA69C] mt-0.5">
              {filter === 'issues' && !isScanning
                ? 'Every product in this scope has a valid square image!'
                : 'Try switching filter tabs or clearing your search.'}
            </p>
          </div>
        ) : (
          visibleProducts.map((prod) => {
            const health = healthMap[prod.id];
            const lookup = rowLookupMap[prod.id];
            const feedbackForRow = rowMessage?.productId === prod.id ? rowMessage : null;

            return (
              <div
                key={prod.id}
                className="bg-white dark:bg-[#131F1B] p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-[#24352F] shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Top/Left: Bigger Clickable Square Thumbnail + Meta */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setPreviewProduct(prod)}
                      title="Click to open full photo & update URL"
                      className="group/ihimg relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 aspect-square rounded-2xl overflow-hidden bg-white border border-slate-200 dark:border-[#24352F] shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <ProductImage
                        src={prod.image_url}
                        alt={prod.name}
                        category={prod.category}
                        fill
                        className="group-hover/ihimg:scale-[1.03] transition-transform duration-200"
                      />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {prod.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        {health?.status === 'missing' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Missing Image
                          </span>
                        )}
                        {health?.status === 'broken' && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                            Broken URL
                          </span>
                        )}
                        {health?.status === 'unofficial' && (
                          <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300">
                            Unofficial Photo ({health.width}×{health.height})
                          </span>
                        )}
                        {health?.status === 'non_square' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                            Non-Square ({health.width}×{health.height})
                          </span>
                        )}
                        {health?.status === 'healthy' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                            Square OK ({health.width}×{health.height})
                          </span>
                        )}
                        {!health && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] text-slate-500">
                            Checking...
                          </span>
                        )}
                        {prod.barcode && (
                          <span className="font-mono text-slate-500 dark:text-[#8FA69C]">
                            {prod.barcode}
                          </span>
                        )}
                        {prod.brand && (
                          <span className="text-slate-500 dark:text-[#8FA69C]">• {prod.brand}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions per Row */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFindOfficial(prod)}
                      disabled={lookup?.loading || lookup?.saving}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition active:scale-95"
                    >
                      {lookup?.loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Find official</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerRowUpload(prod)}
                      disabled={lookup?.saving}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#223630] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold transition active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>

                {/* Per-Row Feedback */}
                {feedbackForRow && (
                  <div
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between gap-2 ${
                      feedbackForRow.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    }`}
                  >
                    <span>{feedbackForRow.text}</span>
                    <button
                      type="button"
                      onClick={() => setRowMessage(null)}
                      className="opacity-70 hover:opacity-100"
                      aria-label="Dismiss message"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Inline Official Candidate Picker for Row */}
                {lookup && !lookup.loading && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] space-y-2.5">
                    {lookup.pendingConfirm && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 space-y-2">
                        <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                          Replace the existing image for "{prod.name}"?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={lookup.saving}
                            onClick={() =>
                              lookup.pendingConfirm &&
                              persistSelectedOfficialUrl(prod, lookup.pendingConfirm)
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                          >
                            {lookup.saving ? 'Saving...' : 'Confirm Replace'}
                          </button>
                          <button
                            type="button"
                            disabled={lookup.saving}
                            onClick={() =>
                              setRowLookupMap((prev) => ({
                                ...prev,
                                [prod.id]: { ...prev[prod.id], pendingConfirm: null }
                              }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-[#8FA69C] text-[11px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {lookup.candidates.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                            Pick an official image ({lookup.candidates.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRowLookupMap((prev) => {
                                const next = { ...prev };
                                delete next[prod.id];
                                return next;
                              })
                            }
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {lookup.candidates.map((cand) => (
                            <button
                              key={cand.url}
                              type="button"
                              disabled={lookup.saving}
                              onClick={() => handleCandidateClick(prod, cand)}
                              className="flex flex-col items-center p-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] hover:border-emerald-500 transition text-left disabled:opacity-50"
                            >
                              <div className="w-full aspect-square rounded-lg bg-white overflow-hidden border border-slate-100">
                                <ProductImage
                                  src={cand.url}
                                  alt={cand.label}
                                  category={prod.category}
                                  fill
                                />
                              </div>
                              <span className="mt-1 w-full text-[10px] font-bold text-slate-700 dark:text-[#E7F0EC] truncate">
                                {cand.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]">
                          {lookup.error || 'No official image found, upload your own'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => triggerRowUpload(prod)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRowLookupMap((prev) => {
                                const next = { ...prev };
                                delete next[prod.id];
                                return next;
                              })
                            }
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {(filteredProducts.length > visibleLimit || (scope === 'out_of_stock' && hasMoreOutOfStock)) && (
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {filteredProducts.length > visibleLimit && (
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + LOAD_MORE_STEP)}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-50 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-xs font-bold text-slate-700 dark:text-[#E7F0EC]"
            >
              Show more ({filteredProducts.length - visibleLimit} remaining)
            </button>
          )}
          {scope === 'out_of_stock' && hasMoreOutOfStock && (
            <button
              type="button"
              disabled={isLoadingOutOfStock}
              onClick={() => fetchOutOfStockPage(outOfStockOffset, true, searchQuery)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs"
            >
              {isLoadingOutOfStock && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isLoadingOutOfStock ? 'Loading...' : `Load next ${OUT_OF_STOCK_PAGE_SIZE} from database`}</span>
            </button>
          )}
        </div>
      )}

      {/* Full Photo Preview & URL Editor Modal */}
      <ProductImagePreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onImageUpdated={async (productId, newUrl) => {
          const normalized = newUrl || undefined;
          if (scope === 'out_of_stock') {
            setOutOfStockProducts((prev) =>
              prev.map((item) => (item.id === productId ? { ...item, image_url: normalized } : item))
            );
          }
          setPreviewProduct((prev) =>
            prev && prev.id === productId ? { ...prev, image_url: normalized } : prev
          );
          const recheck = await probeImageHealth(normalized);
          setHealthMap((prev) => ({ ...prev, [productId]: recheck }));
        }}
      />

      {/* Square 1:1 Cropper Modal */}
      <SquareImageCropperModal
        file={cropTarget?.file || null}
        productName={cropTarget?.product.name}
        isUploading={isUploading}
        uploadError={uploadError}
        onCancel={() => {
          if (!isUploading) {
            setCropTarget(null);
            setUploadError(null);
          }
        }}
        onConfirm={handleConfirmCroppedUpload}
      />
    </div>
  );
};

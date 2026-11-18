import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Image as ImageIcon, Play, Pause, Download, 
  Search, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, 
  Edit2, Eye, ShieldCheck, Database, ShoppingBag, AlertOctagon, HelpCircle, Check, Ban,
  Barcode, Camera, Upload, RefreshCw, Loader2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ProductImage, clearFailedImageUrl } from '../Common/ProductImage';
import { SquareImageCropperModal } from '../Common/SquareImageCropperModal';
import {
  ALLOWED_IMAGE_ACCEPT,
  validateImageFile,
  uploadProcessedProductImage,
  formatFileSize,
  isBase64ImageDataUrl,
  ProcessedSquareImage
} from '../../lib/productImageService';
import { globalImageManager, ImageFetchProgress, validateImageUrl, lookupProductImageByBarcode } from '../../utils/imageFetchingEngine';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { playBeepSound, playSuccessChime } from '../../utils/audioUtils';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { supabase } from '../../lib/supabase';
import { PRODUCT_SELECT_COLS } from '../../lib/supabaseColumns';
import { Product } from '../../types';

interface ProductImageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type ImageStatusFilter = 
  | 'ALL'
  | 'OFFICIAL'
  | 'TRUSTED'
  | 'RETAILER'
  | 'NEEDS_REVIEW'
  | 'INCORRECT'
  | 'BROKEN'
  | 'MISSING';

export const ProductImageManagerModal: React.FC<ProductImageManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products, setProducts, totalCatalogCount = 46571, totalBarcodesCount = 44202 } = useStore() as any;
  const { language, tr } = useLanguage();
  const { user, role } = useAuth();
  const isAdmin = Boolean(user) && (role === 'Owner' || role === 'Admin');

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<ImageStatusFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(40);
  
  // Barcode scanner trigger state
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [scannedBarcodeNotFound, setScannedBarcodeNotFound] = useState<string | null>(null);

  // Engine progress state
  const [progress, setProgress] = useState<ImageFetchProgress>({
    total: 0,
    processed: 0,
    verified: 0,
    missing: 0,
    failed: 0,
    isPaused: false,
    isRunning: false
  });

  // Manual Image URL Editor state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editUrlInput, setEditUrlInput] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [isSearchingOnlineImage, setIsSearchingOnlineImage] = useState(false);
  const [onlineSuggestedImage, setOnlineSuggestedImage] = useState<{ url: string; source: string; name?: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Hidden File input & automatic WebP compression modal state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Debounce search query (300ms) for high performance across 46k records
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset visible items count when search or filter changes
  useEffect(() => {
    setVisibleCount(40);
  }, [debouncedSearch, selectedCategory, statusFilter]);

  // Fast Database-aggregated statistics from Supabase RPC fn_get_catalog_image_stats
  const [serverStats, setServerStats] = useState<{
    totalProducts: number;
    eligibleBarcodes: number;
    officialCount: number;
    trustedCount: number;
    retailerCount: number;
    needsReviewCount: number;
    incorrectCount: number;
    brokenCount: number;
    missingCount: number;
    totalWithImages: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return; // Only query when Photo Database modal is actively opened by user
    let cancelled = false;
    const fetchRpcStats = async () => {
      try {
        const { data, error } = await supabase.rpc('fn_get_catalog_image_stats');
        if (!cancelled && !error && data) {
          const totalProds = Number(data.total_products) || 46571;
          const official = Number(data.official_verified) || 0;
          const trusted = Number(data.trusted) || 0;
          const retailer = Number(data.retailer_verified) || 0;
          const needsReview = Number(data.needs_review) || 0;
          const incorrect = Number(data.incorrect) || 0;
          const broken = Number(data.broken) || 0;
          const withImages = Number(data.with_images) || (official + trusted + retailer + needsReview + incorrect + broken);
          const missing = Math.max(0, totalProds - withImages);
          const pct = totalProds > 0 ? Math.round((withImages / totalProds) * 100) : 0;

          setServerStats({
            totalProducts: totalProds,
            eligibleBarcodes: Number(data.eligible_barcodes) || 0,
            officialCount: official,
            trustedCount: trusted,
            retailerCount: retailer,
            needsReviewCount: needsReview,
            incorrectCount: incorrect,
            brokenCount: broken,
            missingCount: missing,
            totalWithImages: withImages,
            percentage: pct
          });
        }
      } catch {
        // Silent fallback to standard memory counts if RPC is not present
      }
    };
    fetchRpcStats();
    return () => { cancelled = true; };
  }, [isOpen]);

  // Live statistics (prefers instant server RPC over client loop)
  const stats = useMemo(() => {
    if (serverStats) return serverStats;

    let officialCount = 0;
    let trustedCount = 0;
    let retailerCount = 0;
    let needsReviewCount = 0;
    let incorrectCount = 0;
    let brokenCount = 0;
    let missingCount = 0;

    products.forEach((p: Product) => {
      const hasImg = Boolean(p.image_url && p.image_url.trim().length > 0);
      const st = (p.image_status || '').toLowerCase();
      const src = (p.image_source || '').toLowerCase();

      if (!hasImg) {
        missingCount++;
      } else if (st === 'official_verified' || src.includes('official')) {
        officialCount++;
      } else if (st === 'retailer_verified' || src.includes('retailer')) {
        retailerCount++;
      } else if (st === 'incorrect' || st === 'incorrect_product_image') {
        incorrectCount++;
      } else if (st === 'invalid_url' || st === 'broken') {
        brokenCount++;
      } else if (st === 'needs_manual_review' || st === 'pending') {
        needsReviewCount++;
      } else {
        trustedCount++;
      }
    });

    const totalWithImages = officialCount + trustedCount + retailerCount + needsReviewCount + incorrectCount + brokenCount;
    const percentage = totalCatalogCount > 0 ? Math.round((totalWithImages / totalCatalogCount) * 100) : 0;

    return {
      totalProducts: totalCatalogCount || products.length,
      eligibleBarcodes: totalBarcodesCount || products.filter((p: Product) => p.barcode).length,
      officialCount,
      trustedCount,
      retailerCount,
      needsReviewCount,
      incorrectCount,
      brokenCount,
      missingCount,
      totalWithImages,
      percentage
    };
  }, [serverStats, products, totalCatalogCount, totalBarcodesCount]);

  // Stat chips definition in prompt-specified order
  const statChips = useMemo(() => [
    { id: 'ALL' as ImageStatusFilter, label: 'Total', count: stats.totalProducts, border: 'border-slate-300 dark:border-slate-700', activeBg: 'bg-emerald-600' },
    { id: 'OFFICIAL' as ImageStatusFilter, label: 'Official', count: stats.officialCount, border: 'border-emerald-300 dark:border-emerald-700', activeBg: 'bg-emerald-600' },
    { id: 'TRUSTED' as ImageStatusFilter, label: 'Trusted', count: stats.trustedCount, border: 'border-sky-300 dark:border-sky-700', activeBg: 'bg-sky-600' },
    { id: 'RETAILER' as ImageStatusFilter, label: 'Retailer', count: stats.retailerCount, border: 'border-indigo-300 dark:border-indigo-700', activeBg: 'bg-indigo-600' },
    { id: 'NEEDS_REVIEW' as ImageStatusFilter, label: 'Review', count: stats.needsReviewCount, border: 'border-amber-300 dark:border-amber-700', activeBg: 'bg-amber-600' },
    { id: 'INCORRECT' as ImageStatusFilter, label: 'Incorrect', count: stats.incorrectCount, border: 'border-rose-300 dark:border-rose-700', activeBg: 'bg-rose-600' },
    { id: 'BROKEN' as ImageStatusFilter, label: 'Broken', count: stats.brokenCount, border: 'border-red-300 dark:border-red-700', activeBg: 'bg-red-600' },
    { id: 'MISSING' as ImageStatusFilter, label: 'Missing', count: stats.missingCount, border: 'border-slate-300 dark:border-slate-600', activeBg: 'bg-slate-700' },
  ], [stats, language]);

  // Database-backed Catalogue Products State for Photo Dashboard
  const [modalProducts, setModalProducts] = useState<Product[]>([]);
  const [isLoadingModalProducts, setIsLoadingModalProducts] = useState(false);
  const [modalOffset, setModalOffset] = useState(0);
  const [hasMoreModalProducts, setHasMoreModalProducts] = useState(true);

  // Fetch initial page whenever filters change
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchModalProducts = async () => {
      setIsLoadingModalProducts(true);
      try {
        if (!supabase) return;

        let query = supabase.from('products').select(PRODUCT_SELECT_COLS);

        // Apply Status Filter
        if (statusFilter === 'MISSING') {
          query = query.is('image_url', null).not('barcode', 'is', null).neq('barcode', '');
        } else if (statusFilter === 'OFFICIAL') {
          query = query.not('image_url', 'is', null).or('image_status.eq.official_verified,image_source.ilike.%official%');
        } else if (statusFilter === 'TRUSTED') {
          query = query.not('image_url', 'is', null).or('image_status.eq.trusted_database_verified,image_status.eq.verified,image_source.ilike.%openfoodfacts%');
        } else if (statusFilter === 'RETAILER') {
          query = query.not('image_url', 'is', null).or('image_status.eq.retailer_verified,image_source.ilike.%retailer%');
        } else if (statusFilter === 'NEEDS_REVIEW') {
          query = query.or('image_status.eq.needs_manual_review,and(image_url.not.is.null,image_status.eq.pending)');
        } else if (statusFilter === 'INCORRECT') {
          query = query.or('image_status.eq.incorrect,image_status.eq.incorrect_product_image');
        } else if (statusFilter === 'BROKEN') {
          query = query.or('image_status.eq.invalid_url,image_status.eq.broken');
        }

        // Apply Search Filter (name, barcode, brand)
        const q = debouncedSearch.trim();
        if (q) {
          query = query.or(`name.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`);
        }

        // Apply Category Filter
        if (selectedCategory && selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        }

        const { data, error } = await query
          .order('id', { ascending: true })
          .range(0, 39);

        if (!cancelled && !error && data) {
          setModalProducts(data as Product[]);
          setModalOffset(40);
          setHasMoreModalProducts(data.length === 40);
        }
      } catch (err) {
        console.warn('Failed to fetch modal products:', err);
      } finally {
        if (!cancelled) setIsLoadingModalProducts(false);
      }
    };

    fetchModalProducts();
    return () => { cancelled = true; };
  }, [isOpen, debouncedSearch, selectedCategory, statusFilter]);

  // Load More Handler for Catalogue Slicing
  const handleLoadMoreModalProducts = async () => {
    if (isLoadingModalProducts || !hasMoreModalProducts || !supabase) return;
    setIsLoadingModalProducts(true);
    try {
      let query = supabase.from('products').select(PRODUCT_SELECT_COLS);

      if (statusFilter === 'MISSING') {
        query = query.is('image_url', null).not('barcode', 'is', null).neq('barcode', '');
      } else if (statusFilter === 'OFFICIAL') {
        query = query.not('image_url', 'is', null).or('image_status.eq.official_verified,image_source.ilike.%official%');
      } else if (statusFilter === 'TRUSTED') {
        query = query.not('image_url', 'is', null).or('image_status.eq.trusted_database_verified,image_status.eq.verified,image_source.ilike.%openfoodfacts%');
      } else if (statusFilter === 'RETAILER') {
        query = query.not('image_url', 'is', null).or('image_status.eq.retailer_verified,image_source.ilike.%retailer%');
      } else if (statusFilter === 'NEEDS_REVIEW') {
        query = query.or('image_status.eq.needs_manual_review,and(image_url.not.is.null,image_status.eq.pending)');
      } else if (statusFilter === 'INCORRECT') {
        query = query.or('image_status.eq.incorrect,image_status.eq.incorrect_product_image');
      } else if (statusFilter === 'BROKEN') {
        query = query.or('image_status.eq.invalid_url,image_status.eq.broken');
      }

      const q = debouncedSearch.trim();
      if (q) {
        query = query.or(`name.ilike.%${q}%,barcode.ilike.%${q}%,brand.ilike.%${q}%`);
      }

      if (selectedCategory && selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query
        .order('id', { ascending: true })
        .range(modalOffset, modalOffset + 39);

      if (!error && data && data.length > 0) {
        setModalProducts(prev => [...prev, ...(data as Product[])]);
        setModalOffset(prev => prev + data.length);
        setHasMoreModalProducts(data.length === 40);
      } else {
        setHasMoreModalProducts(false);
      }
    } catch (err) {
      console.warn('Failed to load more modal products:', err);
    } finally {
      setIsLoadingModalProducts(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const defaultCats = [
      'All', 'Dairy', 'Milk', 'Paneer & Butter', 'Curd & Lassi', 'Ghee', 
      'Sweets', 'Ice Cream', 'Beverages', 'Bakery & Snacks', 'Groceries', 
      'Dry Fruits & Spices', 'Frozen & Instant', 'Cleaning & Household', 
      'Personal Care', 'Pooja & Festivities', 'Stationery & General'
    ];
    const set = new Set<string>(defaultCats);
    products.forEach((p: Product) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products for display (fallback if offline or loading)
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      
      const hasImg = Boolean(p.image_url && p.image_url.trim().length > 0);
      const st = (p.image_status || '').toLowerCase();
      const src = (p.image_source || '').toLowerCase();

      let matchesStatus = true;
      if (statusFilter === 'MISSING') {
        matchesStatus = !hasImg;
      } else if (statusFilter === 'OFFICIAL') {
        matchesStatus = hasImg && (st === 'official_verified' || src.includes('official'));
      } else if (statusFilter === 'TRUSTED') {
        matchesStatus = hasImg && (st === 'trusted_database_verified' || st === 'verified' || src.includes('openfoodfacts'));
      } else if (statusFilter === 'RETAILER') {
        matchesStatus = hasImg && (st === 'retailer_verified' || src.includes('retailer'));
      } else if (statusFilter === 'NEEDS_REVIEW') {
        matchesStatus = st === 'needs_manual_review' || (hasImg && st === 'pending');
      } else if (statusFilter === 'INCORRECT') {
        matchesStatus = st === 'incorrect' || st === 'incorrect_product_image';
      } else if (statusFilter === 'BROKEN') {
        matchesStatus = st === 'invalid_url' || st === 'broken';
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, debouncedSearch, selectedCategory, statusFilter]);

  // Products to display in grid (prefers live Supabase catalog slice over 13 store items)
  const displayedProducts = useMemo(() => {
    if (modalProducts.length > 0) {
      return modalProducts;
    }
    return filteredProducts.slice(0, visibleCount);
  }, [modalProducts, filteredProducts, visibleCount]);

  if (!isOpen) return null;

  // Handle Barcode Scanned by Camera or Manual Input
  const handleBarcodeScanned = async (scannedBarcode: string) => {
    setIsBarcodeScannerOpen(false);
    playBeepSound();

    const clean = scannedBarcode.trim();
    if (!clean) return;

    // 1. Try finding in loaded products (modal products or store products)
    const candidates = [clean];
    if (clean.startsWith('0')) {
      candidates.push(clean.replace(/^0+/, ''));
    } else {
      candidates.push('0' + clean);
    }

    let found = modalProducts.find((p: Product) => 
      p.barcode && candidates.includes(p.barcode.trim())
    ) || products.find((p: Product) => 
      p.barcode && candidates.includes(p.barcode.trim())
    );

    // 2. If not found in current loaded products slice, query Supabase
    if (!found) {
      try {
        const onlineLookup = await searchProductByBarcodeOnline(clean);
        if (onlineLookup.found && onlineLookup.product) {
          found = onlineLookup.product;
        }
      } catch (err) {
        console.warn('Barcode lookup error:', err);
      }
    }

    if (found) {
      openImageEditorForProduct(found, clean);
    } else {
      setScannedBarcodeNotFound(clean);
      setSearchQuery(clean);
    }
  };

  // Open Image Editor for a Specific Product
  const openImageEditorForProduct = async (product: Product, barcodeUsed?: string) => {
    setEditingProduct(product);
    setEditUrlInput(product.image_url || '');
    setOnlineSuggestedImage(null);
    setIsValidatingUrl(false);

    const bcode = barcodeUsed || product.barcode;
    if (bcode) {
      setIsSearchingOnlineImage(true);
      try {
        const res = await lookupProductImageByBarcode(bcode);
        if (res.status === 'verified' && res.imageUrl) {
          setOnlineSuggestedImage({
            url: res.imageUrl,
            source: res.source,
            name: res.productName
          });
        }
      } catch (e) {
        console.warn('Online image lookup failed:', e);
      } finally {
        setIsSearchingOnlineImage(false);
      }
    }
  };

  // Direct File / Mobile Camera Photo Upload -> Automatic client-side WebP compression & Storage upload
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFileError(validation.error || 'Unsupported or corrupted image file.');
      return;
    }

    setFileError(null);
    setUploadError(null);
    setCropFile(file);
  };

  const handleConfirmCompressedStorageUpload = async (processed: ProcessedSquareImage) => {
    if (!editingProduct) return;
    setIsUploadingPhoto(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const { publicUrl } = await uploadProcessedProductImage({
        processed,
        productId: editingProduct.id,
        oldImageUrl: editingProduct.image_url,
        isAdmin,
        onProgress: setUploadProgress
      });

      clearFailedImageUrl(publicUrl);

      if (supabase) {
        const { error: dbErr } = await supabase
          .from('products')
          .update({
            image_url: publicUrl,
            image_status: 'official_verified',
            image_source: 'STORAGE_WEBP',
            image_fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (dbErr) {
          throw new Error(dbErr.message || 'Failed to update product image URL.');
        }
      }

      if (setProducts) {
        setProducts((prev: Product[]) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? { ...p, image_url: publicUrl, image_status: 'official_verified', image_source: 'STORAGE_WEBP' }
              : p
          )
        );
      }
      setModalProducts((prev: Product[]) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...p, image_url: publicUrl, image_status: 'official_verified', image_source: 'STORAGE_WEBP' }
            : p
        )
      );

      setEditUrlInput(publicUrl);
      setEditingProduct((prev) => (prev ? { ...prev, image_url: publicUrl } : prev));
      setCropFile(null);
      setSaveSuccessToast(
        `Uploaded WebP (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, saved ${processed.savedPercent}%)`
      );
      setTimeout(() => setSaveSuccessToast(null), 4000);
      playSuccessChime();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
    }
  };

  // Start Batch Image Fetching (Database-backed across 34,600+ catalogue items)
  const handleStartFetching = () => {
    globalImageManager.startProcessing({
      batchSize: 20,
      delayMs: 250,
      onProgress: (p) => setProgress(p),
      onProductUpdated: (updatedProd) => {
        // 1. Update in-memory store products if present in shop inventory
        if (setProducts) {
          setProducts((prev: Product[]) => 
            prev.map(item => item.id === updatedProd.id ? { 
              ...item, 
              image_url: updatedProd.image_url, 
              image_status: updatedProd.image_status,
              image_source: updatedProd.image_source
            } : item)
          );
        }
        // 2. Update modal catalog list if currently loaded on screen
        setModalProducts((prev: Product[]) =>
          prev.map(item => item.id === updatedProd.id ? {
            ...item,
            image_url: updatedProd.image_url,
            image_status: updatedProd.image_status,
            image_source: updatedProd.image_source
          } : item)
        );
        // 3. Update server stats counters live
        setServerStats(prev => {
          if (!prev) return prev;
          const newWithImages = prev.totalWithImages + 1;
          const newMissing = Math.max(0, prev.missingCount - 1);
          return {
            ...prev,
            trustedCount: prev.trustedCount + 1,
            totalWithImages: newWithImages,
            missingCount: newMissing,
            percentage: prev.totalProducts > 0 ? Math.round((newWithImages / prev.totalProducts) * 100) : prev.percentage
          };
        });
      }
    });
  };

  const handlePause = () => {
    globalImageManager.pause();
    setProgress(prev => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    globalImageManager.resume();
    setProgress(prev => ({ ...prev, isPaused: false }));
  };

  const handleStop = () => {
    globalImageManager.stop();
    setProgress(prev => ({ ...prev, isRunning: false, isPaused: false }));
  };

  // Administrator Approve Suggested Image
  const handleApproveImage = async (product: Product) => {
    try {
      if (supabase) {
        await supabase
          .from('products')
          .update({
            image_status: 'trusted_database_verified',
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
      }
      if (setProducts) {
        setProducts((prev: Product[]) =>
          prev.map(p => p.id === product.id ? { ...p, image_status: 'trusted_database_verified' } : p)
        );
      }
      setModalProducts((prev: Product[]) =>
        prev.map(p => p.id === product.id ? { ...p, image_status: 'trusted_database_verified' } : p)
      );
      playSuccessChime();
    } catch (e) {
      console.error('Failed to approve image:', e);
    }
  };

  // Administrator Reject Image (Marks incorrect and clears url)
  const handleRejectImage = async (product: Product) => {
    try {
      if (supabase) {
        await supabase
          .from('products')
          .update({
            image_url: null,
            image_status: 'incorrect',
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);
      }
      if (setProducts) {
        setProducts((prev: Product[]) =>
          prev.map(p => p.id === product.id ? { ...p, image_url: undefined, image_status: 'incorrect' } : p)
        );
      }
      setModalProducts((prev: Product[]) =>
        prev.map(p => p.id === product.id ? { ...p, image_url: undefined, image_status: 'incorrect' } : p)
      );
    } catch (e) {
      console.error('Failed to reject image:', e);
    }
  };

  // Save manual or scanned image URL (strictly blocks base64 data URLs from PostgreSQL)
  const handleSaveManualUrl = async () => {
    if (!editingProduct) return;
    setIsValidatingUrl(true);
    const cleanUrl = editUrlInput.trim();

    if (isBase64ImageDataUrl(cleanUrl)) {
      setFileError(
        'Base64 image data cannot be stored in the database. Use "Upload Photo" to compress and upload to Storage.'
      );
      setIsValidatingUrl(false);
      return;
    }

    if (cleanUrl) {
      const isValid = await validateImageUrl(cleanUrl);
      if (!isValid) {
        alert(
          'This image URL cannot be opened or is not a valid image format.'
        );
        setIsValidatingUrl(false);
        return;
      }
    }

    try {
      const newStatus = cleanUrl ? 'official_verified' : 'not_found';
      const newSource = cleanUrl
        ? (onlineSuggestedImage?.url === cleanUrl ? onlineSuggestedImage.source : 'MANUAL_URL')
        : null;

      if (supabase) {
        await supabase
          .from('products')
          .update({ 
            image_url: cleanUrl || null,
            image_status: newStatus,
            image_source: newSource,
            image_fetched_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);
      }
      if (setProducts) {
        setProducts((prev: Product[]) => 
          prev.map(p => p.id === editingProduct.id ? { 
            ...p, 
            image_url: cleanUrl || undefined,
            image_status: newStatus,
            image_source: newSource || undefined
          } : p)
        );
      }
      setModalProducts((prev: Product[]) =>
        prev.map(p => p.id === editingProduct.id ? {
          ...p,
          image_url: cleanUrl || undefined,
          image_status: newStatus,
          image_source: newSource || undefined
        } : p)
      );

      playSuccessChime();
      setSaveSuccessToast(
        `✓ Photo for "${editingProduct.name}" saved successfully!`
      );
      setTimeout(() => setSaveSuccessToast(null), 4000);

      setEditingProduct(null);
      setEditUrlInput('');
      setOnlineSuggestedImage(null);
    } catch (err) {
      console.error('Failed to save manual image URL:', err);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Export Missing as CSV (queries Supabase for up to 1,000 missing catalogue products)
  const handleExportMissing = async () => {
    try {
      let missingItems: any[] = [];
      if (supabase) {
        const { data: dbMissing } = await supabase
          .from('products')
          .select('barcode, name, brand, category, pack_size, unit, selling_price')
          .not('barcode', 'is', null)
          .neq('barcode', '')
          .is('image_url', null)
          .order('id', { ascending: true })
          .limit(1000);

        if (dbMissing && dbMissing.length > 0) {
          missingItems = dbMissing;
        }
      }

      if (missingItems.length === 0) {
        missingItems = products.filter((p: Product) => (!p.image_url || p.image_url.trim() === '') && p.barcode);
      }

      const headers = ['barcode', 'product_name', 'brand', 'category', 'pack_size', 'selling_price'];
      const rows = missingItems.map((p: any) => [
        `"${p.barcode || ''}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.brand || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        `"${(p.pack_size || p.unit || '').replace(/"/g, '""')}"`,
        p.selling_price || ''
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `missing_product_images_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export missing CSV:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 overflow-hidden">
      <div className="relative w-full h-[100dvh] sm:h-[94vh] sm:max-w-2xl lg:max-w-3xl bg-white dark:bg-[#131F1B] sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-[#24352F] flex flex-col overflow-hidden">
        
        {/* 1. Sticky Modal Header (One Row, h-14) */}
        <div className="h-14 px-3 sm:px-4 border-b border-slate-100 dark:border-[#24352F] bg-slate-50/90 dark:bg-[#1A2A25]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate leading-tight">
                {'Product Image Dashboard'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] truncate">
                {stats.totalProducts.toLocaleString()} {'records'} • {stats.eligibleBarcodes.toLocaleString()} {'barcodes'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (progress.isRunning) handleStop();
              onClose();
            }}
            className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer active:scale-95"
            title={'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {saveSuccessToast && (
          <div className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in shrink-0">
            <span className="truncate pr-2">{saveSuccessToast}</span>
            <button onClick={() => setSaveSuccessToast(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live Batch Engine Progress Banner (If Running) */}
        {progress.isRunning && (
          <div className="px-3 py-2 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-black text-slate-800 dark:text-white block truncate">
                  {progress.isPaused
                    ? '⏸️ Process Paused'
                    : '🔄 Verifying photos...'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] truncate block">
                  {progress.currentBarcode || 'Searching'} • {'Found:'} {progress.verified}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {progress.isPaused ? (
                <button
                  onClick={handleResume}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-700 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{'Resume'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center gap-1 hover:bg-amber-600 cursor-pointer"
                >
                  <Pause className="w-3 h-3" />
                  <span>{'Pause'}</span>
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                {'Stop'}
              </button>
            </div>
          </div>
        )}

        {/* 2. Primary Action Row: Scan Barcode, Auto-Fetch, Export CSV */}
        <div className="px-3 pt-2.5 pb-1 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            title={'Scan barcode with camera to find / update photo'}
          >
            <Barcode className="w-4 h-4 shrink-0" />
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{'Scan Barcode'}</span>
          </button>

          {!progress.isRunning ? (
            <button
              type="button"
              onClick={handleStartFetching}
              className="flex-1 h-11 rounded-xl border border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition active:scale-95 cursor-pointer"
              title={'Auto-fetch photos from online food database'}
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span className="truncate">{'Auto-Fetch'}</span>
            </button>
          ) : (
            <div className="flex-1 h-11 flex items-center gap-1.5">
              {progress.isPaused ? (
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{'Resume'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 h-11 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{'Pause'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStop}
                className="h-11 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center active:scale-95 transition cursor-pointer"
              >
                {'Stop'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportMissing}
            className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F] flex items-center justify-center transition active:scale-95 cursor-pointer"
            title={'Download CSV of missing photos (Export CSV)'}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Compact Horizontally Scrollable Stat Chips Row (Tapping applies filter) */}
        <div className="px-3 py-1.5 shrink-0 overflow-x-auto no-scrollbar snap-x flex gap-2">
          {statChips.map(chip => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`min-w-[96px] snap-start shrink-0 rounded-xl px-2.5 py-1.5 text-center cursor-pointer transition select-none border active:scale-95 ${
                  isActive
                    ? `${chip.activeBg} text-white border-transparent ring-2 ring-emerald-400/50 shadow-sm`
                    : `bg-slate-50 dark:bg-[#1A2A25] ${chip.border} text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#20332D]`
                }`}
              >
                <span className={`text-base font-black block leading-none ${isActive ? 'text-white' : ''}`}>
                  {chip.count.toLocaleString()}
                </span>
                <span className={`text-[10px] font-bold block truncate mt-1 ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-[#8FA69C]'}`}>
                  {chip.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Sticky Search & Category Row (All items h-11) */}
        <div className="px-3 pb-2.5 pt-1 flex items-center gap-2 shrink-0 border-b border-slate-100 dark:border-[#24352F]">
          <div className="relative flex-1 h-11">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={'Search name / barcode'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-9 pr-8 rounded-xl text-xs bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="w-11 h-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xs active:scale-95 transition cursor-pointer"
            title={'Scan Barcode'}
          >
            <Barcode className="w-5 h-5" />
          </button>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="h-11 px-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none shrink-0 max-w-[110px] truncate"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 5. Product Image Catalog List (Only this section scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {isLoadingModalProducts && displayedProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-medium">{'Loading products...'}</p>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-3">
              <ImageIcon className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs">{'No products match your search criteria.'}</p>
              <button
                type="button"
                onClick={() => setIsBarcodeScannerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95"
              >
                <Barcode className="w-4 h-4" />
                <span>{'Scan Barcode to Add Photo'}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {displayedProducts.map((prod: Product) => {
                  const st = (prod.image_status || '').toLowerCase();
                  const src = prod.image_source || '';
                  const isOfficial = st === 'official_verified' || src.toLowerCase().includes('official');
                  const isRetailer = st === 'retailer_verified' || src.toLowerCase().includes('retailer');
                  const isNeedsReview = st === 'needs_manual_review' || (Boolean(prod.image_url) && st === 'pending');

                  return (
                    <div 
                      key={prod.id} 
                      className="p-2.5 rounded-2xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-2.5 shadow-2xs hover:border-emerald-500/40 transition"
                    >
                      {/* Left: Product Image 64x64 */}
                      <div className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-[#131F1B] border border-slate-100 dark:border-[#24352F] p-1 flex items-center justify-center overflow-hidden shrink-0">
                        <ProductImage 
                          src={(prod as any)?.image_url ?? prod.image_url} 
                          alt={prod.name} 
                          category={prod.category} 
                          size="md" 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Middle: Name, Badges, Category */}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {prod.name}
                        </span>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {isOfficial && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 shrink-0">
                              🛡️ {'Official'}
                            </span>
                          )}
                          {!isOfficial && isRetailer && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-300 dark:border-indigo-800 shrink-0">
                              🏪 {'Retailer'}
                            </span>
                          )}
                          {!isOfficial && !isRetailer && prod.image_url && !isNeedsReview && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 text-[10px] font-bold border border-sky-300 dark:border-sky-800 shrink-0">
                              🗄️ {'Trusted'}
                            </span>
                          )}
                          {isNeedsReview && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800 shrink-0">
                              ⚠️ {'Review'}
                            </span>
                          )}
                          {!prod.image_url && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold shrink-0">
                              🔍 {'Missing'}
                            </span>
                          )}

                          {prod.barcode ? (
                            <span className="font-mono bg-slate-100 dark:bg-[#131F1B] px-1.5 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-300 font-bold shrink-0">
                              {prod.barcode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">{'No barcode'}</span>
                          )}
                        </div>

                        <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5 truncate">
                          {prod.category}{prod.unit && ` • ${prod.unit}`}{prod.brand && ` • ${prod.brand}`}
                        </div>
                      </div>

                      {/* Right: Actions (Minimum 40px touch targets) */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isNeedsReview && (
                          <>
                            <button
                              onClick={() => handleApproveImage(prod)}
                              className="w-10 h-10 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center justify-center transition active:scale-95 cursor-pointer"
                              title={'Approve Image'}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectImage(prod)}
                              className="w-10 h-10 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition active:scale-95 cursor-pointer"
                              title={'Reject Image'}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {prod.image_url && (
                          <button
                            onClick={() => setPreviewImage({ url: prod.image_url!, name: prod.name })}
                            className="w-10 h-10 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-[#24352F] flex items-center justify-center transition active:scale-95 cursor-pointer"
                            title={'View larger photo'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => openImageEditorForProduct(prod)}
                          className="h-10 px-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#131F1B] hover:bg-slate-200 dark:hover:bg-[#20332D] text-slate-700 dark:text-[#8FA69C] transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-[#24352F] active:scale-95"
                          title={'Update photo URL'}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden xs:inline">
                            {prod.image_url ? 'Change' : 'Add'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreModalProducts && (
                <div className="py-2.5 text-center">
                  <button
                    type="button"
                    disabled={isLoadingModalProducts}
                    onClick={handleLoadMoreModalProducts}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-700 dark:text-white text-xs font-bold border border-slate-200 dark:border-[#24352F] transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoadingModalProducts && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
                    <span>
                      {`Load More Products (${displayedProducts.length}+)`}
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Barcode Scanner Modal Integration */}
        {isBarcodeScannerOpen && (
          <BarcodeScannerModal
            isOpen={isBarcodeScannerOpen}
            onClose={() => setIsBarcodeScannerOpen(false)}
            mode="lookup"
            zIndex="z-[120]"
            onBarcodeScanned={handleBarcodeScanned}
          />
        )}

        {/* Scanned Barcode Not Found Notice */}
        {scannedBarcodeNotFound && (
          <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-30">
            <div className="w-full max-w-sm bg-white dark:bg-[#1A2A25] rounded-3xl p-5 shadow-2xl border border-rose-300 dark:border-rose-900/60 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {'Product Not Found'}
              </h4>
              <p className="text-xs text-slate-500">
                {'No product linked to the scanned barcode was found in the catalogue:'}
              </p>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#131F1B] font-mono text-xs font-bold text-slate-800 dark:text-white">
                {scannedBarcodeNotFound}
              </div>
              <p className="text-[11px] text-slate-400">
                {'You can search for the product by typing its name in the search box.'}
              </p>
              <button
                type="button"
                onClick={() => setScannedBarcodeNotFound(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs cursor-pointer active:scale-95 transition"
              >
                {'OK'}
              </button>
            </div>
          </div>
        )}

        {/* Manual & Barcode-Driven Image URL Edit Modal Dialog */}
        {editingProduct && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-30 overflow-y-auto">
            <div className="w-full max-w-lg bg-white dark:bg-[#1A2A25] rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4 max-h-[92vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {'Add / Update Product Photo'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {'Save from barcode lookup or by entering a direct photo URL'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setOnlineSuggestedImage(null);
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Product Info Card */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                    {editingProduct.name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                    {editingProduct.brand && <span className="font-semibold text-emerald-600">{editingProduct.brand}</span>}
                    <span>• {editingProduct.category}</span>
                    {editingProduct.unit && <span>• {editingProduct.unit}</span>}
                  </div>
                </div>

                {editingProduct.barcode && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-200/60 dark:bg-[#24352F] text-slate-800 dark:text-white text-xs font-mono font-bold shrink-0">
                    <Barcode className="w-4 h-4 text-emerald-600" />
                    <span>{editingProduct.barcode}</span>
                  </div>
                )}
              </div>

              {/* Online Image Lookup State (Searching or Found) */}
              {isSearchingOnlineImage && (
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300">
                  <Sparkles className="w-4 h-4 animate-spin text-sky-600" />
                  <span>
                    {'Searching online official database...'}
                  </span>
                </div>
              )}

              {onlineSuggestedImage && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 dark:from-emerald-950/40 dark:via-[#1A2A25] dark:to-emerald-950/40 border-2 border-emerald-500 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>
                        {`✨ Official photo found (${onlineSuggestedImage.source})`}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditUrlInput(onlineSuggestedImage.url)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{'Use This Photo'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <img 
                      src={onlineSuggestedImage.url} 
                      alt="Online Found" 
                      className="w-14 h-14 object-contain rounded-xl bg-white border border-slate-200 p-1 shrink-0" 
                    />
                    <div className="min-w-0 text-[11px] text-slate-600 dark:text-[#8FA69C]">
                      <p className="truncate font-semibold">{onlineSuggestedImage.name || editingProduct.name}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">{onlineSuggestedImage.url}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Image Input Options: Direct URL or Camera / File Upload */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      {'Photo URL'}
                    </label>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{'📷 Camera / Choose Photo'}</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept={ALLOWED_IMAGE_ACCEPT}
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </div>
                  {fileError && (
                    <div className="mb-2 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      {fileError}
                    </div>
                  )}
                  <input
                    type="url"
                    placeholder={'https://.../product.jpg or capture with camera'}
                    value={editUrlInput}
                    onChange={e => setEditUrlInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Live Preview Box */}
                {editUrlInput.trim() && (
                  <div className="p-3 bg-slate-50 dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={editUrlInput} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain rounded-lg"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }} 
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">
                        {'Live Photo Preview'}
                      </span>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {editUrlInput.startsWith('data:')
                          ? 'Local Camera Photo (Direct Upload)'
                          : editUrlInput}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#24352F]">
                {editingProduct.image_url && (
                  <button
                    type="button"
                    onClick={() => setEditUrlInput('')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition mr-auto cursor-pointer"
                  >
                    {'Clear'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setOnlineSuggestedImage(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                >
                  {'Cancel'}
                </button>
                <button
                  type="button"
                  disabled={isValidatingUrl || (!editUrlInput.trim() && !editingProduct.image_url)}
                  onClick={handleSaveManualUrl}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {isValidatingUrl
                      ? 'Checking...'
                      : 'Save Photo'}
                  </span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Full Image Preview Modal */}
        {previewImage && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-30" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-sm w-full bg-white dark:bg-[#1A2A25] rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate pr-2">{previewImage.name}</span>
                <button onClick={() => setPreviewImage(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-2">
                <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-full object-contain" />
              </div>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 hover:underline"
              >
                <span>{'Open Original Link'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

      </div>

      {/* Automatic Compression Preview & Storage Upload Modal */}
      <SquareImageCropperModal
        file={cropFile}
        productName={editingProduct?.name}
        isUploading={isUploadingPhoto}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onReplaceFile={(nextFile) => {
          setUploadError(null);
          setCropFile(nextFile);
        }}
        onCancel={() => {
          if (!isUploadingPhoto) {
            setCropFile(null);
            setUploadError(null);
            setUploadProgress(0);
          }
        }}
        onConfirm={handleConfirmCompressedStorageUpload}
      />
    </div>
  );
};

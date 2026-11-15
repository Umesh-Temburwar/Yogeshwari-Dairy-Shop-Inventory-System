import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Play, Pause, Download, 
  Search, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, 
  Edit2, Eye, ShieldCheck, Database, ShoppingBag, AlertOctagon, HelpCircle, Check, Ban
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProductImage } from '../Common/ProductImage';
import { globalImageManager, ImageFetchProgress, validateImageUrl } from '../../utils/imageFetchingEngine';
import { supabase } from '../../lib/supabase';
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
  const { language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<ImageStatusFilter>('ALL');
  
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
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  // Calculate live statistics across all 8 prompt-required states
  const stats = useMemo(() => {
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
        // Default verified image from open database
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
  }, [products, totalCatalogCount, totalBarcodesCount]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: Product) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Filtered products for display
  const filteredProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const q = searchQuery.toLowerCase().trim();
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
  }, [products, searchQuery, selectedCategory, statusFilter]);

  if (!isOpen) return null;

  // Start Batch Image Fetching
  const handleStartFetching = () => {
    globalImageManager.startProcessing(products, {
      batchSize: 20,
      delayMs: 200,
      onProgress: (p) => setProgress(p),
      onProductUpdated: (productId, newUrl) => {
        if (setProducts) {
          setProducts((prev: Product[]) => 
            prev.map(item => item.id === productId ? { 
              ...item, 
              image_url: newUrl, 
              image_status: 'trusted_database_verified',
              image_source: 'OpenFoodFacts'
            } : item)
          );
        }
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
    } catch (e) {
      console.error('Failed to reject image:', e);
    }
  };

  // Save manual image URL
  const handleSaveManualUrl = async () => {
    if (!editingProduct) return;
    setIsValidatingUrl(true);
    const cleanUrl = editUrlInput.trim();

    if (cleanUrl) {
      const isValid = await validateImageUrl(cleanUrl);
      if (!isValid) {
        alert(language === 'mr' 
          ? 'हा फोटो URL उघडता येत नाही किंवा वैध फोटो फॉरमॅट नाही.' 
          : 'यह इमेज URL लोड नहीं हो सका या वैध फॉर्मेट नहीं है।');
        setIsValidatingUrl(false);
        return;
      }
    }

    try {
      const newStatus = cleanUrl ? 'official_verified' : 'not_found';
      const newSource = cleanUrl ? 'MANUAL' : null;

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
      setEditingProduct(null);
      setEditUrlInput('');
    } catch (err) {
      console.error('Failed to save manual image URL:', err);
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Export Missing as CSV
  const handleExportMissing = () => {
    const missing = products.filter((p: Product) => (!p.image_url || p.image_url.trim() === '') && p.barcode);
    const headers = ['barcode', 'product_name', 'brand', 'category', 'pack_size', 'selling_price'];
    const rows = missing.map((p: Product) => [
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
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-[#131F1B] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#24352F] flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-[#24352F] bg-slate-50/70 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Product Image Management Dashboard</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                  46,571 Master Records
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr'
                  ? 'अधिकृत ब्रँड आणि फूड डेटाबेसमधून अचूक फोटो पडताळणी व व्यवस्थापन'
                  : 'आधिकारिक ब्रांड और खाद्य डेटाबेस से सटीक उत्पाद तस्वीर सत्यापन व प्रबंधन'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (progress.isRunning) handleStop();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 8 Metric KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 p-3 bg-slate-100/60 dark:bg-[#0E1714] border-b border-slate-200 dark:border-[#24352F] text-center">
          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
            <span className="text-[10px] font-bold text-slate-500 block truncate">एकूण उत्पादने</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{stats.totalProducts.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-emerald-300 dark:border-emerald-800">
            <span className="text-[10px] font-bold text-emerald-600 block truncate">Official Brand</span>
            <span className="text-sm font-black text-emerald-600">{stats.officialCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-sky-300 dark:border-sky-800">
            <span className="text-[10px] font-bold text-sky-600 block truncate">Trusted DB</span>
            <span className="text-sm font-black text-sky-600">{stats.trustedCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-indigo-300 dark:border-indigo-800">
            <span className="text-[10px] font-bold text-indigo-600 block truncate">Retailer Verified</span>
            <span className="text-sm font-black text-indigo-600">{stats.retailerCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-amber-300 dark:border-amber-800">
            <span className="text-[10px] font-bold text-amber-600 block truncate">Needs Review</span>
            <span className="text-sm font-black text-amber-600">{stats.needsReviewCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-rose-300 dark:border-rose-800">
            <span className="text-[10px] font-bold text-rose-600 block truncate">Incorrect</span>
            <span className="text-sm font-black text-rose-600">{stats.incorrectCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-red-300 dark:border-red-800">
            <span className="text-[10px] font-bold text-red-500 block truncate">Broken URLs</span>
            <span className="text-sm font-black text-red-500">{stats.brokenCount.toLocaleString()}</span>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-300 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-500 block truncate">Missing Image</span>
            <span className="text-sm font-black text-slate-600 dark:text-slate-300">{stats.missingCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Live Batch Engine Progress Banner (If Running) */}
        {progress.isRunning && (
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-b border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-white block">
                  {progress.isPaused ? '⏸️ प्रक्रिया थांबवली आहे (Paused)' : '🔄 अचूक फोटो पडताळणी सुरू आहे...'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  तपासत आहे: <strong>{progress.currentBarcode}</strong> ({progress.currentProductName || 'उत्पादन'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-[#131F1B] border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                सापडले: {progress.verified} | अनुपलब्ध: {progress.missing}
              </span>
              {progress.isPaused ? (
                <button
                  onClick={handleResume}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-amber-600 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={handleStop}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* 8 Filter Pills Toolbar */}
        <div className="p-3 border-b border-slate-200 dark:border-[#24352F] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'सर्व (All)' },
              { id: 'OFFICIAL', label: '🛡️ Official Brand' },
              { id: 'TRUSTED', label: '🗄️ Trusted DB' },
              { id: 'RETAILER', label: '🏪 Retailer' },
              { id: 'NEEDS_REVIEW', label: '⚠️ Needs Review' },
              { id: 'INCORRECT', label: '❌ Incorrect' },
              { id: 'BROKEN', label: '🚫 Broken' },
              { id: 'MISSING', label: '🔍 Missing' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as ImageStatusFilter)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!progress.isRunning && (
              <button
                onClick={handleStartFetching}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Auto-Fetch</span>
              </button>
            )}
            <button
              onClick={handleExportMissing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-[#24352F] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Sub-toolbar */}
        <div className="px-4 py-2 bg-slate-50/70 dark:bg-[#1A2A25]/30 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="बारकोड, ब्रँड किंवा नाव शोधा (Search by Barcode, Brand, Name)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Product Image Catalog Table / Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-xs">कोणतेही उत्पादन सापडले नाही (No products match criteria).</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#24352F]">
              {filteredProducts.slice(0, 60).map((prod: Product) => {
                const st = (prod.image_status || '').toLowerCase();
                const src = prod.image_source || '';
                const isOfficial = st === 'official_verified' || src.toLowerCase().includes('official');
                const isRetailer = st === 'retailer_verified' || src.toLowerCase().includes('retailer');
                const isNeedsReview = st === 'needs_manual_review' || (Boolean(prod.image_url) && st === 'pending');

                return (
                  <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/40 px-2 rounded-xl transition">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ProductImage 
                        src={(prod as any)?.image_url ?? prod.image_url} 
                        alt={prod.name} 
                        category={prod.category} 
                        size="md" 
                        className="shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {prod.name}
                          </span>
                          
                          {/* Status Badge */}
                          {isOfficial && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 shrink-0">
                              🛡️ Official Brand
                            </span>
                          )}
                          {!isOfficial && isRetailer && (
                            <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 text-[10px] font-bold border border-indigo-300 dark:border-indigo-800 shrink-0">
                              🏪 Retailer
                            </span>
                          )}
                          {!isOfficial && !isRetailer && prod.image_url && !isNeedsReview && (
                            <span className="px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 text-[10px] font-bold border border-sky-300 dark:border-sky-800 shrink-0">
                              🗄️ Trusted DB
                            </span>
                          )}
                          {isNeedsReview && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-800 shrink-0">
                              ⚠️ Review Required
                            </span>
                          )}
                          {!prod.image_url && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] shrink-0">
                              No Image
                            </span>
                          )}
                        </div>

                        {/* Subtitle details */}
                        <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex items-center gap-2 mt-1 flex-wrap">
                          <span className="font-mono bg-slate-100 dark:bg-[#131F1B] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#24352F]">
                            {prod.barcode || 'No Barcode'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold">{prod.brand || 'General Brand'}</span>
                          <span>•</span>
                          <span>{prod.pack_size || prod.unit || 'Standard'}</span>
                          <span>•</span>
                          <span>₹{prod.selling_price}</span>
                          {src && (
                            <>
                              <span>•</span>
                              <span className="text-[10px] text-slate-400">Src: {src}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Preview, Approve, Reject, Edit */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isNeedsReview && (
                        <>
                          <button
                            onClick={() => handleApproveImage(prod)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 cursor-pointer"
                            title="Approve Image"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectImage(prod)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-800 cursor-pointer"
                            title="Reject Image"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {prod.image_url && (
                        <button
                          onClick={() => setPreviewImage({ url: prod.image_url!, name: prod.name })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer"
                          title="फोटो मोठा करून पहा"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingProduct(prod);
                          setEditUrlInput(prod.image_url || '');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 text-slate-700 dark:text-[#8FA69C] transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-[#24352F]"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{prod.image_url ? 'बदला' : 'URL जोडा'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredProducts.length > 60 && (
            <div className="text-center py-2 text-xs text-slate-400 border-t border-slate-100 dark:border-[#24352F]">
              ...आणखी {filteredProducts.length - 60} उत्पादने उपलब्ध (पहिली ६० दाखवत आहोत). विशिष्ट उत्पादनासाठी सर्च वापरा.
            </div>
          )}
        </div>

        {/* Manual Image URL Edit Modal Dialog */}
        {editingProduct && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="w-full max-w-md bg-white dark:bg-[#1A2A25] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  अधिकृत फोटो URL जोडा / संपादित करा
                </h4>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-white block">{editingProduct.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">बारकोड: {editingProduct.barcode}</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  थेट बाह्य फोटो URL (External Image URL)
                </label>
                <input
                  type="url"
                  placeholder="https://.../product.jpg"
                  value={editUrlInput}
                  onChange={e => setEditUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              {editUrlInput.trim() && (
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-[#131F1B] rounded-xl border border-slate-200 dark:border-[#24352F]">
                  <ProductImage src={editUrlInput} alt="Preview" size="sm" />
                  <span className="text-[11px] text-slate-500">फोटो प्रीव्ह्यू</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingProduct.image_url && (
                  <button
                    type="button"
                    onClick={() => setEditUrlInput('')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition mr-auto"
                  >
                    हटवा (Clear)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  रद्द करा
                </button>
                <button
                  type="button"
                  disabled={isValidatingUrl}
                  onClick={handleSaveManualUrl}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                >
                  {isValidatingUrl ? 'तपासत आहे...' : 'सेव्ह करा (Save)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Image Preview Modal */}
        {previewImage && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-30" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-sm bg-white dark:bg-[#1A2A25] rounded-3xl p-4 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white truncate pr-2">{previewImage.name}</span>
                <button onClick={() => setPreviewImage(null)} className="p-1 text-slate-400 hover:text-white">
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
                <span>मूळ लिंक उघडा</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

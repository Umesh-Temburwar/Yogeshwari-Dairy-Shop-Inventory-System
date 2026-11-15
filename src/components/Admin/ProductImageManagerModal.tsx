import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Play, Pause, RotateCcw, Download, 
  Search, CheckCircle2, AlertTriangle, ExternalLink, Sparkles, 
  Edit2, Trash2, Eye, Filter
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

export const ProductImageManagerModal: React.FC<ProductImageManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products, setProducts, totalCatalogCount = 46571, totalBarcodesCount = 44202 } = useStore() as any;
  const { language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HAS_IMAGE' | 'NO_IMAGE'>('ALL');
  
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

  // Calculate live statistics
  const stats = useMemo(() => {
    const withBarcode = products.filter((p: Product) => p.barcode && p.barcode.trim().length >= 5);
    const withImage = products.filter((p: Product) => p.image_url && p.image_url.trim().length > 0);
    const missingImage = withBarcode.filter((p: Product) => !p.image_url || p.image_url.trim() === '');
    const percentage = withBarcode.length > 0 
      ? Math.round((withImage.length / withBarcode.length) * 100) 
      : 0;

    return {
      totalProducts: totalCatalogCount || products.length,
      eligibleBarcodes: totalBarcodesCount || withBarcode.length,
      verifiedImages: withImage.length,
      missingImages: missingImage.length,
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
      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'HAS_IMAGE' && Boolean(p.image_url)) ||
        (statusFilter === 'NO_IMAGE' && (!p.image_url || p.image_url.trim() === ''));

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, statusFilter]);

  if (!isOpen) return null;

  // Start Batch Image Fetching
  const handleStartFetching = () => {
    globalImageManager.startProcessing(products, {
      batchSize: 15,
      delayMs: 250,
      onProgress: (p) => setProgress(p),
      onProductUpdated: (productId, newUrl) => {
        if (setProducts) {
          setProducts((prev: Product[]) => 
            prev.map(item => item.id === productId ? { ...item, image_url: newUrl } : item)
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
      if (supabase) {
        await supabase
          .from('products')
          .update({ image_url: cleanUrl || null })
          .eq('id', editingProduct.id);
      }
      if (setProducts) {
        setProducts((prev: Product[]) => 
          prev.map(p => p.id === editingProduct.id ? { ...p, image_url: cleanUrl || null } : p)
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
    const headers = ['barcode', 'product_name', 'brand', 'category', 'selling_price'];
    const rows = missing.map((p: Product) => [
      `"${p.barcode || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#131F1B] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#24352F] flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-[#24352F] bg-slate-50/70 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Product Image Database Integration</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 font-bold border border-emerald-300 dark:border-emerald-800">
                  46,000+ Barcodes
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr'
                  ? 'बारकोडनुसार उत्पादनांचे फोटो शोधणे, तपासणे व ॲपमध्ये जोडणे'
                  : 'बारकोड के आधार पर उत्पाद तस्वीरें खोजना, जांचना और जोड़ना'}
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

        {/* Statistics KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-100/60 dark:bg-[#0E1714] border-b border-slate-200 dark:border-[#24352F]">
          <div className="p-3 rounded-2xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
            <span className="text-[11px] font-bold text-slate-500 dark:text-[#8FA69C] block">एकूण बारकोड्स</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{stats.eligibleBarcodes.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">✓ फोटो उपलब्ध (Verified)</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.verifiedImages.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block">फोटो नसलेले (Missing)</span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">{stats.missingImages.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F]">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">प्रगती (Coverage)</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black text-blue-600 dark:text-blue-400">{stats.percentage}%</span>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Batch Engine Progress Banner (If Running) */}
        {progress.isRunning && (
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-b border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-white block">
                  {progress.isPaused ? '⏸️ प्रक्रिया थांबवली आहे (Paused)' : '🔄 स्वयंचलित फोटो शोध सुरू आहे...'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                  सध्या तपासत आहे: <strong>{progress.currentBarcode}</strong> ({progress.currentProductName || 'उत्पादन'})
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

        {/* Action Controls Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-[#24352F] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!progress.isRunning ? (
              <button
                onClick={handleStartFetching}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>स्वयंचलित फोटो शोधा (Start Auto-Fetch)</span>
              </button>
            ) : null}

            <button
              onClick={handleExportMissing}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2A25] dark:hover:bg-[#24352F] text-slate-700 dark:text-[#8FA69C] font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-[#24352F] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Missing Barcodes CSV</span>
            </button>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="बारकोड किंवा नाव शोधा..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-white outline-none"
            >
              <option value="ALL">सर्व (All)</option>
              <option value="HAS_IMAGE">✓ फोटो आहे (Has Image)</option>
              <option value="NO_IMAGE">✗ फोटो नाही (No Image)</option>
            </select>
          </div>
        </div>

        {/* Product Image Catalog Table / Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ImageIcon className="w-10 h-10 mx-auto opacity-30 mb-2" />
              <p className="text-xs">कोणतेही उत्पादन सापडले नाही.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#24352F]">
              {filteredProducts.slice(0, 50).map((prod: Product) => (
                <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-[#1A2A25]/40 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductImage 
                      src={prod.image_url} 
                      alt={prod.name} 
                      category={prod.category} 
                      size="sm" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {prod.name}
                        </span>
                        {prod.image_url ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] shrink-0">
                            Pending
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#8FA69C] flex items-center gap-2 mt-0.5">
                        <span className="font-mono bg-slate-100 dark:bg-[#131F1B] px-1.5 py-0.5 rounded border border-slate-200 dark:border-[#24352F]">
                          {prod.barcode || 'No Barcode'}
                        </span>
                        <span>•</span>
                        <span>{prod.brand || 'General'}</span>
                        <span>•</span>
                        <span>₹{prod.selling_price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {prod.image_url && (
                      <button
                        onClick={() => setPreviewImage({ url: prod.image_url!, name: prod.name })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer"
                        title="फोटो मोठा करून पहा"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingProduct(prod);
                        setEditUrlInput(prod.image_url || '');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 text-slate-700 dark:text-[#8FA69C] transition flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-[#24352F]"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{prod.image_url ? 'बदला' : 'URL जोडा'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length > 50 && (
            <div className="text-center py-2 text-xs text-slate-400 border-t border-slate-100 dark:border-[#24352F]">
              ...आणखी {filteredProducts.length - 50} उत्पादने उपलब्ध (पहिली ५० दाखवत आहोत). अचूक उत्पादनासाठी सर्च वापरा.
            </div>
          )}
        </div>

        {/* Manual Image URL Edit Modal Dialog */}
        {editingProduct && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
            <div className="w-full max-w-md bg-white dark:bg-[#1A2A25] rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-[#24352F] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  फोटो URL जोडा / संपादित करा
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
                  placeholder="https://images.openfoodfacts.org/.../front.jpg"
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
                    onClick={() => {
                      setEditUrlInput('');
                    }}
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

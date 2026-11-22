import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Loader2,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';
import { PRODUCT_IMAGES_BUCKET } from '../../lib/productImageService';

interface BrandLogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BrandEntry {
  name: string;
  count: number;
  logoUrl?: string | null;
}

export const BrandLogoManagerModal: React.FC<BrandLogoManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products } = useStore();
  const [dbBrands, setDbBrands] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingBrand, setUploadingBrand] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedBrandRef = useRef<string | null>(null);

  // Load brands from Supabase
  const loadBrands = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('name, logo_url, is_active')
        .eq('is_active', true);

      if (!error && Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((b) => {
          if (b.name && b.logo_url) {
            map[b.name.trim()] = b.logo_url;
          }
        });
        setDbBrands(map);
      }
    } catch (err) {
      console.error('Failed to load brands', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBrands();
    }
  }, [isOpen]);

  // Aggregate brands from loaded inventory products
  const brandList: BrandEntry[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const b = (p.brand || '').trim();
      if (!b) continue;
      map.set(b, (map.get(b) || 0) + 1);
    }

    // Also include any brands stored in database
    Object.keys(dbBrands).forEach((name) => {
      if (!map.has(name)) {
        map.set(name, 0);
      }
    });

    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        logoUrl: dbBrands[name] || (name.toLowerCase() === 'yogeshwari' ? '/YDO_logo.png' : null),
      }))
      .sort((a, b) => b.count - a.count);
  }, [products, dbBrands]);

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brandList;
    const q = searchQuery.toLowerCase().trim();
    return brandList.filter((b) => b.name.toLowerCase().includes(q));
  }, [brandList, searchQuery]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Trigger file selection for a specific brand
  const handleSelectUpload = (brandName: string) => {
    selectedBrandRef.current = brandName;
    fileInputRef.current?.click();
  };

  // Upload logo with WebP / PNG transparency preservation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const brandName = selectedBrandRef.current;
    if (!file || !brandName) return;

    // Reset input so re-selecting same file works
    e.target.value = '';

    setUploadingBrand(brandName);
    try {
      // Create clean file name
      const ext = file.type.includes('png') ? 'png' : 'webp';
      const cleanSlug = brandName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filePath = `brand-logos/${cleanSlug}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || `image/${ext}`,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(uploadData.path);

      const publicUrl = publicUrlData.publicUrl;

      // Upsert into brands table
      const { error: dbError } = await supabase
        .from('brands')
        .upsert(
          {
            name: brandName,
            logo_url: publicUrl,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        );

      if (dbError) {
        throw new Error(dbError.message);
      }

      setDbBrands((prev) => ({ ...prev, [brandName]: publicUrl }));
      showToast(`Logo updated for ${brandName}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to upload logo', 'error');
    } finally {
      setUploadingBrand(null);
    }
  };

  // Remove / delete logo
  const handleRemoveLogo = async (brandName: string) => {
    if (!window.confirm(`Remove logo for ${brandName}?`)) return;
    setUploadingBrand(brandName);
    try {
      await supabase
        .from('brands')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('name', brandName);

      setDbBrands((prev) => {
        const next = { ...prev };
        delete next[brandName];
        return next;
      });
      showToast(`Logo removed for ${brandName}`);
    } catch {
      showToast('Failed to remove logo', 'error');
    } finally {
      setUploadingBrand(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/webp,image/jpeg,image/jpg"
        className="hidden"
      />

      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Brand Logos Manager
              </h2>
              <p className="text-xs text-slate-500">
                Owner Only • Real Brand Logos for E-Commerce &amp; POS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
                : 'bg-rose-50 text-rose-800 border-b border-rose-100'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands (e.g. Amul, Yogeshwari, Parle)..."
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>

        {/* Brands List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading brands...</span>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No brands found matching your search.
            </div>
          ) : (
            filteredBrands.map((b) => {
              const isUploadingThis = uploadingBrand === b.name;
              return (
                <div
                  key={b.name}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50/80 transition-colors gap-3"
                >
                  {/* Left: Logo + Brand Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 shadow-2xs p-1.5 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {isUploadingThis ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      ) : b.logoUrl ? (
                        <img
                          src={b.logoUrl}
                          alt={b.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-black text-sm flex items-center justify-center">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {b.name}
                        </span>
                        {!b.logoUrl && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                            Missing logo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {b.count} {b.count === 1 ? 'product' : 'products'} in inventory
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Upload / Replace / Remove */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isUploadingThis}
                      onClick={() => handleSelectUpload(b.name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{b.logoUrl ? 'Replace' : 'Upload'}</span>
                    </button>

                    {b.logoUrl && b.name.toLowerCase() !== 'yogeshwari' && (
                      <button
                        type="button"
                        disabled={isUploadingThis}
                        onClick={() => handleRemoveLogo(b.name)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredBrands.length} brands total</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

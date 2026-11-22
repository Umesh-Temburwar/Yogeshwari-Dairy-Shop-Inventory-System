// ============================================================================
// YOGESHWARI DAIRY SHOP ERP - BRAND MASTER & REALTIME SYNC
// File: src/components/Admin/BrandLogoManagerModal.tsx
// ============================================================================

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
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Check,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { supabase } from '../../lib/supabase';
import { PRODUCT_IMAGES_BUCKET } from '../../lib/productImageService';

interface BrandLogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DbBrandRecord {
  id?: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
  description?: string | null;
}

interface BrandAggregateItem {
  id?: string;
  name: string;
  logo_url: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
  is_in_db: boolean;
}

interface BrandFormData {
  originalName?: string;
  name: string;
  logo_url: string;
  display_order: number;
  is_active: boolean;
}

export const BrandLogoManagerModal: React.FC<BrandLogoManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products } = useStore();
  const [dbBrands, setDbBrands] = useState<Record<string, DbBrandRecord>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'HIDDEN' | 'MISSING_LOGO'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingBrand, setUploadingBrand] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add / Edit Form Modal State
  const [editFormData, setEditFormData] = useState<BrandFormData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const selectedQuickUploadBrandRef = useRef<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Fetch all brands from public.brands table
  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.warn('Error querying brands table:', error.message);
      } else if (Array.isArray(data)) {
        const map: Record<string, DbBrandRecord> = {};
        data.forEach((row: any) => {
          if (row.name) {
            const trimmed = row.name.trim();
            map[trimmed.toLowerCase()] = {
              id: row.id,
              name: trimmed,
              logo_url: row.logo_url || null,
              display_order: typeof row.display_order === 'number' ? row.display_order : 0,
              is_active: row.is_active !== false,
              description: row.description || null,
            };
          }
        });
        setDbBrands(map);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Realtime Subscription on public:brands
  useEffect(() => {
    if (!isOpen) return;
    fetchBrands();

    const channel = supabase
      .channel('inventory-brands-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brands' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            if (updated && updated.name) {
              const trimmed = updated.name.trim();
              setDbBrands((prev) => ({
                ...prev,
                [trimmed.toLowerCase()]: {
                  id: updated.id,
                  name: trimmed,
                  logo_url: updated.logo_url || null,
                  display_order: typeof updated.display_order === 'number' ? updated.display_order : 0,
                  is_active: updated.is_active !== false,
                  description: updated.description || null,
                },
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            if (deleted && deleted.id) {
              setDbBrands((prev) => {
                const next = { ...prev };
                for (const key of Object.keys(next)) {
                  if (next[key].id === deleted.id) {
                    delete next[key];
                    break;
                  }
                }
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  // 3. Aggregate all brands from both active inventory products and database
  const aggregatedBrands: BrandAggregateItem[] = useMemo(() => {
    // Count products per brand from inventory
    const productCounts = new Map<string, number>();
    for (const p of products) {
      const b = (p.brand || '').trim();
      if (!b) continue;
      const key = b.toLowerCase();
      productCounts.set(key, (productCounts.get(key) || 0) + 1);
    }

    const items: BrandAggregateItem[] = [];
    const processedKeys = new Set<string>();

    // Add all database brand records
    Object.keys(dbBrands).forEach((key) => {
      const dbRecord = dbBrands[key];
      processedKeys.add(key);
      items.push({
        id: dbRecord.id,
        name: dbRecord.name,
        logo_url: dbRecord.logo_url || (dbRecord.name.toLowerCase() === 'yogeshwari' ? '/YDO_logo.png' : null),
        display_order: dbRecord.display_order,
        is_active: dbRecord.is_active,
        product_count: productCounts.get(key) || 0,
        is_in_db: true,
      });
    });

    // Add any brands found in inventory that haven't been stored in database yet
    for (const p of products) {
      const b = (p.brand || '').trim();
      if (!b) continue;
      const key = b.toLowerCase();
      if (!processedKeys.has(key)) {
        processedKeys.add(key);
        items.push({
          name: b,
          logo_url: b.toLowerCase() === 'yogeshwari' ? '/YDO_logo.png' : null,
          display_order: 99,
          is_active: true,
          product_count: productCounts.get(key) || 0,
          is_in_db: false,
        });
      }
    }

    // Sort: display_order ASC, then product_count DESC, then name ASC
    return items.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      if (b.product_count !== a.product_count) {
        return b.product_count - a.product_count;
      }
      return a.name.localeCompare(b.name);
    });
  }, [products, dbBrands]);

  // 4. Filtered List
  const filteredBrands = useMemo(() => {
    let list = aggregatedBrands;

    // Filter status tab
    if (filterTab === 'ACTIVE') {
      list = list.filter((b) => b.is_active);
    } else if (filterTab === 'HIDDEN') {
      list = list.filter((b) => !b.is_active);
    } else if (filterTab === 'MISSING_LOGO') {
      list = list.filter((b) => !b.logo_url);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    return list;
  }, [aggregatedBrands, filterTab, searchQuery]);

  // 5. Quick Upload Trigger
  const handleQuickUploadClick = (brandName: string) => {
    selectedQuickUploadBrandRef.current = brandName;
    fileInputRef.current?.click();
  };

  // 6. Quick File Upload Handler
  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const brandName = selectedQuickUploadBrandRef.current;
    if (!file || !brandName) return;

    e.target.value = '';
    setUploadingBrand(brandName);

    try {
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

      // Upsert into public.brands
      const existing = dbBrands[brandName.toLowerCase()];
      const { data: savedData, error: dbError } = await supabase
        .from('brands')
        .upsert(
          {
            name: brandName,
            logo_url: publicUrl,
            display_order: existing?.display_order ?? 0,
            is_active: existing?.is_active ?? true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        )
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      setDbBrands((prev) => ({
        ...prev,
        [brandName.toLowerCase()]: {
          id: savedData?.id || existing?.id,
          name: brandName,
          logo_url: publicUrl,
          display_order: existing?.display_order ?? 0,
          is_active: existing?.is_active ?? true,
        },
      }));

      showToast(`Logo updated for ${brandName}!`);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to upload logo', 'error');
    } finally {
      setUploadingBrand(null);
    }
  };

  // 7. Toggle Active / Hidden Status
  const handleToggleActive = async (brand: BrandAggregateItem) => {
    const nextActive = !brand.is_active;
    try {
      const { error } = await supabase
        .from('brands')
        .upsert(
          {
            name: brand.name,
            logo_url: brand.logo_url || null,
            display_order: brand.display_order,
            is_active: nextActive,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'name' }
        );

      if (error) throw error;

      setDbBrands((prev) => ({
        ...prev,
        [brand.name.toLowerCase()]: {
          ...(prev[brand.name.toLowerCase()] || {}),
          name: brand.name,
          logo_url: brand.logo_url || null,
          display_order: brand.display_order,
          is_active: nextActive,
        },
      }));

      showToast(`${brand.name} is now ${nextActive ? 'Active in E-Commerce' : 'Hidden from E-Commerce'}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  // 8. Delete Brand Record from public.brands
  const handleDeleteBrand = async (brand: BrandAggregateItem) => {
    const confirmMsg = brand.product_count > 0
      ? `Remove "${brand.name}" from Brand Master?\n\nNote: ${brand.product_count} products in inventory will keep their brand label, but the brand configuration & logo will be removed from E-Commerce.`
      : `Delete brand "${brand.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('name', brand.name);

      if (error) throw error;

      setDbBrands((prev) => {
        const next = { ...prev };
        delete next[brand.name.toLowerCase()];
        return next;
      });

      showToast(`Brand "${brand.name}" deleted from master.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete brand', 'error');
    }
  };

  // 9. Open Add New Brand Form
  const handleOpenAddNew = () => {
    const maxOrder = aggregatedBrands.reduce((max, b) => Math.max(max, b.display_order), 0);
    setEditFormData({
      name: '',
      logo_url: '',
      display_order: maxOrder + 1,
      is_active: true,
    });
    setIsFormOpen(true);
  };

  // 10. Open Edit Brand Form
  const handleOpenEdit = (brand: BrandAggregateItem) => {
    setEditFormData({
      originalName: brand.name,
      name: brand.name,
      logo_url: brand.logo_url || '',
      display_order: brand.display_order,
      is_active: brand.is_active,
    });
    setIsFormOpen(true);
  };

  // 11. Form File Upload Handler
  const handleFormFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editFormData) return;
    e.target.value = '';

    setIsSaving(true);
    try {
      const ext = file.type.includes('png') ? 'png' : 'webp';
      const cleanSlug = (editFormData.name || 'brand').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const filePath = `brand-logos/${cleanSlug}_${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || `image/${ext}`,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(uploadData.path);

      setEditFormData((prev) => prev ? { ...prev, logo_url: publicUrlData.publicUrl } : null);
      showToast('Photo uploaded successfully! Save to confirm.');
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 12. Save Brand (Add or Edit)
  const handleSaveBrandForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !editFormData.name.trim()) {
      showToast('Please enter brand name', 'error');
      return;
    }

    const cleanName = editFormData.name.trim();
    setIsSaving(true);

    try {
      const payload: any = {
        name: cleanName,
        logo_url: editFormData.logo_url.trim() || null,
        display_order: Number(editFormData.display_order) || 0,
        is_active: editFormData.is_active,
        updated_at: new Date().toISOString(),
      };

      // If renaming an existing brand, update by original name
      if (editFormData.originalName && editFormData.originalName !== cleanName) {
        const { error: updateErr } = await supabase
          .from('brands')
          .update(payload)
          .eq('name', editFormData.originalName);

        if (updateErr) throw updateErr;

        setDbBrands((prev) => {
          const next = { ...prev };
          delete next[editFormData.originalName!.toLowerCase()];
          next[cleanName.toLowerCase()] = {
            name: cleanName,
            logo_url: payload.logo_url,
            display_order: payload.display_order,
            is_active: payload.is_active,
          };
          return next;
        });
      } else {
        // Normal upsert
        const { data: saved, error: upsertErr } = await supabase
          .from('brands')
          .upsert(payload, { onConflict: 'name' })
          .select()
          .single();

        if (upsertErr) throw upsertErr;

        setDbBrands((prev) => ({
          ...prev,
          [cleanName.toLowerCase()]: {
            id: saved?.id,
            name: cleanName,
            logo_url: payload.logo_url,
            display_order: payload.display_order,
            is_active: payload.is_active,
          },
        }));
      }

      showToast(`Brand "${cleanName}" saved successfully!`);
      setIsFormOpen(false);
      setEditFormData(null);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save brand', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleQuickFileChange}
        accept="image/png,image/webp,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
      />
      <input
        type="file"
        ref={formFileInputRef}
        onChange={handleFormFileUpload}
        accept="image/png,image/webp,image/jpeg,image/jpg,image/svg+xml"
        className="hidden"
      />

      <div className="bg-white dark:bg-[#131F1B] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-[#24352F] animate-scale-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between bg-slate-50/80 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-300/60 dark:border-emerald-800/50 shadow-2xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Brand Master Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Realtime Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage logos, priority order &amp; visibility for E-Commerce &amp; POS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddNew}
              className="h-9 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Brand</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1E2E28] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-b border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-b border-rose-200 dark:border-rose-800'
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

        {/* Search & Filter Strip */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-[#24352F] bg-white dark:bg-[#131F1B] space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands (e.g. Amul, Yogeshwari, Parle)..."
              className="w-full h-10 bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#2A3E37] rounded-xl pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {[
              { id: 'ALL', label: 'All Brands', count: aggregatedBrands.length },
              { id: 'ACTIVE', label: 'Active', count: aggregatedBrands.filter((b) => b.is_active).length },
              { id: 'HIDDEN', label: 'Hidden', count: aggregatedBrands.filter((b) => !b.is_active).length },
              { id: 'MISSING_LOGO', label: 'Missing Logo', count: aggregatedBrands.filter((b) => !b.logo_url).length },
            ].map((tab) => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`h-7 px-2.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#253831]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#2E453D] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Brands List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Synchronizing Brand Master...</span>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs space-y-2">
              <p>No brands found matching your search.</p>
              <button
                type="button"
                onClick={handleOpenAddNew}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add new brand now</span>
              </button>
            </div>
          ) : (
            filteredBrands.map((b) => {
              const isUploadingThis = uploadingBrand === b.name;
              return (
                <div
                  key={b.name}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all gap-3 ${
                    !b.is_active
                      ? 'bg-slate-50/60 dark:bg-[#141C19] border-slate-200/60 dark:border-[#1E2E28] opacity-75'
                      : 'bg-white dark:bg-[#131F1B] border-slate-200/90 dark:border-[#24352F] shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {/* Left: Logo + Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Logo Box */}
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#1A2A25] border border-slate-200/80 dark:border-[#24352F] shadow-2xs p-1 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {isUploadingThis ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                      ) : b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-black text-sm flex items-center justify-center">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {b.name}
                        </span>

                        {/* Order Priority Pill */}
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-slate-100 dark:bg-[#1E2E28] text-slate-600 dark:text-slate-400"
                          title="Display Order Priority"
                        >
                          #{b.display_order}
                        </span>

                        {/* Missing Logo Alert */}
                        {!b.logo_url && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            No Logo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>
                          {b.product_count} {b.product_count === 1 ? 'product' : 'products'}
                        </span>
                        <span>&bull;</span>
                        <span className={b.is_active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {b.is_active ? 'Visible in Store' : 'Hidden from Store'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Active / Hidden 1-Tap Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(b)}
                      className={`h-8 px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                        b.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-[#24352F]'
                      }`}
                      title={b.is_active ? 'Click to hide from E-Commerce' : 'Click to show in E-Commerce'}
                    >
                      {b.is_active ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span className="hidden sm:inline">Hidden</span>
                        </>
                      )}
                    </button>

                    {/* Quick Photo Upload / Replace */}
                    <button
                      type="button"
                      disabled={isUploadingThis}
                      onClick={() => handleQuickUploadClick(b.name)}
                      className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                      title="Upload / Replace Brand Logo Image"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">{b.logo_url ? 'Replace' : 'Upload'}</span>
                    </button>

                    {/* Edit Brand Details */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] hover:bg-slate-50 text-slate-700 dark:text-slate-300 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                      title="Edit Brand Name, Priority &amp; Logo URL"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Brand Record */}
                    {b.name.toLowerCase() !== 'yogeshwari' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBrand(b)}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                        title="Delete brand from master"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#24352F] bg-slate-50/80 dark:bg-[#1A2A25]/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{filteredBrands.length} of {aggregatedBrands.length} brands</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* ADD / EDIT BRAND DIALOG MODAL */}
      {isFormOpen && editFormData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white dark:bg-[#131F1B] rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-300 dark:border-emerald-800">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-[#E7F0EC]">
                    {editFormData.originalName ? `Edit "${editFormData.originalName}"` : 'Add New Brand'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Live Supabase Realtime synchronization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditFormData(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBrandForm} className="p-4 sm:p-5 space-y-4">
              {/* Brand Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g. Amul, Yogeshwari, Parle"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-[#2A3E37] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Logo Preview & Upload */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Brand Logo Photo / Image
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#2A3E37] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {editFormData.logo_url ? (
                      <img
                        src={editFormData.logo_url}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => formFileInputRef.current?.click()}
                      className="w-full h-9 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-800 transition active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editFormData.logo_url ? 'Replace from Device' : 'Upload from Device'}</span>
                    </button>
                    <p className="text-[10px] text-slate-400">
                      Supports transparent PNG, WebP or JPEG
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Image URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Or Paste Custom HTTPS Logo URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="url"
                    value={editFormData.logo_url}
                    onChange={(e) => setEditFormData({ ...editFormData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-[#2A3E37] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              {/* Display Order & Active Visibility */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Display Priority (Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.display_order}
                    onChange={(e) => setEditFormData({ ...editFormData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-[#2A3E37] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-white text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-[10px] text-slate-400">1 = First shelf, 2 = Second</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Store Visibility
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, is_active: !editFormData.is_active })}
                    className={`w-full h-10 px-3 rounded-xl border font-bold text-xs inline-flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      editFormData.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-[#1A2A25] text-slate-500 border-slate-200 dark:border-[#24352F]'
                    }`}
                  >
                    {editFormData.is_active ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Active (Visible)</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] text-slate-400">Toggle for E-Commerce</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditFormData(null);
                  }}
                  className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )}
                  <span>Save Brand Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

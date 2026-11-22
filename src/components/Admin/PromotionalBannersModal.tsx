// ============================================================================
// YOGESHWARI DAIRY SHOP ERP - E-COMMERCE PROMOTIONAL BANNERS MODAL
// File: src/components/Admin/PromotionalBannersModal.tsx
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { PromotionalBanner } from '../../types';
import {
  fetchPromotionalBanners,
  savePromotionalBanner,
  deletePromotionalBanner,
  toggleBannerStatus,
  updateBannersOrder,
  BANNER_PRESETS
} from '../../services/bannerService';

interface PromotionalBannersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromotionalBannersModal: React.FC<PromotionalBannersModalProps> = ({
  isOpen,
  onClose
}) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkType, setLinkType] = useState<'CATEGORY' | 'BRAND' | 'EXTERNAL' | 'NONE'>('CATEGORY');
  const [linkTarget, setLinkTarget] = useState('Milk');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPromotionalBanners(false);
      setBanners(data);
    } catch {
      setStatusMessage({ text: 'Failed to load banners', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadBanners();
    }
  }, [isOpen, loadBanners]);

  // Flash notification helper
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  const resetForm = () => {
    setEditingBannerId(null);
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setLinkType('CATEGORY');
    setLinkTarget('Milk');
    setDisplayOrder(banners.length + 1);
    setIsActive(true);
    setShowAddForm(false);
  };

  const handleStartEdit = (b: PromotionalBanner) => {
    setEditingBannerId(b.id);
    setTitle(b.title);
    setSubtitle(b.subtitle || '');
    setImageUrl(b.image_url);
    setLinkType((b.link_type as 'CATEGORY' | 'BRAND' | 'EXTERNAL' | 'NONE') || 'CATEGORY');
    setLinkTarget(b.link_target || '');
    setDisplayOrder(b.display_order);
    setIsActive(b.is_active);
    setShowAddForm(true);
  };

  const handleApplyPreset = (preset: typeof BANNER_PRESETS[0]) => {
    setTitle(preset.title);
    setSubtitle(preset.subtitle);
    setImageUrl(preset.image_url);
    setLinkType(preset.link_type);
    setLinkTarget(preset.link_target);
    setShowAddForm(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      showFeedback('Title and Image URL are required', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await savePromotionalBanner({
        id: editingBannerId || undefined,
        title: title.trim(),
        subtitle: subtitle.trim(),
        image_url: imageUrl.trim(),
        link_type: linkType,
        link_target: linkTarget.trim(),
        display_order: displayOrder,
        is_active: isActive
      });

      if (res.success) {
        showFeedback(editingBannerId ? 'Poster updated successfully!' : 'New poster added!');
        resetForm();
        await loadBanners();
      } else {
        showFeedback(res.error || 'Failed to save poster', 'error');
      }
    } catch {
      showFeedback('Error saving poster', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, bannerTitle: string) => {
    if (!window.confirm(`Delete poster "${bannerTitle}"?`)) return;
    try {
      const res = await deletePromotionalBanner(id);
      if (res.success) {
        showFeedback('Poster removed');
        await loadBanners();
      } else {
        showFeedback(res.error || 'Failed to delete', 'error');
      }
    } catch {
      showFeedback('Error deleting poster', 'error');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await toggleBannerStatus(id, !currentStatus);
      if (res.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, is_active: !currentStatus } : b))
        );
        showFeedback(!currentStatus ? 'Poster activated' : 'Poster deactivated');
      }
    } catch {
      showFeedback('Failed to toggle status', 'error');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIndex, 0, moved);

    // Update orders
    const updated = newBanners.map((b, idx) => ({ ...b, display_order: idx + 1 }));
    setBanners(updated);

    try {
      await updateBannersOrder(updated);
      showFeedback('Posters re-ordered');
    } catch {
      showFeedback('Failed to update order', 'error');
      await loadBanners();
    }
  };

  if (!isOpen) return null;

  const activeCount = banners.filter((b) => b.is_active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#131F1B] w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#24352F] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#24352F] flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#182722]/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
                E-Commerce Top Posters & Banners
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                Manage sliding posters. Top 5 active posters auto-slide in customer store.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" />
              <span>{activeCount} Active</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white dark:bg-[#1E2E28] hover:bg-slate-100 dark:hover:bg-[#253831] border border-slate-200 dark:border-[#2A3E37] flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FEEDBACK STATUS BANNER */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button type="button" onClick={() => setStatusMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ACTION BUTTONS & PRESETS ROW */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (showAddForm) resetForm();
                else setShowAddForm(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{showAddForm ? 'Cancel Form' : '+ Add New Poster'}</span>
            </button>

            <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
              Tip: Drag or use ▲ / ▼ to reorder slides
            </span>
          </div>

          {/* ADD / EDIT BANNER FORM */}
          {showAddForm && (
            <form
              onSubmit={handleSaveBanner}
              className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#16231E] border border-emerald-500/30 dark:border-emerald-500/20 space-y-3.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-[#E7F0EC] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{editingBannerId ? 'Edit Poster / Banner' : 'Create New Poster'}</span>
                </h3>

                {/* 1-Tap Presets Dropdown/Pills */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-[55%] pb-1 scrollbar-none">
                  <span className="text-[10px] text-slate-400 shrink-0 font-medium mr-1">Presets:</span>
                  {BANNER_PRESETS.slice(0, 4).map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2 py-0.5 rounded-full bg-white dark:bg-[#1E2E28] hover:bg-emerald-50 border border-slate-200 dark:border-[#253831] text-[10px] font-medium text-slate-700 dark:text-[#C4D4CE] shrink-0 cursor-pointer"
                    >
                      {preset.link_target}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#C4D4CE] mb-1">
                    Banner Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Farm Fresh Buffalo Milk"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#C4D4CE] mb-1">
                    Subtitle / Tagline
                  </label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. 100% Pure, delivered daily in Ambajogai"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Image URL + Live Preview */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#C4D4CE] mb-1">
                  Poster Image URL * (High-resolution 1200x500 recommended)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-[11px]"
                  />
                  {imageUrl && (
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-600 dark:text-[#C4D4CE] text-xs flex items-center gap-1 hover:text-emerald-600"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </a>
                  )}
                </div>
                {imageUrl && (
                  <div className="mt-2 h-24 sm:h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-[#24352F] relative bg-slate-100 dark:bg-black/40">
                    <img
                      src={imageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-end p-2 sm:p-3 text-white">
                      <p className="text-xs font-bold leading-tight drop-shadow-sm">{title || 'Banner Title'}</p>
                      {subtitle && <p className="text-[10px] text-white/90 drop-shadow-xs">{subtitle}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Click Target & Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#C4D4CE] mb-1">
                    Click Link Type
                  </label>
                  <select
                    value={linkType}
                    onChange={(e) => setLinkType(e.target.value as any)}
                    className="w-full h-9 px-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="CATEGORY">Category</option>
                    <option value="BRAND">Brand</option>
                    <option value="EXTERNAL">External URL</option>
                    <option value="NONE">None (No Action)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-[#C4D4CE] mb-1">
                    Target Name / URL
                  </label>
                  <input
                    type="text"
                    value={linkTarget}
                    onChange={(e) => setLinkTarget(e.target.value)}
                    placeholder="e.g. Milk or Amul"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-[#E7F0EC]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                    />
                    <span>Active in Store</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#24352F]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] text-slate-700 dark:text-[#C4D4CE] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#1A2A24] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBannerId ? 'Update Poster' : 'Save & Publish Poster'}</span>
                </button>
              </div>
            </form>
          )}

          {/* BANNERS LIST */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading promotional posters...</span>
            </div>
          ) : banners.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-[#24352F] p-6 space-y-3">
              <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                No posters configured yet. Click below to load 5 dairy starter presets!
              </p>
              <button
                type="button"
                onClick={async () => {
                  for (const preset of BANNER_PRESETS.slice(0, 5)) {
                    await savePromotionalBanner(preset);
                  }
                  await loadBanners();
                  showFeedback('Loaded 5 starter dairy posters!');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Load Starter Banners
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {banners.map((b, idx) => (
                <div
                  key={b.id}
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    b.is_active
                      ? 'bg-white dark:bg-[#16231E] border-slate-200 dark:border-[#24352F] shadow-xs'
                      : 'bg-slate-50 dark:bg-[#111916] border-slate-200/60 dark:border-[#1E2E28] opacity-70'
                  }`}
                >
                  {/* Left: Thumbnail + Order + Titles */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Order Badge & Reorder Controls */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, 'up')}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#20322B] text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#1E2E28] text-[10px] font-mono font-bold text-slate-700 dark:text-[#C4D4CE] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        disabled={idx === banners.length - 1}
                        onClick={() => handleMoveOrder(idx, 'down')}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#20322B] text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-20 sm:w-28 h-14 sm:h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-[#24352F] shrink-0">
                      <img
                        src={b.image_url}
                        alt={b.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#E7F0EC] truncate">
                          {b.title}
                        </h4>
                        {idx < 5 && b.is_active && (
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[9px] font-bold">
                            Slide {idx + 1}
                          </span>
                        )}
                      </div>
                      {b.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                          {b.subtitle}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        {b.link_type !== 'NONE' && (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <span>{b.link_type}:</span>
                            <span className="font-bold underline">{b.link_target}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Toggle Status, Edit, Delete */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(b.id, b.is_active)}
                      className={`h-8 px-2.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                        b.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-[#1E2E28] text-slate-400 border-slate-200 dark:border-[#24352F]'
                      }`}
                      title={b.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                    >
                      {b.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{b.is_active ? 'Active' : 'Hidden'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(b)}
                      className="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#182722] hover:bg-slate-100 dark:hover:bg-[#20322B] text-slate-600 dark:text-[#C4D4CE] flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit Poster"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(b.id, b.title)}
                      className="w-8 h-8 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Poster"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-[#24352F] flex items-center justify-between text-xs text-slate-500 dark:text-[#8FA69C] bg-slate-50/80 dark:bg-[#182722]/80">
          <span>{banners.length} Total Posters ({activeCount} Active)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-[#1E2E28] hover:bg-slate-300 dark:hover:bg-[#263b33] text-slate-700 dark:text-[#E7F0EC] text-xs font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

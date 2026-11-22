import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Image as ImageIcon,
  Check,
  Upload,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { CategoryRecord } from '../../types';
import {
  fetchCategories,
  updateCategoryPhotoUrl,
  subscribeToCategoryChanges,
  CURATED_CATEGORY_PRESETS,
  DEFAULT_CATEGORY_IMAGES
} from '../../services/categoryService';

interface CategoryPhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryPhotoManagerModal: React.FC<CategoryPhotoManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { products } = useStore();
  const { t } = useLanguage();

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRecord | null>(null);

  // Edit form state
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

  // Load and subscribe to live category updates
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchCategories().then((cats) => {
      setCategories(cats);
      setIsLoading(false);
    });

    const unsubscribe = subscribeToCategoryChanges((updatedList) => {
      setCategories(updatedList);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Product counts per category
  const productCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.marathi_name && c.marathi_name.toLowerCase().includes(q)) ||
        (c.hindi_name && c.hindi_name.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Open editor for a category
  const handleSelectCategoryToEdit = (cat: CategoryRecord) => {
    setSelectedCategory(cat);
    setCustomUrlInput(cat.image_url || DEFAULT_CATEGORY_IMAGES[cat.name] || '');
    setPreviewError(false);
    setSaveSuccessMessage(null);
  };

  // Save updated photo URL
  const handleSavePhotoUrl = async () => {
    if (!selectedCategory) return;
    setIsSaving(true);
    try {
      const updated = await updateCategoryPhotoUrl(
        { id: selectedCategory.id, name: selectedCategory.name },
        customUrlInput.trim()
      );
      setSelectedCategory(updated);
      setSaveSuccessMessage(`✅ "${selectedCategory.name}" photo updated & synced to E-Commerce!`);
      setTimeout(() => setSaveSuccessMessage(null), 3500);
    } catch (e: any) {
      alert(`Could not save photo URL: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original default photo
  const handleResetToDefault = async () => {
    if (!selectedCategory) return;
    const defaultUrl = DEFAULT_CATEGORY_IMAGES[selectedCategory.name] || 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=400&q=80';
    setCustomUrlInput(defaultUrl);
    setPreviewError(false);
    setIsSaving(true);
    try {
      const updated = await updateCategoryPhotoUrl(
        { id: selectedCategory.id, name: selectedCategory.name },
        defaultUrl
      );
      setSelectedCategory(updated);
      setSaveSuccessMessage(`🔄 Reset "${selectedCategory.name}" photo to default!`);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Apply a curated preset with 1-click
  const handleApplyPreset = (url: string) => {
    setCustomUrlInput(url);
    setPreviewError(false);
  };

  // File upload directly to base64 data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo file is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCustomUrlInput(reader.result);
        setPreviewError(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#131F1B] rounded-3xl border border-slate-200 dark:border-[#24352F] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-view-enter">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#24352F] flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Category Photos & Custom URLs
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  E-Commerce Sync
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update category cover photos for the customer e-commerce store and POS billing counter
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast */}
        {saveSuccessMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Category Photo Editor (When category is selected) */}
          {selectedCategory && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border-2 border-emerald-500/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#24352F] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎨</span>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Editing Photo: <span className="text-emerald-600 dark:text-emerald-400">{selectedCategory.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedCategory.marathi_name ? `${selectedCategory.marathi_name} • ` : ''}
                      Paste any image link or select from preset stock photos below
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-[#24352F] cursor-pointer"
                >
                  Close Editor
                </button>
              </div>

              {/* Photo URL Input & Preview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Live Preview Column */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-center">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {customUrlInput && !previewError ? (
                      <img
                        src={customUrlInput}
                        alt={selectedCategory.name}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                        onError={() => setPreviewError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 p-2 text-center">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <span className="text-[10px] font-bold">Image load error</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white uppercase">
                      Live
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mt-2">
                    E-Commerce Store Preview
                  </span>
                </div>

                {/* Input Controls Column */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Custom Photo URL (https://...)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          setPreviewError(false);
                        }}
                        placeholder="https://images.unsplash.com/... or paste image link"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSaving || !customUrlInput.trim()}
                      onClick={handleSavePhotoUrl}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save & Sync Photo URL'}</span>
                    </button>

                    <label className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#24352F] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Upload Device Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleResetToDefault}
                      className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white text-xs font-semibold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-[#24352F] transition cursor-pointer"
                      title="Reset back to default photo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Default</span>
                    </button>
                  </div>

                  {/* 1-Tap Preset Suggestions for this category */}
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Quick Preset Suggestions for {selectedCategory.name}:
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {CURATED_CATEGORY_PRESETS.filter(
                        (p) =>
                          p.category.toLowerCase() === selectedCategory.name.toLowerCase() ||
                          selectedCategory.name.toLowerCase().includes(p.category.toLowerCase())
                      ).map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset.url)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] hover:border-emerald-500 text-left flex items-center gap-2 shrink-0 transition cursor-pointer group"
                        >
                          <img
                            src={preset.url}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-[11px] font-black text-slate-900 dark:text-white group-hover:text-emerald-600 truncate max-w-[120px]">
                              {preset.title}
                            </p>
                            <span className="text-[9px] text-slate-400">Click to use</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search category (उदा. Milk, पनीर, Ghee)..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total <b>{categories.length}</b> Categories configured
            </p>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCategories.map((cat) => {
              const count = productCountMap[cat.name] || 0;
              const currentImg = cat.image_url || DEFAULT_CATEGORY_IMAGES[cat.name];
              const isSelected = selectedCategory?.id === cat.id || selectedCategory?.name === cat.name;

              return (
                <div
                  key={cat.id || cat.name}
                  onClick={() => handleSelectCategoryToEdit(cat)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 group hover:shadow-md ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-[#24352F] bg-white dark:bg-[#131F1B] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Category Thumbnail Image */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-[#24352F] bg-slate-100 dark:bg-slate-800">
                    {currentImg ? (
                      <img
                        src={currentImg}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition">
                        {cat.name}
                      </h4>
                    </div>
                    {cat.marathi_name && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                        {cat.marathi_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A2A25] text-slate-600 dark:text-slate-300">
                        📦 {count} items
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 opacity-90">
                        <span>Edit Photo ✏️</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            All custom photos automatically reflect in customer e-commerce app and counter billing bar.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 ml-auto transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

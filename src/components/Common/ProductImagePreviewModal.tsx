import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Barcode
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ProductImagePreviewModalProps {
  product: Product | null;
  onClose: () => void;
  onImageUpdated?: (productId: string, newUrl: string | null) => void;
}

export const ProductImagePreviewModal: React.FC<ProductImagePreviewModalProps> = ({
  product,
  onClose,
  onImageUpdated
}) => {
  const { updateProduct } = useStore();
  const { language } = useLanguage();

  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (product) {
      const currentUrl = (product.image_url || '').trim();
      setUrlInput(currentUrl);
      setCopied(false);
      setPreviewError(false);
      setPreviewLoaded(false);
      setFeedback(null);
    }
  }, [product]);

  // Close on Escape key
  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const trimmedInput = urlInput.trim();
  const activePreviewUrl = trimmedInput.startsWith('http://') || trimmedInput.startsWith('https://')
    ? trimmedInput
    : '';
  const currentSavedUrl = (product.image_url || '').trim();
  const hasChanges = trimmedInput !== currentSavedUrl;

  const displayName =
    language === 'mr' && product.marathi_name
      ? product.marathi_name
      : language === 'hi' && product.hindi_name
      ? product.hindi_name
      : product.name;

  const handleCopyUrl = async () => {
    const textToCopy = trimmedInput || currentSavedUrl;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (trimmedInput && !trimmedInput.startsWith('http://') && !trimmedInput.startsWith('https://')) {
      setFeedback({
        type: 'error',
        text:
          language === 'mr'
            ? 'कृपया वैध https:// किंवा http:// इमेज URL टाका.'
            : language === 'hi'
            ? 'कृपया वैध https:// या http:// इमेज URL दर्ज करें।'
            : 'Please enter a valid http:// or https:// image URL.'
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const nextUrl = trimmedInput || undefined;

      // Update StoreContext + Supabase
      await updateProduct(product.id, { image_url: nextUrl });

      // Also stamp official verification metadata in Supabase when available
      if (supabase) {
        try {
          await supabase
            .from('products')
            .update({
              image_url: nextUrl || null,
              image_status: nextUrl ? 'official_verified' : 'missing',
              image_source: nextUrl ? 'OFFICIAL_BRAND' : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);
        } catch {
          // Non-blocking metadata update
        }
      }

      onImageUpdated?.(product.id, nextUrl || null);

      setFeedback({
        type: 'success',
        text: nextUrl
          ? language === 'mr'
            ? 'उत्पादनाची अधिकृत इमेज URL यशस्वीरित्या अपडेट झाली!'
            : language === 'hi'
            ? 'उत्पाद का आधिकारिक इमेज URL सफलतापूर्वक अपडेट हो गया!'
            : 'Official product image URL updated successfully!'
          : language === 'mr'
          ? 'उत्पादनाची इमेज काढली गेली.'
          : language === 'hi'
          ? 'उत्पाद की इमेज हटा दी गई।'
          : 'Product image removed.'
      });
    } catch {
      setFeedback({
        type: 'error',
        text:
          language === 'mr'
            ? 'URL सेव्ह करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
            : language === 'hi'
            ? 'URL सेव करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
            : 'Failed to save image URL. Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveImage = async () => {
    setUrlInput('');
    setPreviewError(false);
    setPreviewLoaded(false);
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateProduct(product.id, { image_url: undefined });
      if (supabase) {
        try {
          await supabase
            .from('products')
            .update({ image_url: null, image_status: 'missing', updated_at: new Date().toISOString() })
            .eq('id', product.id);
        } catch {}
      }
      onImageUpdated?.(product.id, null);
      setFeedback({
        type: 'success',
        text:
          language === 'mr'
            ? 'इमेज यशस्वीरित्या काढली गेली.'
            : language === 'hi'
            ? 'इमेज सफलतापूर्वक हटाई गई।'
            : 'Image removed successfully.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const googleImageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${product.brand && product.brand !== 'Generic' && product.brand !== 'Yogeshwari Dairy' ? product.brand + ' ' : ''}${product.name} official packshot white background`
  )}`;

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-image-modal-title"
    >
      <div
        className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-slate-200/90 dark:border-[#24352F] rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-[#24352F]">
          <div className="min-w-0">
            <h3
              id="product-image-modal-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight truncate"
            >
              {displayName}
            </h3>
            <div className="flex items-center flex-wrap gap-2 mt-1 text-[11px] text-slate-500 dark:text-[#8FA69C]">
              {product.brand && (
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {product.brand}
                </span>
              )}
              {product.barcode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2A25] font-mono font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-[#24352F]">
                  <Barcode className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {product.barcode}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* Pure-White Official Studio Photo Stage */}
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-white border border-slate-200/90 dark:border-[#24352F] shadow-inner flex items-center justify-center overflow-hidden p-3">
            {activePreviewUrl && !previewError ? (
              <img
                key={activePreviewUrl}
                src={activePreviewUrl}
                alt={product.name}
                referrerPolicy="no-referrer"
                onLoad={() => {
                  setPreviewLoaded(true);
                  setPreviewError(false);
                }}
                onError={() => {
                  setPreviewLoaded(false);
                  setPreviewError(true);
                }}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-slate-400 p-4 space-y-2">
                <ImageIcon className="w-12 h-12 text-slate-300" />
                <p className="text-xs font-semibold">
                  {previewError
                    ? language === 'mr'
                      ? 'ही इमेज URL लोड होऊ शकली नाही. कृपया दुसरी अधिकृत URL टाका.'
                      : language === 'hi'
                      ? 'यह इमेज URL लोड नहीं हो सकी। कृपया दूसरा आधिकारिक URL डालें।'
                      : 'Unable to load this image URL. Please enter another official URL.'
                    : language === 'mr'
                    ? 'अद्याप कोणतीही इमेज सेट केलेली नाही'
                    : language === 'hi'
                    ? 'अभी तक कोई इमेज सेट नहीं है'
                    : 'No product image set yet'}
                </p>
              </div>
            )}

            {/* Status Pill */}
            {activePreviewUrl && previewLoaded && !previewError && (
              <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold shadow-2xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>Preview Ready</span>
              </span>
            )}
          </div>

          {/* Current Image URL Display + Copy & Open Actions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-[#E7F0EC]">
                {language === 'mr'
                  ? 'उत्पादनाची अधिकृत इमेज URL'
                  : language === 'hi'
                  ? 'उत्पाद का आधिकारिक इमेज URL'
                  : 'Product Official Image URL'}
              </span>

              <div className="flex items-center gap-1.5">
                {activePreviewUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-slate-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'mr' ? 'कॉपी झाले' : language === 'hi' ? 'कॉपी हुआ' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{language === 'mr' ? 'URL कॉपी' : language === 'hi' ? 'कॉपी' : 'Copy'}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={activePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] text-slate-700 dark:text-slate-200 text-[11px] font-bold transition"
                      title="Open image in new tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{language === 'mr' ? 'उघडा' : language === 'hi' ? 'खोलें' : 'Open'}</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Editable Image URL Form */}
            <form onSubmit={handleSaveUrl} className="space-y-3">
              <textarea
                rows={2}
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setPreviewError(false);
                  setPreviewLoaded(false);
                  setFeedback(null);
                }}
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-slate-50 dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none break-all"
              />

              {/* Quick Google Official Image Search Helper */}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <a
                  href={googleImageSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {language === 'mr'
                      ? 'Google वर अधिकृत पांढऱ्या बॅकग्राउंडची फोटो शोधा →'
                      : language === 'hi'
                      ? 'Google पर आधिकारिक व्हाइट बैकग्राउंड फोटो खोजें →'
                      : 'Find Official White-BG Packshot on Google →'}
                  </span>
                </a>
              </div>

              {feedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {currentSavedUrl && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleRemoveImage}
                    className="px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/35 hover:bg-rose-100 dark:hover:bg-rose-900/45 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'mr' ? 'काढा' : language === 'hi' ? 'हटाएं' : 'Remove'}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving || !hasChanges}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 inline-flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'mr' ? 'अपडेट होत आहे...' : language === 'hi' ? 'अपडेट हो रहा है...' : 'Updating...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {language === 'mr'
                          ? 'नवीन इमेज URL सेव्ह करा'
                          : language === 'hi'
                          ? 'नया इमेज URL सेव करें'
                          : 'Update Image URL'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  ClipboardPaste,
  ExternalLink,
  Image as ImageIcon,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Barcode,
  Upload,
  Camera,
  Crop
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { clearFailedImageUrl } from './ProductImage';
import { SquareImageCropperModal } from './SquareImageCropperModal';
import {
  ALLOWED_IMAGE_ACCEPT,
  validateImageFile,
  uploadProcessedProductImage,
  fetchImageUrlAsFile,
  formatFileSize,
  ProcessedSquareImage
} from '../../lib/productImageService';

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
  const { user, role } = useAuth();
  const isAdmin = Boolean(user) && (role === 'Owner' || role === 'Admin');

  const [urlInput, setUrlInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSourceChooser, setShowSourceChooser] = useState(false);
  const [isLoadingCropCurrent, setIsLoadingCropCurrent] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveCameraOpen(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (product) {
      const currentUrl = (product.image_url || '').trim();
      setUrlInput(currentUrl);
      setCopied(false);
      setPasted(false);
      setPreviewError(false);
      setPreviewLoaded(false);
      setFeedback(null);
      setCropFile(null);
      setUploadError(null);
      setUploadProgress(0);
      setShowSourceChooser(false);
      stopLiveCamera();
    }
  }, [product]);

  // Attach live camera MediaStream to video element when live camera modal opens
  useEffect(() => {
    if (!isLiveCameraOpen) return;
    let active = true;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (active) {
          setCameraError(
            language === 'mr'
              ? 'कॅमेरा सुरू करता आला नाही. कृपया कॅमेरा परवानगी द्या किंवा गॅलरीमधून फोटो निवडा.'
              : language === 'hi'
              ? 'कैमरा शुरू नहीं हो सका। कृपया कैमरा अनुमति दें या गैलरी से फोटो चुनें।'
              : 'Could not open camera. Please allow camera permission or choose from Gallery.'
          );
        }
      }
    };

    void startCamera();
    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isLiveCameraOpen, language]);

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

  const handleSelectDeviceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setFeedback({
        type: 'error',
        text: validation.error || 'Unsupported or corrupted image file.'
      });
      return;
    }

    setShowSourceChooser(false);
    setFeedback(null);
    setUploadError(null);
    setCropFile(file);
  };

  const handleChooseGallery = () => {
    setShowSourceChooser(false);
    fileInputRef.current?.click();
  };

  const handleChooseCamera = () => {
    setShowSourceChooser(false);
    const isMobile =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      setIsLiveCameraOpen(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleSnapLiveCamera = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const captured = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
        stopLiveCamera();
        setFeedback(null);
        setUploadError(null);
        setCropFile(captured);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCropCurrentPhoto = async () => {
    if (!activePreviewUrl || !isAdmin || isLoadingCropCurrent) return;
    setIsLoadingCropCurrent(true);
    setFeedback(null);
    setShowSourceChooser(false);
    try {
      const fetchedFile = await fetchImageUrlAsFile(activePreviewUrl, product.name);
      setUploadError(null);
      setCropFile(fetchedFile);
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : language === 'mr'
            ? 'या फोटोवर थेट क्रॉप करता आले नाही. कृपया गॅलरी किंवा कॅमेरा निवडा.'
            : language === 'hi'
            ? 'इस फोटो को सीधे क्रॉप नहीं किया जा सका। कृपया गैलरी या कैमरा चुनें।'
            : 'Could not crop this external URL directly. Please choose from Gallery or Camera.'
      });
    } finally {
      setIsLoadingCropCurrent(false);
    }
  };

  const handleConfirmDeviceUpload = async (processed: ProcessedSquareImage) => {
    if (!isAdmin) return;
    setIsUploadingFile(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const { publicUrl } = await uploadProcessedProductImage({
        processed,
        productId: product.id,
        oldImageUrl: currentSavedUrl,
        isAdmin,
        onProgress: setUploadProgress
      });

      clearFailedImageUrl(publicUrl);
      await updateProduct(product.id, { image_url: publicUrl });

      if (supabase) {
        try {
          await supabase
            .from('products')
            .update({
              image_url: publicUrl,
              image_status: 'official_verified',
              image_source: 'STORAGE_WEBP',
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);
        } catch {
          // Non-blocking metadata update
        }
      }

      setUrlInput(publicUrl);
      setPreviewError(false);
      setPreviewLoaded(false);
      onImageUpdated?.(product.id, publicUrl);
      setCropFile(null);
      setFeedback({
        type: 'success',
        text:
          language === 'mr'
            ? `WebP अपलोड झाला (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, बचत ${processed.savedPercent}%).`
            : language === 'hi'
            ? `WebP अपलोड हुआ (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, बचत ${processed.savedPercent}%)।`
            : `Uploaded WebP (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, saved ${processed.savedPercent}%).`
      });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

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

  const handlePasteUrl = async () => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
        throw new Error('Clipboard read unsupported');
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!clipText) {
        setFeedback({
          type: 'error',
          text:
            language === 'mr'
              ? 'क्लिपबोर्डवर कोणतीही लिंक कॉपी केलेली नाही.'
              : language === 'hi'
              ? 'क्लिपबोर्ड पर कोई लिंक कॉपी नहीं है।'
              : 'Clipboard is empty. Copy an image URL first.'
        });
        return;
      }
      setUrlInput(clipText);
      setPreviewError(false);
      setPreviewLoaded(false);
      setFeedback(null);
      setPasted(true);
      setTimeout(() => setPasted(false), 2000);
    } catch {
      textareaRef.current?.focus();
      setFeedback({
        type: 'error',
        text:
          language === 'mr'
            ? 'ब्राउझरने क्लिपबोर्ड परवानगी नाकारली — कृपया बॉक्समध्ये लाँग-प्रेस करून Paste करा.'
            : language === 'hi'
            ? 'ब्राउज़र ने क्लिपबोर्ड अनुमति रोकी — कृपया बॉक्स में लॉन्ग-प्रेस करके Paste करें।'
            : 'Clipboard permission blocked — long-press or Ctrl+V inside the URL box to paste.'
      });
    }
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !isAdmin) return;

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

      if (nextUrl) {
        clearFailedImageUrl(nextUrl);
      }

      // Update StoreContext + Supabase (existing Storage files are never deleted)
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
    if (!isAdmin) return;
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
          {/* Pure-White Official Studio Photo Stage — Click Photo for Gallery / Camera / Crop */}
          <div
            role={isAdmin ? 'button' : undefined}
            tabIndex={isAdmin ? 0 : undefined}
            onClick={() => {
              if (isAdmin && !isUploadingFile && !isLoadingCropCurrent) {
                setShowSourceChooser((prev) => !prev);
              }
            }}
            onKeyDown={(e) => {
              if (isAdmin && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                setShowSourceChooser((prev) => !prev);
              }
            }}
            aria-label={
              isAdmin
                ? language === 'mr'
                  ? 'फोटो अपलोड किंवा बदलण्यासाठी क्लिक करा (गॅलरी / कॅमेरा)'
                  : language === 'hi'
                  ? 'फोटो अपलोड या बदलने के लिए क्लिक करें (गैलरी / कैमरा)'
                  : 'Click photo to upload or change (Gallery / Camera)'
                : undefined
            }
            className={`group relative w-full aspect-[4/3] rounded-2xl bg-white border border-slate-200/90 dark:border-[#24352F] shadow-inner flex items-center justify-center overflow-hidden p-3 ${
              isAdmin ? 'cursor-pointer hover:border-emerald-500/70 transition-colors' : ''
            }`}
          >
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
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  {previewError
                    ? language === 'mr'
                      ? 'इमेज लोड झाली नाही — गॅलरी किंवा कॅमेरासाठी येथे क्लिक करा'
                      : language === 'hi'
                      ? 'इमेज लोड नहीं हुई — गैलरी या कैमरा के लिए यहाँ क्लिक करें'
                      : 'Image failed to load — Tap here for Gallery or Camera'
                    : language === 'mr'
                    ? 'फोटो अपलोड करण्यासाठी येथे क्लिक करा (गॅलरी / कॅमेरा)'
                    : language === 'hi'
                    ? 'फोटो अपलोड करने के लिए यहाँ क्लिक करें (गैलरी / कैमरा)'
                    : 'Tap here to upload photo (Gallery / Camera)'}
                </p>
              </div>
            )}

            {/* Status Pill */}
            {activePreviewUrl && previewLoaded && !previewError && !showSourceChooser && (
              <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold shadow-2xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>Preview Ready</span>
              </span>
            )}

            {/* Subtle Tap-to-Change / Crop Bottom Bar */}
            {isAdmin && !showSourceChooser && (
              <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/75 text-white text-[10px] font-bold">
                  <Camera className="w-3 h-3 text-emerald-400" />
                  <span>
                    {language === 'mr'
                      ? 'फोटो बदलण्यासाठी क्लिक करा'
                      : language === 'hi'
                      ? 'फोटो बदलने के लिए क्लिक करें'
                      : 'Tap photo: Gallery / Camera'}
                  </span>
                </span>

                {activePreviewUrl && previewLoaded && !previewError && (
                  <button
                    type="button"
                    disabled={isLoadingCropCurrent}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCropCurrentPhoto();
                    }}
                    className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingCropCurrent ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Crop className="w-3 h-3" />
                    )}
                    <span>{language === 'mr' ? 'क्रॉप' : language === 'hi' ? 'क्रॉप' : 'Crop'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Gallery / Camera Chooser Overlay when Photo is Clicked */}
            {isAdmin && showSourceChooser && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center p-4 gap-3"
              >
                <div className="flex items-center justify-between w-full max-w-[260px]">
                  <span className="text-xs font-extrabold text-white">
                    {language === 'mr'
                      ? 'फोटो स्रोत निवडा'
                      : language === 'hi'
                      ? 'फोटो स्रोत चुनें'
                      : 'Choose Photo Source'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSourceChooser(false)}
                    className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                    aria-label="Close source chooser"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 w-full max-w-[260px]">
                  <button
                    type="button"
                    onClick={handleChooseGallery}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 font-extrabold text-xs shadow-lg active:scale-[0.98] transition cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </span>
                    <span>{language === 'mr' ? 'गॅलरी' : language === 'hi' ? 'गैलरी' : 'Gallery'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleChooseCamera}
                    className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 font-extrabold text-xs shadow-lg active:scale-[0.98] transition cursor-pointer"
                  >
                    <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </span>
                    <span>{language === 'mr' ? 'कॅमेरा' : language === 'hi' ? 'कैमरा' : 'Camera'}</span>
                  </button>
                </div>

                {activePreviewUrl && previewLoaded && !previewError && (
                  <button
                    type="button"
                    disabled={isLoadingCropCurrent}
                    onClick={() => void handleCropCurrentPhoto()}
                    className="w-full max-w-[260px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingCropCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crop className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {language === 'mr'
                        ? 'सध्याचा फोटो क्रॉप करा'
                        : language === 'hi'
                        ? 'मौजूदा फोटो क्रॉप करें'
                        : 'Crop Current Photo'}
                    </span>
                  </button>
                )}
              </div>
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

              <div className="flex items-center gap-1.5 flex-wrap justify-end">
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

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handlePasteUrl}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold transition cursor-pointer"
                    title="Paste copied image URL from clipboard"
                  >
                    {pasted ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{language === 'mr' ? 'पेस्ट झाले' : language === 'hi' ? 'पेस्ट हुआ' : 'Pasted'}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="w-3 h-3" />
                        <span>{language === 'mr' ? 'पेस्ट' : language === 'hi' ? 'पेस्ट' : 'Paste'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Editable Image URL Form */}
            <form onSubmit={handleSaveUrl} className="space-y-3">
              <textarea
                ref={textareaRef}
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

              {/* Quick Google Official Image Search Helper + Direct Compressed Device Upload */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <a
                  href={googleImageSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {language === 'mr'
                      ? 'Google वर फोटो शोधा →'
                      : language === 'hi'
                      ? 'Google पर फोटो खोजें →'
                      : 'Search Official Packshot →'}
                  </span>
                </a>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      disabled={isSaving || isUploadingFile}
                      onClick={() => setShowSourceChooser(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-bold transition cursor-pointer disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {currentSavedUrl
                          ? language === 'mr'
                            ? 'फोटो बदला / अपलोड'
                            : language === 'hi'
                            ? 'फोटो बदलें / अपलोड'
                            : 'Upload / Replace Photo'
                          : language === 'mr'
                          ? 'फोटो अपलोड करा'
                          : language === 'hi'
                          ? 'फोटो अपलोड करें'
                          : 'Upload Photo'}
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_IMAGE_ACCEPT}
                      onChange={handleSelectDeviceFile}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleSelectDeviceFile}
                      className="hidden"
                    />
                  </>
                )}
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

      {/* Built-in Desktop Live Camera Viewfinder (Mobile uses native rear camera capture) */}
      {isLiveCameraOpen && (
        <div
          className="fixed inset-0 z-[125] bg-black/80 flex items-center justify-center p-3"
          onClick={stopLiveCamera}
          role="dialog"
          aria-modal="true"
          aria-label="Capture Product Photo"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200 dark:border-[#24352F] max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F]">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>{language === 'mr' ? 'कॅमेरा फोटो काढा' : language === 'hi' ? 'कैमरा से फोटो लें' : 'Take Product Photo'}</span>
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                aria-label="Close camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              {cameraError ? (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs font-bold text-rose-700 dark:text-rose-300 text-center space-y-2">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                  >
                    {language === 'mr' ? 'गॅलरी उघडा' : language === 'hi' ? 'गैलरी खोलें' : 'Open Gallery'}
                  </button>
                </div>
              ) : (
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {!cameraError && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] text-xs font-bold cursor-pointer"
                  >
                    {language === 'mr' ? 'रद्द करा' : language === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSnapLiveCamera}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{language === 'mr' ? 'फोटो काढा' : language === 'hi' ? 'फोटो क्लिक करें' : 'Capture Photo'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SquareImageCropperModal
        file={cropFile}
        productName={displayName}
        isUploading={isUploadingFile}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onReplaceFile={(nextFile) => {
          setUploadError(null);
          setCropFile(nextFile);
        }}
        onCancel={() => {
          if (!isUploadingFile) {
            setCropFile(null);
            setUploadError(null);
            setUploadProgress(0);
          }
        }}
        onConfirm={handleConfirmDeviceUpload}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  Clipboard,
  Image as ImageIcon,
  Trash2,
  Loader2,
  AlertTriangle,
  Search,
  Barcode,
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

interface ToastState {
  type: 'success' | 'error';
  text: string;
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

  // Image URL lives strictly in state — never rendered on screen
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSourceChooser, setShowSourceChooser] = useState(false);
  const [isLoadingCropCurrent, setIsLoadingCropCurrent] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProductIdRef = useRef<string | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ type, text });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const stopLiveCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsLiveCameraOpen(false);
    setCameraError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const productId = product?.id ?? null;
  const productImageUrl = (product?.image_url || '').trim();

  useEffect(() => {
    if (!productId) {
      lastProductIdRef.current = null;
      return;
    }
    const isSwitchingProduct = lastProductIdRef.current !== productId;
    lastProductIdRef.current = productId;

    setUrlInput(productImageUrl);
    if (isSwitchingProduct) {
      setCropFile(null);
      setUploadError(null);
      setUploadProgress(0);
      setShowSourceChooser(false);
      setConfirmingRemove(false);
      stopLiveCamera();
    }
  }, [productId, productImageUrl, stopLiveCamera]);

  const trimmedInput = urlInput.trim();
  const activePreviewUrl = /^https?:\/\//i.test(trimmedInput) ? trimmedInput : '';
  const previewLoaded = Boolean(activePreviewUrl) && loadedUrl === activePreviewUrl;
  const previewError = Boolean(activePreviewUrl) && erroredUrl === activePreviewUrl;

  // Callback ref handles already-cached images synchronously on mount without race conditions
  const handlePreviewImgRef = useCallback((el: HTMLImageElement | null) => {
    previewImgRef.current = el;
    if (el && el.complete && el.naturalWidth > 0) {
      const currentSrc = el.getAttribute('src');
      if (currentSrc) {
        setLoadedUrl(currentSrc);
        setErroredUrl(null);
      }
    }
  }, []);

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

  // Close on Escape key (only when child cropper/camera modals are closed)
  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cropFile && !isLiveCameraOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, cropFile, isLiveCameraOpen, onClose]);

  const toastPortal = toast ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[160] max-w-[calc(100vw-2rem)] pointer-events-none"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold ${
          toast.type === 'success'
            ? 'bg-emerald-900 text-white border-emerald-700'
            : 'bg-rose-700 text-white border-rose-600'
        }`}
      >
        {toast.type === 'success' ? (
          <Check className="w-4 h-4 shrink-0 text-emerald-300" />
        ) : (
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-200" />
        )}
        <span className="truncate">{toast.text}</span>
      </div>
    </div>
  ) : null;

  if (!product) {
    return toastPortal;
  }

  const currentSavedUrl = (product.image_url || '').trim();
  const isDirty = trimmedInput !== currentSavedUrl;
  const isPreviewLoading = Boolean(activePreviewUrl) && !previewLoaded && !previewError;
  const canSave =
    isAdmin &&
    isDirty &&
    !isSaving &&
    !isUploadingFile &&
    !previewError &&
    (!activePreviewUrl || previewLoaded);

  const displayName =
    language === 'mr' && product.marathi_name
      ? product.marathi_name
      : language === 'hi' && product.hindi_name
      ? product.hindi_name
      : product.name;

  const brandForQuery =
    product.brand && product.brand !== 'Generic' ? product.brand.trim() : '';
  const packshotQuery = `${brandForQuery ? `${brandForQuery} ` : ''}${product.name.trim()} packshot`;
  const googleImageSearchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(packshotQuery)}`;

  const handleSelectDeviceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast('error', validation.error || 'Unsupported or corrupted image file.');
      return;
    }

    setShowSourceChooser(false);
    setConfirmingRemove(false);
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
        setUploadError(null);
        setCropFile(captured);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleCropCurrentPhoto = async () => {
    if (!activePreviewUrl || !isAdmin || isLoadingCropCurrent || previewError) return;
    setIsLoadingCropCurrent(true);
    setShowSourceChooser(false);
    setConfirmingRemove(false);
    try {
      const fetchedFile = await fetchImageUrlAsFile(activePreviewUrl, product.name);
      setUploadError(null);
      setCropFile(fetchedFile);
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Could not crop this external photo directly. Upload from Gallery or Camera instead.'
      );
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
      setErroredUrl(null);
      onImageUpdated?.(product.id, publicUrl);
      setCropFile(null);
      showToast(
        'success',
        `Photo saved (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)})`
      );
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!isAdmin) return;
    setConfirmingRemove(false);
    setShowSourceChooser(false);
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
        showToast('error', 'Copy an image link first');
        return;
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!/^https?:\/\//i.test(clipText)) {
        showToast('error', 'Copy an image link first');
        return;
      }
      clearFailedImageUrl(clipText);
      setUrlInput(clipText);
      setErroredUrl(null);
      showToast('success', 'Photo pasted');
    } catch {
      showToast('error', 'Copy an image link first');
    }
  };

  const handleSavePhoto = async () => {
    if (!canSave) return;

    setIsSaving(true);
    setConfirmingRemove(false);

    try {
      const nextUrl = trimmedInput || undefined;

      if (nextUrl) {
        clearFailedImageUrl(nextUrl);
      }

      // Reuse existing StoreContext + Supabase save flow (never deletes existing Storage files)
      await updateProduct(product.id, { image_url: nextUrl });

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
      showToast('success', nextUrl ? 'Photo saved' : 'Photo removed');
      onClose();
    } catch {
      showToast('error', 'Failed to save photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmRemoveImage = async () => {
    if (!isAdmin || isSaving) return;
    setConfirmingRemove(false);
    setIsSaving(true);
    try {
      setUrlInput('');
      setLoadedUrl(null);
      setErroredUrl(null);
      await updateProduct(product.id, { image_url: undefined });
      if (supabase) {
        try {
          await supabase
            .from('products')
            .update({
              image_url: null,
              image_status: 'missing',
              updated_at: new Date().toISOString()
            })
            .eq('id', product.id);
        } catch {
          // Non-blocking metadata update
        }
      }
      onImageUpdated?.(product.id, null);
      showToast('success', 'Photo removed');
    } catch {
      showToast('error', 'Failed to remove photo. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPackshotSearch = () => {
    setShowSourceChooser(false);
    window.open(googleImageSearchUrl, '_blank', 'noopener,noreferrer');
  };

  const hasPhotoToRemove = Boolean(currentSavedUrl || activePreviewUrl);

  return (
    <>
      {toastPortal}

      <div
        className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-image-modal-title"
      >
        <div
          className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-slate-200/90 dark:border-[#24352F] rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-[#24352F] bg-white dark:bg-[#131F1B]">
            <div className="min-w-0 flex-1">
              <h3
                id="product-image-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight truncate"
              >
                {displayName}
              </h3>
              <div className="flex items-center flex-wrap gap-2 mt-1 text-xs">
                {product.brand && (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[160px]">
                    {product.brand}
                  </span>
                )}
                {product.barcode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#1A2A25] font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-[#24352F]">
                    <Barcode className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{product.barcode}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close product image modal"
              className="w-10 h-10 -mr-1 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] flex items-center justify-center transition active:scale-95 shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-3.5">
            {/* Large Square Image Preview */}
            <div
              role={isAdmin ? 'button' : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              onClick={() => {
                if (isAdmin && !isUploadingFile && !isLoadingCropCurrent) {
                  setConfirmingRemove(false);
                  setShowSourceChooser((prev) => !prev);
                }
              }}
              onKeyDown={(e) => {
                if (isAdmin && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setConfirmingRemove(false);
                  setShowSourceChooser((prev) => !prev);
                }
              }}
              aria-label={isAdmin ? 'Tap photo to open Gallery or Camera' : product.name}
              className={`relative aspect-square w-full rounded-2xl border border-slate-200 dark:border-[#24352F] bg-white p-4 overflow-hidden flex items-center justify-center ${
                isAdmin ? 'cursor-pointer hover:border-emerald-500/70 transition-colors' : ''
              }`}
            >
              {/* Actual Image Element (mounted while loading or loaded so onLoad/onError fire cleanly) */}
              {activePreviewUrl && !previewError && (
                <img
                  ref={handlePreviewImgRef}
                  key={activePreviewUrl}
                  src={activePreviewUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onLoad={() => {
                    setLoadedUrl(activePreviewUrl);
                    setErroredUrl(null);
                  }}
                  onError={() => {
                    setLoadedUrl((prev) => (prev === activePreviewUrl ? null : prev));
                    setErroredUrl(activePreviewUrl);
                  }}
                  className={`w-full h-full object-contain transition-opacity duration-200 ${
                    previewLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              )}

              {/* Loading Skeleton + Spinner */}
              {isPreviewLoading && !showSourceChooser && (
                <div className="absolute inset-4 rounded-xl bg-slate-100 animate-pulse flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                  <span className="text-xs font-semibold text-slate-500">Loading photo...</span>
                </div>
              )}

              {/* Error State */}
              {previewError && !showSourceChooser && (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-rose-700">Image could not be loaded</p>
                  {isAdmin && (
                    <p className="text-xs text-slate-500">
                      Tap here to choose from Gallery or Camera
                    </p>
                  )}
                </div>
              )}

              {/* Empty Placeholder */}
              {!activePreviewUrl && !previewError && !showSourceChooser && (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No product photo yet</p>
                  {isAdmin && (
                    <p className="text-xs text-slate-500">Tap to add from Gallery or Camera</p>
                  )}
                </div>
              )}

              {/* Preview Ready Badge — Top-Right, ONLY when image loaded successfully */}
              {activePreviewUrl && previewLoaded && !previewError && !showSourceChooser && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold shadow-xs">
                  <Check className="w-3.5 h-3.5" />
                  <span>Preview Ready</span>
                </span>
              )}

              {/* Gallery / Camera Source Chooser Overlay */}
              {isAdmin && showSourceChooser && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 gap-3"
                >
                  <div className="flex items-center justify-between w-full max-w-[260px]">
                    <span className="text-xs font-extrabold text-white">Choose Photo Source</span>
                    <button
                      type="button"
                      onClick={() => setShowSourceChooser(false)}
                      aria-label="Close photo source chooser"
                      className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center active:scale-95 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 w-full max-w-[260px]">
                    <button
                      type="button"
                      onClick={handleChooseGallery}
                      className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 font-extrabold text-xs shadow-lg active:scale-95 transition cursor-pointer"
                    >
                      <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </span>
                      <span>Gallery</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleChooseCamera}
                      className="flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 font-extrabold text-xs shadow-lg active:scale-95 transition cursor-pointer"
                    >
                      <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </span>
                      <span>Camera</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden Native File & Camera Inputs */}
            {isAdmin && (
              <>
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

            {/* 2x2 Action Grid */}
            {isAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSaving || isUploadingFile}
                  onClick={() => {
                    setConfirmingRemove(false);
                    setShowSourceChooser(true);
                  }}
                  className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                >
                  <Camera className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="truncate">Upload</span>
                </button>

                <button
                  type="button"
                  disabled={
                    isSaving ||
                    isUploadingFile ||
                    isLoadingCropCurrent ||
                    !activePreviewUrl ||
                    previewError
                  }
                  onClick={() => void handleCropCurrentPhoto()}
                  className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#22352E] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                >
                  {isLoadingCropCurrent ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin text-emerald-600" />
                  ) : (
                    <Crop className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  )}
                  <span className="truncate">Crop</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPackshotSearch}
                  className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#22352E] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Search className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="truncate">Packshot</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving || isUploadingFile}
                  onClick={() => void handlePasteFromClipboard()}
                  className="min-h-[48px] px-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#22352E] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-45 cursor-pointer"
                >
                  <Clipboard className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span className="truncate">Paste</span>
                </button>
              </div>
            )}

            {/* Inline Remove Confirmation */}
            {isAdmin && confirmingRemove && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  Remove this product photo?
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmingRemove(false)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleConfirmRemoveImage()}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          {isAdmin && (
            <div className="shrink-0 border-t border-slate-200/90 dark:border-[#24352F] bg-white dark:bg-[#131F1B] px-4 sm:px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-2.5">
              <button
                type="button"
                disabled={!hasPhotoToRemove || isSaving || isUploadingFile}
                onClick={() => setConfirmingRemove((prev) => !prev)}
                aria-label="Remove product photo"
                className="w-12 h-12 shrink-0 rounded-2xl bg-rose-50 dark:bg-rose-950/35 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <button
                type="button"
                disabled={!canSave}
                onClick={() => void handleSavePhoto()}
                className="flex-1 min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/45 text-white font-extrabold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:active:scale-100 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Live Camera Viewfinder (Sibling modal so clicks never bubble to preview backdrop) */}
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
            className="bg-white dark:bg-[#131F1B] rounded-3xl border border-slate-200 dark:border-[#24352F] max-w-sm w-full overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F]">
              <span className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Take Product Photo</span>
              </span>
              <button
                type="button"
                onClick={stopLiveCamera}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white active:scale-95 transition cursor-pointer"
                aria-label="Close camera"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs font-bold text-rose-700 dark:text-rose-300 text-center space-y-2.5">
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveCamera();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold active:scale-95 transition cursor-pointer"
                  >
                    Open Gallery
                  </button>
                </div>
              ) : (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black">
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
                <div className="flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-slate-100 dark:bg-[#1A2A25] text-slate-700 dark:text-[#8FA69C] text-xs font-bold active:scale-95 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSnapLiveCamera}
                    className="flex-1 min-h-[44px] py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
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
    </>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { getShelfLifeNote } from '../../lib/shelfLifeUtils';
import {
  PackagePlus,
  X,
  Mic,
  ScanBarcode,
  Search,
  Clipboard,
  Upload,
  Trash2,
  Camera,
  Info,
  IndianRupee,
  Save
} from 'lucide-react';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { ProductImage, clearFailedImageUrl } from '../Common/ProductImage';
import { SquareImageCropperModal } from '../Common/SquareImageCropperModal';
import {
  validateImageFile,
  uploadProcessedProductImage,
  ALLOWED_IMAGE_ACCEPT,
  formatFileSize,
  ProcessedSquareImage
} from '../../lib/productImageService';
import { translateProductName, translateProductNameSync } from '../../lib/productTranslator';
import { playBeepSound, playSuccessChime } from '../../utils/audioUtils';
import {
  isSpeechRecognitionSupported,
  startMobileVoiceRecognition,
  MobileVoiceController,
  processVoiceTranscript,
  VoiceLanguage
} from '../../lib/voiceProductRecognizer';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstanceLike;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { addProduct, updateProduct } = useStore();
  const { t, language, tr } = useLanguage();
  const { user, role } = useAuth();
  const isAdmin = Boolean(user) && (role === 'Owner' || role === 'Admin');

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [marathiName, setMarathiName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Milk');
  const [unit, setUnit] = useState<ProductUnit>('Litre');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<string>('');
  const [minStockAlert, setMinStockAlert] = useState<string>('15');
  const [barcode, setBarcode] = useState<string>('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPhotoHint, setShowPhotoHint] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{
    name: boolean;
    purchasePrice: boolean;
    sellingPrice: boolean;
  }>({ name: false, purchasePrice: false, sellingPrice: false });

  // Standardized Product Image states
  const [imageUrl, setImageUrl] = useState<string>('');
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [imageStatusMessage, setImageStatusMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastCompressionStats, setLastCompressionStats] = useState<{
    originalBytes: number;
    compressedBytes: number;
    savedPercent: number;
    width: number;
    height: number;
    extension: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslateEnabled] = useState(true);
  const isUserTypingRef = useRef(false);

  // Voice recognition state (English only)
  const [isListening, setIsListening] = useState(false);
  const [voiceLang] = useState<VoiceLanguage>('en-IN');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Lifecycle & Anti-closure refs
  const isListeningRef = useRef(false);
  const userStoppedRef = useRef(false);
  const restartCountRef = useRef(0);
  const recognitionRef = useRef<MobileVoiceController | null>(null);
  const transcriptRef = useRef<string>('');
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up speech recognition on unmount or modal close
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch { }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    isUserTypingRef.current = false;
    setIsTranslating(false);
    setImageStatusMessage(null);
    setCropFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setLastCompressionStats(null);
    setIsSaving(false);
    setShowPhotoHint(false);
    setTouchedFields({ name: false, purchasePrice: false, sellingPrice: false });

    if (productToEdit) {
      setName(productToEdit.name);
      setBrand(productToEdit.brand || '');
      setHindiName(productToEdit.hindi_name || '');
      setMarathiName(productToEdit.marathi_name || '');
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setPurchasePrice(productToEdit.purchase_price.toString());
      setSellingPrice(productToEdit.selling_price.toString());
      setStockQuantity(productToEdit.stock_quantity.toString());
      setMinStockAlert(productToEdit.min_stock_alert.toString());
      setBarcode(productToEdit.barcode || '');
      setImageUrl(productToEdit.image_url || '');
      setOriginalImageUrl(productToEdit.image_url || '');
    } else {
      setName('');
      setBrand('');
      setHindiName('');
      setMarathiName('');
      setCategory('Milk');
      setUnit('Litre');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQuantity('0');
      setMinStockAlert('10');
      setBarcode('');
      setImageUrl('');
      setOriginalImageUrl('');
    }
  }, [productToEdit, isOpen]);

  // Debounced translation hook when user types English name
  useEffect(() => {
    if (!isUserTypingRef.current || !autoTranslateEnabled || !name.trim() || name.trim().length < 2) {
      setIsTranslating(false);
      return;
    }

    let cancelled = false;
    setIsTranslating(true);

    const timer = setTimeout(async () => {
      try {
        const res = await translateProductName(name);
        if (!cancelled) {
          setMarathiName(res.marathi);
          setHindiName(res.hindi);
        }
      } catch (e) {
        console.warn('Auto-translate error:', e);
      } finally {
        setIsTranslating(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setIsTranslating(false);
    };
  }, [name, autoTranslateEnabled]);

  const handleNameChange = (val: string) => {
    isUserTypingRef.current = true;
    setName(val);

    if (autoTranslateEnabled && val.trim().length >= 2) {
      // 1. Instant zero-latency synchronous dictionary & transliteration preview
      const instant = translateProductNameSync(val);
      setMarathiName(instant.marathi);
      setHindiName(instant.hindi);
    } else if (!val.trim()) {
      setIsTranslating(false);
      if (autoTranslateEnabled) {
        setMarathiName('');
        setHindiName('');
      }
    } else {
      setIsTranslating(false);
    }
  };

  const handleManualTranslateTrigger = async () => {
    if (!name.trim()) {
      setIsTranslating(false);
      return;
    }
    setIsTranslating(true);
    try {
      // 1. Instant synchronous preview for zero perceived delay
      const instant = translateProductNameSync(name);
      if (instant.marathi) setMarathiName(instant.marathi);
      if (instant.hindi) setHindiName(instant.hindi);

      // 2. High-accuracy asynchronous refinement
      const res = await translateProductName(name);
      if (res.marathi) setMarathiName(res.marathi);
      if (res.hindi) setHindiName(res.hindi);
    } catch (e) {
      const fallback = translateProductNameSync(name);
      setMarathiName(fallback.marathi);
      setHindiName(fallback.hindi);
    } finally {
      setIsTranslating(false);
    }
  };

  // Start Speech Recognition (uses unified mobile-hardened permission + recognition launcher)
  const startVoiceListening = (selectedLang: VoiceLanguage = voiceLang) => {
    setVoiceError(null);
    setInterimTranscript('');
    setVoiceFeedback(null);
    transcriptRef.current = '';
    userStoppedRef.current = false;
    restartCountRef.current = 0;

    if (!isSpeechRecognitionSupported()) {
      setVoiceError(
        'Voice input is not supported in this browser. Please use Chrome or your mobile keyboard mic.'
      );
      return;
    }

    // Release active input focus on mobile so soft keyboard does not fight the microphone permission popup
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const controller = startMobileVoiceRecognition({
      lang: selectedLang,
      uiLang: 'en',
      onStart: () => {
        isListeningRef.current = true;
        setIsListening(true);
      },
      onInterim: (raw, instant) => {
        transcriptRef.current = raw;
        setInterimTranscript(raw);
        if (instant.englishName) {
          setName(instant.englishName);
          if (instant.detectedBrand) setBrand(instant.detectedBrand);
          if (instant.detectedCategory) setCategory(instant.detectedCategory);
          if (instant.detectedUnit) setUnit(instant.detectedUnit);
        }
      },
      onFinal: (raw) => {
        transcriptRef.current = raw;
        isListeningRef.current = false;
        setIsListening(false);
        void handleVoiceResult(raw, selectedLang);
      },
      onError: (_code, message) => {
        userStoppedRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
        setVoiceError(message);
      },
      onEnd: () => {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
      }
    });

    if (controller) {
      recognitionRef.current = controller;
      isListeningRef.current = true;
      setIsListening(true);
    }
  };

  // Stop Speech Recognition & finalize
  const stopVoiceListening = async () => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }
    setIsListening(false);

    const textToProcess = transcriptRef.current.trim();
    if (textToProcess) {
      await handleVoiceResult(textToProcess, voiceLang);
    }
  };

  // Cancel Speech Recognition without saving
  const cancelVoiceListening = () => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch { }
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  // 1-Tap Quick Suggestion Apply
  const applyVoiceSuggestion = (phrase: string) => {
    stopVoiceListening();
    transcriptRef.current = phrase;
    setInterimTranscript(phrase);
    handleVoiceResult(phrase, voiceLang);
  };

  // Process Recognized Voice Transcript using Trained Dairy Intelligence
  const handleVoiceResult = async (spokenText: string, lang: VoiceLanguage) => {
    try {
      setIsTranslating(true);
      isUserTypingRef.current = true;

      const processed = await processVoiceTranscript(spokenText, lang);

      if (processed.englishName) {
        setName(processed.englishName);
        setMarathiName(processed.marathiName);
        setHindiName(processed.hindiName);

        if (processed.detectedCategory) {
          setCategory(processed.detectedCategory);
        }
        if (processed.detectedUnit) {
          setUnit(processed.detectedUnit);
        }

        playSuccessChime();
        setVoiceFeedback(processed.englishName);
        setTimeout(() => setVoiceFeedback(null), 4000);
      }
    } catch (e: unknown) {
      console.warn('Error processing voice product transcript:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  // Search Official Packshot on Google Images in a new tab
  const handleSearchOfficialPackshot = () => {
    const cleanBrand = brand.trim() && brand.trim() !== 'Generic' ? brand.trim() : '';
    const cleanName = name.trim() || barcode.trim();
    const query = `${cleanBrand ? `${cleanBrand} ` : ''}${cleanName} packshot`.trim();
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Paste copied packshot image link from clipboard
  const handlePastePackshotUrl = async () => {
    if (!isAdmin) return;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
        setImageStatusMessage({
          type: 'error',
          text: 'Copy an image link first'
        });
        return;
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!/^https?:\/\//i.test(clipText)) {
        setImageStatusMessage({
          type: 'error',
          text: 'Copy an image link first'
        });
        return;
      }
      clearFailedImageUrl(clipText);
      setImageUrl(clipText);
      setImageStatusMessage({
        type: 'success',
        text: 'Photo pasted. Click Save to persist.'
      });
    } catch {
      setImageStatusMessage({
        type: 'error',
        text: 'Copy an image link first'
      });
    }
  };

  // STEP 3: Clean Upload (Validate -> 1:1 Square Crop -> 512x512 WebP -> Supabase Storage)
  const handleSelectImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isAdmin) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageStatusMessage({
        type: 'error',
        text: validation.error || 'Invalid image file.'
      });
      return;
    }

    setUploadError(null);
    setImageStatusMessage(null);
    setCropFile(file);
  };

  const handleConfirmCroppedUpload = async (processed: ProcessedSquareImage) => {
    if (!isAdmin) return;
    setIsUploadingImage(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      const { publicUrl } = await uploadProcessedProductImage({
        processed,
        productId: productToEdit?.id,
        oldImageUrl: imageUrl || originalImageUrl,
        isAdmin,
        onProgress: setUploadProgress
      });

      setImageUrl(publicUrl);
      if (productToEdit) {
        await updateProduct(productToEdit.id, { image_url: publicUrl });
        setOriginalImageUrl(publicUrl);
      }

      setLastCompressionStats({
        originalBytes: processed.originalBytes,
        compressedBytes: processed.compressedBytes,
        savedPercent: processed.savedPercent,
        width: processed.width,
        height: processed.height,
        extension: processed.extension
      });
      setCropFile(null);
      setImageStatusMessage({
        type: 'success',
        text: `Uploaded ${processed.extension.toUpperCase()} (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, saved ${processed.savedPercent}%).`
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image.';
      setUploadError(message);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const parsedPurchase = parseFloat(purchasePrice);
  const parsedSelling = parseFloat(sellingPrice);
  const hasPurchaseValue = purchasePrice.trim() !== '' && !Number.isNaN(parsedPurchase) && parsedPurchase >= 0;
  const hasSellingValue = sellingPrice.trim() !== '' && !Number.isNaN(parsedSelling) && parsedSelling >= 0;
  const nameError = touchedFields.name && !name.trim() ? 'Product name is required' : null;
  const purchaseError = touchedFields.purchasePrice && !hasPurchaseValue ? 'Enter a valid purchase rate' : null;
  const sellingError = touchedFields.sellingPrice && !hasSellingValue ? 'Enter a valid selling rate' : null;
  const isFormValid = Boolean(name.trim()) && hasPurchaseValue && hasSellingValue;

  const isDirty = productToEdit
    ? name.trim() !== (productToEdit.name || '').trim() ||
      brand.trim() !== (productToEdit.brand || '').trim() ||
      barcode.trim() !== (productToEdit.barcode || '').trim() ||
      category !== productToEdit.category ||
      unit !== productToEdit.unit ||
      purchasePrice.trim() !== productToEdit.purchase_price.toString() ||
      sellingPrice.trim() !== productToEdit.selling_price.toString() ||
      minStockAlert.trim() !== productToEdit.min_stock_alert.toString() ||
      imageUrl.trim() !== (originalImageUrl || '').trim()
    : Boolean(name.trim() || brand.trim() || barcode.trim() || purchasePrice.trim() || sellingPrice.trim() || imageUrl.trim());

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // Ignore unsupported scrollIntoView options
      }
    }, 180);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedFields({ name: true, purchasePrice: true, sellingPrice: true });
    const cleanName = name.trim();
    if (!cleanName || !hasPurchaseValue || !hasSellingValue || isSaving) return;

    const pPrice = Math.max(0, parsedPurchase);
    const sPrice = Math.max(0, parsedSelling);
    const sQty = Math.max(0, parseFloat(stockQuantity) || 0);
    const minAlert = Math.max(0, parseFloat(minStockAlert) || 10);
    const nextImageUrl = imageUrl.trim() || undefined;

    if (nextImageUrl) {
      clearFailedImageUrl(nextImageUrl);
    }

    setIsSaving(true);
    try {
      if (productToEdit) {
        await updateProduct(productToEdit.id, {
          name: cleanName,
          brand: brand.trim() || undefined,
          category,
          unit,
          purchase_price: pPrice,
          selling_price: sPrice,
          // In Edit Mode, stock_quantity is preserved and managed via Batches/Stock Inward!
          min_stock_alert: minAlert,
          barcode: barcode.trim() || undefined,
          image_url: nextImageUrl
        });
      } else {
        await addProduct({
          name: cleanName,
          brand: brand.trim() || undefined,
          category,
          unit,
          purchase_price: pPrice,
          selling_price: sPrice,
          stock_quantity: sQty,
          min_stock_alert: minAlert,
          barcode: barcode.trim() || undefined,
          image_url: nextImageUrl,
          is_active: true
        });
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const hasBothPrices = hasPurchaseValue && hasSellingValue;
  const marginPerUnit = hasBothPrices ? parsedSelling - parsedPurchase : 0;
  const marginPct = hasBothPrices && parsedPurchase > 0
    ? ((marginPerUnit / parsedPurchase) * 100).toFixed(1)
    : '0.0';

  const profitStripClass = !hasBothPrices || marginPerUnit === 0
    ? 'bg-slate-50 dark:bg-[#1A2A25] text-slate-600 dark:text-[#8FA69C] border border-slate-200/80 dark:border-[#24352F]'
    : marginPerUnit > 0
    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50'
    : 'bg-red-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50';

  const handleRemoveProductPhoto = async () => {
    setImageUrl('');
    setLastCompressionStats(null);
    if (productToEdit) {
      await updateProduct(productToEdit.id, { image_url: undefined });
      setOriginalImageUrl('');
    }
    setImageStatusMessage({
      type: 'info',
      text: 'Product image removed.'
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-edit-product-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 dark:bg-[#0F1A17] text-slate-900 dark:text-[#E7F0EC] border border-slate-200/90 dark:border-[#24352F] rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* 1. Sticky Modal Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 bg-white dark:bg-[#131F1B] border-b border-slate-200/80 dark:border-[#24352F]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="add-edit-product-modal-title"
                className="font-bold text-slate-900 dark:text-[#E7F0EC] text-base leading-tight truncate"
              >
                {productToEdit
                  ? 'Edit Product Details'
                  : 'Add New Dairy Product'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C] truncate mt-0.5">
                {'Milk, Paneer, Ghee, Sweets or Dairy items'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] active:scale-95 transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Body + Sticky Footer Form */}
        <form id="product-details-form" onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">

            {/* SECTION A: BASIC INFO */}
            <section aria-label="Basic Info" className="space-y-1.5">
              <h4 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                BASIC INFO
              </h4>
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3.5">
                {/* Product Name * with Inline 40px Mic Button */}
                <div>
                  <label
                    htmlFor="product-name-input"
                    className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5"
                  >
                    Product Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="product-name-input"
                      name="productName"
                      type="text"
                      required
                      placeholder="e.g. Fresh Buffalo Milk 1L, Good Day Biscuit"
                      value={name}
                      onFocus={handleInputFocus}
                      onBlur={() => setTouchedFields((prev) => ({ ...prev, name: true }))}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={`w-full h-12 pl-3.5 pr-12 rounded-xl border bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-medium focus:outline-none focus:ring-2 transition ${
                        nameError
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                          : 'border-slate-300 dark:border-[#24352F] focus:border-emerald-500 focus:ring-emerald-500/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={isListening ? stopVoiceListening : () => startVoiceListening(voiceLang)}
                      aria-label="Voice input"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                  {nameError && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{nameError}</p>
                  )}

                  {/* Live Voice Listening Panel */}
                  {isListening && (
                    <div className="mt-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                          {interimTranscript ? `"${interimTranscript}"` : 'Listening... Speak product name'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={stopVoiceListening}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold active:scale-95 cursor-pointer"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={cancelVoiceListening}
                            aria-label="Cancel voice input"
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {voiceFeedback && !isListening && (
                    <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
                      Recognized: {voiceFeedback}
                    </p>
                  )}
                  {voiceError && (
                    <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{voiceError}</p>
                  )}
                </div>

                {/* Barcode / EAN-13 with Matching Inline 40px Scan Button */}
                <div>
                  <label
                    htmlFor="product-barcode-input"
                    className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5"
                  >
                    Barcode / EAN-13
                  </label>
                  <div className="relative">
                    <input
                      id="product-barcode-input"
                      name="productBarcode"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 8901030925237"
                      value={barcode}
                      onFocus={handleInputFocus}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full h-12 pl-3.5 pr-12 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-mono font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBarcodeScanner(true)}
                      aria-label="Scan barcode"
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition active:scale-95 cursor-pointer"
                    >
                      <ScanBarcode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Brand (Optional) & Unit * Side by Side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="product-brand-input"
                      className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                    >
                      Brand (Optional)
                    </label>
                    <input
                      id="product-brand-input"
                      name="productBrand"
                      type="text"
                      placeholder="e.g. Amul, Parle"
                      value={brand}
                      onFocus={handleInputFocus}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full h-12 px-3.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="product-unit-select"
                      className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                    >
                      {t('unitCol')} <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="product-unit-select"
                      name="productUnit"
                      value={unit}
                      onFocus={handleInputFocus}
                      onChange={(e) => setUnit(e.target.value as ProductUnit)}
                      className="w-full h-12 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
                    >
                      <option value="Litre">Litre</option>
                      <option value="Kg">Kg</option>
                      <option value="Packet (500ml)">Packet (500ml)</option>
                      <option value="Packet (1L)">Packet (1L)</option>
                      <option value="Piece">Piece</option>
                      <option value="Gram">Gram</option>
                    </select>
                  </div>
                </div>

                {/* Category * (Full Width, No Repeated Text) */}
                <div>
                  <label
                    htmlFor="product-category-select"
                    className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5"
                  >
                    {t('categoryCol')} <span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="product-category-select"
                    name="productCategory"
                    value={category}
                    onFocus={handleInputFocus}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full h-12 px-3.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
                  >
                    <option value="Milk">{t('catMilk')}</option>
                    <option value="Curd & Chaas">{t('catCurd')}</option>
                    <option value="Paneer & Butter">{t('catPaneer')}</option>
                    <option value="Ghee">{t('catGhee')}</option>
                    <option value="Sweets/Mithai">{t('catSweets')}</option>
                    <option value="Bakery & Extras">{t('catBakery')}</option>
                  </select>
                </div>
              </div>
            </section>

            {/* SECTION B: PHOTO (Admin Only) */}
            {isAdmin && (
              <section aria-label="Photo" className="space-y-1.5">
                <h4 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                  PHOTO
                </h4>
                <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3">
                  <div className="flex items-start gap-3.5">
                    {/* 96px Square Thumbnail with Tap-to-Upload + Single Red Top-Right Remove Button */}
                    <div className="relative w-24 h-24 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label="Select product photo from Gallery or Camera"
                        className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] hover:border-emerald-500/70 transition cursor-pointer block"
                      >
                        {imageUrl ? (
                          <ProductImage
                            src={imageUrl}
                            alt={name.trim() || 'Product'}
                            category={category}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-[#8FA69C] gap-1">
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px] font-semibold">Add photo</span>
                          </div>
                        )}

                        {/* Small Camera Badge at Bottom-Right */}
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-emerald-700 text-white shadow-sm flex items-center justify-center ring-2 ring-white dark:ring-[#131F1B]"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* ONE Single Red Remove Icon Button at Top-Right */}
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveProductPhoto()}
                          aria-label="Remove photo"
                          className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md flex items-center justify-center ring-2 ring-white dark:ring-[#131F1B] active:scale-95 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Vertical Stack of 3 Equal-Width Action Buttons */}
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleSearchOfficialPackshot}
                        disabled={!barcode.trim() && !name.trim() && !brand.trim()}
                        className="w-full h-10 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-45 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        <span className="truncate">Search Packshot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handlePastePackshotUrl()}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1A2A25] hover:bg-slate-50 dark:hover:bg-[#22352E] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                      >
                        <Clipboard className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        <span className="truncate">Paste link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1A2A25] hover:bg-slate-50 dark:hover:bg-[#22352E] border border-slate-200 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                      >
                        <Upload className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                        <span className="truncate">{imageUrl ? 'Replace photo' : 'Upload photo'}</span>
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ALLOWED_IMAGE_ACCEPT}
                        onChange={handleSelectImageFile}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Single-Line Helper Text with Expandable Info Tooltip */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowPhotoHint((prev) => !prev)}
                      title="Auto-compressed to ~20 KB WebP (max 800×800 px) before upload. Accepts JPEG/PNG/WebP up to 15 MB."
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#8FA69C] hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer text-left"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span>Auto-optimised to WebP, up to 15 MB</span>
                    </button>

                    {showPhotoHint && (
                      <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] pl-5">
                        Auto-compressed to ~20 KB WebP (max 800×800 px) before upload. Accepts JPEG, PNG, or WebP up to 15 MB.
                      </p>
                    )}

                    {lastCompressionStats && (
                      <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatFileSize(lastCompressionStats.originalBytes)} → {formatFileSize(lastCompressionStats.compressedBytes)} (saved {lastCompressionStats.savedPercent}%)
                      </p>
                    )}

                    {imageStatusMessage && (
                      <p
                        className={`text-xs font-medium ${
                          imageStatusMessage.type === 'error'
                            ? 'text-rose-600 dark:text-rose-400'
                            : imageStatusMessage.type === 'success'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-[#8FA69C]'
                        }`}
                      >
                        {imageStatusMessage.text}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION C: PRICING */}
            <section aria-label="Pricing" className="space-y-1.5">
              <h4 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                PRICING
              </h4>
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="product-purchase-rate"
                      className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                    >
                      Purchase ₹ / {unit} <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee
                        aria-hidden="true"
                        className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      />
                      <input
                        id="product-purchase-rate"
                        name="purchasePrice"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={purchasePrice}
                        onFocus={handleInputFocus}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, purchasePrice: true }))}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        className={`w-full h-12 pl-8 pr-3 rounded-xl border bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-semibold tabular-nums focus:outline-none focus:ring-2 transition ${
                          purchaseError
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-[#24352F] focus:border-emerald-500 focus:ring-emerald-500/30'
                        }`}
                      />
                    </div>
                    {purchaseError && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{purchaseError}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="product-selling-rate"
                      className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                    >
                      Selling ₹ / {unit} <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee
                        aria-hidden="true"
                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      />
                      <input
                        id="product-selling-rate"
                        name="sellingPrice"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        value={sellingPrice}
                        onFocus={handleInputFocus}
                        onBlur={() => setTouchedFields((prev) => ({ ...prev, sellingPrice: true }))}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className={`w-full h-12 pl-8 pr-3 rounded-xl border bg-white dark:bg-[#1A2A25] text-emerald-800 dark:text-emerald-400 text-base font-semibold tabular-nums focus:outline-none focus:ring-2 transition ${
                          sellingError
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                            : 'border-slate-300 dark:border-[#24352F] focus:border-emerald-500 focus:ring-emerald-500/30'
                        }`}
                      />
                    </div>
                    {sellingError && (
                      <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">{sellingError}</p>
                    )}
                  </div>
                </div>

                {/* Live Profit Strip */}
                <div className={`rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold ${profitStripClass}`}>
                  <span className="truncate">Profit per {unit}</span>
                  <span className="font-extrabold text-sm tabular-nums shrink-0">
                    ₹{marginPerUnit.toFixed(2)} ({marginPct}%)
                  </span>
                </div>
              </div>
            </section>

            {/* SECTION D: STOCK */}
            <section aria-label="Stock" className="space-y-1.5">
              <h4 className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#8FA69C]">
                STOCK
              </h4>
              <div className="bg-white dark:bg-[#131F1B] rounded-2xl border border-slate-200/80 dark:border-[#24352F] shadow-sm p-4">
                {productToEdit ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 rounded-xl bg-slate-50 dark:bg-[#1A2A25] px-3.5 py-2.5">
                      <span className="block text-[11px] font-semibold text-slate-500 dark:text-[#8FA69C]">
                        Current stock
                      </span>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight mt-0.5 truncate">
                        {productToEdit.stock_quantity}{' '}
                        <span className="text-xs font-semibold text-slate-500 dark:text-[#8FA69C]">{unit}</span>
                      </div>
                      <span className="block text-[11px] text-slate-500 dark:text-[#8FA69C] truncate mt-0.5">
                        Managed via Batches &amp; Inward
                      </span>
                    </div>

                    <div className="w-32 sm:w-36 shrink-0">
                      <label
                        htmlFor="product-low-alert"
                        className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                      >
                        Low Alert ({unit})
                      </label>
                      <input
                        id="product-low-alert"
                        name="minStockAlert"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        value={minStockAlert}
                        onFocus={handleInputFocus}
                        onChange={(e) => setMinStockAlert(e.target.value)}
                        className="w-full h-12 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-amber-700 dark:text-amber-400 text-base font-bold tabular-nums focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="product-initial-stock"
                          className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                        >
                          Initial Stock ({unit})
                        </label>
                        <input
                          id="product-initial-stock"
                          name="stockQuantity"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          placeholder="0"
                          value={stockQuantity}
                          onFocus={handleInputFocus}
                          onChange={(e) => setStockQuantity(e.target.value)}
                          className="w-full h-12 px-3.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-base font-semibold tabular-nums focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="product-low-alert"
                          className="block text-[13px] font-semibold text-slate-700 dark:text-[#C4D6CE] mb-1.5 truncate"
                        >
                          Low Alert ({unit})
                        </label>
                        <input
                          id="product-low-alert"
                          name="minStockAlert"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          value={minStockAlert}
                          onFocus={handleInputFocus}
                          onChange={(e) => setMinStockAlert(e.target.value)}
                          className="w-full h-12 px-3.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-amber-700 dark:text-amber-400 text-base font-bold tabular-nums focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-[#8FA69C] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">
                        {getShelfLifeNote(category, name, language)} • Initial stock batch auto-created
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* 3. Sticky Footer */}
          <div className="shrink-0 border-t border-slate-200/80 dark:border-[#24352F] bg-white dark:bg-[#131F1B] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 h-12 px-3 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] hover:bg-slate-50 dark:hover:bg-[#22352E] font-bold text-sm text-slate-700 dark:text-[#C4D6CE] transition active:scale-95 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!isDirty || !isFormValid || isSaving || isUploadingImage}
              className="flex-1 h-12 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-700/45 text-white font-bold text-sm shadow-sm inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:active:scale-100 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-full border-2 border-white/35 border-t-white animate-spin"
                  />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{productToEdit ? 'Update Details' : t('save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={(scanned) => {
          setBarcode(scanned);
          setShowBarcodeScanner(false);
        }}
      />

      {/* Automatic Compression Preview & Upload Modal */}
      <SquareImageCropperModal
        file={cropFile}
        productName={name.trim() || productToEdit?.name}
        isUploading={isUploadingImage}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onReplaceFile={(nextFile) => {
          setUploadError(null);
          setCropFile(nextFile);
        }}
        onCancel={() => {
          if (!isUploadingImage) {
            setCropFile(null);
            setUploadError(null);
            setUploadProgress(0);
          }
        }}
        onConfirm={handleConfirmCroppedUpload}
      />
    </div>
  );
};

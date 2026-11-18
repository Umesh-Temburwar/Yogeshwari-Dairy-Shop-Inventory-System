import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { getShelfLifeNote } from '../../lib/shelfLifeUtils';
import {
  X,
  Save,
  PackagePlus,
  Clock,
  Sparkles,
  Barcode,
  Mic,
  CheckCircle2,
  AlertCircle,
  Search,
  Upload,
  Trash2,
  Clipboard,
  Image as ImageIcon
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
  isMobileVoiceDevice,
  dedupeVoiceTranscript,
  processVoiceTranscript,
  processVoiceTranscriptSync,
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
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
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

  // Start Speech Recognition
  const startVoiceListening = (selectedLang: VoiceLanguage = voiceLang) => {
    setVoiceError(null);
    setInterimTranscript('');
    setVoiceFeedback(null);
    transcriptRef.current = '';
    userStoppedRef.current = false;
    restartCountRef.current = 0;

    if (!isSpeechRecognitionSupported()) {
      setVoiceError(
        language === 'mr'
          ? 'तुमच्या ब्राउझरमध्ये व्हॉइस इनपुट उपलब्ध नाही. कृपया Google Chrome किंवा Microsoft Edge वापरा.'
          : language === 'hi'
            ? 'आपके ब्राउज़र में वॉयस इनपुट उपलब्ध नहीं है। कृपया Google Chrome या Edge का उपयोग करें।'
            : 'Voice input is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    initRecognition(selectedLang);
  };

  const initRecognition = (selectedLang: VoiceLanguage) => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { }
    }

    try {
      const win = window as WindowWithSpeechRecognition;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error('SpeechRecognition not supported');
      }
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      const isMobile = isMobileVoiceDevice();
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      if (!isMobile) {
        playBeepSound();
      }
      isListeningRef.current = true;
      setIsListening(true);

      const scheduleFinalizeOnSilence = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            stopVoiceListening();
          }
        }, 2500); // 2.5s of silence after speech detected
      };

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        let finalized = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalized += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = dedupeVoiceTranscript((finalized + interim).trim());
        if (currentText) {
          transcriptRef.current = currentText;
          setInterimTranscript(currentText);
          scheduleFinalizeOnSilence();

          // Instant preview across all 3 language fields, brand, category & unit
          const instant = processVoiceTranscriptSync(currentText, selectedLang);
          if (instant.englishName) {
            setName(instant.englishName);
            setMarathiName(instant.marathiName);
            setHindiName(instant.hindiName);
            if (instant.detectedBrand) setBrand(instant.detectedBrand);
            if (instant.detectedCategory) setCategory(instant.detectedCategory);
            if (instant.detectedUnit) setUnit(instant.detectedUnit);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
          setVoiceError(
            language === 'mr'
              ? 'मायक्रोफोन परवानगी नाकारली आहे. कृपया ॲड्रेस बारमधील कुलूप (Lock) आयकॉनवर क्लिक करून Microphone Allow करा.'
              : language === 'hi'
                ? 'माइक्रोफ़ोन अनुमति अस्वीकृत है। कृपया Address bar में Lock आइकॉन पर क्लिक करके Microphone Allow करें।'
                : 'Microphone access denied. Please click the lock icon in address bar to allow microphone.'
          );
        } else if (event.error === 'network') {
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
          setVoiceError(
            tr(
              'Google Voice Network error. Please check your internet connection.',
              'Google Voice Network त्रुटि। कृपया इंटरनेट कनेक्शन जांचें।',
              'Google Voice Network त्रुटी. कृपया इंटरनेट कनेक्शन तपासा.'
            )
          );
        }
      };

      recognition.onend = async () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // Case 1: User explicitly cancelled or stopped
        if (userStoppedRef.current) {
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }

        // Case 2: We have captured speech transcript
        const capturedText = transcriptRef.current.trim();
        if (capturedText) {
          isListeningRef.current = false;
          setIsListening(false);
          await handleVoiceResult(capturedText, selectedLang);
          return;
        }

        // Case 3: No speech captured yet, but user is still in listening mode!
        // Allow up to 4 auto-restarts (~15s listening window) so slight hesitations do not abort
        if (isListeningRef.current && restartCountRef.current < 4) {
          restartCountRef.current += 1;
          try {
            recognition.start();
            return;
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) initRecognition(selectedLang);
            }, 100);
            return;
          }
        }

        // Case 4: Timed out after prolonged silence (15+ seconds)
        isListeningRef.current = false;
        setIsListening(false);
        setVoiceFeedback(
          language === 'mr'
            ? 'काही आवाज ऐकू आला नाही. कृपया माईक जवळ धरून पुन्हा बोला.'
            : language === 'hi'
              ? 'कोई आवाज़ सुनाई नहीं दी। कृपया माइक के पास बोलें।'
              : 'No speech detected. Please speak closer to the microphone.'
        );
      };

      recognition.start();
    } catch (err: unknown) {
      console.error('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setVoiceError(
        tr(
          'Error starting microphone. Please try again.',
          'माइक शुरू करने में समस्या आई। कृपया पुनः प्रयास करें।',
          'माईक सुरू करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'
        )
      );
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
          text: tr('Copy an image link first', 'पहले इमेज लिंक कॉपी करें', 'आधी फोटोची लिंक कॉपी करा')
        });
        return;
      }
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!/^https?:\/\//i.test(clipText)) {
        setImageStatusMessage({
          type: 'error',
          text: tr('Copy an image link first', 'पहले इमेज लिंक कॉपी करें', 'आधी फोटोची लिंक कॉपी करा')
        });
        return;
      }
      clearFailedImageUrl(clipText);
      setImageUrl(clipText);
      setImageStatusMessage({
        type: 'success',
        text: tr('Photo pasted. Click Save to persist.', 'फोटो पेस्ट हो गया। सहेजने के लिए सेव दबाएं।', 'फोटो पेस्ट झाला. जतन करण्यासाठी सेव्ह दाबा.')
      });
    } catch {
      setImageStatusMessage({
        type: 'error',
        text: tr('Copy an image link first', 'पहले इमेज लिंक कॉपी करें', 'आधी फोटोची लिंक कॉपी करा')
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
        text: validation.error || tr('Invalid image file.', 'अमान्य इमेज फ़ाइल।', 'अवैध फोटो फाईल.')
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
        text: tr(
          `Uploaded ${processed.extension.toUpperCase()} (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, saved ${processed.savedPercent}%).`,
          `${processed.extension.toUpperCase()} अपलोड हो गया (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, बचत ${processed.savedPercent}%)।`,
          `${processed.extension.toUpperCase()} अपलोड झाला (${formatFileSize(processed.originalBytes)} → ${formatFileSize(processed.compressedBytes)}, बचत ${processed.savedPercent}%).`
        )
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tr('Failed to upload image.', 'इमेज अपलोड करने में विफल।', 'फोटो अपलोड करण्यात अयशस्वी.');
      setUploadError(message);
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const pPrice = Math.max(0, parseFloat(purchasePrice) || 0);
    const sPrice = Math.max(0, parseFloat(sellingPrice) || 0);
    const sQty = Math.max(0, parseFloat(stockQuantity) || 0);
    const minAlert = Math.max(0, parseFloat(minStockAlert) || 10);
    const nextImageUrl = imageUrl.trim() || undefined;

    if (nextImageUrl) {
      clearFailedImageUrl(nextImageUrl);
    }

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
  };

  const marginPerUnit = (parseFloat(sellingPrice) || 0) - (parseFloat(purchasePrice) || 0);
  const marginPct = (parseFloat(purchasePrice) > 0)
    ? ((marginPerUnit / parseFloat(purchasePrice)) * 100).toFixed(1)
    : '0';

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-transparent dark:border-[#24352F] rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto overscroll-contain">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#24352F] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-[#E7F0EC] text-base">
                {productToEdit
                  ? (language === 'mr' ? 'मालाची माहिती बदला' : language === 'hi' ? 'माल की जानकारी अपडेट करें' : 'Edit Product Details')
                  : (language === 'mr' ? 'दुकानात नवीन माल जोडा' : language === 'hi' ? 'दुकान में नया माल जोड़ें' : 'Add New Dairy Product')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'दूध, पनीर, तूप, खवा, मिठाई किंवा इतर उत्पादने' : language === 'hi' ? 'दूध, पनीर, घी, खोया, मिठाई या अन्य डेरी उत्पाद' : 'Milk, Paneer, Ghee, Sweets or Dairy items'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Product Name (English) + Voice Input */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] flex items-center gap-1.5">
                  <span>Product Name *</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Buffalo Milk 1 Litre, Amul Paneer 200g, Cow Ghee..."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full pl-3 pr-28 py-2.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={isListening ? stopVoiceListening : () => startVoiceListening(voiceLang)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${isListening
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-500/40 ring-2 ring-rose-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                      }`}
                    title={isListening ? 'Stop Mic' : 'Voice to Text'}
                  >
                    <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className="text-[11px] font-black">
                      {isListening ? 'Listening...' : 'Voice'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Interactive Voice Recognition Assistant Panel */}
              {isListening && (
                <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 dark:from-emerald-950/40 dark:via-[#1A2A25] dark:to-emerald-950/40 border-2 border-emerald-500 rounded-2xl shadow-md space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      {/* Audio visualizer wave bars */}
                      <div className="flex items-center gap-0.5 h-3.5 px-1 bg-rose-100 dark:bg-rose-950/60 rounded-md">
                        <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 bg-rose-500 rounded-full animate-bounce h-3.5" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2.5" style={{ animationDelay: '300ms' }}></span>
                        <span className="w-1 bg-rose-500 rounded-full animate-bounce h-1.5" style={{ animationDelay: '75ms' }}></span>
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
                        <span>Listening... Speak clearly (English):</span>
                      </span>
                    </div>
                  </div>

                  {/* Live Speech Recognition Transcription Box */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-emerald-800/60 min-h-[44px] flex items-center justify-between gap-2 shadow-2xs">
                    <div className="truncate flex-1">
                      <p className="text-xs font-black text-emerald-950 dark:text-emerald-200 truncate">
                        {interimTranscript
                          ? `🎙️ "${interimTranscript}"`
                          : tr(
                            'Speak anything (e.g. "Amul Taaza 500ml", "Buffalo Milk 1 Litre")...',
                            'कुछ भी बोलें (उदा. "अमुल ताज़ा 500 मिली", "भैंस का दूध 1 लीटर")...',
                            'काहीही बोला (उदा. "अमुल ताझा ५०० मिली", "म्हशीचे दूध १ लिटर")...'
                          )}
                      </p>
                      {name && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate mt-0.5">
                          ✓ Auto: <span className="font-bold">{name}</span> {category && `[${category}]`} {unit && `[${unit}]`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={stopVoiceListening}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <span>✓</span>
                        <span>{language === 'mr' ? 'पूर्ण' : language === 'hi' ? 'पूर्ण' : 'Done'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={cancelVoiceListening}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        title={tr('Cancel', 'रद्द करें', 'रद्द करा')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trained voice suggestions with 1-tap fast buttons */}
                  <div className="space-y-1 pt-0.5">
                    <p className="text-[10px] text-slate-500 dark:text-[#8FA69C] font-bold">
                      💡 {language === 'mr' ? '१-टॅप नमुने किंवा थेट बोला:' : language === 'hi' ? '1-टैप उदाहरण या सीधे बोलें:' : '1-Tap quick samples or speak:'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: tr('🥛 Buffalo Milk 1L', '🥛 भैंस का दूध 1L', '🥛 म्हशीचे दूध १L'), val: 'म्हशीचे दूध १ लिटर' },
                        { label: tr('🥛 Amul Taaza 500ml', '🥛 अमूल ताज़ा 500ml', '🥛 अमुल ताझा ५००ml'), val: 'अमुल ताझा ५०० मिली' },
                        { label: tr('🧈 Amul Butter 100g', '🧈 अमूल बटर 100g', '🧈 अमुल बटर १००g'), val: 'अमुल बटर १०० ग्रॅम' },
                        { label: tr('🧀 Fresh Paneer 500g', '🧀 ताज़ा पनीर 500g', '🧀 ताजे पनीर ५००g'), val: 'ताजे पनीर ५०० ग्रॅम' },
                        { label: tr('🫙 Cow Ghee 1L', '🫙 गाय का घी 1L', '🫙 गायीचे तूप १L'), val: 'गायीचे तूप १ लिटर' },
                        { label: tr('🥤 Masala Chaas', '🥤 मसाला छाछ', '🥤 मसाला ताक'), val: 'मसाला ताक' },
                        { label: tr('🍬 Kaju Katli', '🍬 काजू कतली', '🍬 काजू कतली'), val: 'काजू कतली' },
                        { label: tr('🍞 Butter Khari', '🍞 बटर खारी', '🍞 बटर खारी'), val: 'बटर खारी' }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => applyVoiceSuggestion(item.val)}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition active:scale-95 shadow-2xs"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Success Toast */}
              {voiceFeedback && (
                <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300 animate-in fade-in">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{language === 'mr' ? 'आवाजावरून भरले:' : language === 'hi' ? 'वॉयस से भरा गया:' : 'Recognized:'} <strong>{voiceFeedback}</strong></span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded font-black shrink-0">
                    ✓ VOICE AI
                  </span>
                </div>
              )}

              {/* Voice Error Banner */}
              {voiceError && (
                <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Barcode Input & Scanner */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'mr' ? 'बारकोड क्रमांक (Barcode / EAN-13 / SKU)' : language === 'hi' ? 'बारकोड संख्या (Barcode)' : 'Barcode / EAN-13'}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={tr('e.g. 8901030925237', 'उदा. 8901030925237', 'उदा. 8901030925237')}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#20332D] text-slate-700 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-[#24352F] transition"
                title={tr('Scan Barcode', 'बारकोड स्कैन करें', 'बारकोड स्कॅन करा')}
              >
                <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{tr('Scan', 'स्कैन', 'स्कॅन')}</span>
              </button>
            </div>
          </div>

          {/* Brand (Optional — improves official image lookup) */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
              {language === 'mr' ? 'ब्रँड (Brand — ऐच्छिक)' : language === 'hi' ? 'ब्रांड (Brand — वैकल्पिक)' : 'Brand (Optional)'}
            </label>
            <input
              type="text"
              placeholder="e.g. Amul, Britannia, Parle, Cadbury, Chitale..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Admin-Only Product Image Standardization Section (Steps 2 & 3) */}
          {isAdmin && (
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 dark:text-[#E7F0EC] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{tr('Product Image (1:1 Square)', 'उत्पाद फोटो (1:1 स्क्वायर)', 'उत्पादन फोटो (1:1 स्क्वेअर)')}</span>
                </span>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setImageStatusMessage({ type: 'info', text: tr('Image cleared. Click Save to confirm.', 'फोटो हटाया गया। सहेजने के लिए सेव दबाएं।', 'फोटो काढला. जतन करण्यासाठी सेव्ह दाबा.') });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{tr('Remove', 'हटाएं', 'काढा')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-start gap-3">
                {/* Uniform Square Preview */}
                <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden bg-white border border-slate-200 dark:border-[#24352F]">
                  <ProductImage
                    src={imageUrl || null}
                    alt={name.trim() || 'Product'}
                    category={category}
                    fill
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSearchOfficialPackshot}
                      disabled={!barcode.trim() && !name.trim() && !brand.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{tr('Search Official Packshot', 'ऑफिशियल पैकशॉट खोजें', 'ऑफिशियल पॅकशॉट शोधा')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handlePastePackshotUrl()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-emerald-50 dark:hover:bg-[#223630] border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>{tr('Paste', 'पेस्ट', 'पेस्ट')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#223630] border border-slate-300 dark:border-[#24352F] text-slate-800 dark:text-[#E7F0EC] text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {imageUrl
                          ? tr('Replace photo', 'फोटो बदलें', 'फोटो बदला')
                          : tr('Upload photo', 'फोटो अपलोड करें', 'फोटो अपलोड करा')}
                      </span>
                    </button>

                    {imageUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          setImageUrl('');
                          setLastCompressionStats(null);
                          if (productToEdit) {
                            await updateProduct(productToEdit.id, { image_url: undefined });
                          }
                          setImageStatusMessage({
                            type: 'info',
                            text: tr('Product image removed.', 'उत्पाद की फोटो हटाई गई।', 'उत्पादनाचा फोटो काढला गेला.')
                          });
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{tr('Remove', 'हटाएं', 'काढा')}</span>
                      </button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_IMAGE_ACCEPT}
                      onChange={handleSelectImageFile}
                      className="hidden"
                    />
                  </div>

                  <p className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C]">
                    {tr(
                      'Auto-compressed to ~20 KB WebP (max 800×800 px) before upload. Accepts JPEG/PNG/WebP up to 15 MB.',
                      'अपलोड से पहले ऑटो-कंप्रेस होकर ~20 KB WebP (अधिकतम 800×800 px) बनता है। 15 MB तक JPEG/PNG/WebP।',
                      'अपलोडपूर्वी आपोआप ~20 KB WebP (कमाल 800×800 px) मध्ये कॉम्प्रेस होते. 15 MB पर्यंत JPEG/PNG/WebP.'
                    )}
                  </p>

                  {lastCompressionStats && (
                    <div className="inline-flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">
                      <span>{tr('Original:', 'मूल:', 'मूळ:')} {formatFileSize(lastCompressionStats.originalBytes)}</span>
                      <span>•</span>
                      <span>{tr('Compressed:', 'कंप्रेस्ड:', 'कॉम्प्रेस्ड:')} {formatFileSize(lastCompressionStats.compressedBytes)}</span>
                      <span>•</span>
                      <span>{tr('Saved:', 'बचत:', 'बचत:')} {lastCompressionStats.savedPercent}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Feedback */}
              {imageStatusMessage && (
                <div
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
                    imageStatusMessage.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                      : imageStatusMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-slate-100 dark:bg-[#131F1B] text-slate-700 dark:text-[#8FA69C] border border-slate-200 dark:border-[#24352F]'
                  }`}
                >
                  {imageStatusMessage.type === 'error' ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{imageStatusMessage.text}</span>
                </div>
              )}
            </div>
          )}

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {t('categoryCol')} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Milk">{t('catMilk')} (Milk)</option>
                <option value="Curd & Chaas">{t('catCurd')} (Curd & Chaas)</option>
                <option value="Paneer & Butter">{t('catPaneer')} (Paneer & Butter)</option>
                <option value="Ghee">{t('catGhee')} (Ghee)</option>
                <option value="Sweets/Mithai">{t('catSweets')} (Sweets & Khoya)</option>
                <option value="Bakery & Extras">{t('catBakery')} (Bakery & Extras)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {t('unitCol')} *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Litre">{language === 'mr' ? 'लिटर (Litre)' : language === 'hi' ? 'लीटर (Litre)' : 'Litre'}</option>
                <option value="Kg">{language === 'mr' ? 'किलो (Kg)' : language === 'hi' ? 'किलोग्राम (Kg)' : 'Kg'}</option>
                <option value="Packet (500ml)">{language === 'mr' ? 'पिशवी ५०० मिली' : language === 'hi' ? 'थैली ५०० मिली' : 'Packet (500ml)'}</option>
                <option value="Packet (1L)">{language === 'mr' ? 'पिशवी १ लिटर' : language === 'hi' ? 'थैली १ लीटर' : 'Packet (1L)'}</option>
                <option value="Piece">{language === 'mr' ? 'नग / पीस' : language === 'hi' ? 'नग / पीस' : 'Piece'}</option>
                <option value="Gram">{language === 'mr' ? 'ग्रॅम' : language === 'hi' ? 'ग्राम' : 'Gram'}</option>
              </select>
            </div>
          </div>

          {/* Purchase Price vs Selling Price */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1A2A25] p-3 rounded-2xl border border-slate-200 dark:border-[#24352F]">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `खरेदी दर प्रति ${unit} (₹)` : language === 'hi' ? `खरीद भाव प्रति ${unit} (₹)` : `Purchase Rate per ${unit} (₹)`} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="58"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `विक्री दर प्रति ${unit} (₹)` : language === 'hi' ? `बिक्री भाव प्रति ${unit} (₹)` : `Selling Rate per ${unit} (₹)`} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="70"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#131F1B] text-emerald-800 dark:text-emerald-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Live Profit Margin Calculator Indicator */}
            <div className="col-span-2 flex items-center justify-between text-xs font-semibold pt-1 text-slate-600 dark:text-[#8FA69C] border-t border-slate-200 dark:border-[#24352F]">
              <span>{language === 'mr' ? `प्रति ${unit} नफा:` : language === 'hi' ? `प्रति ${unit} अनुमानित लाभ:` : `Est Profit per ${unit}:`}</span>
              <span className={`font-bold ${marginPerUnit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                ₹{marginPerUnit.toFixed(2)} ({marginPct}% {language === 'mr' ? 'मार्जिन' : language === 'hi' ? 'मार्जिन' : 'Margin'})
              </span>
            </div>
          </div>

          {/* Current Stock & Low Stock Alert Level */}
          {productToEdit ? (
            /* In Edit Mode: Clean Informative Stock Card + Editable Low Stock Alert */
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 block">
                  {language === 'mr' ? 'सध्या दुकानातील शिल्लक साठा:' : language === 'hi' ? 'दुकान में मौजूदा स्टॉक:' : 'Current Shop Stock:'}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {productToEdit.stock_quantity} <span className="text-xs font-bold text-slate-500">{unit}</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-[#8FA69C] block mt-0.5">
                  ✓ {language === 'mr' ? 'लॉट व मुदत बॅचनुसार सुरक्षित (बदलण्यासाठी स्टॉक आवक वापरा)' : language === 'hi' ? 'बैच व एक्सपायरी अनुसार सुरक्षित (बदलने हेतु स्टॉक आवक करें)' : 'Managed via Batches & Inward'}
                </span>
              </div>

              <div className="w-36 shrink-0">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? `कमी साठा इशारा (${unit})` : language === 'hi' ? `कम स्टॉक अलर्ट (${unit})` : `Low Alert (${unit})`}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-amber-700 dark:text-amber-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ) : (
            /* In Add Mode (New product): Editable Initial Stock & Alert */
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? `सुरुवातीचा साठा (${unit} मध्ये)` : language === 'hi' ? `आरंभिक स्टॉक (${unit} में)` : `Initial Stock (${unit})`}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? `कमी साठा मर्यादा (${unit})` : language === 'hi' ? `कम स्टॉक अलर्ट सीमा (${unit})` : `Low Stock Threshold (${unit})`}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-amber-700 dark:text-amber-400 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{getShelfLifeNote(category, name, language)} &bull; {language === 'mr' ? 'आरंभीच्या साठ्याची बॅच आपोआप तयार होईल' : language === 'hi' ? 'आरंभिक स्टॉक का बैच स्वतः बन जाएगा' : 'Initial stock batch auto-created with variety expiry'}</span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-[#24352F]">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1A2A25] hover:bg-slate-200 dark:hover:bg-[#24352F] font-semibold text-xs text-slate-700 dark:text-[#8FA69C]"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{productToEdit ? (language === 'mr' ? 'माहिती जतन करा' : language === 'hi' ? 'अपडेट सुरक्षित करें' : 'Update Details') : t('save')}</span>
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

import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  createBarcodeReader,
  decodeVideoMultiAngle,
  decodeImageMultiAngle,
  detectWithNativeBarcodeDetector,
  BarcodeConfirmationTracker
} from '../../utils/barcodeScannerEngine';
import { performBarcodeOcrFallback } from '../../utils/barcodeOcrFallback';
import { validateBarcode, BarcodeValidationResult } from '../../utils/barcodeChecksum';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { playBeepSound } from '../../utils/audioUtils';
import { supabase } from '../../lib/supabase';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { translateProductName, translateProductNameSync } from '../../lib/productTranslator';
import { playSuccessChime } from '../../utils/audioUtils';
import { 
  isSpeechRecognitionSupported, 
  processVoiceTranscript 
} from '../../lib/voiceProductRecognizer';
import {
  Camera,
  X,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  PackagePlus,
  PlusCircle,
  Layers,
  Calendar,
  DollarSign,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Video,
  SwitchCamera,
  Flashlight,
  RefreshCw,
  Mic
} from 'lucide-react';

interface BarcodeStockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (product: Product, batchNo: string, qtyAdded: number) => void;
  initialBarcode?: string;
  initialProduct?: Product | null;
  forceRegisterNew?: boolean;
}

export const BarcodeStockInModal: React.FC<BarcodeStockInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialBarcode,
  initialProduct,
  forceRegisterNew = false,
}) => {
  const { products, addProduct, addBatch } = useStore();
  const { language } = useLanguage();

  // Step 1: Scan | Step 2: Register New (if not found) | Step 3: Enter Stock Details | Step 4: Confirm Summary | Step 5: Success
  const [step, setStep] = useState<'scan' | 'register' | 'details' | 'confirm' | 'success'>('scan');

  // Scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [showOcrButton, setShowOcrButton] = useState(true);
  const [scanTarget, setScanTarget] = useState<'barcode' | 'numbers'>('barcode');
  const [validationResult, setValidationResult] = useState<BarcodeValidationResult | null>(null);
  const [matchedSource, setMatchedSource] = useState<'product_barcodes' | 'products' | 'rpc' | 'local' | 'catalogue' | null>(null);

  // Auto-search when user types complete barcode digits on the scan step
  useEffect(() => {
    if (step !== 'scan') return;
    const clean = barcodeInput.trim();
    if ((clean.length === 12 || clean.length === 13) && /^\d+$/.test(clean)) {
      lookupBarcode(clean);
    }
  }, [barcodeInput, step]);

  // Matched / Selected Product
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // New Product Registration Form (Catalogue only, stock = 0)
  const [newProdName, setNewProdName] = useState('');
  const [newProdMarathiName, setNewProdMarathiName] = useState('');
  const [newProdBrand, setNewProdBrand] = useState('Yogeshwari Dairy');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('Bakery & Extras');
  const [newProdUnit, setNewProdUnit] = useState<ProductUnit>('Piece');
  const [newProdPackSize, setNewProdPackSize] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Auto-translate English to Marathi for newly registered products
  useEffect(() => {
    if (!newProdName.trim() || newProdName.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await translateProductName(newProdName);
        if (!cancelled && res.marathi) {
          setNewProdMarathiName(res.marathi);
        }
      } catch (e) {
        // ignore
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [newProdName]);

  const handleNewProdNameChange = (val: string) => {
    setNewProdName(val);
    if (val.trim().length >= 2) {
      const instant = translateProductNameSync(val);
      setNewProdMarathiName(instant.marathi);
    } else if (!val.trim()) {
      setNewProdMarathiName('');
    }
  };

  // Voice-to-Text Recognition for Barcode Product Registration
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const barcodeRecognitionRef = useRef<any>(null);

  const handleBarcodeVoiceClick = () => {
    if (isVoiceListening) {
      if (barcodeRecognitionRef.current) {
        try { barcodeRecognitionRef.current.stop(); } catch {}
      }
      setIsVoiceListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) return;

    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechClass();
      barcodeRecognitionRef.current = recognition;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'mr-IN';
      recognition.interimResults = true;
      recognition.continuous = true;

      playBeepSound();
      setIsVoiceListening(true);

      let accumulated = '';
      let stopTimer: any = null;

      const resetStopTimer = () => {
        if (stopTimer) clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
          try { recognition.stop(); } catch {}
        }, 2500);
      };

      recognition.onresult = async (e: any) => {
        resetStopTimer();
        let interim = '';
        for (let i = 0; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            accumulated += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        const text = (accumulated + interim).trim();
        if (text) {
          const processed = await processVoiceTranscript(text, recognition.lang);
          if (processed.englishName) {
            setNewProdName(processed.englishName);
            setNewProdMarathiName(processed.marathiName);
            if (processed.detectedCategory) setNewProdCategory(processed.detectedCategory);
            if (processed.detectedUnit) setNewProdUnit(processed.detectedUnit);
            if (processed.packSize) setNewProdPackSize(processed.packSize);
          }
        }
      };

      recognition.onerror = () => setIsVoiceListening(false);
      recognition.onend = () => {
        if (stopTimer) clearTimeout(stopTimer);
        setIsVoiceListening(false);
        playSuccessChime();
      };

      recognition.start();
    } catch {
      setIsVoiceListening(false);
    }
  };

  // Stock Inward Form
  const [quantity, setQuantity] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [batchNo, setBatchNo] = useState('');
  const [mfgDate, setMfgDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success summary info
  const [lastStockInResult, setLastStockInResult] = useState<{
    productName: string;
    barcode: string;
    batchNo: string;
    qtyAdded: number;
    newTotalStock: number;
  } | null>(null);

  // Auto-generate unique batch number
  const generateBatchNumber = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `LOT-${today}-${rand}`;
  };

  // Reset modal state
  const resetAll = () => {
    setStep('scan');
    setBarcodeInput('');
    setSelectedProduct(null);
    setNewProdName('');
    setNewProdMarathiName('');
    setNewProdBrand('Yogeshwari Dairy');
    setQuantity('');
    setPurchasePrice('');
    setSellingPrice('');
    setBatchNo(generateBatchNumber());
    setSupplierName('');
    setNotes('');
    setErrorMessage(null);
    setIsSubmitting(false);
    setIsRegistering(false);
  };

  const stopCamera = () => {
    try {
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop();
        scannerControlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('stopCamera error:', e);
    }
    setIsScanningCamera(false);
    setTorchEnabled(false);
  };

  const startCamera = async () => {
    stopCamera();
    setIsScanningCamera(false);
    setCameraError(null);

    // Robust video element check with retry polling
    let videoElement = videoRef.current;
    let attempts = 0;
    while (!videoElement && attempts < 15) {
      await new Promise(r => setTimeout(r, 50));
      videoElement = videoRef.current;
      attempts++;
    }

    if (!videoElement) {
      setCameraError(
        language === 'mr'
          ? 'कॅमेरा सुरू करण्यासाठी खालील बटण दाबा.'
          : 'कैमरा शुरू करने के लिए नीचे दिए बटन को दबाएं।'
      );
      setIsScanningCamera(false);
      return;
    }

    const diag: string[] = [];
    const logD = (msg: string) => {
      console.info(`[CameraDiagnostics:StockIn] ${msg}`);
      diag.push(msg);
      setDiagnosticsLogs([...diag]);
    };

    try {
      // Check for WebRTC Secure Context (Mobile Chrome blocks getUserMedia on plain HTTP over LAN IP)
      const isSecure = typeof window !== 'undefined'
        ? (window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        : true;

      logD(`Origin: ${typeof window !== 'undefined' ? window.location.origin : ''} (${isSecure ? 'Secure Context' : 'Insecure Context'})`);
      logD(`MediaDevices API: ${Boolean(navigator?.mediaDevices)}, getUserMedia: ${Boolean(navigator?.mediaDevices?.getUserMedia)}`);

      if (navigator?.permissions?.query) {
        navigator.permissions.query({ name: 'camera' as any }).then(p => {
          logD(`Camera Permission State: ${p.state}`);
        }).catch(() => {});
      }

      if (navigator?.mediaDevices?.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices().then(devs => {
          const v = devs.filter(d => d.kind === 'videoinput');
          logD(`Cameras Found: ${v.length} (${v.map(d => d.label || 'camera').join(', ') || 'unlabeled'})`);
        }).catch(() => {});
      }

      if (!isSecure && (!navigator?.mediaDevices || !navigator?.mediaDevices?.getUserMedia)) {
        logD('Insecure context without getUserMedia. Falling back to native camera.');
        setCameraError(
          language === 'mr'
            ? 'मोबाईल ब्राऊझर सुरक्षित नसलेल्या (HTTP) वायफाय पत्त्यावर थेट व्हिडिओ कॅमेरा ब्लॉक करतो. आम्ही तुमच्यासाठी थेट मोबाईल कॅमेरा फोटो स्कॅनर उघडत आहोत...'
            : 'मोबाइल ब्राउज़र HTTP पते पर लाइव कैमरा ब्लॉक करता है। आपके लिए सीधे मोबाइल कैमरा फोटो स्कैनर खोला जा रहा है...'
        );
        setIsScanningCamera(false);
        // Automatically launch native phone camera intent so user is never stuck
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 150);
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment');
      }

      let stream: MediaStream | null = null;

      // Tier 1: Ideal rear camera with HD resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        });
      } catch (err1) {
        // Tier 2: Rear camera without resolution constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user'
            },
            audio: false
          });
        } catch (err2) {
          // Tier 3: Search for rear camera in enumerateDevices
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            const rearDevice = videoDevices.find(d => {
              const label = d.label.toLowerCase();
              return label.includes('back') || label.includes('rear') || label.includes('environment');
            });

            if (rearDevice) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: rearDevice.deviceId } },
                audio: false
              });
            } else {
              throw new Error('No explicit rear device found');
            }
          } catch (err3) {
            // Tier 4: Universal fallback
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
          }
        }
      }

      if (!stream) {
        throw new Error('Failed to acquire video stream');
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('webkit-playsinline', 'true');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.muted = true;
      await videoElement.play().catch(e => console.warn('Video play warning:', e));

      // Attempt hardware continuous autofocus for mobile rear camera
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && videoTrack.applyConstraints) {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any]
          });
        }
      } catch (focusErr) {
        // focusMode optional, ignore if unsupported
      }

      // Wait briefly for video dimensions so canvas can capture valid frames
      if (videoElement.videoWidth === 0) {
        await new Promise<void>(resolve => {
          const onLoaded = () => {
            videoElement.removeEventListener('loadedmetadata', onLoaded);
            resolve();
          };
          videoElement.addEventListener('loadedmetadata', onLoaded);
          setTimeout(resolve, 600);
        });
      }

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities?.torch));

      // 2. High-Performance Multi-Pass AI & Multi-Angle Computer Vision Decoder
      const codeReader = createBarcodeReader();
      codeReaderRef.current = codeReader;

      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      let isLoopRunning = true;
      let isDecodingFrame = false;
      let isAutoOcrRunning = false;
      const tracker = new BarcodeConfirmationTracker();

      // Show OCR fallback button quickly after 1.5s
      const ocrTimer = setTimeout(() => {
        if (isLoopRunning) {
          setShowOcrButton(true);
        }
      }, 1500);

      // Continuous Auto-OCR loop: Automatically reads human-readable numbers for blurry/worn barcodes!
      const autoOcrInterval = setInterval(async () => {
        if (!isLoopRunning || isAutoOcrRunning || isDecodingFrame) return;
        if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) return;

        isAutoOcrRunning = true;
        try {
          const ocrRes = await performBarcodeOcrFallback(videoElement);
          if (ocrRes.found && ocrRes.barcode && isLoopRunning) {
            const check = validateBarcode(ocrRes.barcode);
            if (check.isValid) {
              isLoopRunning = false;
              clearInterval(scanInterval);
              clearInterval(autoOcrInterval);
              clearTimeout(ocrTimer);
              handleBarcodeDetected(ocrRes.barcode);
            }
          }
        } catch (e) {
          // silent fallback
        } finally {
          isAutoOcrRunning = false;
        }
      }, 1200);

      const scanInterval = setInterval(async () => {
        if (!isLoopRunning || isDecodingFrame) return;
        if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) return;

        isDecodingFrame = true;
        try {
          // 1. Hardware Accelerated Native BarcodeDetector (Google ML Kit on Android)
          const nativeCode = await detectWithNativeBarcodeDetector(videoElement);
          if (nativeCode && isLoopRunning) {
            const confirmed = tracker.evaluateCandidate(nativeCode);
            if (confirmed && isLoopRunning) {
              isLoopRunning = false;
              clearInterval(scanInterval);
              clearInterval(autoOcrInterval);
              clearTimeout(ocrTimer);
              handleBarcodeDetected(confirmed.text);
              return;
            }
          }

          // 2. Multi-Angle Computer Vision Decoder (ZXing)
          if (scanCtx) {
            const rawText = decodeVideoMultiAngle(videoElement, codeReader, scanCanvas, scanCtx);
            if (rawText && isLoopRunning) {
              const confirmed = tracker.evaluateCandidate(rawText);
              if (confirmed && isLoopRunning) {
                isLoopRunning = false;
                clearInterval(scanInterval);
                clearInterval(autoOcrInterval);
                clearTimeout(ocrTimer);
                handleBarcodeDetected(confirmed.text);
                return;
              }
            }
          }
        } catch (frameErr) {
          // ignore transient frame capture glitches
        } finally {
          isDecodingFrame = false;
        }
      }, 90);

      scannerControlsRef.current = {
        stop: () => {
          isLoopRunning = false;
          clearInterval(scanInterval);
          clearInterval(autoOcrInterval);
          clearTimeout(ocrTimer);
        }
      };

      setIsScanningCamera(true);
      setCameraError(null);
    } catch (err: any) {
      console.error('Camera access error:', err);
      logD(`Camera Error: [${err?.name || 'Error'}] ${err?.message || ''}`);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
      setCameraError(
        isPermissionDenied
          ? (language === 'mr'
            ? 'कॅमेरा परवानगी नाकारली गेली. कृपया ब्राऊझर पत्त्याजवळ (Address bar) कुलूपावर क्लिक करून कॅमेरा सुरू करा.'
            : 'कैमरा अनुमति अस्वीकृत। कृपया ब्राउज़र में कैमरा एक्सेस दें।')
          : (language === 'mr'
            ? `कॅमेरा सुरू करता आला नाही (${err?.name || 'Error'}). कृपया "कॅमेरा सुरू करा" बटण दाबा किंवा बारकोड टाईप करा.`
            : `कैमरा शुरू नहीं हो सका (${err?.name || 'Error'})। कृपया "कैमरा शुरू करें" बटन दबाएं।`)
      );
      setIsScanningCamera(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const next = !torchEnabled;
      if (scannerControlsRef.current?.switchTorch) {
        await scannerControlsRef.current.switchTorch(next);
        setTorchEnabled(next);
      } else if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        await track.applyConstraints({
          advanced: [{ torch: next } as any]
        });
        setTorchEnabled(next);
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // AI OCR Fallback for damaged or scratched barcode labels
  const handleTriggerOcr = async () => {
    if (!videoRef.current || isOcrRunning) return;
    setIsOcrRunning(true);
    try {
      const mode = scanTarget === 'numbers' ? 'strip' : 'full';
      const ocrRes = await performBarcodeOcrFallback(videoRef.current, mode);
      if (ocrRes.found && ocrRes.barcode) {
        if (scannerControlsRef.current) {
          scannerControlsRef.current.stop();
        }
        handleBarcodeDetected(ocrRes.barcode);
      } else {
        alert(
          language === 'mr'
            ? 'संख्या वाचता आली नाही. कृपया खाली बारकोड नंबर टाईप करा.'
            : 'संख्या पहचानी नहीं जा सकी। कृपया नीचे बारकोड नंबर टाइप करें।'
        );
      }
    } catch (err) {
      console.warn('OCR error:', err);
    } finally {
      setIsOcrRunning(false);
    }
  };

  useEffect(() => {
    const shouldSkipCamera = Boolean(initialProduct || (initialBarcode && forceRegisterNew));
    if (isOpen && step === 'scan' && !shouldSkipCamera) {
      setShowOcrButton(true);
      const timer = setTimeout(() => {
        startCamera();
      }, 50);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, facingMode, initialProduct, initialBarcode, forceRegisterNew]);

  const handleBarcodeDetected = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    playBeepSound();
    setBarcodeInput(clean);

    const val = validateBarcode(clean);
    setValidationResult(val);

    lookupBarcode(clean);
  };

  // Lookup barcode in database & local products
  const lookupBarcode = async (code: string) => {
    setErrorMessage(null);
    const clean = code.trim();
    if (!clean) return;

    // 1. Check local StoreContext first
    const candidates = [clean, '0' + clean, clean.replace(/^0+/, '')];
    const localMatch = products.find(
      (p) => (p.barcode && candidates.includes(p.barcode.trim())) || p.id === clean
    );

    if (localMatch) {
      setMatchedSource('local');
      proceedWithProduct(localMatch);
      return;
    }

    // 2. Query online database (product_barcodes, products, RPC, product_catalogue)
    try {
      const result = await searchProductByBarcodeOnline(clean);
      if (result.found && result.product) {
        setMatchedSource(result.source);
        proceedWithProduct(result.product);
        return;
      }
    } catch (e) {
      console.warn('Online barcode lookup failed:', e);
    }

    setMatchedSource(null);
    // Not found -> Step 2: Register product
    stopCamera();
    setStep('register');
    setNewProdName('');
    setNewProdMarathiName('');
  };

  const proceedWithProduct = (product: Product) => {
    stopCamera();
    setSelectedProduct(product);
    setPurchasePrice(product.purchase_price || 0);
    setSellingPrice(product.selling_price || 0);
    setStep('details');
  };

  // Auto-fill from props if initial product or initial barcode was provided
  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        proceedWithProduct(initialProduct);
      } else if (initialBarcode && initialBarcode.trim()) {
        const clean = initialBarcode.trim();
        setBarcodeInput(clean);
        setValidationResult(validateBarcode(clean));
        if (forceRegisterNew) {
          // Redirected directly from top search scanner for an unknown barcode -> open New Product Name entry step immediately
          stopCamera();
          setMatchedSource(null);
          setSelectedProduct(null);
          setErrorMessage(null);
          setNewProdName('');
          setNewProdMarathiName('');
          setBatchNo(generateBatchNumber());
          setStep('register');
        } else {
          lookupBarcode(clean);
        }
      } else {
        resetAll();
      }
    } else {
      stopCamera();
    }
  }, [isOpen, initialProduct, initialBarcode, forceRegisterNew]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Try Multi-Angle ZXing Image Decoder (0°, 180°, 90°, 270°)
      const reader = createBarcodeReader();
      const detected = await decodeImageMultiAngle(img, reader);
      if (detected) {
        handleBarcodeDetected(detected);
      } else {
        alert(language === 'mr' ? 'फोटोमध्ये बारकोड सापडला नाही. कृपया जवळून स्पष्ट फोटो काढा.' : 'फोटो में बारकोड नहीं मिला। कृपया स्पष्ट फोटो लें।');
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(language === 'mr' ? 'फोटोमध्ये बारकोड वाचता आला नाही. कृपया बारकोड नंबर हाताने टाका.' : 'फोटो में बारकोड नहीं पढ़ा जा सका। कृपया बारकोड संख्या टाइप करें।');
    }
  };

  // Quick preset for expiry date
  const setExpiryDaysFromToday = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  // Handle registering a new product to catalogue & instant database save
  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProdName.trim();
    if (!cleanName) {
      setErrorMessage(language === 'mr' ? 'उत्पादनाचे नाव आवश्यक आहे' : 'उत्पाद का नाम आवश्यक है');
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);

    const sPrice = typeof sellingPrice === 'number' ? sellingPrice : 0;
    const pPrice = typeof purchasePrice === 'number' ? purchasePrice : (sPrice > 0 ? sPrice * 0.85 : 0);
    const qtyToAdd = typeof quantity === 'number' ? quantity : 0;
    const cleanBc = barcodeInput.trim();

    try {
      // 1. Add product to StoreContext & Supabase products table
      const createdProd = await addProduct({
        name: cleanName,
        marathi_name: newProdMarathiName.trim() || undefined,
        category: newProdCategory || 'Bakery & Extras',
        unit: newProdUnit || 'Piece',
        brand: newProdBrand.trim() || undefined,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: qtyToAdd,
        min_stock_alert: 5,
        barcode: cleanBc,
        is_active: true
      });

      // 2. Direct client guarantee for public.product_barcodes
      if (supabase && cleanBc) {
        const bcType = cleanBc.length === 8 ? 'EAN-8' : cleanBc.length === 12 ? 'UPC-A' : cleanBc.length === 14 ? 'GTIN-14' : 'EAN-13';
        try {
          await supabase.from('product_barcodes').upsert([{
            product_id: createdProd.id,
            barcode: cleanBc,
            barcode_type: bcType,
            is_primary: true,
            source: 'STOCK_IN_QUICK_SAVE',
            is_active: true
          }], { onConflict: 'barcode' });
        } catch (bcErr) {
          console.warn('[BarcodeStockIn] product_barcodes upsert:', bcErr);
        }
      }

      // 3. If quantity > 0, create batch
      const finalBatch = generateBatchNumber();
      if (qtyToAdd > 0) {
        try {
          await addBatch({
            product_id: createdProd.id,
            product_name: createdProd.name,
            batch_no: finalBatch,
            mfg_date: new Date().toISOString().split('T')[0],
            expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            qty_received: qtyToAdd,
            qty_remaining: qtyToAdd,
            purchase_price: pPrice,
            selling_price: sPrice,
            notes: 'बारकोड आवक द्वारे नोंदणी'
          }, createdProd);
        } catch (batchErr) {
          console.warn('Batch creation error:', batchErr);
        }
      }

      setLastStockInResult({
        productName: createdProd.name,
        barcode: cleanBc,
        batchNo: finalBatch,
        qtyAdded: qtyToAdd,
        newTotalStock: qtyToAdd
      });

      playSuccessChime();
      if (onSuccess) {
        onSuccess(createdProd, finalBatch, qtyToAdd);
      }

      // Direct to Success screen!
      setStep('success');
    } catch (err: any) {
      console.error('Register product error:', err);
      setErrorMessage(err?.message || 'उत्पादन नोंदणी करताना त्रुटी आली.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Step 3 to Step 4: Validate stock inward details
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      setErrorMessage(language === 'mr' ? 'कृपया वैध नग संख्या टाका (> 0)' : 'कृपया वैध मात्रा दर्ज करें (> 0)');
      return;
    }
    if (!expiryDate) {
      setErrorMessage(language === 'mr' ? 'कृपया एक्सपायरी तारीख निवडा' : 'कृपया समाप्ति तिथि चुनें');
      return;
    }
    setErrorMessage(null);
    setStep('confirm');
  };

  // Step 4: Execute Atomic Stock-In
  const handleConfirmStockIn = async () => {
    if (!selectedProduct || !quantity || Number(quantity) <= 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const qtyToAdd = Number(quantity);
    const pCost = typeof purchasePrice === 'number' ? purchasePrice : selectedProduct.purchase_price;
    const pPrice = typeof sellingPrice === 'number' ? sellingPrice : selectedProduct.selling_price;
    const finalBatch = batchNo.trim() || generateBatchNumber();

    try {
      // 1. Try atomic backend RPC
      let rpcSuccess = false;
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('fn_barcode_stock_in', {
          p_barcode: barcodeInput.trim() || selectedProduct.barcode,
          p_quantity: qtyToAdd,
          p_purchase_price: pCost,
          p_selling_price: pPrice,
          p_batch_no: finalBatch,
          p_expiry_date: expiryDate,
          p_mfg_date: mfgDate,
          p_supplier_name: supplierName.trim() || null,
          p_notes: notes.trim() || 'बारकोड द्वारे साठा आवक'
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          rpcSuccess = true;
        }
      } catch (rpcEx) {
        console.warn('RPC fn_barcode_stock_in fallback to client store:', rpcEx);
      }

      // 2. Always sync frontend storeContext batch & product
      await addBatch({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        batch_no: finalBatch,
        mfg_date: mfgDate,
        expiry_date: expiryDate,
        qty_received: qtyToAdd,
        qty_remaining: qtyToAdd,
        purchase_price: pCost,
        selling_price: pPrice,
        supplier_name: supplierName.trim() || undefined,
        notes: notes.trim() || undefined
      }, selectedProduct);

      const newTotalStock = Number(selectedProduct.stock_quantity || 0) + qtyToAdd;

      setLastStockInResult({
        productName: selectedProduct.name,
        barcode: barcodeInput.trim() || selectedProduct.barcode || 'N/A',
        batchNo: finalBatch,
        qtyAdded: qtyToAdd,
        newTotalStock
      });

      playBeepSound();
      if (onSuccess) {
        onSuccess(selectedProduct, finalBatch, qtyToAdd);
      }
      setStep('success');
    } catch (err: any) {
      console.error('Stock inward error:', err);
      setErrorMessage(err?.message || 'साठा जमा करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-xl max-h-[92dvh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl backdrop-blur-md shrink-0">
              <PackagePlus className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {language === 'mr' ? 'बारकोड द्वारे साठा आवक (Stock-In)' : 'बारकोड द्वारा स्टॉक आवक'}
              </h2>
              <p className="text-xs text-emerald-100 truncate">
                {step === 'scan' && (language === 'mr' ? 'पायरी १: बारकोड स्कॅन किंवा सर्च करा' : 'चरण १: बारकोड स्कैन या खोजें')}
                {step === 'register' && (language === 'mr' ? 'पायरी २: नवीन उत्पादन नोंदणी (कॅटलॉग)' : 'चरण २: नया उत्पाद पंजीकरण')}
                {step === 'details' && (language === 'mr' ? 'पायरी ३: साठा, बॅच व किमतीची नोंद' : 'चरण ३: स्टॉक, बैच एवं मूल्य विवरण')}
                {step === 'confirm' && (language === 'mr' ? 'पायरी ४: साठा आवक खात्री करा' : 'चरण ४: स्टॉक आवक पुष्टि')}
                {step === 'success' && (language === 'mr' ? 'साठा यशस्वीरीत्या जमा झाला!' : 'स्टॉक सफलतापूर्वक दर्ज!')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="shrink-0 mx-4 sm:mx-6 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {/* STEP 1: SCAN OR MANUAL SEARCH */}
          {step === 'scan' && (
            <div className="space-y-5">
              {/* Camera Viewfinder */}
              <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-emerald-500/50 flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* OCR Processing Overlay */}
                {isOcrRunning && (
                  <div className="absolute inset-0 bg-slate-950/85 z-30 flex flex-col items-center justify-center text-white space-y-2.5 animate-fadeIn">
                    <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                    <p className="text-xs font-bold text-amber-200">
                      {language === 'mr' ? 'AI OCR द्वारे बारकोड नंबर वाचत आहे...' : 'AI OCR द्वारा बारकोड संख्या पढ़ी जा रही है...'}
                    </p>
                  </div>
                )}

                {/* Aiming Reticle: Clean Minimalist Frame with Smooth Glowing Laser */}
                {isScanningCamera && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-36 border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] overflow-hidden">
                      {/* Ultra-Smooth Glowing Neon Laser Beam */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_15px_#10b981,0_0_32px_#34d399] animate-scanner-sweep pointer-events-none">
                        <div className="absolute -top-2 left-4 right-4 h-5 bg-gradient-to-b from-emerald-400/25 to-transparent blur-[2px] pointer-events-none" />
                      </div>
                      <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase bg-emerald-800/90 rounded-md py-0.5 px-2.5 max-w-fit mx-auto shadow-sm">
                        {language === 'mr' ? 'बारकोड चौकटीत धरा' : 'बारकोड फ्रेम में रखें'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Floating Viewfinder Controls: Torch & Camera Switch Only */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-20">

                  {hasTorch && isScanningCamera && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold transition flex items-center gap-1 shadow-lg ${torchEnabled
                        ? 'bg-amber-400 text-slate-900 border-amber-300'
                        : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                        }`}
                      title="टॉर्च / Flashlight"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}

                  {isScanningCamera && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition flex items-center gap-1 shadow-lg"
                      title={facingMode === 'environment' ? 'समोरचा कॅमेरा (Front)' : 'मागील कॅमेरा (Back)'}
                    >
                      <SwitchCamera className="w-4 h-4" />
                      <span className="text-[10px] hidden sm:inline">
                        {facingMode === 'environment' ? 'Back' : 'Front'}
                      </span>
                    </button>
                  )}
                </div>

                {!isScanningCamera && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-10 animate-fadeIn">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
                      <Camera className="w-7 h-7" />
                    </div>
                    <p className="text-xs text-slate-300 max-w-xs">
                      {cameraError || (language === 'mr' ? 'कॅमेरा सुरू करण्यासाठी खालील बटण दाबा.' : 'कैमरा शुरू करने के लिए नीचे दिए बटन को दबाएं।')}
                    </p>
                    {/* Action Buttons: Enable Live Camera OR Direct Mobile Camera Photo */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 w-full max-w-sm">
                      <label className="w-full sm:w-auto cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition">
                        <Camera className="w-4 h-4 text-white" />
                        <span>{language === 'mr' ? '📷 मोबाईल कॅमेऱ्याने फोटो काढा' : '📷 मोबाइल कैमरे से फोटो लें'}</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 shadow-md flex items-center justify-center gap-2 active:scale-95 transition"
                      >
                        <Video className="w-4 h-4 text-emerald-400" />
                        <span>{language === 'mr' ? '🎥 पुन्हा प्रयत्न करा' : '🎥 पुनः प्रयास करें'}</span>
                      </button>
                    </div>

                    {/* Mobile HTTP Security Help Box */}
                    {cameraError && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 max-w-sm text-left space-y-1.5 leading-relaxed">
                        <p className="font-bold text-amber-300">💡 मोबाईलवर कॅमेरा परवानगी का येत नाही?</p>
                        <p>मोबाईल ब्राउझर (Chrome/Safari) सुरक्षेसाठी <strong>HTTP (10.63.238.67)</strong> वर थेट व्हिडिओ बंद ठेवतो.</p>
                        <p className="font-semibold text-emerald-300">✓ उपाय १: वरील "मोबाईल कॅमेऱ्याने फोटो काढा" बटण वापरा (हे कोणत्याही सेटिंगशिवाय लगेच काम करते).</p>
                        <p className="font-semibold text-sky-300">✓ उपाय २: मोबाईल Chrome मध्ये <code>chrome://flags</code> उघडून <code>unsafely-treat-insecure-origin-as-secure</code> मध्ये <code>http://10.63.238.67:5173</code> टाका आणि Enable करा.</p>
                      </div>
                    )}

                    {/* Diagnostics Toggle */}
                    {diagnosticsLogs.length > 0 && (
                      <div className="w-full max-w-sm pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDiagnostics(!showDiagnostics)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                        >
                          {showDiagnostics ? 'तांत्रिक माहिती लपवा' : '🛠️ तांत्रिक माहिती (Diagnostics)'}
                        </button>
                        {showDiagnostics && (
                          <div className="w-full mt-1 p-2 bg-black/80 border border-slate-800 rounded-lg text-[9px] text-left font-mono text-emerald-400 max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                            {diagnosticsLogs.join('\n')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Manual Barcode Input / Scanner Gun (Optional secondary input, no autoFocus) */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  {language === 'mr' ? 'किंवा बारकोड नंबर टाईप करा / स्कॅनर गन वापरा:' : 'या बारकोड नंबर टाइप करें / स्कैनर गन उपयोग करें:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        lookupBarcode(barcodeInput);
                      }
                    }}
                    placeholder={language === 'mr' ? 'उदा. 8901030384721' : 'उदा. 8901030384721'}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <label
                    title={language === 'mr' ? 'मोबाईल कॅमेऱ्याने फोटो काढून स्कॅन करा' : 'मोबाइल कैमरे से फोटो खींचकर स्कैन करें'}
                    className="px-3.5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition shrink-0"
                  >
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => lookupBarcode(barcodeInput)}
                    disabled={!barcodeInput.trim()}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    {language === 'mr' ? 'शोधा' : 'खोजें'}
                  </button>
                </div>
              </div>

              {/* Quick helper tip */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  {language === 'mr'
                    ? 'अमूल, गोवर्धन, मदर डेअरी किंवा स्थानिक उत्पादनांचा बारकोड स्कॅन करा.'
                    : 'अमूल, गोवर्धन, मदर डेयरी अथवा स्थानीय उत्पादों का बारकोड स्कैन करें।'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: REGISTER NEW PRODUCT IN CATALOGUE (MINIMAL 1-STEP: NAME + BARCODE ONLY) */}
          {step === 'register' && (
            <form onSubmit={handleRegisterProduct} className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
                      {language === 'mr' ? 'नवीन बारकोड - फक्त उत्पादनाचे नाव नोंदवा' : 'नया बारकोड - केवल उत्पाद का नाम दर्ज करें'}
                    </h4>
                    <p className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                      {barcodeInput}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Name Input - The ONLY Required Field */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {language === 'mr' ? 'उत्पादनाचे नाव (Product Name) *' : 'उत्पाद का नाम (Product Name) *'}
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      🎤 {language === 'mr' ? 'व्हॉइस उपलब्ध' : 'वॉयस उपलब्ध'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      value={newProdName}
                      onChange={(e) => handleNewProdNameChange(e.target.value)}
                      placeholder="उदा. Parle Monaco 50g / Britannia Toast"
                      className="w-full pr-24 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeVoiceClick}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        isVoiceListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}
                      title="बोलून नाव भरा (Voice Input)"
                    >
                      <Mic className={`w-3.5 h-3.5 ${isVoiceListening ? 'animate-bounce' : ''}`} />
                      <span>{isVoiceListening ? 'ऐकत आहे...' : 'बोला'}</span>
                    </button>
                  </div>
                </div>

                {/* Marathi Name (Auto-Translated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {language === 'mr' ? 'मराठी नाव (आपोआप भाषांतर)' : 'मराठी/हिंदी नाम'}
                    </label>
                    {newProdMarathiName && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                        ✓ ऑटो-मराठी
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newProdMarathiName}
                    onChange={(e) => setNewProdMarathiName(e.target.value)}
                    placeholder="उदा. पार्ले मोनाको ५० ग्रॅम"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons: Instant 1-Click Save */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStep('scan');
                    startCamera();
                  }}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold"
                >
                  {language === 'mr' ? 'मागे जा' : 'वापस'}
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{language === 'mr' ? 'डेटाबेसमध्ये सेव्ह करत आहे...' : 'डेटाबेस में सहेज रहे हैं...'}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>{language === 'mr' ? '⚡ थेट डेटाबेसमध्ये सेव्ह करा' : '⚡ सीधे डेटाबेस में सहेजें'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PRODUCT ALREADY IN DATABASE (CLEAN DISPLAY, NO EXTRA FIELDS) */}
          {step === 'details' && selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                    {language === 'mr' ? '✓ उत्पादन डेटाबेसमध्ये आधीच उपलब्ध आहे' : '✓ उत्पाद डेटाबेस में पहले से उपलब्ध है'}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedProduct.marathi_name || selectedProduct.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                    बारकोड: <strong className="text-slate-800 dark:text-slate-200">{selectedProduct.barcode || barcodeInput}</strong> | साठा: <strong className="text-emerald-600 dark:text-emerald-400">{selectedProduct.stock_quantity || 0} {selectedProduct.unit}</strong>
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'mr' ? 'पुढील बारकोड स्कॅन करा' : 'अगला बारकोड स्कैन करें'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  {language === 'mr' ? 'पूर्ण झाले / बंद करा' : 'पूर्ण / बंद करें'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION */}
          {step === 'success' && lastStockInResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {language === 'mr' ? 'उत्पादन आणि बारकोड यशस्वीरीत्या सेव्ह झाले!' : 'उत्पाद और बारकोड सफलतापूर्वक दर्ज हुआ!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  डेटाबेसमध्ये नवीन नोंद पूर्ण झाली आहे.
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl inline-block text-left text-xs space-y-1 font-mono">
                <div>उत्पादन: <strong className="text-slate-900 dark:text-white text-sm">{lastStockInResult.productName}</strong></div>
                <div>बारकोड: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{lastStockInResult.barcode}</strong></div>
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  {language === 'mr' ? 'पुढील उत्पादन स्कॅन करा' : 'अगला उत्पाद स्कैन करें'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-300"
                >
                  {language === 'mr' ? 'बंद करा' : 'बंद करें'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

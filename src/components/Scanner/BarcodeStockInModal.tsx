import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  createBarcodeReader,
  decodeVideoSingleStep,
  decodeImageMultiAngle,
  detectWithNativeBarcodeDetector,
  isNativeBarcodeDetectorSupported,
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
  processVoiceTranscript,
  startMobileVoiceRecognition,
  MobileVoiceController,
  VoiceLanguage
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
  const { language, tr, getProductDisplayName } = useLanguage();

  // Step 1: Scan | Step 2: Register New (if not found) | Step 3: Enter Stock Details | Step 4: Confirm Summary | Step 5: Success
  const [step, setStep] = useState<'scan' | 'register' | 'details' | 'confirm' | 'success'>('scan');

  // Scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSessionRef = useRef(0);
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

  // Mobile-Hardened Voice-to-Text Recognition for Barcode Product Registration
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceLiveTranscript, setVoiceLiveTranscript] = useState('');
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(() => {
    try {
      const saved = localStorage.getItem('ydo_voice_lang');
      if (saved === 'en-IN' || saved === 'mr-IN' || saved === 'hi-IN') return saved;
    } catch {}
    // Default en-IN recognizes English FMCG brands + Hinglish/Marathi dairy terms cleanly on mobile
    return 'en-IN';
  });
  const voiceControllerRef = useRef<MobileVoiceController | null>(null);
  const voiceSessionSeqRef = useRef<number>(0);

  const handleSelectVoiceLang = (nextLang: VoiceLanguage) => {
    setVoiceLang(nextLang);
    try {
      localStorage.setItem('ydo_voice_lang', nextLang);
    } catch {}
  };

  // Stop voice recognition cleanly when modal closes or step changes
  useEffect(() => {
    if (!isOpen || step !== 'register') {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.abort();
        voiceControllerRef.current = null;
      }
      setIsVoiceListening(false);
      setVoiceLiveTranscript('');
      setVoiceErrorMsg(null);
    }
    return () => {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.abort();
        voiceControllerRef.current = null;
      }
    };
  }, [isOpen, step]);

  const handleBarcodeVoiceClick = () => {
    if (isVoiceListening) {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.stop();
        voiceControllerRef.current = null;
      }
      setIsVoiceListening(false);
      return;
    }

    // Release active input focus on mobile so soft keyboard doesn't fight OS voice capture
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Ensure camera stream is fully stopped so mobile audio/media resources are completely free
    stopCamera();

    setVoiceErrorMsg(null);
    setVoiceLiveTranscript('');
    const seqId = ++voiceSessionSeqRef.current;

    const controller = startMobileVoiceRecognition({
      lang: voiceLang,
      uiLang: language === 'mr' ? 'mr' : language === 'hi' ? 'hi' : 'en',
      onStart: () => {
        setIsVoiceListening(true);
      },
      onInterim: (raw, processed) => {
        if (voiceSessionSeqRef.current !== seqId) return;
        setVoiceLiveTranscript(raw);
        if (processed.englishName) {
          setNewProdName(processed.englishName);
          if (processed.marathiName) setNewProdMarathiName(processed.marathiName);
          if (processed.detectedBrand) setNewProdBrand(processed.detectedBrand);
          if (processed.detectedCategory) setNewProdCategory(processed.detectedCategory);
          if (processed.detectedUnit) setNewProdUnit(processed.detectedUnit);
          if (processed.packSize) setNewProdPackSize(processed.packSize);
        }
      },
      onFinal: async (raw, processed) => {
        if (voiceSessionSeqRef.current !== seqId) return;
        setVoiceLiveTranscript(raw);
        if (processed.englishName) {
          setNewProdName(processed.englishName);
          if (processed.marathiName) setNewProdMarathiName(processed.marathiName);
          if (processed.detectedBrand) setNewProdBrand(processed.detectedBrand);
          if (processed.detectedCategory) setNewProdCategory(processed.detectedCategory);
          if (processed.detectedUnit) setNewProdUnit(processed.detectedUnit);
          if (processed.packSize) setNewProdPackSize(processed.packSize);
        }
        playSuccessChime();
        // Optional async enrichment guarded by sequence ID (prevents race overwrites)
        try {
          const enriched = await processVoiceTranscript(raw, voiceLang);
          if (voiceSessionSeqRef.current === seqId && enriched.englishName) {
            setNewProdName(enriched.englishName);
            if (enriched.marathiName) setNewProdMarathiName(enriched.marathiName);
          }
        } catch {
          // Synchronous result already applied
        }
      },
      onError: (_code, message) => {
        if (voiceSessionSeqRef.current !== seqId) return;
        setIsVoiceListening(false);
        setVoiceErrorMsg(message);
      },
      onEnd: () => {
        if (voiceSessionSeqRef.current !== seqId) return;
        voiceControllerRef.current = null;
        setIsVoiceListening(false);
      }
    });

    if (controller) {
      voiceControllerRef.current = controller;
      setIsVoiceListening(true);
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
    cameraSessionRef.current += 1;
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
    const sessionId = ++cameraSessionRef.current;
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
        tr(
          'Press the button below to start camera.',
          'कैमरा शुरू करने के लिए नीचे दिए बटन को दबाएं।',
          'कॅमेरा सुरू करण्यासाठी खालील बटण दाबा.'
        )
      );
      setIsScanningCamera(false);
      return;
    }

    const diag: string[] = [];
    const logD = (msg: string) => {
      diag.push(msg);
    };

    try {
      // Check for WebRTC Secure Context (Mobile Chrome blocks getUserMedia on plain HTTP over LAN IP)
      const isSecure = typeof window !== 'undefined'
        ? (window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        : true;

      logD(`Origin: ${typeof window !== 'undefined' ? window.location.origin : ''} (${isSecure ? 'Secure Context' : 'Insecure Context'})`);
      logD(`MediaDevices API: ${Boolean(navigator?.mediaDevices)}, getUserMedia: ${Boolean(navigator?.mediaDevices?.getUserMedia)}`);

      if (!isSecure && (!navigator?.mediaDevices || !navigator?.mediaDevices?.getUserMedia)) {
        logD('Insecure context without getUserMedia. Falling back to native camera.');
        setDiagnosticsLogs([...diag]);
        setCameraError(
          tr(
            'Mobile browser blocks live video camera on insecure (HTTP) Wi-Fi addresses. Opening native mobile camera photo scanner for you...',
            'मोबाइल ब्राउज़र HTTP पते पर लाइव कैमरा ब्लॉक करता है। आपके लिए सीधे मोबाइल कैमरा फोटो स्कैनर खोला जा रहा है...',
            'मोबाईल ब्राऊझर सुरक्षित नसलेल्या (HTTP) वायफाय पत्त्यावर थेट व्हिडिओ कॅमेरा ब्लॉक करतो. आम्ही तुमच्यासाठी थेट मोबाईल कॅमेरा फोटो स्कॅनर उघडत आहोत...'
          )
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

      // Tier 1: Ideal rear camera with smooth 30fps HD resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
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

      // Guard against modal closing or camera switching while getUserMedia was pending
      if (sessionId !== cameraSessionRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
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

      // 2. Smooth Non-Blocking Time-Sliced Scanner Loop (Zero Main-Thread Hang)
      const hasNativeDetector = await isNativeBarcodeDetectorSupported();
      const codeReader = createBarcodeReader();
      codeReaderRef.current = codeReader;

      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      let isLoopRunning = true;
      let nextTickTimer: ReturnType<typeof setTimeout> | null = null;
      let nextRafId: number | null = null;
      let tickCounter = 0;
      let zxingPassIndex = 0;
      const tracker = new BarcodeConfirmationTracker();

      const ocrTimer = setTimeout(() => {
        if (isLoopRunning) {
          setShowOcrButton(true);
        }
      }, 1500);

      const stopLoop = () => {
        isLoopRunning = false;
        clearTimeout(ocrTimer);
        if (nextTickTimer !== null) {
          clearTimeout(nextTickTimer);
          nextTickTimer = null;
        }
        if (nextRafId !== null) {
          cancelAnimationFrame(nextRafId);
          nextRafId = null;
        }
      };

      const scheduleNextTick = (delayMs: number) => {
        if (!isLoopRunning) return;
        nextTickTimer = setTimeout(() => {
          if (!isLoopRunning) return;
          nextRafId = requestAnimationFrame(() => {
            void runScanStep();
          });
        }, delayMs);
      };

      const runScanStep = async () => {
        if (!isLoopRunning) return;
        if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
          scheduleNextTick(120);
          return;
        }

        try {
          tickCounter++;

          // 1. Hardware-Accelerated Native BarcodeDetector (async on GPU/NPU, < 15ms)
          if (hasNativeDetector) {
            const nativeCode = await detectWithNativeBarcodeDetector(videoElement);
            if (nativeCode && isLoopRunning) {
              const confirmed = tracker.evaluateCandidate(nativeCode);
              if (confirmed && isLoopRunning) {
                stopLoop();
                handleBarcodeDetected(confirmed.text);
                return;
              }
            }
          }

          // 2. Time-Sliced Single-Pass ZXing Fallback (1 lightweight pass per tick)
          const shouldRunZxing = !hasNativeDetector || tickCounter % 5 === 0;
          if (shouldRunZxing && scanCtx && isLoopRunning) {
            const rawText = decodeVideoSingleStep(
              videoElement,
              codeReader,
              scanCanvas,
              scanCtx,
              zxingPassIndex++
            );
            if (rawText && isLoopRunning) {
              const confirmed = tracker.evaluateCandidate(rawText);
              if (confirmed && isLoopRunning) {
                stopLoop();
                handleBarcodeDetected(confirmed.text);
                return;
              }
            }
          }
        } catch {
          // ignore transient frame capture glitches
        }

        scheduleNextTick(hasNativeDetector ? 100 : 120);
      };

      scannerControlsRef.current = {
        stop: stopLoop
      };

      setIsScanningCamera(true);
      setCameraError(null);

      scheduleNextTick(80);
    } catch (err: any) {
      console.error('Camera access error:', err);
      logD(`Camera Error: [${err?.name || 'Error'}] ${err?.message || ''}`);
      setDiagnosticsLogs([...diag]);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
      setCameraError(
        isPermissionDenied
          ? tr(
              'Camera permission denied. Please click the lock icon in the browser address bar to allow camera access.',
              'कैमरा अनुमति अस्वीकृत। कृपया ब्राउज़र में कैमरा एक्सेस दें।',
              'कॅमेरा परवानगी नाकारली गेली. कृपया ब्राऊझर पत्त्याजवळ (Address bar) कुलूपावर क्लिक करून कॅमेरा सुरू करा.'
            )
          : tr(
              `Could not start camera (${err?.name || 'Error'}). Please press "Try Again" or type the barcode.`,
              `कैमरा शुरू नहीं हो सका (${err?.name || 'Error'})। कृपया "कैमरा शुरू करें" बटन दबाएं।`,
              `कॅमेरा सुरू करता आला नाही (${err?.name || 'Error'}). कृपया "कॅमेरा सुरू करा" बटण दाबा किंवा बारकोड टाईप करा.`
            )
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
          tr(
            'Could not read digits. Please type the barcode number below.',
            'संख्या पहचानी नहीं जा सकी। कृपया नीचे बारकोड नंबर टाइप करें।',
            'संख्या वाचता आली नाही. कृपया खाली बारकोड नंबर टाईप करा.'
          )
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
        alert(
          tr(
            'No barcode found in photo. Please take a closer, clearer photo.',
            'फोटो में बारकोड नहीं मिला। कृपया स्पष्ट फोटो लें।',
            'फोटोमध्ये बारकोड सापडला नाही. कृपया जवळून स्पष्ट फोटो काढा.'
          )
        );
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(
        tr(
          'Could not read barcode from photo. Please type the barcode number manually.',
          'फोटो में बारकोड नहीं पढ़ा जा सका। कृपया बारकोड संख्या टाइप करें।',
          'फोटोमध्ये बारकोड वाचता आला नाही. कृपया बारकोड नंबर हाताने टाका.'
        )
      );
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
      setErrorMessage(tr('Product name is required', 'उत्पाद का नाम आवश्यक है', 'उत्पादनाचे नाव आवश्यक आहे'));
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
      setErrorMessage(err?.message || tr('Error registering product.', 'उत्पाद पंजीकरण में त्रुटि हुई।', 'उत्पादन नोंदणी करताना त्रुटी आली.'));
    } finally {
      setIsRegistering(false);
    }
  };

  // Step 3 to Step 4: Validate stock inward details
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      setErrorMessage(tr('Please enter a valid quantity (> 0)', 'कृपया वैध मात्रा दर्ज करें (> 0)', 'कृपया वैध नग संख्या टाका (> 0)'));
      return;
    }
    if (!expiryDate) {
      setErrorMessage(tr('Please select an expiry date', 'कृपया समाप्ति तिथि चुनें', 'कृपया एक्सपायरी तारीख निवडा'));
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
      if (supabase) {
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
      setErrorMessage(err?.message || tr('Error saving stock. Please try again.', 'स्टॉक सहेजने में त्रुटि हुई। कृपया पुनः प्रयास करें।', 'साठा जमा करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div
        className={`relative w-full ${
          step === 'scan' ? 'max-w-lg' : 'max-w-xl'
        } max-h-[92vh] flex flex-col bg-white dark:bg-[#131F1B] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#24352F] overflow-hidden`}
      >
        {/* Top Header — Matches Live Barcode Camera Scanner */}
        <div className="shrink-0 p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 min-w-0">
            <Barcode className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight truncate">
                {tr('Barcode Stock-In', 'बारकोड द्वारा स्टॉक आवक', 'बारकोड द्वारे साठा आवक')}
              </h2>
              {step !== 'scan' && (
                <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] truncate mt-0.5">
                  {step === 'register' && tr('Step 2: Register new product (Catalogue)', 'चरण 2: नया उत्पाद पंजीकरण (कैटलॉग)', 'पायरी २: नवीन उत्पादन नोंदणी (कॅटलॉग)')}
                  {step === 'details' && tr('Step 3: Stock, batch & price details', 'चरण 3: स्टॉक, बैच एवं मूल्य विवरण', 'पायरी ३: साठा, बॅच व किमतीची नोंद')}
                  {step === 'confirm' && tr('Step 4: Confirm stock inward', 'चरण 4: स्टॉक आवक पुष्टि', 'पायरी ४: साठा आवक खात्री करा')}
                  {step === 'success' && tr('Stock saved successfully!', 'स्टॉक सफलतापूर्वक दर्ज!', 'साठा यशस्वीरीत्या जमा झाला!')}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1A2A25] transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="shrink-0 mx-4 mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: FULL-BLEED CAMERA SCANNER LAYOUT (IDENTICAL TO BARCODE SCANNER MODAL) */}
        {step === 'scan' ? (
          <>
            {/* Video Viewfinder & Overlay */}
            <div className="relative bg-slate-950 flex-1 min-h-[280px] max-h-[360px] flex items-center justify-center overflow-hidden">
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
                    {tr(
                      'Reading barcode digits via AI OCR...',
                      'AI OCR द्वारा बारकोड संख्या पढ़ी जा रही है...',
                      'AI OCR द्वारे बारकोड नंबर वाचत आहे...'
                    )}
                  </p>
                </div>
              )}

              {/* Active Scanning Box: Clean Minimalist Frame with 60fps GPU-Composited Laser */}
              {isScanningCamera && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-36 border border-emerald-400/70 rounded-2xl relative shadow-[0_0_0_100vmax_rgba(0,0,0,0.48)] overflow-hidden">
                    {/* Crisp Corner Brackets */}
                    <span className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-xl" />
                    <span className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-xl" />
                    <span className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-xl" />
                    <span className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-xl" />

                    {/* 60fps GPU-Composited Laser Beam */}
                    <div className="absolute inset-0 animate-scanner-sweep pointer-events-none">
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#10b981,0_0_24px_#34d399]" />
                      <div className="mx-3 h-5 bg-gradient-to-b from-emerald-400/25 to-transparent" />
                    </div>

                    <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase bg-emerald-900/85 rounded-md py-0.5 px-2.5 max-w-fit mx-auto shadow-sm">
                      {tr('Hold barcode inside frame', 'बारकोड फ्रेम में रखें', 'बारकोड चौकटीत धरा')}
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
                    title={tr('Flashlight / Torch', 'टॉर्च / फ्लैशलाइट', 'टॉर्च / फ्लॅशलाइट')}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                {isScanningCamera && (
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition flex items-center gap-1 shadow-lg"
                    title={
                      facingMode === 'environment'
                        ? tr('Switch to Front Camera', 'फ्रंट कैमरा पर स्विच करें', 'समोरचा कॅमेरा (Front)')
                        : tr('Switch to Back Camera', 'बैक कैमरा पर स्विच करें', 'मागील कॅमेरा (Back)')
                    }
                  >
                    <SwitchCamera className="w-4 h-4" />
                    <span className="text-[10px] hidden sm:inline">
                      {facingMode === 'environment' ? tr('Back', 'बैक', 'मागील') : tr('Front', 'फ्रंट', 'समोरचा')}
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
                    {cameraError || tr('Press the button below to start camera.', 'कैमरा शुरू करने के लिए नीचे दिए बटन को दबाएं।', 'कॅमेरा सुरू करण्यासाठी खालील बटण दाबा.')}
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 w-full max-w-sm">
                    <label className="w-full sm:w-auto cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition">
                      <Camera className="w-4 h-4 text-white" />
                      <span>{tr('📷 Take Photo with Mobile Camera', '📷 मोबाइल कैमरे से फोटो लें', '📷 मोबाईल कॅमेऱ्याने फोटो काढा')}</span>
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
                      <span>{tr('🎥 Try Again', '🎥 पुनः प्रयास करें', '🎥 पुन्हा प्रयत्न करा')}</span>
                    </button>
                  </div>

                  {cameraError && (
                    <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 max-w-sm text-left space-y-1.5 leading-relaxed">
                      <p className="font-bold text-amber-300">
                        {tr(
                          '💡 Why is camera permission not showing on mobile?',
                          '💡 मोबाइल पर कैमरा अनुमति क्यों नहीं आ रही है?',
                          '💡 मोबाईलवर कॅमेरा परवानगी का येत नाही?'
                        )}
                      </p>
                      <p>
                        {tr(
                          'Mobile browsers (Chrome/Safari) block live video over insecure HTTP (10.63.238.67) for security.',
                          'मोबाइल ब्राउज़र (Chrome/Safari) सुरक्षा के लिए HTTP (10.63.238.67) पर लाइव वीडियो बंद रखते हैं।',
                          'मोबाईल ब्राउझर (Chrome/Safari) सुरक्षेसाठी HTTP (10.63.238.67) वर थेट व्हिडिओ बंद ठेवतो.'
                        )}
                      </p>
                      <p className="font-semibold text-emerald-300">
                        {tr(
                          '✓ Option 1: Use the "Take Photo with Mobile Camera" button above (works instantly without any settings).',
                          '✓ उपाय 1: ऊपर दिए "मोबाइल कैमरे से फोटो लें" बटन का उपयोग करें (यह बिना किसी सेटिंग के तुरंत काम करता है)।',
                          '✓ उपाय १: वरील "मोबाईल कॅमेऱ्याने फोटो काढा" बटण वापरा (हे कोणत्याही सेटिंगशिवाय लगेच काम करते).'
                        )}
                      </p>
                      <p className="font-semibold text-sky-300">
                        {tr(
                          '✓ Option 2: Open chrome://flags in mobile Chrome, add http://10.63.238.67:5173 in unsafely-treat-insecure-origin-as-secure and enable it.',
                          '✓ उपाय 2: मोबाइल Chrome में chrome://flags खोलें, unsafely-treat-insecure-origin-as-secure में http://10.63.238.67:5173 जोड़ें और Enable करें।',
                          '✓ उपाय २: मोबाईल Chrome मध्ये chrome://flags उघडून unsafely-treat-insecure-origin-as-secure मध्ये http://10.63.238.67:5173 टाका आणि Enable करा.'
                        )}
                      </p>
                    </div>
                  )}

                  {diagnosticsLogs.length > 0 && (
                    <div className="w-full max-w-sm pt-1">
                      <button
                        type="button"
                        onClick={() => setShowDiagnostics(!showDiagnostics)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        {showDiagnostics
                          ? tr('Hide technical details', 'तकनीकी जानकारी छुपाएं', 'तांत्रिक माहिती लपवा')
                          : tr('🛠️ Technical Details (Diagnostics)', '🛠️ तकनीकी जानकारी (Diagnostics)', '🛠️ तांत्रिक माहिती (Diagnostics)')}
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

            {/* Compact Manual Barcode Input Bar — Matches BarcodeScannerModal */}
            <div className="p-3.5 bg-slate-50 dark:bg-[#1A2A25] border-t border-slate-200/80 dark:border-[#24352F]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (barcodeInput.trim()) lookupBarcode(barcodeInput);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={tr('Or type barcode number...', 'या बारकोड संख्या टाइप करें...', 'किंवा बारकोड नंबर टाईप करा...')}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <label
                  title={tr('Take photo with mobile camera to scan', 'मोबाइल कैमरे से फोटो खींचकर स्कैन करें', 'मोबाईल कॅमेऱ्याने फोटो काढून स्कॅन करा')}
                  className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  <span>{tr('Photo', 'फोटो', 'फोटो')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                <button
                  type="submit"
                  disabled={!barcodeInput.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">{tr('Search', 'खोजें', 'शोधा')}</span>
                </button>
              </form>
            </div>
          </>
        ) : (
        /* Modal Body for Steps 2-5 */
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">

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
                      {tr(
                        'New Barcode - Enter Product Name Only',
                        'नया बारकोड - केवल उत्पाद का नाम दर्ज करें',
                        'नवीन बारकोड - फक्त उत्पादनाचे नाव नोंदवा'
                      )}
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
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {tr('Product Name *', 'उत्पाद का नाम *', 'उत्पादनाचे नाव *')}
                    </label>
                    {/* Compact Voice Language Switcher (EN / मराठी / हिंदी) */}
                    <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-[#1A2A25] p-0.5 border border-slate-200 dark:border-[#24352F]">
                      {(
                        [
                          { code: 'en-IN', label: 'EN' },
                          { code: 'mr-IN', label: 'मराठी' },
                          { code: 'hi-IN', label: 'हिंदी' }
                        ] as Array<{ code: VoiceLanguage; label: string }>
                      ).map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => handleSelectVoiceLang(opt.code)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
                            voiceLang === opt.code
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={newProdName}
                      onChange={(e) => handleNewProdNameChange(e.target.value)}
                      placeholder={tr(
                        'e.g. Parle Monaco 50g / Britannia Toast',
                        'उदा. Parle Monaco 50g / Britannia Toast',
                        'उदा. Parle Monaco 50g / Britannia Toast'
                      )}
                      className="w-full pr-28 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeVoiceClick}
                      aria-label={isVoiceListening ? 'Stop voice input' : 'Start voice input'}
                      className={`absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-[0.97] cursor-pointer ${
                        isVoiceListening
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}
                      title={tr('Speak to fill product name (Voice Input)', 'बोलकर नाम भरें (वॉइस इनपुट)', 'बोलून नाव भरा (Voice Input)')}
                    >
                      <Mic className={`w-3.5 h-3.5 ${isVoiceListening ? 'animate-pulse' : ''}`} />
                      <span>
                        {isVoiceListening
                          ? tr('Stop', 'रोकें', 'थांबवा')
                          : tr('Speak', 'बोलें', 'बोला')}
                      </span>
                    </button>
                  </div>

                  {/* Live Mobile Voice Listening Feedback */}
                  {isVoiceListening && (
                    <div className="mt-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-2 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="truncate">
                          {voiceLiveTranscript
                            ? `${tr('Heard', 'सुना गया', 'ऐकले')}: "${voiceLiveTranscript}"`
                            : tr(
                                'Listening... speak product name clearly',
                                'सुन रहा है... उत्पाद का नाम स्पष्ट बोलें',
                                'ऐकत आहे... उत्पादनाचे नाव स्पष्ट बोला'
                              )}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Actionable Voice Error Feedback (Permission / No Speech / HTTP) */}
                  {voiceErrorMsg && !isVoiceListening && (
                    <div className="mt-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{voiceErrorMsg}</span>
                    </div>
                  )}

                  {!isSpeechRecognitionSupported() && !voiceErrorMsg && (
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-[#8FA69C]">
                      {tr(
                        'Tip: You can also tap the 🎤 mic on your mobile keyboard.',
                        'टिप: आप अपने मोबाइल कीबोर्ड पर 🎤 माइक भी दबा सकते हैं।',
                        'टीप: मोबाईल कीबोर्डवरील 🎤 माइक देखील वापरता येतो.'
                      )}
                    </p>
                  )}
                </div>

                {/* Marathi Name (Auto-Translated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {tr('Marathi / Regional Name', 'मराठी / हिंदी नाम', 'मराठी नाव (आपोआप भाषांतर)')}
                    </label>
                    {newProdMarathiName && (
                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                        {tr('✓ Auto-Marathi', '✓ ऑटो-मराठी', '✓ ऑटो-मराठी')}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newProdMarathiName}
                    onChange={(e) => setNewProdMarathiName(e.target.value)}
                    placeholder={tr('e.g. Parle Monaco 50g (Regional)', 'उदा. पार्ले मोनाको 50 ग्राम', 'उदा. पार्ले मोनाको ५० ग्रॅम')}
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
                  {tr('Back', 'वापस', 'मागे जा')}
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{tr('Saving to database...', 'डेटाबेस में सहेज रहे हैं...', 'डेटाबेसमध्ये सेव्ह करत आहे...')}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>{tr('⚡ Save Directly to Database', '⚡ सीधे डेटाबेस में सहेजें', '⚡ थेट डेटाबेसमध्ये सेव्ह करा')}</span>
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
                    {tr(
                      '✓ Product already exists in database',
                      '✓ उत्पाद डेटाबेस में पहले से उपलब्ध है',
                      '✓ उत्पादन डेटाबेसमध्ये आधीच उपलब्ध आहे'
                    )}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {getProductDisplayName(selectedProduct)}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tr('Barcode:', 'बारकोड:', 'बारकोड:')} <strong className="text-slate-800 dark:text-slate-200">{selectedProduct.barcode || barcodeInput}</strong> | {tr('Stock:', 'स्टॉक:', 'साठा:')} <strong className="text-emerald-600 dark:text-emerald-400">{selectedProduct.stock_quantity || 0} {selectedProduct.unit}</strong>
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
                  <span>{tr('Scan Next Barcode', 'अगला बारकोड स्कैन करें', 'पुढील बारकोड स्कॅन करा')}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  {tr('Done / Close', 'पूर्ण / बंद करें', 'पूर्ण झाले / बंद करा')}
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
                  {tr(
                    'Product & barcode saved successfully!',
                    'उत्पाद और बारकोड सफलतापूर्वक दर्ज हुआ!',
                    'उत्पादन आणि बारकोड यशस्वीरीत्या सेव्ह झाले!'
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {tr(
                    'New record has been saved to the database.',
                    'डेटाबेस में नई प्रविष्टि पूरी हो गई है।',
                    'डेटाबेसमध्ये नवीन नोंद पूर्ण झाली आहे.'
                  )}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl inline-block text-left text-xs space-y-1 font-mono">
                <div>{tr('Product:', 'उत्पाद:', 'उत्पादन:')} <strong className="text-slate-900 dark:text-white text-sm">{lastStockInResult.productName}</strong></div>
                <div>{tr('Barcode:', 'बारकोड:', 'बारकोड:')} <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{lastStockInResult.barcode}</strong></div>
              </div>

              <div className="flex justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  {tr('Scan Next Product', 'अगला उत्पाद स्कैन करें', 'पुढील उत्पादन स्कॅन करा')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-300"
                >
                  {tr('Close', 'बंद करें', 'बंद करा')}
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

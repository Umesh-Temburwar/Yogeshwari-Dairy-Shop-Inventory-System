import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  createBarcodeReader,
  decodeVideoMultiAngle,
  decodeImageMultiAngle,
  BarcodeConfirmationTracker
} from '../../utils/barcodeScannerEngine';
import { performBarcodeOcrFallback } from '../../utils/barcodeOcrFallback';
import { validateBarcode, BarcodeValidationResult } from '../../utils/barcodeChecksum';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import { playBeepSound } from '../../utils/audioUtils';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import {
  Camera,
  X,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Flashlight,
  VideoOff,
  Video,
  SwitchCamera,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelected?: (product: Product) => void;
  onBarcodeScanned?: (barcode: string) => void;
  mode?: 'pos' | 'stock_inward' | 'lookup';
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductSelected,
  onBarcodeScanned,
  mode = 'lookup'
}) => {
  const { products } = useStore();
  const { language } = useLanguage();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsLogs, setDiagnosticsLogs] = useState<string[]>([]);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [showOcrButton, setShowOcrButton] = useState(false);
  const [validationResult, setValidationResult] = useState<BarcodeValidationResult | null>(null);
  const [matchedSource, setMatchedSource] = useState<'product_barcodes' | 'products' | 'rpc' | 'local' | 'catalogue' | null>(null);

  // Stop camera tracks cleanly
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
    setIsScanning(false);
    setIsCameraActive(false);
    setTorchEnabled(false);
  };

  // Start Camera with back-camera (environment) preference
  const startCamera = async () => {
    stopCamera();
    setIsScanning(true);
    setCameraError(null);

    // Wait a brief tick for DOM to attach video ref if needed
    let videoElement = videoRef.current;
    if (!videoElement) {
      await new Promise(r => setTimeout(r, 150));
      videoElement = videoRef.current;
    }

    if (!videoElement) {
      setCameraError(
        language === 'mr'
          ? 'कॅमेरा घटक लोड झाला नाही. कृपया खालील बटण दाबा.'
          : 'कैमरा लोड नहीं हुआ। कृपया नीचे दिए बटन को दबाएं।'
      );
      setIsScanning(false);
      return;
    }

    const diag: string[] = [];
    const logD = (msg: string) => {
      console.info(`[CameraDiagnostics] ${msg}`);
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
        setIsScanning(false);
        setIsCameraActive(false);
        // Automatically launch native phone camera intent so user is never stuck
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 150);
        return;
      }

      // 1. Request user media stream with 4-tier robust constraint fallback
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

      // Check torch capabilities
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
      const tracker = new BarcodeConfirmationTracker();

      // Offer OCR fallback button after 3.5s of scanning without decode
      const ocrTimer = setTimeout(() => {
        if (isLoopRunning) {
          setShowOcrButton(true);
        }
      }, 3500);

      const scanInterval = setInterval(() => {
        if (!isLoopRunning || isDecodingFrame) return;
        if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) return;
        if (!scanCtx) return;

        isDecodingFrame = true;
        try {
          const rawText = decodeVideoMultiAngle(videoElement, codeReader, scanCanvas, scanCtx);
          if (rawText && isLoopRunning) {
            const confirmed = tracker.evaluateCandidate(rawText);
            if (confirmed && isLoopRunning) {
              isLoopRunning = false;
              clearInterval(scanInterval);
              clearTimeout(ocrTimer);
              handleBarcodeDetected(confirmed.text);
            }
          }
        } catch (frameErr) {
          // ignore transient frame capture glitches
        } finally {
          isDecodingFrame = false;
        }
      }, 120);

      scannerControlsRef.current = {
        stop: () => {
          isLoopRunning = false;
          clearInterval(scanInterval);
          clearTimeout(ocrTimer);
        }
      };

      setIsCameraActive(true);
      setIsScanning(false);
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
            ? `कॅमेरा सुरू करता आला नाही (${err?.name || 'Error'}). कृपया "कॅमेरा सुरू करा" बटण दाबा किंवा बारकोड हाताने टाका.`
            : `कैमरा शुरू नहीं हो सका (${err?.name || 'Error'})। कृपया "कैमरा शुरू करें" बटन दबाएं।`)
      );
      setIsScanning(false);
      setIsCameraActive(false);
    }
  };

  // Toggle Torch/Flashlight
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

  // Switch between front & back camera
  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Trigger AI OCR Fallback for damaged/scratched barcodes
  const handleTriggerOcr = async () => {
    if (!videoRef.current || isOcrRunning) return;
    setIsOcrRunning(true);
    try {
      const ocrRes = await performBarcodeOcrFallback(videoRef.current);
      if (ocrRes.found && ocrRes.barcode) {
        if (scannerControlsRef.current) {
          scannerControlsRef.current.stop();
        }
        handleBarcodeDetected(ocrRes.barcode);
      } else {
        alert(
          language === 'mr'
            ? 'बारकोड क्रमांक ओळखता आला नाही. कृपया बारकोड थेट प्रकाशात आणा किंवा हाताने नंबर टाका.'
            : 'बारकोड संख्या पहचानी नहीं जा सकी। कृपया रोशनी में लाएं या बारकोड संख्या टाइप करें।'
        );
      }
    } catch (err) {
      console.warn('OCR error:', err);
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setScannedCode(null);
    setMatchedProduct(null);
    setValidationResult(null);
    setMatchedSource(null);
    setShowOcrButton(false);
    setCameraError(null);
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const handleBarcodeDetected = async (code: string) => {
    playBeepSound();
    const clean = code.trim();
    setScannedCode(clean);

    const val = validateBarcode(clean);
    setValidationResult(val);

    if (onBarcodeScanned) {
      onBarcodeScanned(clean);
    }

    // 1. Lookup in local product list with candidate variations
    const candidates = [clean, '0' + clean, clean.replace(/^0+/, '')];
    const found = products.find(p => p.barcode && candidates.includes(p.barcode.trim()));
    if (found) {
      setMatchedProduct(found);
      setMatchedSource('local');
      return;
    }

    // 2. Lookup in online Supabase catalog (product_barcodes + products + catalogue)
    try {
      const result = await searchProductByBarcodeOnline(clean);
      if (result.found && result.product) {
        setMatchedProduct(result.product);
        setMatchedSource(result.source);
        return;
      }
    } catch (e) {
      console.warn('Online barcode scanner lookup failed:', e);
    }

    setMatchedProduct(null);
    setMatchedSource(null);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleBarcodeDetected(manualInput.trim());
    }
  };

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

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#131F1B] max-w-lg w-full rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between bg-slate-50/50 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Barcode className="w-5 h-5" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {language === 'mr' ? 'लाईव्ह बारकोड कॅमेरा स्कॅनर' : language === 'hi' ? 'लाइव बारकोड कैमरा स्कैनर' : 'Live Barcode Camera Scanner'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-[#1A2A25] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder & Overlay */}
        <div className="relative bg-slate-950 flex-1 min-h-[280px] max-h-[360px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Active Scanning Status Badge */}
          {isCameraActive && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold backdrop-blur-md shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{language === 'mr' ? 'AI स्कॅनर सक्रिय (Multi-Pass)' : 'AI स्कैनर सक्रिय (Multi-Pass)'}</span>
            </div>
          )}

          {/* Prompt OCR Fallback button if scanning takes a few seconds */}
          {showOcrButton && isCameraActive && !isOcrRunning && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center z-20 px-3 pointer-events-auto">
              <button
                type="button"
                onClick={handleTriggerOcr}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1.5 transition active:scale-95 animate-bounce"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span>{language === 'mr' ? 'खराब बारकोड? नंबर OCR ने वाचा' : 'खराब बारकोड? नंबर OCR से पढ़ें'}</span>
              </button>
            </div>
          )}

          {/* OCR Processing Overlay */}
          {isOcrRunning && (
            <div className="absolute inset-0 bg-slate-950/85 z-30 flex flex-col items-center justify-center text-white space-y-2.5 animate-fadeIn">
              <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-amber-200">
                {language === 'mr' ? 'AI OCR द्वारे बारकोड नंबर वाचत आहे...' : 'AI OCR द्वारा बारकोड संख्या पढ़ी जा रही है...'}
              </p>
            </div>
          )}

          {/* Active Scanning Box with Fluid Sweeping Laser Beam */}
          {isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-36 border-2 border-emerald-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] overflow-hidden">
                {/* Fluid Neon Green Laser Sweep Beam */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scanner-sweep pointer-events-none" />
                <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase bg-emerald-800/90 rounded-md py-0.5 px-2.5 max-w-fit mx-auto shadow-sm">
                  {language === 'mr' ? 'बारकोड चौकटीत धरा' : 'बारकोड फ्रेम में रखें'}
                </div>
              </div>
            </div>
          )}

          {/* Floating Camera Controls (Switch, Torch, Toggle) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {hasTorch && isCameraActive && (
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

            {isCameraActive && (
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

          {/* Camera Disabled / Idle Overlay with Big Enable Button */}
          {!isCameraActive && !isScanning && (
            <div className="absolute inset-0 bg-slate-950/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-4 z-10 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-xs">
                <h4 className="font-extrabold text-sm text-white">
                  {cameraError
                    ? (language === 'mr' ? 'कॅमेरा सुरू करता आला नाही' : 'कैमरा शुरू नहीं हुआ')
                    : (language === 'mr' ? 'कॅमेरा बंद आहे' : 'कैमरा बंद है')}
                </h4>
                <p className="text-xs text-slate-300">
                  {cameraError || (language === 'mr'
                    ? 'बारकोड स्कॅन करण्यासाठी खालील बटण दाबून कॅमेरा सुरू करा.'
                    : 'बारकोड स्कैन करने के लिए नीचे दिए बटन से कैमरा शुरू करें।')}
                </p>
              </div>

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

          {/* Loading Indicator */}
          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-3 z-10">
              <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
              <p className="text-xs font-bold text-slate-200">
                {language === 'mr' ? 'कॅमेरा सुरू होत आहे...' : 'कैमरा शुरू हो रहा है...'}
              </p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-3.5 bg-slate-50 dark:bg-[#1A2A25] border-t border-slate-200/80 dark:border-[#24352F]">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={language === 'mr' ? 'किंवा बारकोड नंबर टाईप करा...' : 'या बारकोड संख्या टाइप करें...'}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <label
              title={language === 'mr' ? 'मोबाईल कॅमेऱ्याने फोटो काढून स्कॅन करा' : 'मोबाइल कैमरे से फोटो खींचकर स्कैन करें'}
              className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>{language === 'mr' ? 'फोटो' : 'फोटो'}</span>
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
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'mr' ? 'शोधा' : 'खोजें'}</span>
            </button>
          </form>
        </div>

        {/* Result Area */}
        {scannedCode && (
          <div className="p-4 bg-white dark:bg-[#131F1B] border-t border-slate-200 dark:border-[#24352F] space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {language === 'mr' ? 'स्कॅन केलेला कोड:' : 'स्कैन किया गया कोड:'}
                </span>
                <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {scannedCode}
                </span>
              </div>

              {/* Validation & Source Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {validationResult?.isGS1 && validationResult?.isValid && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{validationResult.format.replace('_', '-')} GS1 Valid</span>
                  </span>
                )}
                {matchedSource === 'catalogue' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-300 dark:border-sky-800">
                    <span>📦 46K+ Master Catalogue</span>
                  </span>
                )}
                {matchedSource === 'products' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                    <span>🏪 दुकान स्टॉक</span>
                  </span>
                )}
              </div>
            </div>

            {matchedProduct ? (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{getProductDisplayName(matchedProduct)}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-[#8FA69C] mt-0.5">
                    दर: ₹{matchedProduct.selling_price} / {matchedProduct.unit} | साठा: {matchedProduct.stock_quantity} {matchedProduct.unit}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onProductSelected) onProductSelected(matchedProduct);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {mode === 'pos'
                    ? (language === 'mr' ? '+ बिलात जोडा' : '+ बिल में जोड़ें')
                    : (language === 'mr' ? 'निवडा' : 'चुनें')}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block">
                    {language === 'mr' ? 'हे उत्पादन इन्व्हेंटरीमध्ये नाही' : 'यह उत्पाद इन्वेंटरी में नहीं मिला'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'तुम्ही या बारकोडसह नवीन उत्पादन तयार करू शकता.' : 'आप इस बारकोड से नया उत्पाद बना सकते हैं।'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (onBarcodeScanned) onBarcodeScanned(scannedCode);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  + {language === 'mr' ? 'नवीन जोडा' : 'नया जोड़ें'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

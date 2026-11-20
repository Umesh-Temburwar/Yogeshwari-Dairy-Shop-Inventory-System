import React, { useEffect, useRef, useState } from 'react';
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
import { Product } from '../../types';
import { playBeepSound } from '../../utils/audioUtils';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
import { ProductImage } from '../Common/ProductImage';
import { QuickProductRegisterModal } from './QuickProductRegisterModal';
import { requestNativeCameraPermission } from '../../services/capacitorService';
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
  onBarcodeNotFound?: (barcode: string) => void;
  mode?: 'pos' | 'stock_inward' | 'lookup';
  zIndex?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductSelected,
  onBarcodeScanned,
  onBarcodeNotFound,
  mode = 'lookup',
  zIndex = 'z-[120]'
}) => {
  const { products } = useStore();
  const { language, tr } = useLanguage();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraSessionRef = useRef(0);

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
  const [showOcrButton, setShowOcrButton] = useState(true);
  const [scanTarget, setScanTarget] = useState<'barcode' | 'numbers'>('barcode');
  const [validationResult, setValidationResult] = useState<BarcodeValidationResult | null>(null);
  const [matchedSource, setMatchedSource] = useState<'product_barcodes' | 'products' | 'rpc' | 'local' | 'catalogue' | null>(null);
  const [showQuickRegister, setShowQuickRegister] = useState(false);

  // Instant auto-lookup when user types complete barcode digits
  useEffect(() => {
    const clean = manualInput.trim();
    if ((clean.length === 12 || clean.length === 13) && /^\d+$/.test(clean)) {
      handleBarcodeDetected(clean);
    }
  }, [manualInput]);

  // Stop camera tracks cleanly
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
    setIsScanning(false);
    setIsCameraActive(false);
    setTorchEnabled(false);
  };

  // Start Camera with back-camera (environment) preference
  const startCamera = async () => {
    stopCamera();
    const sessionId = ++cameraSessionRef.current;
    setIsScanning(true);
    setCameraError(null);

    // Wait one animation frame for DOM to attach video ref if needed
    let videoElement = videoRef.current;
    if (!videoElement) {
      await new Promise<void>(r => requestAnimationFrame(() => r()));
      videoElement = videoRef.current;
    }

    if (!videoElement) {
      setCameraError(
        'Camera element failed to load. Please press the button below.'
      );
      setIsScanning(false);
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
          'Mobile browser blocks live video camera on insecure (HTTP) Wi-Fi addresses. Opening native mobile camera photo scanner for you...'
        );
        setIsScanning(false);
        setIsCameraActive(false);
        // Automatically launch native phone camera intent so user is never stuck
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 150);
        return;
      }

      // 1. Ensure native camera permissions upfront on Android / iOS
      await requestNativeCameraPermission();

      // 2. Request user media stream with 4-tier robust constraint fallback
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

      // Check torch capabilities
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

      setShowOcrButton(true);

      const stopLoop = () => {
        isLoopRunning = false;
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
          // Yield to animation frame so browser paints smooth video + laser before next decode
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

          // 2. Time-Sliced Single-Pass ZXing Fallback (only 1 lightweight pass per tick)
          // When native detector is active, run ZXing backup only every 5th tick
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

        // Smooth cadence: 100ms with hardware detector, 120ms for single-pass ZXing
        scheduleNextTick(hasNativeDetector ? 100 : 120);
      };

      scannerControlsRef.current = {
        stop: stopLoop
      };

      setIsCameraActive(true);
      setIsScanning(false);
      setCameraError(null);

      // Start scanning after first video frame renders smoothly
      scheduleNextTick(80);
    } catch (err: any) {
      console.error('Camera access error:', err);
      logD(`Camera Error: [${err?.name || 'Error'}] ${err?.message || ''}`);
      setDiagnosticsLogs([...diag]);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
      setCameraError(
        isPermissionDenied
          ? 'Camera permission denied. Please click the lock icon in the browser address bar to allow camera access.'
          : `Could not start camera (${err?.name || 'Error'}). Please tap "Try Again" or type the barcode manually.`
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
      const mode = scanTarget === 'numbers' ? 'strip' : 'full';
      const ocrRes = await performBarcodeOcrFallback(videoRef.current, mode);
      if (ocrRes.found && ocrRes.barcode) {
        if (scannerControlsRef.current) {
          scannerControlsRef.current.stop();
        }
        handleBarcodeDetected(ocrRes.barcode);
      } else {
        alert(
          'Could not read digits. Please type the barcode number below or hold in better light.'
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
    setShowOcrButton(true);
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

    // If caller handles unknown barcodes directly (e.g. redirect to New Barcode product registration page)
    if (onBarcodeNotFound) {
      stopCamera();
      onBarcodeNotFound(clean);
      onClose();
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualInput.replace(/[\s\-]/g, '').trim();
    if (clean) {
      handleBarcodeDetected(clean);
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

      // 1. Try Native ML Kit & Multi-Angle ZXing Image Decoder
      const reader = createBarcodeReader();
      let detected = await decodeImageMultiAngle(img, reader);

      // 2. If barcode lines not recognized, fallback to AI OCR numbers
      if (!detected) {
        const ocrRes = await performBarcodeOcrFallback(img as any, 'full');
        if (ocrRes.found && ocrRes.barcode) {
          detected = ocrRes.barcode;
        }
      }

      if (detected) {
        handleBarcodeDetected(detected);
      } else {
        alert(
          'No barcode found in photo. Please take a closer, clearer photo.'
        );
      }
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert(
        'Could not read barcode from photo. Please type the barcode number manually.'
      );
    }
  };

  const getProductDisplayName = (prod: Product) => {
    if (language === 'mr' && prod.marathi_name) return prod.marathi_name;
    if (language === 'hi' && prod.hindi_name) return prod.hindi_name;
    return prod.name;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn`}>
      <div className="bg-white dark:bg-[#131F1B] max-w-lg w-full rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between bg-slate-50/50 dark:bg-[#1A2A25]/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Barcode className="w-5 h-5" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {'Live Barcode Camera Scanner'}
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

          {/* OCR Processing Overlay */}
          {isOcrRunning && (
            <div className="absolute inset-0 bg-slate-950/85 z-30 flex flex-col items-center justify-center text-white space-y-2.5 animate-fadeIn">
              <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-amber-200">
                {'Reading barcode digits via AI OCR...'}
              </p>
            </div>
          )}

          {/* Active Scanning Box: Clean Minimalist Frame with 60fps GPU-Composited Laser */}
          {isCameraActive && (
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
                  {'Hold barcode inside frame'}
                </div>
              </div>
            </div>
          )}

          {/* Floating Camera Controls: Torch & Camera Switch Only */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">

            {hasTorch && isCameraActive && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold transition flex items-center gap-1 shadow-lg ${torchEnabled
                  ? 'bg-amber-400 text-slate-900 border-amber-300'
                  : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                title={'Flashlight / Torch'}
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {isCameraActive && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs font-bold transition flex items-center gap-1 shadow-lg"
                title={
                  facingMode === 'environment'
                    ? 'Switch to Front Camera'
                    : 'Switch to Back Camera'
                }
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
                    ? 'Could not start camera'
                    : 'Camera is off'}
                </h4>
                <p className="text-xs text-slate-300">
                  {cameraError || 'Press the button below to start the camera and scan barcodes.'}
                </p>
              </div>

              {/* Action Buttons: Enable Live Camera OR Direct Mobile Camera Photo */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 w-full max-w-sm">
                <label className="w-full sm:w-auto cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-95 transition">
                  <Camera className="w-4 h-4 text-white" />
                  <span>{'📷 Take Photo with Mobile Camera'}</span>
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
                  <span>{'🎥 Try Again'}</span>
                </button>
              </div>

              {/* Mobile HTTP Security Help Box */}
              {cameraError && (
                <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 max-w-sm text-left space-y-1.5 leading-relaxed">
                  <p className="font-bold text-amber-300">
                    {'💡 Why is camera permission not showing on mobile?'}
                  </p>
                  <p>
                    {'Mobile browsers (Chrome/Safari) block live video over insecure HTTP (10.63.238.67) for security.'}
                  </p>
                  <p className="font-semibold text-emerald-300">
                    {'✓ Option 1: Use the "Take Photo with Mobile Camera" button above (works instantly without any settings).'}
                  </p>
                  <p className="font-semibold text-sky-300">
                    {'✓ Option 2: Open chrome://flags in mobile Chrome, add http://10.63.238.67:5173 in unsafely-treat-insecure-origin-as-secure and enable it.'}
                  </p>
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
                    {showDiagnostics
                      ? 'Hide technical details'
                      : '🛠️ Technical Details (Diagnostics)'}
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
                {'Starting camera...'}
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
              placeholder={'Or type barcode number...'}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <label
              title={'Take photo with mobile camera to scan'}
              className="px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>{'Photo'}</span>
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
              <span className="hidden sm:inline">{'Search'}</span>
            </button>
          </form>
        </div>

        {/* Result Area */}
        {scannedCode && (
          <div className="p-4 bg-white dark:bg-[#131F1B] border-t border-slate-200 dark:border-[#24352F] space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-[#8FA69C]">
                  {'Scanned Code:'}
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
                    <span>{'🏪 Shop Stock'}</span>
                  </span>
                )}
              </div>
            </div>

            {matchedProduct ? (
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ProductImage
                    src={matchedProduct.image_url}
                    alt={matchedProduct.name}
                    category={matchedProduct.category}
                    size="md"
                    className="shadow-sm shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 dark:text-emerald-300 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{getProductDisplayName(matchedProduct)}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-[#8FA69C] mt-0.5 truncate">
                      {'Rate:'} ₹{matchedProduct.selling_price} / {matchedProduct.unit} | {'Stock:'} {matchedProduct.stock_quantity} {matchedProduct.unit}
                    </div>
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
                    ? '+ Add to Bill'
                    : 'Select'}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block truncate">
                    {'This product is not in inventory'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#8FA69C] block truncate">
                    {'Quickly register with this barcode in 1 click:'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setShowQuickRegister(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>{'⚡ Quick Register'}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onBarcodeScanned) onBarcodeScanned(scannedCode);
                      onClose();
                    }}
                    className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-[#1A2A25] text-slate-700 dark:text-slate-300 font-bold text-xs"
                    title={'Close'}
                  >
                    {'Close'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Product Register Modal for Unknown Barcodes */}
        {showQuickRegister && scannedCode && (
          <QuickProductRegisterModal
            isOpen={showQuickRegister}
            onClose={() => setShowQuickRegister(false)}
            barcode={scannedCode}
            mode={mode === 'pos' ? 'pos' : 'catalogue'}
            onProductCreated={(createdProd) => {
              setShowQuickRegister(false);
              setMatchedProduct(createdProd);
              if (onProductSelected) {
                onProductSelected(createdProd);
              }
              onClose();
            }}
          />
        )}

      </div>
    </div>
  );
};

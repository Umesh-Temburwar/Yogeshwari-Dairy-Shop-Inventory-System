import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
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
  SwitchCamera
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

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

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

    try {
      // 1. Request user media stream
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode === 'environment' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstErr) {
        // Fallback for laptop / desktop webcams without facingMode constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('autoplay', 'true');
      videoElement.muted = true;
      await videoElement.play().catch(e => console.warn('Video play warning:', e));

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

      // 2. Barcode Scanning Engine: Chrome Native BarcodeDetector + ZXing Fallback
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
          });
          let active = true;
          const scanNativeLoop = async () => {
            if (!active) return;
            try {
              if (videoElement && videoElement.readyState >= 2) {
                const barcodes = await detector.detect(videoElement);
                if (barcodes && barcodes.length > 0) {
                  const rawCode = barcodes[0].rawValue;
                  if (rawCode) handleBarcodeDetected(rawCode);
                }
              }
            } catch (detErr) {}
            if (active) requestAnimationFrame(scanNativeLoop);
          };
          requestAnimationFrame(scanNativeLoop);
          scannerControlsRef.current = { stop: () => { active = false; } };
        } catch (natErr) {
          // Fallback to ZXing if native initialization fails
          const codeReader = new BrowserMultiFormatReader();
          codeReaderRef.current = codeReader;
          const controls = codeReader.scan(videoElement, (result) => {
            if (result) handleBarcodeDetected(result.getText());
          });
          scannerControlsRef.current = controls;
        }
      } else {
        // Fallback to ZXing BrowserMultiFormatReader
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;
        const controls = codeReader.scan(videoElement, (result) => {
          if (result) handleBarcodeDetected(result.getText());
        });
        scannerControlsRef.current = controls;
      }

      setIsCameraActive(true);
      setIsScanning(false);
      setCameraError(null);
    } catch (err: any) {
      console.error('Camera access error:', err);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
      setCameraError(
        isPermissionDenied
          ? (language === 'mr'
              ? 'कॅमेरा परवानगी नाकारली गेली. कृपया ब्राऊझर पत्त्याजवळ (Address bar) कुलूपावर क्लिक करून कॅमेरा सुरू करा.'
              : 'कैमरा अनुमति अस्वीकृत। कृपया ब्राउज़र में कैमरा एक्सेस दें।')
          : (language === 'mr'
              ? 'कॅमेरा सुरू करता आला नाही. कृपया "कॅमेरा सुरू करा" बटण दाबा किंवा बारकोड हाताने टाका.'
              : 'कैमरा शुरू नहीं हो सका। कृपया "कैमरा शुरू करें" बटन दबाएं।')
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

  // Lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setScannedCode(null);
    setMatchedProduct(null);
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
    if (onBarcodeScanned) {
      onBarcodeScanned(clean);
    }

    // 1. Lookup in local product list with candidate variations
    const candidates = [clean, '0' + clean, clean.replace(/^0+/, '')];
    const found = products.find(p => p.barcode && candidates.includes(p.barcode.trim()));
    if (found) {
      setMatchedProduct(found);
      return;
    }

    // 2. Lookup in online Supabase catalog (product_barcodes + products)
    try {
      const result = await searchProductByBarcodeOnline(clean);
      if (result.found && result.product) {
        setMatchedProduct(result.product);
        return;
      }
    } catch (e) {
      console.warn('Online barcode scanner lookup failed:', e);
    }

    setMatchedProduct(null);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleBarcodeDetected(manualInput.trim());
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

          {/* Active Scanning Box with Red Aim Line */}
          {isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-36 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Animated Red Laser Scan Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
                <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase bg-emerald-700/80 rounded-md py-0.5 px-2 max-w-fit mx-auto">
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
                className={`p-2 rounded-xl backdrop-blur-md border text-xs font-bold transition flex items-center gap-1 shadow-lg ${
                  torchEnabled 
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

              {/* THE BIG ENABLE CAMERA BUTTON */}
              <button
                type="button"
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-900/40 flex items-center gap-2 active:scale-95 transition"
              >
                <Video className="w-4 h-4" />
                <span>{language === 'mr' ? '🎥 कॅमेरा सुरू करा (Enable Camera)' : '🎥 कैमरा शुरू करें (Enable Camera)'}</span>
              </button>
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
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'mr' ? 'शोधा' : 'खोजें'}</span>
            </button>
          </form>
        </div>

        {/* Result Area */}
        {scannedCode && (
          <div className="p-4 bg-white dark:bg-[#131F1B] border-t border-slate-200 dark:border-[#24352F] space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-[#8FA69C]">
                {language === 'mr' ? 'स्कॅन केलेला कोड:' : 'स्कैन किया गया कोड:'}
              </span>
              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                {scannedCode}
              </span>
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

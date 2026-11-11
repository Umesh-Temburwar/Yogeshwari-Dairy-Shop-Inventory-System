import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import {
  Camera,
  X,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  PackagePlus,
  RefreshCw,
  Flashlight
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

  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');

  // Start Camera and Barcode Decoder
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
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setCameraError(null);
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const videoElement = videoRef.current;
      if (!videoElement) return;

      // Decode from video stream
      await codeReader.decodeFromVideoDevice(
        undefined, // default camera
        videoElement,
        (result, error) => {
          if (result) {
            const text = result.getText();
            handleBarcodeDetected(text);
          }
        }
      );
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err?.message?.includes('Permission') 
          ? (language === 'mr' ? 'कॅमेरा परवानगी नाकारली गेली. कृपया ब्राऊझर सेटिंग्जमध्ये कॅमेरा सुरू करा.' : 'कैमरा अनुमति अस्वीकृत। कृपया ब्राउज़र में कैमरा एक्सेस दें।')
          : (language === 'mr' ? 'कॅमेरा सुरू करता आला नाही. कृपया बारकोड हाताने टाका.' : 'कैमरा शुरू नहीं हो सका। कृपया बारकोड मैन्युअली दर्ज करें।')
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    try {
      if (codeReaderRef.current) {
        // ZXing Browser stops tracks through reader reset
        const stream = videoRef.current?.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    } catch (e) {}
    setIsScanning(false);
  };

  const handleBarcodeDetected = (code: string) => {
    setScannedCode(code);
    if (onBarcodeScanned) {
      onBarcodeScanned(code);
    }

    // Lookup in local product list
    const found = products.find(p => p.barcode === code);
    if (found) {
      setMatchedProduct(found);
      if (onProductSelected) {
        // If automatic callback requested
        // onProductSelected(found);
      }
    } else {
      setMatchedProduct(null);
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#131F1B] max-w-lg w-full rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Barcode className="w-5 h-5" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {language === 'mr' ? 'बारकोड स्कॅनर (Barcode Scanner)' : language === 'hi' ? 'बारकोड स्कैनर (Barcode Scanner)' : 'Live Barcode Scanner'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder & Overlay */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[340px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Viewfinder Target Aim Box */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-36 border-2 border-emerald-400 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Animated Red Laser Scan Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse top-1/2 -translate-y-1/2" />
              <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase">
                {language === 'mr' ? 'बारकोड चौकटीत धरा' : 'बारकोड फ्रेम में रखें'}
              </div>
            </div>
          </div>

          {/* Camera Error / Fallback Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-xs font-semibold max-w-xs">{cameraError}</p>
              <button
                onClick={startCamera}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500"
              >
                {language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'पुनः प्रयास करें'}
              </button>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-4 bg-slate-50 dark:bg-[#1A2A25] border-t border-slate-200/80 dark:border-[#24352F]">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={language === 'mr' ? 'किंवा बारकोड नंबर हाताने टाईप करा...' : 'या बारकोड संख्या टाइप करें...'}
              className="flex-1 px-3 py-2 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 text-white font-bold text-xs"
            >
              <Search className="w-4 h-4" />
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


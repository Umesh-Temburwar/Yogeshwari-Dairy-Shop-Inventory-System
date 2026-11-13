import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product } from '../../types';
import {
  X,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button, Input, StatusBadge, Badge } from '../ui';

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

      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      let selectedDeviceId: string | undefined = undefined;
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      if (backCamera) {
        selectedDeviceId = backCamera.deviceId;
      } else if (videoInputDevices.length > 0) {
        selectedDeviceId = videoInputDevices[0].deviceId;
      }

      if (videoRef.current) {
        await codeReader.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, err) => {
            if (result) {
              const text = result.getText();
              handleBarcodeDetected(text);
            }
          }
        );
      }
    } catch (err: any) {
      console.error('Camera Init Error:', err);
      setCameraError(language === 'mr' ? 'कॅमेरा सुरू करताना त्रुटी आली. कृपया ब्राऊझर परवानगी तपासा किंवा मॅन्युअल इनपुट वापरा.' : 'कैमरा शुरू करने में त्रुटि। कृपया अनुमति जांचें या मैनुअल दर्ज करें।');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        (codeReaderRef.current as any).reset();
      } catch (e) {
        console.error(e);
      }
      codeReaderRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const handleBarcodeDetected = (code: string) => {
    setScannedCode(code);

    const found = products.find(p => p.id === code || (p as any).barcode === code);
    if (found) {
      setMatchedProduct(found);
      if (mode === 'pos' && onProductSelected) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface max-w-lg w-full rounded-2xl border border-line shadow-pop overflow-hidden flex flex-col max-h-[90vh] text-ink">
        
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink">
              <Barcode className="w-4 h-4 text-ink-2" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-ink tracking-tight">
              {language === 'mr' ? 'बारकोड स्कॅनर (Barcode Scanner)' : language === 'hi' ? 'बारकोड स्कैनर (Barcode Scanner)' : 'Live Barcode Scanner'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Viewfinder & Overlay */}
        <div className="relative bg-black flex-1 min-h-[240px] max-h-[320px] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Viewfinder Target Aim Box */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-60 h-32 border-2 border-white/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Scan Line */}
              <div className="absolute left-0 right-0 h-0.5 bg-danger animate-pulse top-1/2 -translate-y-1/2" />
              <div className="absolute -top-6 left-0 right-0 text-center text-[10px] font-medium text-white/90 tracking-wider uppercase">
                {language === 'mr' ? 'बारकोड चौकटीत धरा' : 'बारकोड फ्रेम में रखें'}
              </div>
            </div>
          </div>

          {/* Camera Error / Fallback Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-surface/95 p-6 flex flex-col items-center justify-center text-center text-ink space-y-3 z-10">
              <AlertCircle className="w-8 h-8 text-warn" />
              <p className="text-xs font-medium max-w-xs text-ink-2">{cameraError}</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={startCamera}
              >
                {language === 'mr' ? 'पुन्हा प्रयत्न करा' : 'पुनः प्रयास करें'}
              </Button>
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-3.5 bg-surface-2/60 border-t border-line shrink-0">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <Input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={language === 'mr' ? 'किंवा बारकोड नंबर टाईप करा...' : 'या बारकोड संख्या टाइप करें...'}
              className="font-mono text-xs"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Search className="w-4 h-4" />}
            >
              {language === 'mr' ? 'शोधा' : 'खोजें'}
            </Button>
          </form>
        </div>

        {/* Result Area */}
        {scannedCode && (
          <div className="p-4 bg-surface border-t border-line space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-3">
                {language === 'mr' ? 'स्कॅन केलेला कोड:' : 'स्कैन किया गया कोड:'}
              </span>
              <span className="font-mono text-xs font-semibold text-ink px-2 py-0.5 rounded-md bg-surface-2 border border-line">
                {scannedCode}
              </span>
            </div>

            {matchedProduct ? (
              <div className="p-3 bg-surface-2/60 rounded-xl border border-line flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <StatusBadge status="ok">{getProductDisplayName(matchedProduct)}</StatusBadge>
                  </div>
                  <div className="text-[11px] text-ink-3 mt-0.5 tabular-nums">
                    दर: ₹{matchedProduct.selling_price} / {matchedProduct.unit} | साठा: {matchedProduct.stock_quantity} {matchedProduct.unit}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    if (onProductSelected) onProductSelected(matchedProduct);
                    onClose();
                  }}
                >
                  {mode === 'pos' 
                    ? (language === 'mr' ? '+ बिलात जोडा' : '+ बिल में जोड़ें')
                    : (language === 'mr' ? 'निवडा' : 'चुनें')}
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-surface-2/60 rounded-xl border border-line flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-ink block">
                    {language === 'mr' ? 'हे उत्पादन इन्व्हेंटरीमध्ये नाही' : 'यह उत्पाद इन्वेंटरी में नहीं मिला'}
                  </span>
                  <span className="text-[11px] text-ink-3">
                    {language === 'mr' ? 'तुम्ही या बारकोडसह नवीन उत्पादन तयार करू शकता.' : 'आप इस बारकोड से नया उत्पाद बना सकते हैं।'}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (onBarcodeScanned) onBarcodeScanned(scannedCode);
                    onClose();
                  }}
                >
                  + {language === 'mr' ? 'नवीन जोडा' : 'नया जोड़ें'}
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default BarcodeScannerModal;

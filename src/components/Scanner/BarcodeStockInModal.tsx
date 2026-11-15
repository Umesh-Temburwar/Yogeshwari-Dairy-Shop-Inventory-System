import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  createBarcodeReader,
  decodeVideoMultiAngle,
  decodeImageMultiAngle
} from '../../utils/barcodeScannerEngine';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { playBeepSound } from '../../utils/audioUtils';
import { supabase } from '../../lib/supabase';
import { searchProductByBarcodeOnline } from '../../lib/barcodeService';
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
  RefreshCw
} from 'lucide-react';

interface BarcodeStockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (product: Product, batchNo: string, qtyAdded: number) => void;
}

export const BarcodeStockInModal: React.FC<BarcodeStockInModalProps> = ({
  isOpen,
  onClose,
  onSuccess
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
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

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

    // Wait a brief tick for DOM to attach video ref if needed
    let videoElement = videoRef.current;
    if (!videoElement) {
      await new Promise(r => setTimeout(r, 150));
      videoElement = videoRef.current;
    }

    if (!videoElement) {
      setCameraError(
        language === 'mr'
          ? 'कॅमेरा लोड झाला नाही. खालील बटण दाबून कॅमेरा सुरू करा.'
          : 'कैमरा लोड नहीं हुआ। नीचे दिए बटन से कैमरा शुरू करें।'
      );
      return;
    }

    try {
      // Check for WebRTC Secure Context (Mobile Chrome blocks getUserMedia on plain HTTP over LAN IP)
      const isSecure = typeof window !== 'undefined'
        ? (window.isSecureContext ?? (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        : true;

      if (!isSecure && (!navigator?.mediaDevices || !navigator?.mediaDevices?.getUserMedia)) {
        setCameraError(
          language === 'mr'
            ? 'मोबाईल ब्राऊझर सुरक्षित नसलेल्या (HTTP) वायफाय पत्त्यावर थेट व्हिडिओ कॅमेरा ब्लॉक करतो. कृपया खालील "📷 मोबाईल कॅमेऱ्याने फोटो काढा व स्कॅन करा" बटण वापरा.'
            : 'मोबाइल ब्राउज़र HTTP पते पर लाइव कैमरा ब्लॉक करता है। कृपया नीचे दिए "📷 फोटो खींचें और स्कैन करें" बटन का उपयोग करें।'
        );
        setIsScanningCamera(false);
        return;
      }

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

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities ? track.getCapabilities() : {};
      setHasTorch(Boolean(capabilities?.torch));

      // 2. High-Performance Multi-Angle ZXing Scanning Engine (0°, 180°, 90°, Center Reticle Crop)
      const codeReader = createBarcodeReader();
      codeReaderRef.current = codeReader;

      const scanCanvas = document.createElement('canvas');
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });

      let isLoopRunning = true;
      let isDecodingFrame = false;

      const scanInterval = setInterval(() => {
        if (!isLoopRunning || isDecodingFrame) return;
        if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) return;
        if (!scanCtx) return;

        isDecodingFrame = true;
        try {
          const detectedText = decodeVideoMultiAngle(videoElement, codeReader, scanCanvas, scanCtx);
          if (detectedText && isLoopRunning) {
            isLoopRunning = false;
            clearInterval(scanInterval);
            handleBarcodeDetected(detectedText);
          }
        } catch (frameErr) {
          // ignore transient frame capture glitches
        } finally {
          isDecodingFrame = false;
        }
      }, 140);

      scannerControlsRef.current = {
        stop: () => {
          isLoopRunning = false;
          clearInterval(scanInterval);
        }
      };

      setIsScanningCamera(true);
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
            ? 'कॅमेरा सुरू करता आला नाही. कृपया "कॅमेरा सुरू करा" बटण दाबा किंवा बारकोड टाईप करा.'
            : 'कैमरा शुरू नहीं हो सका। कृपया "कैमरा शुरू करें" बटन दबाएं।')
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

  useEffect(() => {
    if (isOpen && step === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, facingMode]);

  const handleBarcodeDetected = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    playBeepSound();
    setBarcodeInput(clean);
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
      proceedWithProduct(localMatch);
      return;
    }

    // 2. Query online database (product_barcodes, products, RPC)
    try {
      const result = await searchProductByBarcodeOnline(clean);
      if (result.found && result.product) {
        proceedWithProduct(result.product);
        return;
      }
    } catch (e) {
      console.warn('Online barcode lookup failed:', e);
    }

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

  // Handle registering a new product to catalogue (Available Stock = 0.00)
  const handleRegisterProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      setErrorMessage(language === 'mr' ? 'उत्पादनाचे नाव आवश्यक आहे' : 'उत्पाद का नाम आवश्यक है');
      return;
    }

    setIsRegistering(true);
    setErrorMessage(null);

    try {
      // 1. Try atomic register RPC
      const { data: regData, error: regErr } = await supabase.rpc(
        'fn_register_product_and_barcode',
        {
          p_name: newProdName.trim(),
          p_marathi_name: newProdMarathiName.trim() || newProdName.trim(),
          p_category: newProdCategory,
          p_unit: newProdUnit,
          p_barcode: barcodeInput.trim(),
          p_brand: newProdBrand.trim(),
          p_pack_size: newProdPackSize.trim() || newProdUnit,
          p_purchase_price: typeof purchasePrice === 'number' ? purchasePrice : 0,
          p_selling_price: typeof sellingPrice === 'number' ? sellingPrice : 0
        }
      );

      let createdProd: Product;

      if (!regErr && regData && regData.product_id) {
        createdProd = {
          id: regData.product_id,
          name: newProdName.trim(),
          marathi_name: newProdMarathiName.trim() || newProdName.trim(),
          category: newProdCategory,
          unit: newProdUnit,
          brand: newProdBrand.trim(),
          pack_size: newProdPackSize.trim() || newProdUnit,
          purchase_price: typeof purchasePrice === 'number' ? purchasePrice : 0,
          selling_price: typeof sellingPrice === 'number' ? sellingPrice : 0,
          stock_quantity: 0.0, // Strictly 0 upon creation
          min_stock_alert: 5,
          barcode: barcodeInput.trim(),
          is_active: true,
          created_at: new Date().toISOString()
        };
      } else {
        // Fallback storeContext addProduct (catalogue creation with stock = 0)
        createdProd = await addProduct({
          name: newProdName.trim(),
          marathi_name: newProdMarathiName.trim() || newProdName.trim(),
          category: newProdCategory,
          unit: newProdUnit,
          brand: newProdBrand.trim(),
          purchase_price: typeof purchasePrice === 'number' ? purchasePrice : 0,
          selling_price: typeof sellingPrice === 'number' ? sellingPrice : 0,
          stock_quantity: 0.0,
          min_stock_alert: 5,
          barcode: barcodeInput.trim(),
          is_active: true
        });
      }

      setSelectedProduct(createdProd);
      setStep('details');
    } catch (err: any) {
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
      });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <PackagePlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {language === 'mr' ? 'बारकोड द्वारे साठा आवक (Stock-In)' : 'बारकोड द्वारा स्टॉक आवक'}
              </h2>
              <p className="text-xs text-emerald-100">
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
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
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
                {/* Active Scanning Status Badge */}
                {isScanningCamera && (
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold backdrop-blur-md shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{language === 'mr' ? 'कॅमेरा सुरू • स्कॅनिंग सक्रिय' : 'कैमरा चालू • स्कैनिंग सक्रिय'}</span>
                  </div>
                )}

                {/* Aiming Reticle with Fluid Sweeping Laser Beam */}
                {isScanningCamera && (
                  <div className="absolute inset-x-12 inset-y-8 border-2 border-emerald-400/90 rounded-2xl pointer-events-none overflow-hidden relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scanner-sweep" />
                    <div className="absolute top-2 left-0 right-0 text-center text-[10px] font-bold text-white tracking-wider uppercase bg-emerald-800/90 rounded-md py-0.5 px-2 max-w-fit mx-auto shadow-sm">
                      {language === 'mr' ? 'बारकोड चौकटीत धरा' : 'बारकोड फ्रेम में रखें'}
                    </div>
                  </div>
                )}

                {/* Floating Viewfinder Controls */}
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
                  </div>
                )}
              </div>

              {/* Manual Barcode Input / Scanner Gun */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-emerald-600" />
                  {language === 'mr' ? 'किंवा बारकोड नंबर टाका / स्कॅनर गन वापरा:' : 'या बारकोड दर्ज करें / स्कैनर गन उपयोग करें:'}
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
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />
                  <label
                    title={language === 'mr' ? 'मोबाईल कॅमेऱ्याने फोटो काढून स्कॅन करा' : 'मोबाइल कैमरे से फोटो खींचकर स्कैन करें'}
                    className="px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition shrink-0"
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

          {/* STEP 2: REGISTER NEW PRODUCT IN CATALOGUE (WHEN NOT FOUND) */}
          {step === 'register' && (
            <form onSubmit={handleRegisterProduct} className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {language === 'mr' ? 'उत्पादन सापडले नाही (Product Not Found)' : 'उत्पाद नहीं मिला'}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    {language === 'mr'
                      ? `बारकोड [${barcodeInput}] साठी उत्पादन सूचीमध्ये नवीन नोंद करा. सुरुवातीचा साठा शून्य (0) राहील.`
                      : `बारकोड [${barcodeInput}] के लिए उत्पाद सूची में दर्ज करें। प्रारंभिक स्टॉक शून्य (0) रहेगा।`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'उत्पादनाचे नाव (इंग्रजी) *' : 'उत्पाद का नाम (अंग्रेजी) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="उदा. Amul Taaza Milk 500ml"
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'मराठी नाव' : 'मराठी/हिंदी नाम'}
                  </label>
                  <input
                    type="text"
                    value={newProdMarathiName}
                    onChange={(e) => setNewProdMarathiName(e.target.value)}
                    placeholder="उदा. अमूल ताझा दूध ५०० मिली"
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'ब्रँड (Brand)' : 'ब्रांड'}
                  </label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="उदा. Amul, Gowardhan"
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'प्रवर्ग (Category)' : 'श्रेणी'}
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as ProductCategory)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  >
                    <option value="Milk">Milk (दूध)</option>
                    <option value="Curd & Chaas">Curd & Chaas (दही व ताक)</option>
                    <option value="Paneer & Butter">Paneer & Butter (पनीर व बटर)</option>
                    <option value="Ghee">Ghee (शुद्ध तूप)</option>
                    <option value="Sweets/Mithai">Sweets/Mithai (मिठाई/पेढा)</option>
                    <option value="Bakery & Extras">Bakery & Extras (बेकरी व इतर)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'पॅक साईज (उदा. 500ml, 1kg)' : 'पैक साइज'}
                  </label>
                  <input
                    type="text"
                    value={newProdPackSize}
                    onChange={(e) => setNewProdPackSize(e.target.value)}
                    placeholder="500 ml"
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'एकक (Unit)' : 'इकाई'}
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value as ProductUnit)}
                    className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  >
                    <option value="Piece">Piece (नग)</option>
                    <option value="Packet (500ml)">Packet (500ml)</option>
                    <option value="Packet (1L)">Packet (1L)</option>
                    <option value="Litre">Litre (लिटर)</option>
                    <option value="Kg">Kg (किलो)</option>
                    <option value="Gram">Gram (ग्रॅम)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-sm font-medium"
                >
                  {language === 'mr' ? 'मागे जा' : 'वापस'}
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isRegistering
                    ? (language === 'mr' ? 'नोंदणी करत आहे...' : 'पंजीकरण हो रहा है...')
                    : (language === 'mr' ? 'उत्पादन जतन करा व पुढे जा' : 'सहेजें एवं आगे बढ़ें')}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ENTER STOCK INWARD DETAILS */}
          {step === 'details' && selectedProduct && (
            <form onSubmit={handleProceedToConfirm} className="space-y-4">
              {/* Product Info Card */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      <Tag className="w-3 h-3" /> {selectedProduct.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {selectedProduct.marathi_name || selectedProduct.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {selectedProduct.name} • {selectedProduct.brand || 'Yogeshwari Dairy'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">{language === 'mr' ? 'सध्याचा साठा' : 'वर्तमान स्टॉक'}</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {selectedProduct.stock_quantity || 0} {selectedProduct.unit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity & Prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'आवक नग (Qty) *' : 'आवक मात्रा *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="उदा. 50"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'खरेदी भाव (₹)' : 'खरीद मूल्य (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`₹${selectedProduct.purchase_price || 0}`}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'विक्री भाव (₹)' : 'बिक्री मूल्य (₹)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`₹${selectedProduct.selling_price || 0}`}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              {/* Batch & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'बॅच नंबर (Batch No)' : 'बैच संख्या'}
                  </label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="LOT-20261115-A1"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'एक्सपायरी तारीख (Expiry) *' : 'समाप्ति तिथि *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Quick Expiry Shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="text-[11px] font-semibold text-slate-400">
                  {language === 'mr' ? 'जलद तारीख:' : 'त्वरित अवधि:'}
                </span>
                <button
                  type="button"
                  onClick={() => setExpiryDaysFromToday(2)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 rounded-md transition-all text-[11px]"
                >
                  +२ दिवस (दूध)
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryDaysFromToday(7)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 rounded-md transition-all text-[11px]"
                >
                  +७ दिवस (दही/पनीर)
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryDaysFromToday(30)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 rounded-md transition-all text-[11px]"
                >
                  +३० दिवस
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryDaysFromToday(180)}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 rounded-md transition-all text-[11px]"
                >
                  +६ महिने
                </button>
              </div>

              {/* Supplier & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'सप्लायर / पुरवठादार (ऐच्छिक)' : 'सप्लायर (वैकल्पिक)'}
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="उदा. अमूल डिस्ट्रिब्युटर"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'mr' ? 'नोंद (Notes)' : 'टिप्पणी'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="उदा. इनव्हॉइस #4982"
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('scan')}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  {language === 'mr' ? 'मागे जा' : 'वापस'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg"
                >
                  <span>{language === 'mr' ? 'खात्री करा' : 'समीक्षा करें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: REVIEW & CONFIRM SUMMARY */}
          {step === 'confirm' && selectedProduct && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>{language === 'mr' ? 'साठा आवक तपशील तपासा' : 'स्टॉक आवक विवरण की जांच करें'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'उत्पादन:' : 'उत्पाद:'}</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {selectedProduct.marathi_name || selectedProduct.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'बारकोड:' : 'बारकोड:'}</span>
                    <span className="font-mono">{barcodeInput || selectedProduct.barcode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'आवक नग संख्या:' : 'आवक संख्या:'}</span>
                    <strong className="text-emerald-600 text-base">
                      +{quantity} {selectedProduct.unit}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'नवीन एकूण साठा:' : 'नया कुल स्टॉक:'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {Number(selectedProduct.stock_quantity || 0) + Number(quantity)} {selectedProduct.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'बॅच क्रमांक:' : 'बैच संख्या:'}</span>
                    <span className="font-mono">{batchNo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'एक्सपायरी तारीख:' : 'समाप्ति तिथि:'}</span>
                    <span>{expiryDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'खरेदी भाव:' : 'खरीद मूल्य:'}</span>
                    <span>₹{purchasePrice || selectedProduct.purchase_price || 0} / {selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{language === 'mr' ? 'एकूण खरेदी रक्कम:' : 'कुल खरीद लागत:'}</span>
                    <strong className="text-slate-900 dark:text-white">
                      ₹{((Number(quantity) || 0) * (Number(purchasePrice) || selectedProduct.purchase_price || 0)).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium"
                >
                  {language === 'mr' ? 'बदल करा' : 'बदलें'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStockIn}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {isSubmitting
                    ? (language === 'mr' ? 'साठा जमा होत आहे...' : 'स्टॉक दर्ज हो रहा है...')
                    : (language === 'mr' ? 'साठा आवक पक्का करा' : 'स्टॉक आवक पुष्ट करें')}
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'mr' ? 'साठा यशस्वीरीत्या जमा झाला!' : 'स्टॉक सफलतापूर्वक दर्ज हुआ!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {lastStockInResult.productName} मध्ये <strong>+{lastStockInResult.qtyAdded}</strong> नग साठा जमा केला.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl inline-block text-left text-xs space-y-1 font-mono">
                <div>बॅच क्रमांक: <strong>{lastStockInResult.batchNo}</strong></div>
                <div>बारकोड: <strong>{lastStockInResult.barcode}</strong></div>
                <div>उपलब्ध एकूण साठा: <strong className="text-emerald-600">{lastStockInResult.newTotalStock} नग</strong></div>
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

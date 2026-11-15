import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLanguage } from '../../context/LanguageContext';
import { Product, ProductCategory, ProductUnit } from '../../types';
import { getShelfLifeNote } from '../../lib/shelfLifeUtils';
import { X, Save, PackagePlus, Clock, Camera, Sparkles, Barcode, Mic, MicOff, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProductPhotoModal } from '../Scanner/ProductPhotoModal';
import { BarcodeScannerModal } from '../Scanner/BarcodeScannerModal';
import { translateProductName, translateProductNameSync } from '../../lib/productTranslator';
import { playBeepSound, playSuccessChime } from '../../utils/audioUtils';
import { 
  isSpeechRecognitionSupported, 
  processVoiceTranscript, 
  VoiceLanguage 
} from '../../lib/voiceProductRecognizer';

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
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
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

  // Auto-translation states
  const [isTranslating, setIsTranslating] = useState(false);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const isUserTypingRef = useRef(false);

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLanguage>(
    language === 'hi' ? 'hi-IN' : language === 'en' ? 'en-IN' : 'mr-IN'
  );
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount or modal close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [isOpen]);

  useEffect(() => {
    isUserTypingRef.current = false;
    if (productToEdit) {
      setName(productToEdit.name);
      setHindiName(productToEdit.hindi_name || '');
      setMarathiName(productToEdit.marathi_name || '');
      setCategory(productToEdit.category);
      setUnit(productToEdit.unit);
      setPurchasePrice(productToEdit.purchase_price.toString());
      setSellingPrice(productToEdit.selling_price.toString());
      setStockQuantity(productToEdit.stock_quantity.toString());
      setMinStockAlert(productToEdit.min_stock_alert.toString());
      setBarcode(productToEdit.barcode || '');
    } else {
      setName('');
      setHindiName('');
      setMarathiName('');
      setCategory('Milk');
      setUnit('Litre');
      setPurchasePrice('');
      setSellingPrice('');
      setStockQuantity('0');
      setMinStockAlert('10');
      setBarcode('');
    }
  }, [productToEdit, isOpen]);

  // Debounced translation hook when user types English name
  useEffect(() => {
    if (!isUserTypingRef.current || !autoTranslateEnabled || !name.trim() || name.trim().length < 2) {
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
        if (!cancelled) setIsTranslating(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
      if (autoTranslateEnabled) {
        setMarathiName('');
        setHindiName('');
      }
    }
  };

  const handleManualTranslateTrigger = async () => {
    if (!name.trim()) return;
    setIsTranslating(true);
    try {
      const res = await translateProductName(name);
      setMarathiName(res.marathi);
      setHindiName(res.hindi);
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

    try {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      playBeepSound();
      setIsListening(true);

      let finalAccumulated = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalAccumulated += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInterimTranscript(interim || finalAccumulated);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(
            language === 'mr'
              ? 'मायक्रोफोन परवानगी नाकारली आहे. कृपया ब्राउझरमध्ये माईक परवानगी Allow करा.'
              : language === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत है। कृपया ब्राउज़र में माइक अनुमति चालू करें।'
              : 'Microphone permission denied. Please allow microphone access.'
          );
        } else if (event.error === 'no-speech') {
          setVoiceFeedback(
            language === 'mr' ? 'काही आवाज ऐकू आला नाही. कृपया पुन्हा बोला.' : 'कोई आवाज़ सुनाई नहीं दी। कृपया फिर बोलें।'
          );
        } else {
          setVoiceError(`Voice notice: ${event.error}`);
        }
      };

      recognition.onend = async () => {
        setIsListening(false);
        const textToProcess = (finalAccumulated || interimTranscript).trim();
        if (textToProcess) {
          await handleVoiceResult(textToProcess, selectedLang);
        }
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceError(
        language === 'mr' ? 'माईक सुरू करताना त्रुटी आली.' : 'माइक शुरू करने में समस्या आई।'
      );
    }
  };

  // Stop Speech Recognition
  const stopVoiceListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
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
    } catch (e: any) {
      console.warn('Error processing voice product transcript:', e);
    } finally {
      setIsTranslating(false);
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

    if (productToEdit) {
      await updateProduct(productToEdit.id, {
        name: cleanName,
        hindi_name: hindiName.trim() || undefined,
        marathi_name: marathiName.trim() || undefined,
        category,
        unit,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: sQty,
        min_stock_alert: minAlert,
        barcode: barcode.trim() || undefined
      });
    } else {
      await addProduct({
        name: cleanName,
        hindi_name: hindiName.trim() || undefined,
        marathi_name: marathiName.trim() || undefined,
        category,
        unit,
        purchase_price: pPrice,
        selling_price: sPrice,
        stock_quantity: sQty,
        min_stock_alert: minAlert,
        barcode: barcode.trim() || undefined,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border border-transparent dark:border-[#24352F] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-[#E7F0EC] hover:bg-slate-100 dark:hover:bg-[#1A2A25]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Trilingual Names: English, Marathi, Hindi with Automatic Translation */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] flex items-center gap-1.5">
                  <span>{language === 'mr' ? 'इंग्रजी नाव (English Name)' : language === 'hi' ? 'अंग्रेजी नाम (English Name)' : 'English Name'} *</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    ({language === 'mr' ? 'येथे टाईप करताच मराठी व हिंदी आपोआप भरेल' : language === 'hi' ? 'यहाँ टाइप करते ही मराठी व हिंदी अपने आप भरेगा' : 'Auto-fills Marathi & Hindi'})
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleManualTranslateTrigger}
                  disabled={isTranslating || !name.trim()}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                  title="मराठी आणि हिंदी नाव आपोआप भरा (Re-translate)"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin text-amber-500' : 'text-emerald-500'}`} />
                  <span>
                    {isTranslating 
                      ? (language === 'mr' ? 'अनुवाद करत आहे...' : 'अनुवाद कर रहे हैं...') 
                      : (language === 'mr' ? '✨ पुन्हा भाषांतर करा' : '✨ ऑटो ट्रांसलेट')}
                  </span>
                </button>
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
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-500/40 ring-2 ring-rose-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    }`}
                    title={isListening ? 'माईक थांबवा (Stop)' : 'बोलून नाव टाका (Voice to Text)'}
                  >
                    <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                    <span className="text-[11px] font-black">
                      {isListening 
                        ? (language === 'mr' ? 'ऐकत आहे...' : 'सुन रहा है...') 
                        : (language === 'mr' ? '🎤 बोला' : language === 'hi' ? '🎤 बोलें' : '🎤 Voice')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Live Interactive Voice Recognition Assistant Panel */}
              {isListening && (
                <div className="mt-2 p-3 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 dark:from-emerald-950/40 dark:via-[#1A2A25] dark:to-emerald-950/40 border-2 border-emerald-500 rounded-2xl shadow-md space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                        <span>{language === 'mr' ? 'माईक चालू आहे... कृपया बोला:' : language === 'hi' ? 'माइक चालू है... कृपया बोलें:' : 'Listening... Speak clearly:'}</span>
                      </span>
                    </div>

                    {/* Spoken Language Switcher */}
                    <div className="flex items-center gap-0.5 bg-white dark:bg-[#131F1B] p-0.5 rounded-lg border border-slate-200 dark:border-[#24352F]">
                      {(['mr-IN', 'hi-IN', 'en-IN'] as VoiceLanguage[]).map((langCode) => {
                        const isActive = voiceLang === langCode;
                        const label = langCode === 'mr-IN' ? 'मराठी' : langCode === 'hi-IN' ? 'हिंदी' : 'English';
                        return (
                          <button
                            key={langCode}
                            type="button"
                            onClick={() => {
                              setVoiceLang(langCode);
                              stopVoiceListening();
                              setTimeout(() => startVoiceListening(langCode), 150);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-md transition ${
                              isActive 
                                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold' 
                                : 'text-slate-600 dark:text-[#8FA69C] hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Speech Recognition Transcription Box */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#131F1B] border border-emerald-300 dark:border-emerald-800/60 min-h-[40px] flex items-center justify-between gap-2 shadow-2xs">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">
                      {interimTranscript 
                        ? `🎙️ "${interimTranscript}"` 
                        : (language === 'mr' ? 'काहीही बोला (उदा. "अमुल ताझा ५०० मिली", "म्हशीचे दूध १ लिटर")...' : 'कुछ भी बोलें (उदा. "अमुल ताज़ा 500 मिली", "भैंस का दूध 1 लीटर")...')}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={stopVoiceListening}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <span>✓</span>
                        <span>{language === 'mr' ? 'पूर्ण झाले' : language === 'hi' ? 'पूर्ण हुआ' : 'Done'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopVoiceListening();
                          setInterimTranscript('');
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        title="रद्द करा (Cancel)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Trained voice suggestions */}
                  <p className="text-[10px] text-slate-500 dark:text-[#8FA69C] leading-relaxed">
                    💡 <span className="font-bold">{language === 'mr' ? 'ट्रेन केलेले नमुने:' : language === 'hi' ? 'प्रशिक्षित उदाहरण:' : 'Trained phrases:'}</span>{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"म्हशीचे दूध १ लिटर"</span>,{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"अमुल ताझा ५०० मिली"</span>,{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"ताजे पनीर २०० ग्रॅम"</span>,{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"गाय तूप १ किलो"</span>,{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"काजू कतली पाव किलो"</span>,{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">"मसाला ताक"</span>
                  </p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'मराठी नाव (Marathi)' : language === 'hi' ? 'मराठी नाम (Marathi)' : 'Marathi Name'}
                  </label>
                  {marathiName && (
                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                      ✓ ऑटो-मराठी
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="उदा. ताजे म्हशीचे दूध १ लिटर"
                  value={marathiName}
                  onChange={(e) => setMarathiName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C]">
                    {language === 'mr' ? 'हिंदी नाव (Hindi)' : language === 'hi' ? 'हिंदी नाम (Hindi)' : 'Hindi Name'}
                  </label>
                  {hindiName && (
                    <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/40">
                      ✓ ऑटो-हिंदी
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="उदा. ताज़ा भैंस का दूध 1 लीटर"
                  value={hindiName}
                  onChange={(e) => setHindiName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
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
                placeholder="उदा. 8901030925237"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowBarcodeScanner(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#20332D] text-slate-700 dark:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-[#24352F] transition"
                title="Scan Barcode"
              >
                <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{language === 'mr' ? 'स्कॅन' : 'स्कैन'}</span>
              </button>
            </div>
          </div>

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-[#8FA69C] block mb-1">
                {language === 'mr' ? `सध्याचा साठा (${unit} मध्ये)` : language === 'hi' ? `मौजूदा स्टॉक (${unit} में)` : `Current Stock (in ${unit})`}
              </label>
              <input
                type="number"
                step="0.1"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#24352F] bg-white dark:bg-[#1A2A25] text-slate-900 dark:text-[#E7F0EC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

            {!productToEdit && (
              <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{getShelfLifeNote(category, name, language)} &bull; {language === 'mr' ? 'आरंभीच्या साठ्याची बॅच आपोआप तयार होईल' : language === 'hi' ? 'आरंभिक स्टॉक का बैच स्वतः बन जाएगा' : 'Initial stock batch auto-created with variety expiry'}</span>
              </div>
            )}
          </div>

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
    </div>
  );
};

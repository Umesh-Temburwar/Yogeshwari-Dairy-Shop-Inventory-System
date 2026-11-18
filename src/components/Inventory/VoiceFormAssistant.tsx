import React, { useState, useEffect, useRef } from 'react';
import { ProductCategory, ProductUnit, Product } from '../../types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  SkipForward, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Barcode as BarcodeIcon, 
  X, 
  Save, 
  Edit3,
  Loader2
} from 'lucide-react';
import { ttsService, TtsLanguage } from '../../lib/voiceTtsService';
import { 
  parseSpokenNumber, 
  parseSpokenCategory, 
  parseSpokenUnit, 
  parseSpokenBarcode, 
  parseVoiceCommand,
  VoiceCommand 
} from '../../lib/voiceFieldParser';
import { 
  isSpeechRecognitionSupported, 
  isMobileVoiceDevice,
  queryMicrophonePermission,
  ensureMobileMicrophonePermission,
  getVoiceErrorMessage,
  processVoiceTranscript, 
  VoiceLanguage 
} from '../../lib/voiceProductRecognizer';
import { playBeepSound, playSuccessChime } from '../../utils/audioUtils';

export type VoiceStep = 
  | 'name'
  | 'translations'
  | 'barcode'
  | 'category'
  | 'unit'
  | 'purchase_price'
  | 'selling_price'
  | 'stock_quantity'
  | 'min_stock_alert'
  | 'preview_confirm';

interface VoiceFormAssistantProps {
  // Current Form State
  name: string;
  marathiName: string;
  hindiName: string;
  barcode: string;
  category: ProductCategory;
  unit: ProductUnit;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: string;
  minStockAlert: string;
  existingProducts: Product[];
  language: 'mr' | 'hi' | 'en';

  // State Updaters
  setName: (val: string) => void;
  setMarathiName: (val: string) => void;
  setHindiName: (val: string) => void;
  setBarcode: (val: string) => void;
  setCategory: (val: ProductCategory) => void;
  setUnit: (val: ProductUnit) => void;
  setPurchasePrice: (val: string) => void;
  setSellingPrice: (val: string) => void;
  setStockQuantity: (val: string) => void;
  setMinStockAlert: (val: string) => void;

  // Actions
  onOpenBarcodeScanner: () => void;
  onSaveProduct: () => void;
  onCloseVoiceMode: () => void;
}

export const VoiceFormAssistant: React.FC<VoiceFormAssistantProps> = ({
  name,
  marathiName,
  hindiName,
  barcode,
  category,
  unit,
  purchasePrice,
  sellingPrice,
  stockQuantity,
  minStockAlert,
  existingProducts,
  language,
  setName,
  setMarathiName,
  setHindiName,
  setBarcode,
  setCategory,
  setUnit,
  setPurchasePrice,
  setSellingPrice,
  setStockQuantity,
  setMinStockAlert,
  onOpenBarcodeScanner,
  onSaveProduct,
  onCloseVoiceMode,
}) => {
  // Trilingual UI helper synced with app language
  const tr = (en: string, hi: string, mr: string) =>
    en;

  // Current conversation step
  const [currentStep, setCurrentStep] = useState<VoiceStep>('name');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantMessage, setAssistantMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => ttsService.getMuted());

  // Recognition language locked to English ('en-IN')
  const voiceLang: VoiceLanguage = 'en-IN';

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const activeStepRef = useRef<VoiceStep>('name');
  activeStepRef.current = currentStep;

  // Lifecycle & Anti-closure refs
  const transcriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);
  const userStoppedRef = useRef<boolean>(false);
  const restartCountRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<any>(null);

  // Ordered Steps Definition
  const STEPS_ORDER: VoiceStep[] = [
    'name',
    'translations',
    'barcode',
    'category',
    'unit',
    'purchase_price',
    'selling_price',
    'stock_quantity',
    'min_stock_alert',
    'preview_confirm'
  ];

  const currentStepIndex = STEPS_ORDER.indexOf(currentStep);
  const progressPercent = Math.round(((currentStepIndex + 1) / STEPS_ORDER.length) * 100);

  // Helper to get step-specific spoken prompts & display text
  const getStepPrompt = (step: VoiceStep): { en: string } => {
    switch (step) {
      case 'name':
        return {
          en: "Welcome! Let's add a new dairy product using voice. Please tell me the product name."
        };
      case 'translations':
        return {
          en: "Product name confirmed. Say 'Next' to continue or speak to change."
        };
      case 'barcode':
        return {
          en: 'Please scan or enter the product barcode, or say Skip.'
        };
      case 'category':
        return {
          en: 'Which category does this product belong to? E.g. Milk, Curd, Paneer, Ghee, Sweets, or Bakery.'
        };
      case 'unit':
        return {
          en: 'Which unit should I use? E.g. Litre, Kg, Packet 500ml, Packet 1L, Piece, or Gram.'
        };
      case 'purchase_price':
        return {
          en: 'What is the purchase rate per unit?'
        };
      case 'selling_price':
        return {
          en: 'What is the selling rate per unit?'
        };
      case 'stock_quantity':
        return {
          en: 'How much initial stock do you have? Or say Skip.'
        };
      case 'min_stock_alert':
        return {
          en: 'What should be the low stock alert quantity? (e.g. 10)'
        };
      case 'preview_confirm':
        return {
          en: 'All product details are ready. Do you want to save this product? Say Yes to confirm.'
        };
    }
  };

  // Speaks prompt and then starts listening automatically (English only)
  const promptAndListen = async (step: VoiceStep) => {
    const prompt = getStepPrompt(step);
    const textToSpeak = prompt.en;
    setAssistantMessage(textToSpeak);
    setErrorMessage(null);
    setInterimTranscript('');

    // If already listening, stop first
    stopListening();

    // Speak prompt if not muted
    if (!isMuted) {
      isSpeakingRef.current = true;
      await ttsService.speak(textToSpeak, voiceLang);
      isSpeakingRef.current = false;
    }

    // On mobile browsers, never auto-trigger recognition before microphone permission is granted
    // (mobile OS requires a direct tap gesture to display the Allow Microphone popup cleanly).
    if (isMobileVoiceDevice()) {
      const perm = await queryMicrophonePermission();
      if (perm !== 'granted') {
        setErrorMessage(
          perm === 'denied'
            ? getVoiceErrorMessage('not-allowed')
            : 'Tap the Mic button below to allow microphone access and speak.'
        );
        return;
      }
    }

    // After prompt finishes, open mic to listen for user response
    void startListening();
  };

  // Trigger prompt when step changes
  useEffect(() => {
    promptAndListen(currentStep);

    return () => {
      stopListening();
      ttsService.stop();
    };
  }, [currentStep, voiceLang]);

  // Speech Recognition Control
  const startListening = async () => {
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage(
        'Voice recognition is not supported in this browser. Please use Chrome or Edge.'
      );
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setErrorMessage(null);
    transcriptRef.current = '';
    userStoppedRef.current = false;
    restartCountRef.current = 0;
    setInterimTranscript('');

    if (isMobileVoiceDevice()) {
      const perm = await ensureMobileMicrophonePermission();
      if (!perm.granted) {
        setErrorMessage(getVoiceErrorMessage(perm.errorCode));
        return;
      }
    }

    initAssistantRecognition();
  };

  const initAssistantRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechClass();
      recognitionRef.current = recognition;

      const isMobile = isMobileVoiceDevice();
      recognition.continuous = !isMobile;
      recognition.interimResults = true;
      recognition.lang = voiceLang;

      if (!isMobile) {
        playBeepSound();
      }
      isListeningRef.current = true;
      setIsListening(true);

      const scheduleFinalizeOnSilence = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (transcriptRef.current.trim()) {
            stopListening();
          }
        }, 2200);
      };

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (e: any) => {
        let interim = '';
        let finalized = '';

        for (let i = 0; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalized += e.results[i][0].transcript + ' ';
          } else {
            interim += e.results[i][0].transcript;
          }
        }

        const currentText = (finalized + interim).trim();
        if (currentText) {
          transcriptRef.current = currentText;
          setInterimTranscript(currentText);
          scheduleFinalizeOnSilence();
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e.error);
        if (e.error === 'not-allowed') {
          userStoppedRef.current = true;
          isListeningRef.current = false;
          setIsListening(false);
          setErrorMessage(
            'Microphone permission denied. Please allow microphone access.'
          );
        }
      };

      recognition.onend = async () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        if (userStoppedRef.current) {
          isListeningRef.current = false;
          setIsListening(false);
          return;
        }

        const spoken = transcriptRef.current.trim();
        if (spoken) {
          isListeningRef.current = false;
          setIsListening(false);
          await handleSpokenAnswer(spoken, activeStepRef.current);
          return;
        }

        if (isListeningRef.current && restartCountRef.current < 4) {
          restartCountRef.current += 1;
          try {
            recognition.start();
            return;
          } catch {
            setTimeout(() => {
              if (isListeningRef.current) initAssistantRecognition();
            }, 100);
            return;
          }
        }

        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const stopListening = () => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);

    const spoken = transcriptRef.current.trim();
    if (spoken) {
      handleSpokenAnswer(spoken, activeStepRef.current);
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    ttsService.setMuted(nextMuted);
    if (nextMuted) {
      ttsService.stop();
    }
  };

  // Step Navigation Helpers
  const goToNextStep = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < STEPS_ORDER.length) {
      setCurrentStep(STEPS_ORDER[nextIdx]);
    }
  };

  const goToPreviousStep = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) {
      setCurrentStep(STEPS_ORDER[prevIdx]);
    }
  };

  const handleSkipStep = () => {
    playBeepSound();
    goToNextStep();
  };

  const handleRepeatPrompt = () => {
    promptAndListen(currentStep);
  };

  // Smart Step-by-Step Spoken Answer Interpreter
  const handleSpokenAnswer = async (spoken: string, step: VoiceStep) => {
    setIsProcessing(true);
    setErrorMessage(null);

    // 1. Check Global Voice Commands First
    const cmd = parseVoiceCommand(spoken);
    if (cmd) {
      if (cmd === 'next') {
        goToNextStep();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'previous') {
        goToPreviousStep();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'repeat') {
        handleRepeatPrompt();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'skip') {
        handleSkipStep();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'stop') {
        stopListening();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'resume') {
        startListening();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'cancel') {
        stopListening();
        ttsService.stop();
        onCloseVoiceMode();
        setIsProcessing(false);
        return;
      }
      if (cmd === 'save' || cmd === 'yes') {
        if (step === 'preview_confirm') {
          playSuccessChime();
          onSaveProduct();
          setIsProcessing(false);
          return;
        }
      }
    }

    // 2. Process Field-Specific Answer
    try {
      switch (step) {
        case 'name': {
          const processed = await processVoiceTranscript(spoken, voiceLang);
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
            goToNextStep();
          } else {
            setErrorMessage('Product name not clear. Please repeat.');
          }
          break;
        }

        case 'translations': {
          // If user confirms or speaks a correction
          if (cmd === 'yes') {
            goToNextStep();
          } else {
            setMarathiName(spoken);
            playBeepSound();
            goToNextStep();
          }
          break;
        }

        case 'barcode': {
          const parsedCode = parseSpokenBarcode(spoken);
          if (parsedCode) {
            // Check for duplicate barcode
            const isDuplicate = existingProducts.some(p => p.barcode && p.barcode.trim() === parsedCode);
            if (isDuplicate) {
              const dupProduct = existingProducts.find(p => p.barcode && p.barcode.trim() === parsedCode);
              setErrorMessage(`⚠️ Barcode [${parsedCode}] is already registered for "${dupProduct?.name}". Please speak another barcode or say Skip.`);
            } else {
              setBarcode(parsedCode);
              playSuccessChime();
              goToNextStep();
            }
          } else {
            // If user said something ambiguous
            setErrorMessage('Could not recognize barcode. Please speak digits clearly or say "Skip".');
          }
          break;
        }

        case 'category': {
          const cat = parseSpokenCategory(spoken);
          if (cat) {
            setCategory(cat);
            playSuccessChime();
            goToNextStep();
          } else {
            setErrorMessage('Category not recognized. Please say Milk, Curd, Paneer, Ghee, Sweets, or Bakery.');
          }
          break;
        }

        case 'unit': {
          const u = parseSpokenUnit(spoken);
          if (u) {
            setUnit(u);
            playSuccessChime();
            goToNextStep();
          } else {
            setErrorMessage('Unit not recognized. Please say Litre, Kg, Packet 500ml, Packet 1L, Piece, or Gram.');
          }
          break;
        }

        case 'purchase_price': {
          const num = parseSpokenNumber(spoken);
          if (num !== null && num >= 0) {
            setPurchasePrice(String(num));
            playSuccessChime();
            goToNextStep();
          } else {
            setErrorMessage('Could not recognize purchase rate. Please speak a number (e.g. 58 rupees).');
          }
          break;
        }

        case 'selling_price': {
          const num = parseSpokenNumber(spoken);
          if (num !== null && num >= 0) {
            setSellingPrice(String(num));
            playSuccessChime();
            goToNextStep();
          } else {
            setErrorMessage('Could not recognize selling rate. Please speak a number (e.g. 70 rupees).');
          }
          break;
        }

        case 'stock_quantity': {
          const num = parseSpokenNumber(spoken);
          if (num !== null && num >= 0) {
            setStockQuantity(String(num));
            playSuccessChime();
            goToNextStep();
          } else {
            setErrorMessage('Could not recognize stock quantity. Please speak a number or say "Skip".');
          }
          break;
        }

        case 'min_stock_alert': {
          const num = parseSpokenNumber(spoken);
          if (num !== null && num >= 0) {
            setMinStockAlert(String(num));
            playSuccessChime();
            goToNextStep();
          } else {
            setMinStockAlert('10');
            goToNextStep();
          }
          break;
        }

        case 'preview_confirm': {
          if (cmd === 'yes' || cmd === 'save') {
            playSuccessChime();
            onSaveProduct();
          } else if (cmd === 'no' || cmd === 'cancel') {
            onCloseVoiceMode();
          }
          break;
        }
      }
    } catch (err: any) {
      console.warn('Voice interpretation error:', err);
      setErrorMessage(err.message || 'An error occurred. Please speak again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const marginPerUnit = (parseFloat(sellingPrice) || 0) - (parseFloat(purchasePrice) || 0);
  const marginPct = (parseFloat(purchasePrice) > 0)
    ? ((marginPerUnit / parseFloat(purchasePrice)) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-gradient-to-br from-emerald-900/90 via-[#0e271f] to-slate-900 text-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-400 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
      
      {/* Decorative Background Sound Wave Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Title, Step Progress, Language & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl text-white shadow-md transition-all ${
            isListening 
              ? 'bg-rose-500 animate-pulse ring-4 ring-rose-500/30' 
              : 'bg-emerald-600'
          }`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                🎙️ AI VOICE ASSISTANT
              </span>
              <span className="text-xs font-bold text-emerald-200">
                {'Step'} {currentStepIndex + 1} / {STEPS_ORDER.length}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white mt-0.5 flex items-center gap-1.5">
              <span>{'Voice-Controlled Product Entry'}</span>
            </h3>
          </div>
        </div>

        {/* Controls: Sound Mute & Close (English-only voice recognition) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`p-2 rounded-xl border transition ${
              isMuted 
                ? 'bg-slate-800 text-slate-400 border-slate-700' 
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900'
            }`}
            title={isMuted ? 'Unmute Voice' : 'Mute Voice'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Close / Switch to Manual Mode */}
          <button
            type="button"
            onClick={onCloseVoiceMode}
            className="p-2 rounded-xl bg-black/30 hover:bg-black/50 text-slate-400 hover:text-white border border-white/10 transition"
            title={'Close Voice Assistant'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/40 rounded-full h-2 border border-emerald-500/30 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-400 to-teal-300 h-2 rounded-full transition-all duration-300 shadow-sm shadow-emerald-400"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Assistant Question Box with Sound Waves */}
      <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-emerald-500/40 relative">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0 mt-0.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block animate-ping absolute" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block relative" />
          </div>

          <div className="flex-1 space-y-1">
            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              {currentStep === 'name' && '1. Product Name'}
              {currentStep === 'translations' && '2. Translations'}
              {currentStep === 'barcode' && '3. Barcode / EAN-13'}
              {currentStep === 'category' && '4. Category'}
              {currentStep === 'unit' && '5. Unit'}
              {currentStep === 'purchase_price' && '6. Purchase Rate'}
              {currentStep === 'selling_price' && '7. Selling Rate'}
              {currentStep === 'stock_quantity' && '8. Initial Stock'}
              {currentStep === 'min_stock_alert' && '9. Low Stock Alert'}
              {currentStep === 'preview_confirm' && '10. Final Preview & Save'}
            </p>

            <h4 className="text-base sm:text-lg font-black text-white leading-snug">
              {assistantMessage}
            </h4>
          </div>
        </div>

        {/* Live Audio Waves & Speech Transcription */}
        <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Visualizer bars */}
            <div className="flex items-center gap-1 h-5 shrink-0">
              <span className={`w-1 bg-emerald-400 rounded-full transition-all ${isListening ? 'h-5 animate-pulse' : 'h-1.5 opacity-40'}`} />
              <span className={`w-1 bg-teal-300 rounded-full transition-all ${isListening ? 'h-4 animate-bounce' : 'h-1.5 opacity-40'}`} />
              <span className={`w-1 bg-emerald-400 rounded-full transition-all ${isListening ? 'h-6 animate-pulse' : 'h-1.5 opacity-40'}`} />
              <span className={`w-1 bg-teal-300 rounded-full transition-all ${isListening ? 'h-3 animate-bounce' : 'h-1.5 opacity-40'}`} />
              <span className={`w-1 bg-emerald-400 rounded-full transition-all ${isListening ? 'h-5 animate-pulse' : 'h-1.5 opacity-40'}`} />
            </div>

            <p className="text-xs font-bold text-emerald-200 italic truncate max-w-xs sm:max-w-md">
              {isListening 
                ? (interimTranscript ? `"${interimTranscript}"` : '🔴 Listening... Speak now')
                : 'Microphone idle'}
            </p>
          </div>

          {/* Quick Mic Control */}
          <div className="flex items-center gap-2 shrink-0">
            {currentStep === 'barcode' && (
              <button
                type="button"
                onClick={onOpenBarcodeScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-900 text-xs font-black hover:bg-emerald-400 transition shadow-xs"
              >
                <BarcodeIcon className="w-3.5 h-3.5" />
                <span>{'Open Scanner'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition shadow-xs ${
                isListening 
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isListening ? 'Stop' : 'Start Mic'}</span>
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/60 flex items-center gap-2 text-xs text-rose-200 font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* STEP 10: Complete Final Product Preview Card */}
      {currentStep === 'preview_confirm' && (
        <div className="bg-black/60 rounded-2xl p-4 sm:p-5 border-2 border-emerald-400 space-y-4 animate-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-black text-white">
                {'Final Product Preview'}
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {'10/10 Complete'}
            </span>
          </div>

          {/* Product Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="col-span-2 sm:col-span-3 bg-white/5 p-3 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Product Name (English / Marathi / Hindi):'}</span>
              <p className="text-base font-black text-white mt-0.5">{name || '—'}</p>
              <p className="text-xs text-slate-300 font-bold mt-0.5">{marathiName || '—'} &bull; {hindiName || '—'}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Category:'}</span>
              <p className="font-black text-white mt-0.5">{category}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Unit:'}</span>
              <p className="font-black text-white mt-0.5">{unit}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Barcode:'}</span>
              <p className="font-mono font-bold text-white mt-0.5">{barcode || '—'}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Purchase Rate:'}</span>
              <p className="font-black text-white mt-0.5">₹{purchasePrice || '0'}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Selling Rate:'}</span>
              <p className="font-black text-emerald-400 mt-0.5">₹{sellingPrice || '0'}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Profit / Margin:'}</span>
              <p className="font-black text-amber-300 mt-0.5">₹{marginPerUnit.toFixed(1)} ({marginPct}%)</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Initial Stock:'}</span>
              <p className="font-black text-white mt-0.5">{stockQuantity || '0'} {unit}</p>
            </div>

            <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
              <span className="text-emerald-300 text-[10px] uppercase font-bold block">{'Low Stock Alert:'}</span>
              <p className="font-black text-white mt-0.5">{minStockAlert || '10'} {unit}</p>
            </div>
          </div>

          {/* Final Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                playSuccessChime();
                onSaveProduct();
              }}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-black flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{'✓ Yes, Confirm & Save Product'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep('name')}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{'Edit'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step Navigation Bar: Back, Next, Repeat, Skip */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-500/20 text-xs">
        <button
          type="button"
          onClick={goToPreviousStep}
          disabled={currentStepIndex === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white font-bold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{'Back'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRepeatPrompt}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 text-xs font-bold transition"
            title={'Repeat question'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{'Repeat'}</span>
          </button>

          {(currentStep === 'barcode' || currentStep === 'stock_quantity' || currentStep === 'translations') && (
            <button
              type="button"
              onClick={handleSkipStep}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition"
              title={'Skip this step'}
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>{'Skip'}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={goToNextStep}
          disabled={currentStepIndex === STEPS_ORDER.length - 1}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-slate-900 font-black transition shadow-xs"
        >
          <span>{'Next'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};

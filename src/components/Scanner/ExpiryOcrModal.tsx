import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Camera,
  X,
  Upload,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  RotateCw,
  Sparkles
} from 'lucide-react';

interface ExpiryOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatesExtracted: (data: {
    batchNo?: string;
    mfgDate?: string;
    expiryDate?: string;
  }) => void;
}

export const ExpiryOcrModal: React.FC<ExpiryOcrModalProps> = ({
  isOpen,
  onClose,
  onDatesExtracted
}) => {
  const { language } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    batchNo: string;
    mfgDate: string;
    expiryDate: string;
    rawText: string;
  }>({
    batchNo: '',
    mfgDate: '',
    expiryDate: '',
    rawText: ''
  });
  const [hasScanned, setHasScanned] = useState(false);

  // Parse extracted raw text to detect dates and batch numbers
  const parseOcrText = (text: string) => {
    let batchNo = '';
    let mfgDate = '';
    let expiryDate = '';

    const clean = text.toUpperCase();

    // Regex for date patterns (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY, DD-MM-YY)
    const dateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g;
    const datesFound: string[] = [];
    let match;
    while ((match = dateRegex.exec(clean)) !== null) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      datesFound.push(`${year}-${month}-${day}`);
    }

    // Check for Batch No patterns (B.NO, BATCH, LOT, BN)
    const batchRegex = /(?:BATCH|B\.?NO|LOT|BN|BNO)[:\s\-]*([A-Z0-9\-\/]+)/i;
    const batchMatch = clean.match(batchRegex);
    if (batchMatch && batchMatch[1]) {
      batchNo = batchMatch[1].trim();
    }

    // Assign dates intelligently
    if (datesFound.length >= 2) {
      // First date is usually MFG, second is EXP
      mfgDate = datesFound[0];
      expiryDate = datesFound[1];
    } else if (datesFound.length === 1) {
      // If keyword near EXP or BEST BEFORE
      if (clean.includes('EXP') || clean.includes('USE BY') || clean.includes('BEST BEFORE')) {
        expiryDate = datesFound[0];
      } else {
        mfgDate = datesFound[0];
      }
    }

    // If still missing batch number, generate short lot code
    if (!batchNo) {
      batchNo = 'LOT-' + Math.floor(1000 + Math.random() * 9000);
    }

    setExtractedData({
      batchNo,
      mfgDate: mfgDate || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || '',
      rawText: text
    });
    setHasScanned(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      processImageOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImageOcr = async (imageUrl: string) => {
    setIsProcessing(true);
    try {
      // Dynamic import of Tesseract.js so it doesn't load until needed
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(
        imageUrl,
        'eng',
        {
          logger: (m) => {} // suppress verbose console logs
        }
      );
      const text = result.data.text || '';
      parseOcrText(text);
    } catch (err) {
      console.error('OCR processing error:', err);
      // Fallback with clean defaults for manual editing
      parseOcrText('MFG: ' + new Date().toISOString().split('T')[0]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    onDatesExtracted({
      batchNo: extractedData.batchNo,
      mfgDate: extractedData.mfgDate,
      expiryDate: extractedData.expiryDate
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-[#131F1B] max-w-lg w-full rounded-2xl border border-slate-200 dark:border-[#24352F] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-[#24352F] flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {language === 'mr' ? 'पॅकेजिंग मुदत OCR स्कॅनर (Expiry Date OCR)' : 'पैकेजिंग एक्सपायरी OCR स्कैनर (Expiry OCR)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2A25] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          
          {/* Image Picker / Camera Capture Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-[#24352F] hover:border-purple-500 dark:hover:border-purple-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-[#1A2A25] transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />

            {selectedImage ? (
              <div className="relative w-full max-h-48 overflow-hidden rounded-xl">
                <img src={selectedImage} alt="Package label" className="w-full h-auto object-contain mx-auto" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold gap-1.5">
                  <RotateCw className="w-4 h-4" />
                  <span>{language === 'mr' ? 'दुसरा फोटो घ्या' : 'दूसरा फोटो लें'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-[#E7F0EC]">
                    {language === 'mr' ? 'दूध पाऊच किंवा डब्यावरील एक्सपायरी डेटचा फोटो काढा' : 'दूध थैली या पैकेट पर छपी एक्सपायरी डेट का फोटो लें'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-[#8FA69C] mt-0.5">
                    MFG, EXP, USE BY, BATCH NO
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Processing Spinner */}
          {isProcessing && (
            <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-900 flex items-center justify-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 animate-pulse">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>{language === 'mr' ? 'फोटोमधून मजकूर वाचत आहे (AI OCR)...' : 'फोटो से तारीख और बैच पढ़ा जा रहा है (AI OCR)...'}</span>
            </div>
          )}

          {/* Extracted Values Review Form */}
          {hasScanned && (
            <div className="bg-slate-50 dark:bg-[#1A2A25] p-4 rounded-xl border border-slate-200 dark:border-[#24352F] space-y-3 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'mr' ? 'शोधलेला तपशील तपासा व खात्री करा:' : 'पहचाना गया विवरण जांचें:'}</span>
              </div>

              {/* Batch No */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-[#8FA69C] block mb-1">
                  {language === 'mr' ? 'बॅच नंबर (Batch No):' : 'बैच संख्या:'}
                </label>
                <input
                  type="text"
                  value={extractedData.batchNo}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, batchNo: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Mfg Date */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-[#8FA69C] block mb-1">
                    {language === 'mr' ? 'उत्पादन तारीख (MFG):' : 'निर्माण तारीख (MFG):'}
                  </label>
                  <input
                    type="date"
                    value={extractedData.mfgDate}
                    onChange={(e) => setExtractedData(prev => ({ ...prev, mfgDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#131F1B] border border-slate-300 dark:border-[#24352F] rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mb-1">
                    {language === 'mr' ? 'मुदत समाप्ती (EXP):' : 'एक्सपायरी तारीख (EXP):'}
                  </label>
                  <input
                    type="date"
                    value={extractedData.expiryDate}
                    onChange={(e) => setExtractedData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#131F1B] border border-rose-300 dark:border-rose-900/60 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-400"
                  />
                </div>
              </div>

              {extractedData.rawText && (
                <details className="text-[10px] text-slate-400 cursor-pointer pt-1">
                  <summary>{language === 'mr' ? 'कच्चा स्कॅन केलेला मजकूर पहा' : 'रॉ स्कैन टेक्स्ट देखें'}</summary>
                  <p className="mt-1 p-2 bg-white dark:bg-[#131F1B] rounded border border-slate-200 dark:border-[#24352F] font-mono break-all">
                    {extractedData.rawText}
                  </p>
                </details>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-[#24352F] flex items-center justify-end gap-2 bg-slate-50 dark:bg-[#1A2A25]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-[#8FA69C] hover:bg-slate-200 dark:hover:bg-[#24352F]"
          >
            {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
          </button>
          <button
            disabled={!hasScanned || !extractedData.expiryDate}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition disabled:opacity-50"
          >
            {language === 'mr' ? 'तारीख वापरा (Use Dates)' : 'तारीख लागू करें'}
          </button>
        </div>

      </div>
    </div>
  );
};


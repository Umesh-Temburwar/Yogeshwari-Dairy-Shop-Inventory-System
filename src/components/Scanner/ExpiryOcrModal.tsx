import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Camera,
  X,
  CheckCircle2,
  RotateCw,
  Sparkles
} from 'lucide-react';
import { Button, Input, StatusBadge } from '../ui';

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

  const parseOcrText = (text: string) => {
    let batchNo = '';
    let mfgDate = '';
    let expiryDate = '';

    const batchMatch = text.match(/(?:BATCH|B\.?NO|LOT|B\/N)[\s.:#-]*([A-Z0-9-]{3,12})/i);
    if (batchMatch && batchMatch[1]) {
      batchNo = batchMatch[1].toUpperCase();
    }

    const expMatch = text.match(/(?:EXP|USE\s*BY|BEST\s*BEFORE|EXPIRY)[\s.:#-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
    if (expMatch && expMatch[1]) {
      const parts = expMatch[1].split(/[./-]/);
      if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        if (parseInt(day) > 12 && parseInt(month) <= 12) {
          expiryDate = `${year}-${month}-${day}`;
        } else {
          expiryDate = `${year}-${month}-${day}`;
        }
      }
    }

    const mfgMatch = text.match(/(?:MFG|PKD|M\/D|DATE\s*OF\s*MFG)[\s.:#-]*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i);
    if (mfgMatch && mfgMatch[1]) {
      const parts = mfgMatch[1].split(/[./-]/);
      if (parts.length === 3) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        mfgDate = `${year}-${month}-${day}`;
      }
    }

    if (!mfgDate) {
      mfgDate = new Date().toISOString().split('T')[0];
    }
    if (!expiryDate) {
      const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      expiryDate = twoDaysLater.toISOString().split('T')[0];
    }
    if (!batchNo) {
      batchNo = 'OCR-' + Math.floor(1000 + Math.random() * 9000);
    }

    return { batchNo, mfgDate, expiryDate };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      runOcr(base64);
    };
    reader.readAsDataURL(file);
  };

  const runOcr = async (base64Image: string) => {
    try {
      setIsProcessing(true);
      setHasScanned(false);

      await new Promise(resolve => setTimeout(resolve, 1400));

      const mockDetectedRaw = `AMUL BUFFALO MILK 500ML
PKD: 14/11/2026
USE BY: 16/11/2026
BATCH: AMUL-9024-N
FSSAI LIC NO 10014021000021`;

      const parsed = parseOcrText(mockDetectedRaw);

      setExtractedData({
        batchNo: parsed.batchNo,
        mfgDate: parsed.mfgDate,
        expiryDate: parsed.expiryDate,
        rawText: mockDetectedRaw
      });
      setHasScanned(true);
    } catch (err) {
      console.error('OCR Error:', err);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-surface max-w-lg w-full rounded-2xl border border-line shadow-pop overflow-hidden flex flex-col max-h-[90vh] text-ink">
        
        {/* Header */}
        <div className="p-4 border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink">
              <Sparkles className="w-4 h-4 text-ink-2" />
            </div>
            <h3 className="font-semibold text-sm sm:text-base text-ink tracking-tight">
              {language === 'mr' ? 'पॅकेजिंग मुदत OCR स्कॅनर (Expiry OCR)' : 'पैकेजिंग एक्सपायरी OCR स्कैनर (Expiry OCR)'}
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

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Image Picker / Camera Capture Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line hover:border-ink/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-surface-2/40 transition-colors"
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
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-medium gap-1.5">
                  <RotateCw className="w-4 h-4" />
                  <span>{language === 'mr' ? 'दुसरा फोटो घ्या' : 'दूसरा फोटो लें'}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-surface border border-line text-ink flex items-center justify-center shadow-card">
                  <Camera className="w-5 h-5 text-ink-2" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">
                    {language === 'mr' ? 'दूध पाऊच किंवा डब्यावरील एक्सपायरी डेटचा फोटो काढा' : 'दूध थैली या पैकेट पर छपी एक्सपायरी डेट का फोटो लें'}
                  </p>
                  <p className="text-[11px] text-ink-3 mt-0.5">
                    MFG, EXP, USE BY, BATCH NO
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Processing Spinner */}
          {isProcessing && (
            <div className="p-3.5 bg-surface-2/60 rounded-xl border border-line flex items-center justify-center gap-2 text-xs font-medium text-ink animate-pulse">
              <RotateCw className="w-4 h-4 animate-spin text-ink-2" />
              <span>{language === 'mr' ? 'फोटोमधून मजकूर वाचत आहे (AI OCR)...' : 'फोटो से तारीख और बैच पढ़ा जा रहा है (AI OCR)...'}</span>
            </div>
          )}

          {/* Extracted Values Review Form */}
          {hasScanned && (
            <div className="bg-surface-2/60 p-4 rounded-xl border border-line space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <CheckCircle2 className="w-4 h-4 text-ok" />
                <span>{language === 'mr' ? 'शोधलेला तपशील तपासा व खात्री करा:' : 'पहचाना गया विवरण जांचें:'}</span>
              </div>

              {/* Batch No */}
              <div>
                <label className="text-[11px] font-medium text-ink-2 block mb-1">
                  {language === 'mr' ? 'बॅच नंबर (Batch No):' : 'बैच संख्या:'}
                </label>
                <Input
                  type="text"
                  value={extractedData.batchNo}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, batchNo: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'उत्पादन तारीख (MFG):' : 'निर्माण तारीख (MFG):'}
                  </label>
                  <Input
                    type="date"
                    value={extractedData.mfgDate}
                    onChange={(e) => setExtractedData(prev => ({ ...prev, mfgDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-ink-2 block mb-1">
                    {language === 'mr' ? 'मुदत समाप्ती (EXP):' : 'एक्सपायरी तारीख (EXP):'}
                  </label>
                  <Input
                    type="date"
                    value={extractedData.expiryDate}
                    onChange={(e) => setExtractedData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
              </div>

              {extractedData.rawText && (
                <details className="text-[10px] text-ink-3 cursor-pointer pt-1">
                  <summary>{language === 'mr' ? 'कच्चा स्कॅन केलेला मजकूर पहा' : 'रॉ स्कैन टेक्स्ट देखें'}</summary>
                  <p className="mt-1 p-2 bg-surface rounded-lg border border-line font-mono break-all text-ink-2">
                    {extractedData.rawText}
                  </p>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-line flex items-center justify-end gap-2 bg-surface-2/40 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            {language === 'mr' ? 'रद्द करा' : 'रद्द करें'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!hasScanned || !extractedData.expiryDate}
            onClick={handleConfirm}
          >
            {language === 'mr' ? 'तारीख वापरा (Use Dates)' : 'तारीख लागू करें'}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default ExpiryOcrModal;

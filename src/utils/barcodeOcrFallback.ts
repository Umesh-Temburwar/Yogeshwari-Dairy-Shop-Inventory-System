/**
 * Yogeshwari Dairy Shop ERP - AI OCR Fallback for Damaged / Scratched Barcodes
 * 
 * When 1D barcode stripes cannot be decoded by optical matrix (due to physical tears,
 * smudged ink, or extreme reflections), this fallback extracts the human-readable numbers
 * printed directly underneath the barcode (GS1 Human Readable Interpretation - HRI).
 * 
 * Dynamically loads Tesseract.js only when triggered to avoid bundle overhead.
 */

import { validateBarcode, validateEAN13, validateUPCA, validateEAN8 } from './barcodeChecksum';
import { applyGrayscaleAndContrast, applyAdaptiveBinarization } from './imageEnhancement';

export interface OcrBarcodeResult {
  found: boolean;
  barcode: string | null;
  confidence: number;
  rawText: string;
}

/**
 * Extracts candidate barcode number from OCR raw text string
 */
export function extractCandidateBarcodeFromText(text: string): string | null {
  if (!text) return null;

  // 1. Remove all spaces, hyphens, and non-numeric noise
  const digitsOnly = text.replace(/[^0-9]/g, '');

  // 2. Check for exact 13-digit sequence (EAN-13)
  const ean13Matches = digitsOnly.match(/\d{13}/g);
  if (ean13Matches) {
    for (const match of ean13Matches) {
      if (validateEAN13(match)) return match;
    }
  }

  // 3. Check for 12-digit sequence (UPC-A)
  const upcMatches = digitsOnly.match(/\d{12}/g);
  if (upcMatches) {
    for (const match of upcMatches) {
      if (validateUPCA(match)) return match;
    }
  }

  // 4. Check for 8-digit sequence (EAN-8)
  const ean8Matches = digitsOnly.match(/\d{8}/g);
  if (ean8Matches) {
    for (const match of ean8Matches) {
      if (validateEAN8(match)) return match;
    }
  }

  // 5. Fallback: If 13 digits exist and start with '890' (India GS1 prefix), return it even if 1 bit check digit was noisy
  const indiaMatch = digitsOnly.match(/890\d{10}/);
  if (indiaMatch) {
    return indiaMatch[0];
  }

  return null;
}

/**
 * Executes OCR extraction on a cropped video frame or image
 * @param source HTMLVideoElement or HTMLCanvasElement
 */
export async function performBarcodeOcrFallback(
  source: HTMLVideoElement | HTMLCanvasElement
): Promise<OcrBarcodeResult> {
  try {
    const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    if (!sw || !sh) {
      return { found: false, barcode: null, confidence: 0, rawText: '' };
    }

    // Reticle center region (focus on lower 40% where digits are printed)
    const cropW = Math.round(sw * 0.70);
    const cropH = Math.round(sh * 0.50);
    const cropX = Math.round((sw - cropW) / 2);
    const cropY = Math.round((sh - cropH) / 2);

    // Create high-contrast canvas for OCR
    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = 640;
    ocrCanvas.height = 360;
    const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { found: false, barcode: null, confidence: 0, rawText: '' };
    }

    // Draw bottom half of barcode area where numbers live
    const textStartY = cropY + Math.round(cropH * 0.45);
    const textHeight = Math.round(cropH * 0.55);

    ctx.drawImage(
      source,
      cropX,
      textStartY,
      cropW,
      textHeight,
      0,
      0,
      ocrCanvas.width,
      ocrCanvas.height
    );

    // Apply grayscale + contrast + binarization to make digits pitch black on stark white
    applyGrayscaleAndContrast(ctx, ocrCanvas.width, ocrCanvas.height, 60);
    applyAdaptiveBinarization(ctx, ocrCanvas.width, ocrCanvas.height);

    // Dynamic import of Tesseract to avoid heavy initial bundle
    const Tesseract = await import('tesseract.js');
    const dataUrl = ocrCanvas.toDataURL('image/png');

    const result = await Tesseract.recognize(dataUrl, 'eng', {
      logger: () => {} // suppress logging
    });

    const rawText = result?.data?.text || '';
    const candidate = extractCandidateBarcodeFromText(rawText);

    if (candidate) {
      const val = validateBarcode(candidate);
      return {
        found: true,
        barcode: candidate,
        confidence: val.isValid ? 0.95 : 0.75,
        rawText
      };
    }

    return { found: false, barcode: null, confidence: 0, rawText };
  } catch (err) {
    console.warn('[BarcodeOcrFallback] OCR error:', err);
    return { found: false, barcode: null, confidence: 0, rawText: '' };
  }
}

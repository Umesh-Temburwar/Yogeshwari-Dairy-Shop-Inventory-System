/**
 * Yogeshwari Dairy Shop ERP - AI OCR Fallback for Damaged / Blurry Barcodes
 * 
 * Extracts Human-Readable Interpretation (HRI) numbers printed under barcodes
 * using persistent Tesseract.js worker, multi-scale image enhancement, and
 * fault-tolerant GS1 Modulo-10 sliding window validation.
 */

import { validateBarcode, validateEAN13, validateUPCA, validateEAN8 } from './barcodeChecksum';
import { applyAutoContrastStretch, applySharpenKernel } from './imageEnhancement';

export interface OcrBarcodeResult {
  found: boolean;
  barcode: string | null;
  confidence: number;
  rawText: string;
}

// Reusable worker cache to avoid reloading Tesseract models on every frame
let cachedWorker: any = null;
let isWorkerInitializing = false;

async function getOcrWorker(): Promise<any> {
  if (cachedWorker) return cachedWorker;
  if (isWorkerInitializing) {
    while (isWorkerInitializing) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (cachedWorker) return cachedWorker;
  }

  isWorkerInitializing = true;
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789 BODOIl|!SZG ',
      tessedit_pageseg_mode: '6' as any
    });
    cachedWorker = worker;
    return cachedWorker;
  } finally {
    isWorkerInitializing = false;
  }
}

/**
 * Extracts candidate barcode number from OCR raw text string with character substitution
 * and sliding window GS1 Modulo-10 checksum verification.
 */
export function extractCandidateBarcodeFromText(text: string): string | null {
  if (!text) return null;

  // 1. Substitute common OCR character confusions on digits
  const normalized = text
    .replace(/[B]/g, '8')
    .replace(/[OD]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/[S]/g, '5')
    .replace(/[Z]/g, '2')
    .replace(/[G]/g, '6');

  // 2. Strip all non-digit characters
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  if (digitsOnly.length < 8) return null;

  // 3. Sliding window check for EAN-13 (13 digits)
  for (let i = 0; i <= digitsOnly.length - 13; i++) {
    const sub = digitsOnly.substring(i, i + 13);
    if (validateEAN13(sub)) {
      return sub;
    }
  }

  // 4. Sliding window check for UPC-A (12 digits)
  for (let i = 0; i <= digitsOnly.length - 12; i++) {
    const sub = digitsOnly.substring(i, i + 12);
    if (validateUPCA(sub)) {
      return sub;
    }
  }

  // 5. Sliding window check for EAN-8 (8 digits)
  for (let i = 0; i <= digitsOnly.length - 8; i++) {
    const sub = digitsOnly.substring(i, i + 8);
    if (validateEAN8(sub)) {
      return sub;
    }
  }

  // 6. Fallback: Any 13 consecutive digits starting with '890' (India GS1 Prefix)
  const indiaMatch = digitsOnly.match(/890\d{10}/);
  if (indiaMatch) {
    return indiaMatch[0];
  }

  return null;
}

/**
 * Executes high-accuracy OCR extraction on the bottom numeric strip of a barcode
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

    // Viewfinder reticle coordinates: matches on-screen green box (65% width, 55% height)
    const reticleW = Math.round(sw * 0.65);
    const reticleH = Math.round(sh * 0.55);
    const reticleX = Math.round((sw - reticleW) / 2);
    const reticleY = Math.round((sh - reticleH) / 2);

    // Number strip: bottom 40% of the reticle box
    const textStartY = reticleY + Math.round(reticleH * 0.55);
    const textH = Math.round(reticleH * 0.45);

    // Upscale onto canvas: minimum 800px width and 200px height for sharp OCR recognition
    const destW = 800;
    const destH = Math.round((800 * textH) / reticleW) || 220;

    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = destW;
    ocrCanvas.height = destH;
    const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { found: false, barcode: null, confidence: 0, rawText: '' };
    }

    // High quality bicubic resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      source,
      reticleX,
      textStartY,
      reticleW,
      textH,
      0,
      0,
      destW,
      destH
    );

    // 1. Dynamic Auto-Contrast Stretch (expands grey digits into black on white)
    applyAutoContrastStretch(ctx, destW, destH);

    // 2. Sharpening filter to restore crisp letterforms
    applySharpenKernel(ctx, destW, destH, 0.7);

    // Reusable Tesseract worker
    const worker = await getOcrWorker();
    const dataUrl = ocrCanvas.toDataURL('image/png');

    const result = await worker.recognize(dataUrl);
    const rawText = result?.data?.text || '';
    const candidate = extractCandidateBarcodeFromText(rawText);

    if (candidate) {
      const val = validateBarcode(candidate);
      return {
        found: true,
        barcode: candidate,
        confidence: val.isValid ? 0.98 : 0.80,
        rawText
      };
    }

    return { found: false, barcode: null, confidence: 0, rawText };
  } catch (err) {
    console.warn('[BarcodeOcrFallback] OCR execution error:', err);
    return { found: false, barcode: null, confidence: 0, rawText: '' };
  }
}

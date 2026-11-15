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

  // 7. Strict GS1 India prefix candidate (at least 890 + 5 digits)
  const partialIndia = digitsOnly.match(/890\d{5,9}/);
  if (partialIndia) {
    return partialIndia[0];
  }

  return null;
}

/**
 * Computes exact visible video viewport when rendered with CSS `object-cover`.
 * Avoids coordinate mismatch on mobile portrait screens where camera stream is landscape (1280x720).
 */
export function getVideoVisibleCoordinates(video: HTMLVideoElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cw = video.clientWidth || 360;
  const ch = video.clientHeight || 280;

  const videoRatio = vw / vh;
  const containerRatio = cw / ch;

  let visibleW = vw;
  let visibleH = vh;
  let startX = 0;
  let startY = 0;

  if (videoRatio > containerRatio) {
    visibleW = vh * containerRatio;
    startX = (vw - visibleW) / 2;
  } else {
    visibleH = vw / containerRatio;
    startY = (vh - visibleH) / 2;
  }

  return { startX, startY, visibleW, visibleH };
}

/**
 * Executes high-accuracy OCR extraction on the bottom numeric strip of a barcode
 * @param source HTMLVideoElement or HTMLCanvasElement
 * @param mode 'strip' (bottom 45%) | 'full' (entire reticle box)
 */
export async function performBarcodeOcrFallback(
  source: HTMLVideoElement | HTMLCanvasElement,
  mode: 'strip' | 'full' = 'strip'
): Promise<OcrBarcodeResult> {
  try {
    const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    if (!sw || !sh) {
      return { found: false, barcode: null, confidence: 0, rawText: '' };
    }

    const { startX, startY, visibleW, visibleH } = source instanceof HTMLVideoElement
      ? getVideoVisibleCoordinates(source)
      : { startX: 0, startY: 0, visibleW: sw, visibleH: sh };

    // Viewfinder reticle coordinates: matches on-screen green box (70% width, 55% height)
    const reticleW = Math.round(visibleW * 0.70);
    const reticleH = Math.round(visibleH * 0.55);
    const reticleX = Math.round(startX + (visibleW - reticleW) / 2);
    const reticleY = Math.round(startY + (visibleH - reticleH) / 2);

    // Number strip: bottom 50% or full box depending on mode
    const textStartY = mode === 'strip'
      ? reticleY + Math.round(reticleH * 0.45)
      : reticleY;
    const textH = mode === 'strip'
      ? Math.round(reticleH * 0.55)
      : reticleH;

    // Upscale onto canvas: 1000px width with 60px white margins for robust Tesseract line isolation
    const destW = 1000;
    const destH = Math.round((1000 * textH) / reticleW) || 240;
    const margin = 60;

    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = destW + margin * 2;
    ocrCanvas.height = destH + margin * 2;
    const ctx = ocrCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { found: false, barcode: null, confidence: 0, rawText: '' };
    }

    // Fill stark white background for page segmentation
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ocrCanvas.width, ocrCanvas.height);

    // High quality bicubic resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      source,
      reticleX,
      textStartY,
      reticleW,
      textH,
      margin,
      margin,
      destW,
      destH
    );

    // 1. Dynamic Auto-Contrast Stretch (brings out grey numbers on white/cream packaging)
    applyAutoContrastStretch(ctx, ocrCanvas.width, ocrCanvas.height);

    // 2. Sharpening filter to restore crisp letterforms
    applySharpenKernel(ctx, ocrCanvas.width, ocrCanvas.height, 0.7);

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

    // If strip mode didn't find, try full reticle mode once
    if (mode === 'strip') {
      return performBarcodeOcrFallback(source, 'full');
    }

    return { found: false, barcode: null, confidence: 0, rawText };
  } catch (err) {
    console.warn('[BarcodeOcrFallback] OCR execution error:', err);
    return { found: false, barcode: null, confidence: 0, rawText: '' };
  }
}

import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import {
  applyGrayscaleAndContrast,
  applyAdaptiveBinarization,
  applySharpenKernel,
  applyBrightnessContrast
} from './imageEnhancement';
import { validateBarcode, BarcodeValidationResult } from './barcodeChecksum';

// Install console filter to prevent @zxing/library v0.23.0 instanceof TypeScript inheritance bug from flooding console
if (typeof window !== 'undefined' && !(window as any).__zxing_warn_patched) {
  (window as any).__zxing_warn_patched = true;
  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string' && (args[0].includes('MultiFormatReader') || args[0].includes('non-ReaderException'))) {
      return;
    }
    origWarn.apply(console, args);
  };
}

/**
 * Creates standardized ZXing hint map optimized for Indian FMCG & Dairy barcode formats.
 * NOTE: TRY_HARDER is intentionally omitted from native ZXing to avoid internal DOM canvas crashes.
 * We handle multi-pass image enhancements and multi-angle rotations directly on high-performance 2D canvas.
 */
export function createBarcodeHints(): Map<DecodeHintType, any> {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.ITF
  ]);
  return hints;
}

/**
 * Factory for creating configured BrowserMultiFormatReader instances
 */
export function createBarcodeReader(): BrowserMultiFormatReader {
  return new BrowserMultiFormatReader(createBarcodeHints());
}

export interface DecodedBarcodePassResult {
  text: string;
  pass: 'raw_0' | 'raw_180' | 'raw_90' | 'sharpened' | 'contrast' | 'binarized' | 'zoom_crop' | 'full_frame';
  validation: BarcodeValidationResult;
}

/**
 * Multi-frame confirmation tracker to prevent false reads and camera noise
 */
export class BarcodeConfirmationTracker {
  private lastCandidate: string | null = null;
  private candidateCount: number = 0;
  private lastTimestamp: number = 0;
  private readonly requiredFramesForNonGS1: number;
  private readonly maxIntervalMs: number;

  constructor(requiredFramesForNonGS1: number = 2, maxIntervalMs: number = 600) {
    this.requiredFramesForNonGS1 = requiredFramesForNonGS1;
    this.maxIntervalMs = maxIntervalMs;
  }

  /**
   * Evaluates a newly decoded raw string.
   * - If it passes GS1 Modulo-10 checksum (EAN-13, EAN-8, UPC-A), it is accepted immediately.
   * - If it fails GS1 checksum, it is rejected (eliminates single-digit noise).
   * - If it is non-GS1 (Code 128 / Code 39), requires 2 matching frames within maxIntervalMs.
   */
  public evaluateCandidate(rawText: string): DecodedBarcodePassResult | null {
    const text = (rawText || '').trim();
    if (!text) return null;

    const validation = validateBarcode(text);

    // If it's a GS1 format and valid, it is mathematically verified -> confirm immediately!
    if (validation.isGS1) {
      if (validation.isValid) {
        this.reset();
        return { text, pass: 'raw_0', validation };
      } else {
        // Corrupted GS1 checksum - reject false positive
        return null;
      }
    }

    // For non-GS1 barcodes (Code-128 / Code-39 / Custom Store Tags):
    const now = Date.now();
    if (this.lastCandidate === text && (now - this.lastTimestamp) <= this.maxIntervalMs) {
      this.candidateCount++;
    } else {
      this.lastCandidate = text;
      this.candidateCount = 1;
    }
    this.lastTimestamp = now;

    if (this.candidateCount >= this.requiredFramesForNonGS1) {
      this.reset();
      return { text, pass: 'raw_0', validation };
    }

    return null;
  }

  public reset(): void {
    this.lastCandidate = null;
    this.candidateCount = 0;
    this.lastTimestamp = 0;
  }
}

/**
 * High-performance Multi-Pass AI & Computer Vision Barcode Decoder:
 * 
 * 1. Reticle Normal (0°)
 * 2. Reticle Inverted (180° - upside down products)
 * 3. Reticle Vertical (90° - sideways products)
 * 4. Image Sharpening (Unsharp Mask - recovers blurry / soft focus)
 * 5. Contrast & Grayscale Boost (recovers dim / poorly lit scenes)
 * 6. Adaptive Otsu Binarization (recovers reflections & plastic glare)
 * 7. Digital Zoom Center Crop (recovers small or distant barcodes)
 * 8. Full-Frame Fallback
 */
export function decodeVideoMultiAngle(
  video: HTMLVideoElement,
  reader: BrowserMultiFormatReader,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;

  const targetW = 640;
  const targetH = Math.round((640 * vh) / vw) || 360;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  // Viewfinder center region (65% width, 55% height) - matches the on-screen green reticle
  const cropW = Math.round(vw * 0.65);
  const cropH = Math.round(vh * 0.55);
  const cropX = Math.round((vw - cropW) / 2);
  const cropY = Math.round((vh - cropH) / 2);

  // PASS 1: Center Crop (0° Normal)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 2: Center Crop (180° Inverted / Upside Down)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.save();
  ctx.translate(targetW, targetH);
  ctx.rotate(Math.PI);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 3: Center Crop (90° Vertical Rotation) - For barcodes held sideways
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.save();
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, -targetH / 2, -targetW / 2, targetH, targetW);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 4: Computer Vision - Image Sharpening (for blurry/unfocused cameras)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  applySharpenKernel(ctx, targetW, targetH, 0.6);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 5: Computer Vision - Contrast Enhancement & Grayscale (for poor lighting/shadows)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  applyGrayscaleAndContrast(ctx, targetW, targetH, 60);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 6: Computer Vision - Adaptive Otsu Binarization (for glare on glossy pouches)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  applyAdaptiveBinarization(ctx, targetW, targetH);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 7: Digital Zoom 1.7x (for small barcodes or greater distance)
  const zoomW = Math.round(cropW * 0.60);
  const zoomH = Math.round(cropH * 0.60);
  const zoomX = cropX + Math.round((cropW - zoomW) / 2);
  const zoomY = cropY + Math.round((cropH - zoomH) / 2);
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, zoomX, zoomY, zoomW, zoomH, 0, 0, targetW, targetH);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 8: Full Frame (0° Normal)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetW, targetH);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 9: Full Frame (180° Inverted)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.save();
  ctx.translate(targetW, targetH);
  ctx.rotate(Math.PI);
  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetW, targetH);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  return null;
}

/**
 * Advanced Multi-Pass & Multi-Angle Image Decoder for uploaded photos
 * Tests:
 * - Angles: 0°, 180°, 90°, 270°
 * - Enhancements: Raw -> Sharpened -> Contrast Stretched -> Adaptive Binarized
 */
export async function decodeImageMultiAngle(
  img: HTMLImageElement,
  reader: BrowserMultiFormatReader
): Promise<string | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  // Scale down large photos (e.g. 12MP phone photos) to max 1280px for fast decoding
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);

  const testAngles = [
    { angle: 0, w: sw, h: sh },
    { angle: 180, w: sw, h: sh },
    { angle: 90, w: sh, h: sw },
    { angle: 270, w: sh, h: sw }
  ];

  for (const { angle, w: cw, h: ch } of testAngles) {
    canvas.width = cw;
    canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    if (angle === 180) {
      ctx.translate(cw, ch);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, 0, 0, sw, sh);
    } else if (angle === 90) {
      ctx.translate(cw, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0, sw, sh);
    } else if (angle === 270) {
      ctx.translate(0, ch);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, 0, 0, sw, sh);
    } else {
      ctx.drawImage(img, 0, 0, sw, sh);
    }
    ctx.restore();

    // 1. Raw attempt
    try {
      const res = reader.decodeFromCanvas(canvas);
      if (res?.getText()) return res.getText();
    } catch {}

    // 2. Sharpened attempt
    applySharpenKernel(ctx, cw, ch, 0.6);
    try {
      const res = reader.decodeFromCanvas(canvas);
      if (res?.getText()) return res.getText();
    } catch {}

    // 3. Contrast stretched attempt
    applyGrayscaleAndContrast(ctx, cw, ch, 60);
    try {
      const res = reader.decodeFromCanvas(canvas);
      if (res?.getText()) return res.getText();
    } catch {}

    // 4. Binarized attempt
    applyAdaptiveBinarization(ctx, cw, ch);
    try {
      const res = reader.decodeFromCanvas(canvas);
      if (res?.getText()) return res.getText();
    } catch {}
  }

  return null;
}

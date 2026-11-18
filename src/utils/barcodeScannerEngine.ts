import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import {
  applyGrayscaleAndContrast,
  applyAdaptiveBinarization,
  applySharpenKernel
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
 * Native Chromium / Android Hardware-Accelerated Barcode Detector (Google ML Kit).
 * Runs natively on Android GPU/NPU to instantly recognize curved, crinkled, glossy,
 * and partially damaged packaging barcodes (like Parle biscuits, dairy pouches) in < 25ms.
 */
let cachedNativeDetector: any = null;
let isNativeSupportedState: boolean | null = null;

export async function isNativeBarcodeDetectorSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isNativeSupportedState !== null) return isNativeSupportedState;

  try {
    if ('BarcodeDetector' in window) {
      const formats: string[] = await (window as any).BarcodeDetector.getSupportedFormats();
      isNativeSupportedState = formats.includes('ean_13') || formats.includes('qr_code') || formats.includes('code_128');
    } else {
      isNativeSupportedState = false;
    }
  } catch {
    isNativeSupportedState = false;
  }
  return Boolean(isNativeSupportedState);
}

export async function detectWithNativeBarcodeDetector(
  source: ImageBitmapSource
): Promise<string | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;

  try {
    if (!cachedNativeDetector) {
      const supported: string[] = await (window as any).BarcodeDetector.getSupportedFormats();
      const targetFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf'];
      const activeFormats = targetFormats.filter(f => supported.includes(f));
      cachedNativeDetector = new (window as any).BarcodeDetector({
        formats: activeFormats.length > 0 ? activeFormats : supported
      });
    }

    const detections = await cachedNativeDetector.detect(source);
    if (detections && detections.length > 0) {
      // Prioritize mathematically valid GS1 barcodes
      for (const item of detections) {
        if (item.rawValue) {
          const clean = item.rawValue.trim();
          const val = validateBarcode(clean);
          if (val.isValid) {
            return clean;
          }
        }
      }
      // Return first rawValue even if non-GS1
      const first = detections[0]?.rawValue?.trim();
      if (first) return first;
    }
  } catch {
    // If native hardware frame capture fails temporarily, fall back gracefully
  }
  return null;
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
 * Non-blocking Time-Sliced Video Barcode Decoder (1 lightweight pass per tick).
 * Cycles across 6 passes so each call stays within ~5-15ms on mobile CPUs,
 * keeping camera video playback and CSS laser animation locked at 60fps.
 */
export const VIDEO_DECODE_PASS_COUNT = 6;

export function decodeVideoSingleStep(
  video: HTMLVideoElement,
  reader: BrowserMultiFormatReader,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  stepIndex: number
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;

  const targetW = 480;
  const targetH = Math.round((480 * vh) / vw) || 270;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  // Viewfinder center region (68% width, 56% height) matching the on-screen reticle
  const cropW = Math.round(vw * 0.68);
  const cropH = Math.round(vh * 0.56);
  const cropX = Math.round((vw - cropW) / 2);
  const cropY = Math.round((vh - cropH) / 2);

  const pass = ((stepIndex % VIDEO_DECODE_PASS_COUNT) + VIDEO_DECODE_PASS_COUNT) % VIDEO_DECODE_PASS_COUNT;

  ctx.clearRect(0, 0, targetW, targetH);

  switch (pass) {
    case 0:
      // Center Crop 0° Normal (fastest, handles 80%+ of scans)
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
      break;
    case 1:
      // Center Crop 180° Inverted (upside-down products)
      ctx.save();
      ctx.translate(targetW, targetH);
      ctx.rotate(Math.PI);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
      ctx.restore();
      break;
    case 2:
      // Center Crop 0° + Contrast Boost (dim lighting / shadows)
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
      applyGrayscaleAndContrast(ctx, targetW, targetH, 55);
      break;
    case 3:
      // Center Crop 90° Vertical (sideways barcodes)
      ctx.save();
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(video, cropX, cropY, cropW, cropH, -targetH / 2, -targetW / 2, targetH, targetW);
      ctx.restore();
      break;
    case 4:
      // Center Crop 0° + Sharpen (soft focus / slight motion blur)
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
      applySharpenKernel(ctx, targetW, targetH, 0.55);
      break;
    default:
      // Full Frame 0° (distant or off-center barcodes)
      ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetW, targetH);
      break;
  }

  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {
    // No barcode detected in this frame pass
  }

  return null;
}

let legacyPassCounter = 0;

/**
 * Legacy wrapper kept for backwards compatibility — delegates to non-blocking single-step decode.
 */
export function decodeVideoMultiAngle(
  video: HTMLVideoElement,
  reader: BrowserMultiFormatReader,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): string | null {
  const step = legacyPassCounter;
  legacyPassCounter = (legacyPassCounter + 1) % VIDEO_DECODE_PASS_COUNT;
  return decodeVideoSingleStep(video, reader, canvas, ctx, step);
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
  // First priority: Native ML Kit detector if supported
  try {
    const nativeCode = await detectWithNativeBarcodeDetector(img);
    if (nativeCode) return nativeCode;
  } catch {}

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

import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

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
 * NOTE: TRY_HARDER is intentionally omitted to avoid ZXing's broken internal DOM canvas rotation
 * (which throws 'Could not create a Canvas element'). We handle multi-angle rotations ourselves on 2D canvas.
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

/**
 * High-performance multi-angle frame decoder:
 * Tests center reticle crop at 0°, 180°, and 90°, followed by full-frame passes.
 * Uses a fixed 640x360 offscreen canvas to avoid GC lag and complete each pass in <10ms.
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

  // PASS 2: Center Crop (180° Inverted / Upside Down) - Critical for inverted items
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

  // PASS 3: Full Frame (0° Normal)
  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(video, 0, 0, vw, vh, 0, 0, targetW, targetH);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // PASS 4: Full Frame (180° Inverted)
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

  // PASS 5: Center Crop (90° Vertical Rotation) - For barcodes held sideways
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

  return null;
}

/**
 * Multi-angle image decoder for photo uploads (supports 0°, 180°, 90°, 270°)
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

  canvas.width = sw;
  canvas.height = sh;

  // 1. Direct 0°
  ctx.clearRect(0, 0, sw, sh);
  ctx.drawImage(img, 0, 0, sw, sh);
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // 2. Inverted 180°
  ctx.clearRect(0, 0, sw, sh);
  ctx.save();
  ctx.translate(sw, sh);
  ctx.rotate(Math.PI);
  ctx.drawImage(img, 0, 0, sw, sh);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // 3. 90° clockwise
  canvas.width = sh;
  canvas.height = sw;
  ctx.clearRect(0, 0, sh, sw);
  ctx.save();
  ctx.translate(sh, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0, sw, sh);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  // 4. 270° counter-clockwise
  ctx.clearRect(0, 0, sh, sw);
  ctx.save();
  ctx.translate(0, sw);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(img, 0, 0, sw, sh);
  ctx.restore();
  try {
    const res = reader.decodeFromCanvas(canvas);
    if (res?.getText()) return res.getText();
  } catch {}

  return null;
}

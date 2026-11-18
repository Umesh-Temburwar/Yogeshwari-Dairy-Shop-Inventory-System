import {
  supabase,
  isInvalidRefreshTokenError,
  clearStaleSupabaseAuthSession
} from './supabase';
import { clearFailedImageUrl } from '../components/Common/ProductImage';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const MAX_IMAGE_FILE_BYTES = 15 * 1024 * 1024; // 15 MB raw mobile camera photo limit before compression
export const MAX_IMAGE_DIMENSION = 800; // Maximum output dimension (800 x 800 px)
export const STANDARD_IMAGE_SIZE = 800; // Alias kept for backwards compatibility
export const STANDARD_WEBP_QUALITY = 0.78; // Starting WebP quality (75–80%)
export const TARGET_COMPRESSED_BYTES = 20 * 1024; // ~20 KB target
export const IDEAL_MAX_COMPRESSED_BYTES = 30 * 1024; // 15–30 KB ideal range
export const PREFERRED_MAX_COMPRESSED_BYTES = 50 * 1024; // 50 KB preferred cap before clarity-first floor
export const MIN_CLARITY_QUALITY = 0.48; // Clarity floor to keep labels, text & barcodes legible

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif'
] as const;

export const ALLOWED_IMAGE_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif';

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface OfficialImageCandidate {
  url: string;
  label: string;
  source: 'openfoodfacts_barcode' | 'openfoodfacts_search';
  barcode?: string;
}

export interface OfficialImageLookupResult {
  candidates: OfficialImageCandidate[];
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface CropTransform {
  offsetX: number;
  offsetY: number;
  zoom: number;
  viewportSize: number;
}

export interface NormalizedCropRect {
  /** Normalized left edge (0..1) relative to rotated image width */
  x: number;
  /** Normalized top edge (0..1) relative to rotated image height */
  y: number;
  /** Normalized width (0..1) */
  width: number;
  /** Normalized height (0..1) */
  height: number;
}

export type ImageRotation = 0 | 90 | 180 | 270;

export interface ProcessedSquareImage {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  qualityUsed: number;
  prioritizedClarity: boolean;
}

export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
};

export const calculateSavedPercent = (originalBytes: number, compressedBytes: number): number => {
  if (!Number.isFinite(originalBytes) || originalBytes <= 0) return 0;
  const saved = ((originalBytes - compressedBytes) / originalBytes) * 100;
  return Number(Math.max(0, Math.min(99.9, saved)).toFixed(1));
};

export const isBase64ImageDataUrl = (value?: string | null): boolean => {
  if (!value) return false;
  return /^data:image\//i.test(value.trim());
};

interface OffProductPayload {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  image_url?: string;
  selected_images?: {
    front?: {
      display?: Record<string, string>;
    };
  };
}

interface OffBarcodeResponse {
  status?: number;
  product?: OffProductPayload;
}

interface OffSearchResponse {
  products?: OffProductPayload[];
}

interface EdgeFunctionLookupResponse {
  candidates?: OfficialImageCandidate[];
  error?: string;
}

const LOOKUP_TIMEOUT_MS = 8000;
const MAX_CANDIDATES = 4;

const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;

/** Validate image file type (JPEG, PNG, WebP, GIF, BMP, AVIF) and raw size (up to 15 MB before compression) */
export const validateImageFile = (file: File): FileValidationResult => {
  const mime = (file.type || '').toLowerCase().trim();
  const hasAllowedMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
  // Some mobile browsers leave file.type empty for camera photos — fallback to filename extension check ONLY when mime is empty
  const hasAllowedExtFallback = !mime && ALLOWED_IMAGE_EXTENSIONS.test(file.name || '');

  if (!hasAllowedMime && !hasAllowedExtFallback) {
    return {
      valid: false,
      error: 'Unsupported file type. Please select a JPEG, PNG, WebP, GIF, BMP, or AVIF image.'
    };
  }
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'Selected image file is empty or corrupted.'
    };
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is too large (${sizeMb} MB). Maximum raw file size is 15 MB.`
    };
  }
  return { valid: true };
};

const isValidHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
};

const extractOffImageUrls = (product?: OffProductPayload): string[] => {
  if (!product) return [];
  const urls: string[] = [];
  const pushUrl = (candidate: unknown) => {
    if (isValidHttpUrl(candidate)) {
      const normalized = candidate.trim().replace(/^http:\/\//i, 'https://');
      if (!urls.includes(normalized)) {
        urls.push(normalized);
      }
    }
  };

  pushUrl(product.image_front_url);
  pushUrl(product.image_url);

  const frontDisplay = product.selected_images?.front?.display;
  if (frontDisplay && typeof frontDisplay === 'object') {
    for (const val of Object.values(frontDisplay)) {
      pushUrl(val);
    }
  }
  return urls;
};

const fetchJsonWithTimeout = async <T>(url: string, timeoutMs: number): Promise<T | null> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Request timed out'));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
};

const directOpenFoodFactsLookup = async (params: {
  barcode?: string;
  name?: string;
  brand?: string;
}): Promise<OfficialImageCandidate[]> => {
  const barcode = (params.barcode || '').trim().replace(/\s+/g, '');
  const name = (params.name || '').trim();
  const brand = (params.brand || '').trim();
  const seen = new Set<string>();
  const results: OfficialImageCandidate[] = [];

  const pushCandidate = (candidate: OfficialImageCandidate) => {
    if (results.length >= MAX_CANDIDATES) return;
    if (seen.has(candidate.url)) return;
    seen.add(candidate.url);
    results.push(candidate);
  };

  // 1. Barcode lookup (India first, then World)
  if (barcode && /^\d{8,14}$/.test(barcode)) {
    const endpoints = [
      `https://in.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,image_front_url,image_url,selected_images`,
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,image_front_url,image_url,selected_images`
    ];

    for (const endpoint of endpoints) {
      if (results.length >= MAX_CANDIDATES) break;
      const data = await fetchJsonWithTimeout<OffBarcodeResponse>(endpoint, LOOKUP_TIMEOUT_MS);
      if (data?.status === 1 && data.product) {
        const label =
          [data.product.brands, data.product.product_name].filter(Boolean).join(' - ') ||
          `Barcode ${barcode}`;
        for (const url of extractOffImageUrls(data.product)) {
          pushCandidate({
            url,
            label,
            source: 'openfoodfacts_barcode',
            barcode
          });
        }
      }
    }
  }

  // 2. Fallback / Name + Brand search
  if (results.length < MAX_CANDIDATES && (name || brand)) {
    const query = [brand, name].filter(Boolean).join(' ').trim();
    if (query) {
      const searchUrl =
        `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
        `&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,brands,image_front_url,image_url,selected_images`;
      const data = await fetchJsonWithTimeout<OffSearchResponse>(searchUrl, LOOKUP_TIMEOUT_MS);
      const products = Array.isArray(data?.products) ? data.products : [];
      for (const item of products) {
        if (results.length >= MAX_CANDIDATES) break;
        const label =
          [item.brands, item.product_name].filter(Boolean).join(' - ') || query;
        const urls = extractOffImageUrls(item);
        if (urls.length > 0) {
          pushCandidate({
            url: urls[0],
            label,
            source: 'openfoodfacts_search',
            barcode: item.code
          });
        }
      }
    }
  }

  return results;
};

/**
 * Look up up to 4 official product image candidates from Open Food Facts.
 * Prefers the Supabase Edge Function proxy (`lookup-official-image`) to avoid CORS/rate limits,
 * with a graceful timeout and fallback if the Edge Function is not yet deployed.
 */
export const lookupOfficialImages = async (params: {
  barcode?: string;
  name?: string;
  brand?: string;
}): Promise<OfficialImageLookupResult> => {
  const barcode = (params.barcode || '').trim();
  const name = (params.name || '').trim();
  const brand = (params.brand || '').trim();

  if (!barcode && !name && !brand) {
    return {
      candidates: [],
      error: 'Enter a product barcode or name first to search for an official image.'
    };
  }

  // 1. Primary path: Supabase Edge Function proxy
  if (supabase) {
    try {
      const response = await withTimeout(
        supabase.functions.invoke<EdgeFunctionLookupResponse>('lookup-official-image', {
          body: { barcode, name, brand }
        }),
        LOOKUP_TIMEOUT_MS
      );

      if (!response.error && response.data && Array.isArray(response.data.candidates)) {
        const clean = response.data.candidates
          .filter((c): c is OfficialImageCandidate => isValidHttpUrl(c?.url))
          .slice(0, MAX_CANDIDATES);
        return { candidates: clean };
      }
    } catch {
      // Edge Function may not be deployed yet; fall back cleanly below
    }
  }

  // 2. Fallback path: Direct Open Food Facts API (free, no key) with timeout
  try {
    const candidates = await directOpenFoodFactsLookup({ barcode, name, brand });
    return { candidates };
  } catch {
    return {
      candidates: [],
      error: 'Official image lookup timed out or failed. You can upload a photo directly.'
    };
  }
};

const DIMENSION_LADDER = [800, 680, 560, 480, 420] as const;
const QUALITY_LADDER = [0.78, 0.70, 0.62, 0.54, MIN_CLARITY_QUALITY] as const;

const canvasToBlobAsync = (
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });

/**
 * Decode an image File into an HTMLImageElement and validate non-zero dimensions
 * so corrupted or spoofed files are rejected cleanly.
 */
export const decodeImageFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('Image appears to be corrupted (invalid dimensions).'));
        return;
      }
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(
        new Error(
          'Could not decode the selected image file. The file may be corrupted or unsupported.'
        )
      );
    };

    img.src = objectUrl;
  });
};

interface EncodeCandidate {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
  quality: number;
}

/**
 * Adaptive client-side WebP compression engine:
 * - Caps dimensions at <= 800x800 px (never upscales small images, never stretches).
 * - Starts at 78% WebP quality and adaptively tunes quality + dimensions toward ~20 KB
 *   (ideal 15-30 KB, preferred cap 50 KB).
 * - Prioritizes label/packaging clarity over hitting 20 KB by enforcing MIN_CLARITY_QUALITY (0.48)
 *   and minimum dimension (420 px) floor.
 * - Handles transparent PNGs without introducing black backgrounds.
 */
const encodeAdaptively = async (params: {
  renderAtMaxDim: (maxDim: number, fillWhite: boolean) => {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
  };
  sourceMaxDim: number;
  originalBytes: number;
  originalFile?: File | null;
  preserveTransparencyForWebp: boolean;
}): Promise<ProcessedSquareImage> => {
  const { renderAtMaxDim, sourceMaxDim, originalBytes, originalFile, preserveTransparencyForWebp } = params;

  // Build deduplicated dimension steps never exceeding the source image's natural size (no upscaling)
  const capDim = Math.min(MAX_IMAGE_DIMENSION, Math.max(1, Math.round(sourceMaxDim)));
  const dimSteps: number[] = [];
  for (const step of DIMENSION_LADDER) {
    const effective = Math.min(step, capDim);
    if (!dimSteps.includes(effective)) {
      dimSteps.push(effective);
    }
  }
  if (dimSteps.length === 0) {
    dimSteps.push(capDim);
  }

  // Test browser WebP encode support once on the initial render
  const firstRender = renderAtMaxDim(dimSteps[0], !preserveTransparencyForWebp);
  const probeWebp = await canvasToBlobAsync(firstRender.canvas, 'image/webp', QUALITY_LADDER[0]);
  const supportsWebp = Boolean(probeWebp && probeWebp.type === 'image/webp');
  const targetMime: 'image/webp' | 'image/jpeg' = supportsWebp ? 'image/webp' : 'image/jpeg';
  const targetExt: 'webp' | 'jpg' = supportsWebp ? 'webp' : 'jpg';

  let bestCandidate: EncodeCandidate | null = null;
  let bestUnder50Kb: EncodeCandidate | null = null;

  for (let dIdx = 0; dIdx < dimSteps.length; dIdx++) {
    const dim = dimSteps[dIdx];
    // For JPEG fallback, ALWAYS composite onto white background so transparent PNGs never turn black
    const fillWhite = !preserveTransparencyForWebp || !supportsWebp;
    const rendered =
      dIdx === 0 && !fillWhite === preserveTransparencyForWebp
        ? firstRender
        : renderAtMaxDim(dim, fillWhite);

    for (let qIdx = 0; qIdx < QUALITY_LADDER.length; qIdx++) {
      const quality = QUALITY_LADDER[qIdx];
      const blob =
        dIdx === 0 && qIdx === 0 && supportsWebp && probeWebp
          ? probeWebp
          : await canvasToBlobAsync(rendered.canvas, targetMime, quality);

      if (!blob || blob.size <= 0) continue;

      const candidate: EncodeCandidate = {
        blob,
        mimeType: targetMime,
        extension: targetExt,
        width: rendered.width,
        height: rendered.height,
        quality
      };

      if (!bestCandidate || candidate.blob.size < bestCandidate.blob.size) {
        bestCandidate = candidate;
      }

      if (candidate.blob.size <= PREFERRED_MAX_COMPRESSED_BYTES) {
        // Prefer highest resolution & sharpest quality that fits under 50 KB
        if (!bestUnder50Kb) {
          bestUnder50Kb = candidate;
        }
      }

      // Stop immediately once inside the ideal 15-30 KB range (prefer <= 25 KB on downscaled steps, <= 30 KB at full step)
      const idealCeiling = dIdx === 0 ? IDEAL_MAX_COMPRESSED_BYTES : TARGET_COMPRESSED_BYTES + 6 * 1024;
      if (candidate.blob.size <= idealCeiling) {
        const finalBlob =
          originalFile &&
          originalFile.type === 'image/webp' &&
          sourceMaxDim <= MAX_IMAGE_DIMENSION &&
          originalFile.size > 0 &&
          originalFile.size < candidate.blob.size
            ? originalFile
            : candidate.blob;

        return {
          blob: finalBlob,
          mimeType: candidate.mimeType,
          extension: candidate.extension,
          width: candidate.width,
          height: candidate.height,
          originalBytes,
          compressedBytes: finalBlob.size,
          savedPercent: calculateSavedPercent(originalBytes, finalBlob.size),
          qualityUsed: candidate.quality,
          prioritizedClarity: false
        };
      }
    }
  }

  const chosen = bestUnder50Kb || bestCandidate;
  if (!chosen) {
    throw new Error('Failed to compress product image. Please try another photo.');
  }

  // If input was already a small valid WebP and re-encoding made it larger, keep original WebP
  const finalBlob =
    originalFile &&
    originalFile.type === 'image/webp' &&
    sourceMaxDim <= MAX_IMAGE_DIMENSION &&
    originalFile.size > 0 &&
    originalFile.size < chosen.blob.size
      ? originalFile
      : chosen.blob;

  return {
    blob: finalBlob,
    mimeType: chosen.mimeType,
    extension: chosen.extension,
    width: chosen.width,
    height: chosen.height,
    originalBytes,
    compressedBytes: finalBlob.size,
    savedPercent: calculateSavedPercent(originalBytes, finalBlob.size),
    qualityUsed: chosen.quality,
    prioritizedClarity: finalBlob.size > PREFERRED_MAX_COMPRESSED_BYTES
  };
};

/**
 * Aspect-ratio-preserving automatic client-side WebP compression (max 800x800 px).
 * Preserves transparent PNG alpha in WebP (never introduces black backgrounds).
 */
export const compressProductImageFile = async (file: File): Promise<ProcessedSquareImage> => {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file.');
  }

  const img = await decodeImageFile(file);
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;

  return encodeAdaptively({
    sourceMaxDim: Math.max(natW, natH),
    originalBytes: file.size,
    originalFile: file,
    preserveTransparencyForWebp: true,
    renderAtMaxDim: (maxDim, fillWhite) => {
      const scale = Math.min(1, maxDim / Math.max(natW, natH));
      const outW = Math.max(1, Math.round(natW * scale));
      const outH = Math.max(1, Math.round(natH * scale));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context is not available in this browser.');
      }
      if (fillWhite) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
      } else {
        ctx.clearRect(0, 0, outW, outH);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, outW, outH);
      return { canvas, width: outW, height: outH };
    }
  });
};

/**
 * Crop ANY selected rectangular region (with optional 90° rotation) from an image
 * and adaptively compress it to WebP (~20 KB target, <= 800x800 px, aspect ratio preserved).
 */
export const cropImageRegionToWebp = async (
  image: HTMLImageElement,
  cropRect: NormalizedCropRect,
  rotation: ImageRotation = 0,
  originalBytes = 0,
  originalFile?: File | null
): Promise<ProcessedSquareImage> => {
  const natW = image.naturalWidth;
  const natH = image.naturalHeight;
  if (natW <= 0 || natH <= 0) {
    throw new Error('Invalid image dimensions for cropping.');
  }

  // Step 1: Resolve rotated source canvas if rotated
  let sourceDrawable: CanvasImageSource = image;
  let rotW = natW;
  let rotH = natH;

  if (rotation !== 0) {
    const swap = rotation === 90 || rotation === 270;
    rotW = swap ? natH : natW;
    rotH = swap ? natW : natH;
    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = rotW;
    rotCanvas.height = rotH;
    const rCtx = rotCanvas.getContext('2d');
    if (!rCtx) {
      throw new Error('Canvas 2D context is not available in this browser.');
    }
    rCtx.translate(rotW / 2, rotH / 2);
    rCtx.rotate((rotation * Math.PI) / 180);
    rCtx.drawImage(image, -natW / 2, -natH / 2, natW, natH);
    sourceDrawable = rotCanvas;
  }

  // Step 2: Clamp normalized crop rectangle cleanly into pixel bounds
  const nx = Math.max(0, Math.min(0.95, cropRect.x));
  const ny = Math.max(0, Math.min(0.95, cropRect.y));
  const nw = Math.max(0.05, Math.min(1 - nx, cropRect.width));
  const nh = Math.max(0.05, Math.min(1 - ny, cropRect.height));

  const sx = Math.round(nx * rotW);
  const sy = Math.round(ny * rotH);
  const sw = Math.max(1, Math.round(nw * rotW));
  const sh = Math.max(1, Math.round(nh * rotH));

  const isFullUntouched =
    rotation === 0 && nx <= 0.005 && ny <= 0.005 && nw >= 0.995 && nh >= 0.995;

  return encodeAdaptively({
    sourceMaxDim: Math.max(sw, sh),
    originalBytes: originalBytes || originalFile?.size || 0,
    originalFile: isFullUntouched ? originalFile : null,
    preserveTransparencyForWebp: true,
    renderAtMaxDim: (maxDim, fillWhite) => {
      const scale = Math.min(1, maxDim / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context is not available in this browser.');
      }
      if (fillWhite) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
      } else {
        ctx.clearRect(0, 0, outW, outH);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceDrawable, sx, sy, sw, sh, 0, 0, outW, outH);
      return { canvas, width: outW, height: outH };
    }
  });
};

/**
 * Fetch an existing remote image URL (Supabase Storage or CORS-enabled CDN) into a local File
 * so admins can crop & re-optimize any existing product photo directly in the cropper.
 */
export const fetchImageUrlAsFile = async (
  imageUrl: string,
  fileBaseName = 'product-photo'
): Promise<File> => {
  const cleanUrl = imageUrl.trim();
  if (!cleanUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://'))) {
    throw new Error('Invalid image URL.');
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(cleanUrl, {
      mode: 'cors',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Could not load image (${response.status}).`);
    }
    const blob = await response.blob();
    if (!blob || blob.size <= 0) {
      throw new Error('Downloaded image is empty.');
    }
    const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const safeName = fileBaseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'product';
    return new File([blob], `${safeName}.${ext}`, { type: mime });
  } catch {
    throw new Error(
      'This external website blocks direct cropping (CORS). Please pick the photo from Gallery or Camera to crop and upload.'
    );
  } finally {
    window.clearTimeout(timer);
  }
};

/**
 * Crop and adaptively compress an image to a clean 1:1 WebP (max 800x800 px, target ~20 KB / 15-30 KB)
 * preserving aspect ratio (no stretching) with a crisp white background for transparent PNGs.
 */
export const cropAndCompressToSquareWebp = async (
  image: HTMLImageElement,
  crop: CropTransform,
  originalBytes = 0,
  originalFile?: File | null
): Promise<ProcessedSquareImage> => {
  const { offsetX, offsetY, zoom, viewportSize } = crop;
  const natW = image.naturalWidth;
  const natH = image.naturalHeight;

  if (natW <= 0 || natH <= 0 || viewportSize <= 0) {
    throw new Error('Invalid image dimensions for cropping.');
  }

  const isUntouchedFraming =
    Math.abs(zoom - 1) < 0.01 && Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1;

  // When framing is untouched on an image, keep aspect ratio within <= 800x800 without wasting bytes on padding
  if (isUntouchedFraming && Math.abs(natW / natH - 1) > 0.08) {
    return encodeAdaptively({
      sourceMaxDim: Math.max(natW, natH),
      originalBytes: originalBytes || originalFile?.size || 0,
      originalFile,
      preserveTransparencyForWebp: true,
      renderAtMaxDim: (maxDim, fillWhite) => {
        const scale = Math.min(1, maxDim / Math.max(natW, natH));
        const outW = Math.max(1, Math.round(natW * scale));
        const outH = Math.max(1, Math.round(natH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context is not available in this browser.');
        }
        if (fillWhite) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, outW, outH);
        } else {
          ctx.clearRect(0, 0, outW, outH);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, outW, outH);
        return { canvas, width: outW, height: outH };
      }
    });
  }

  // Interactive zoom/pan crop onto crisp white square canvas (never stretches, never black background)
  const sourceMaxDim = Math.min(MAX_IMAGE_DIMENSION, Math.max(natW, natH));
  return encodeAdaptively({
    sourceMaxDim,
    originalBytes: originalBytes || originalFile?.size || 0,
    originalFile: isUntouchedFraming ? originalFile : null,
    preserveTransparencyForWebp: false,
    renderAtMaxDim: (side) => {
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context is not available in this browser.');
      }

      // Crisp white background fills transparent PNGs and any empty margin (never black)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, side, side);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const baseScale = Math.min(viewportSize / natW, viewportSize / natH);
      const drawWViewport = natW * baseScale * zoom;
      const drawHViewport = natH * baseScale * zoom;

      const ratioToOutput = side / viewportSize;
      const outW = drawWViewport * ratioToOutput;
      const outH = drawHViewport * ratioToOutput;
      const outX = (side - outW) / 2 + offsetX * ratioToOutput;
      const outY = (side - outH) / 2 + offsetY * ratioToOutput;

      ctx.drawImage(image, outX, outY, outW, outH);
      return { canvas, width: side, height: side };
    }
  });
};

/**
 * Extract the object path inside `product-images` bucket from a public Supabase Storage URL.
 * Returns null for external URLs (e.g., Open Food Facts / OpenMRP).
 */
export const extractManagedStoragePath = (publicUrl?: string | null): string | null => {
  if (!publicUrl) return null;
  const trimmed = publicUrl.trim();
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;

  const rawPath = trimmed.slice(idx + marker.length).split('?')[0].split('#')[0];
  if (!rawPath) return null;

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
};

/** Delete an old file from `product-images` Storage if the URL belongs to this bucket */
export const removeManagedStorageImage = async (oldImageUrl?: string | null): Promise<void> => {
  if (!supabase) return;
  const storagePath = extractManagedStoragePath(oldImageUrl);
  if (!storagePath) return;

  try {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([storagePath]);
    if (error) {
      console.warn('Could not delete previous storage image:', error.message);
    }
  } catch (err: unknown) {
    console.warn('Previous storage image cleanup skipped:', err);
  }
};

const generateUniqueSuffix = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2, 10);
};

const computeBlobFingerprint = async (blob: Blob): Promise<string> => {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof blob.arrayBuffer === 'function') {
      const buf = await blob.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest).slice(0, 6))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall through to deterministic size/type fallback
  }
  return `${blob.size.toString(36)}_${generateUniqueSuffix().slice(0, 6)}`;
};

/**
 * Upload a client-compressed WebP image to Supabase Storage (`product-images`).
 * - Uses product-scoped deterministic content-hash paths (`products/{safeId}_{hash}.{ext}`)
 *   with `upsert: true` so retries never create duplicate files and one product can never
 *   overwrite another product's image.
 * - Never deletes existing Storage files (protects shared references and avoids data loss).
 */
export const uploadProcessedProductImage = async (params: {
  processed: ProcessedSquareImage;
  productId?: string;
  oldImageUrl?: string | null;
  isAdmin: boolean;
  onProgress?: (percent: number) => void;
}): Promise<{ publicUrl: string; storagePath: string }> => {
  const reportProgress = (pct: number) => {
    try {
      params.onProgress?.(pct);
    } catch {
      // ignore progress callback errors
    }
  };

  if (!params.isAdmin) {
    throw new Error('Only authenticated shop Owner or Admin can upload product images.');
  }
  if (!supabase) {
    throw new Error('Supabase cloud connection is not configured.');
  }
  if (!params.processed?.blob || params.processed.blob.size <= 0) {
    throw new Error('Compressed image is empty. Please select another photo.');
  }

  reportProgress(15);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError && isInvalidRefreshTokenError(sessionError)) {
    await clearStaleSupabaseAuthSession();
    throw new Error('Your session expired. Please sign in again to upload product images.');
  }
  if (!sessionData.session) {
    throw new Error('Please sign in as Owner/Admin to upload product images.');
  }

  reportProgress(30);

  const safeId = (params.productId || 'new').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || 'item';
  const fingerprint = await computeBlobFingerprint(params.processed.blob);
  const storagePath = `products/${safeId}_${fingerprint}.${params.processed.extension}`;

  reportProgress(55);

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, params.processed.blob, {
      contentType: params.processed.mimeType,
      cacheControl: '31536000',
      upsert: true
    });

  if (uploadError) {
    const msg = uploadError.message || 'Storage upload failed';
    if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
      throw new Error(
        'Storage bucket "product-images" not found. Run supabase/70_phase70_product_images_storage_bucket.sql in Supabase SQL Editor.'
      );
    }
    throw new Error(msg);
  }

  reportProgress(88);

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;
  clearFailedImageUrl(publicUrl);

  reportProgress(100);

  // NOTE: Existing Storage files are intentionally preserved (never deleted) so shared
  // references across products and rollback safety remain intact.
  return { publicUrl, storagePath };
};

export type ImageHealthStatus =
  | 'missing'
  | 'broken'
  | 'non_square'
  | 'unofficial'
  | 'healthy';

export interface ImageProbeResult {
  status: ImageHealthStatus;
  width: number;
  height: number;
}

export const isUnofficialCrowdsourcedUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('images.openfoodfacts.org') || lower.includes('images.openfoodfacts.net');
};

/** Measure natural dimensions in the browser to classify Missing, Broken, Unofficial, Non-Square, or Healthy */
export const probeImageHealth = async (
  url?: string | null,
  timeoutMs = 7000
): Promise<ImageProbeResult> => {
  const normalized = (url || '').trim();
  if (!normalized) {
    return { status: 'missing', width: 0, height: 0 };
  }

  return new Promise<ImageProbeResult>((resolve) => {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    let settled = false;

    const finish = (res: ImageProbeResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(res);
    };

    const timer = window.setTimeout(() => {
      finish({ status: 'broken', width: 0, height: 0 });
    }, timeoutMs);

    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) {
        finish({ status: 'broken', width: 0, height: 0 });
        return;
      }
      if (isUnofficialCrowdsourcedUrl(normalized)) {
        finish({ status: 'unofficial', width: w, height: h });
        return;
      }
      const ratio = w / h;
      const isSquare = Math.abs(ratio - 1) <= 0.12;
      finish({
        status: isSquare ? 'healthy' : 'non_square',
        width: w,
        height: h
      });
    };

    img.onerror = () => {
      finish({ status: 'broken', width: 0, height: 0 });
    };

    img.src = normalized;
  });
};

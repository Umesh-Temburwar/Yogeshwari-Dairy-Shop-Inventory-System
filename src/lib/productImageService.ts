import { supabase } from './supabase';
import { clearFailedImageUrl } from '../components/Common/ProductImage';

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const MAX_IMAGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB before compression
export const STANDARD_IMAGE_SIZE = 512;
export const STANDARD_WEBP_QUALITY = 0.82;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

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

export interface ProcessedSquareImage {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  extension: 'webp' | 'jpg';
  width: number;
  height: number;
}

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

/** Validate file type (JPEG, PNG, WebP) and max size (5 MB before compression) */
export const validateImageFile = (file: File): FileValidationResult => {
  const mime = file.type.toLowerCase();
  const isAllowedType = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
  if (!isAllowedType) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, or WebP images are allowed.'
    };
  }
  if (file.size <= 0) {
    return {
      valid: false,
      error: 'Selected image file is empty.'
    };
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`
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

/**
 * Compute base cover/contain scale and crop an image to a 512x512 square WebP (quality 0.82)
 * with pure white background fill so transparent/empty areas are crisp white.
 */
export const cropAndCompressToSquareWebp = async (
  image: HTMLImageElement,
  crop: CropTransform
): Promise<ProcessedSquareImage> => {
  const { offsetX, offsetY, zoom, viewportSize } = crop;
  const natW = image.naturalWidth;
  const natH = image.naturalHeight;

  if (natW <= 0 || natH <= 0 || viewportSize <= 0) {
    throw new Error('Invalid image dimensions for cropping.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = STANDARD_IMAGE_SIZE;
  canvas.height = STANDARD_IMAGE_SIZE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available in this browser.');
  }

  // Pure white background fills transparent PNGs and any empty margin
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, STANDARD_IMAGE_SIZE, STANDARD_IMAGE_SIZE);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fit longest side into viewport at zoom = 1 (contain baseline so product is never clipped by default)
  const baseScale = Math.min(viewportSize / natW, viewportSize / natH);
  const drawWViewport = natW * baseScale * zoom;
  const drawHViewport = natH * baseScale * zoom;

  const ratioToOutput = STANDARD_IMAGE_SIZE / viewportSize;
  const outW = drawWViewport * ratioToOutput;
  const outH = drawHViewport * ratioToOutput;
  const outX = (STANDARD_IMAGE_SIZE - outW) / 2 + offsetX * ratioToOutput;
  const outY = (STANDARD_IMAGE_SIZE - outH) / 2 + offsetY * ratioToOutput;

  ctx.drawImage(image, outX, outY, outW, outH);

  const toBlobAsync = (type: string, quality: number): Promise<Blob | null> =>
    new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });

  const webpBlob = await toBlobAsync('image/webp', STANDARD_WEBP_QUALITY);
  if (webpBlob && webpBlob.type === 'image/webp') {
    return {
      blob: webpBlob,
      mimeType: 'image/webp',
      extension: 'webp',
      width: STANDARD_IMAGE_SIZE,
      height: STANDARD_IMAGE_SIZE
    };
  }

  // Safety fallback only if browser cannot encode WebP
  const jpegBlob = await toBlobAsync('image/jpeg', 0.86);
  if (!jpegBlob) {
    throw new Error('Failed to encode cropped product image.');
  }
  return {
    blob: jpegBlob,
    mimeType: 'image/jpeg',
    extension: 'jpg',
    width: STANDARD_IMAGE_SIZE,
    height: STANDARD_IMAGE_SIZE
  };
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

/**
 * Upload a processed 512x512 WebP image to Supabase Storage (`product-images`)
 * and delete the previous managed file if replacing an existing storage upload.
 */
export const uploadProcessedProductImage = async (params: {
  processed: ProcessedSquareImage;
  productId?: string;
  oldImageUrl?: string | null;
  isAdmin: boolean;
}): Promise<{ publicUrl: string; storagePath: string }> => {
  if (!params.isAdmin) {
    throw new Error('Only authenticated shop Owner or Admin can upload product images.');
  }
  if (!supabase) {
    throw new Error('Supabase cloud connection is not configured.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('Please sign in as Owner/Admin to upload product images.');
  }

  const safeId = (params.productId || 'new').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || 'item';
  const storagePath = `products/${safeId}_${Date.now()}_${generateUniqueSuffix()}.${params.processed.extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, params.processed.blob, {
      contentType: params.processed.mimeType,
      cacheControl: '31536000',
      upsert: false
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

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;
  clearFailedImageUrl(publicUrl);

  // Clean up old managed storage file so storage does not fill up
  const oldPath = extractManagedStoragePath(params.oldImageUrl);
  if (oldPath && oldPath !== storagePath) {
    await removeManagedStorageImage(params.oldImageUrl);
  }

  return { publicUrl, storagePath };
};

export interface ImageProbeResult {
  status: 'missing' | 'broken' | 'non_square' | 'unofficial' | 'healthy';
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

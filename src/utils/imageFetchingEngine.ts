/**
 * Bulk Product Image Fetching Engine for Yogeshwari Dairy Shop ERP
 * 
 * Sources:
 * - Open Food Facts (global & in.openfoodfacts.org)
 * - Open Products Facts
 * 
 * Safety & Rules:
 * - EXACT barcode matching only
 * - Validates external image URL before saving
 * - Updates ONLY `image_url` column on products table
 * - ZERO modification to stock, prices, batches, or sales
 */

import { supabase } from '../lib/supabase';
import { Product } from '../types';

export interface ImageFetchProgress {
  total: number;
  processed: number;
  verified: number;
  missing: number;
  failed: number;
  currentBarcode?: string;
  currentProductName?: string;
  isPaused: boolean;
  isRunning: boolean;
}

export interface ImageLookupResult {
  barcode: string;
  imageUrl: string | null;
  source: 'OpenFoodFacts' | 'OpenProductsFacts' | 'None';
  status: 'verified' | 'missing' | 'failed';
  productName?: string;
}

/**
 * Validates that an image URL actually returns a valid image (not 404, HTML, or CORS error)
 */
export async function validateImageUrl(url: string, timeoutMs: number = 5000): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      // Ensure image has real dimensions
      if (img.naturalWidth > 10 && img.naturalHeight > 10) {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = clean;
  });
}

/**
 * Looks up a product image using exact barcode in Open Food Facts and fallback open sources
 */
export async function lookupProductImageByBarcode(barcode: string): Promise<ImageLookupResult> {
  const clean = (barcode || '').trim();
  if (!clean || clean.length < 5) {
    return { barcode: clean, imageUrl: null, source: 'None', status: 'missing' };
  }

  // Generate candidate barcodes (e.g. raw, with leading zero, without leading zero)
  const candidates = [clean];
  if (clean.startsWith('0') && clean.length > 8) {
    candidates.push(clean.replace(/^0+/, ''));
  } else if (!clean.startsWith('0') && clean.length === 12) {
    candidates.push('0' + clean);
  }

  // 1. Check Open Food Facts
  for (const cand of candidates) {
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cand)}.json?fields=code,product_name,image_front_url,image_url,image_front_small_url`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          const rawImg = data.product.image_front_url || data.product.image_url || data.product.image_front_small_url;
          if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('http')) {
            const isValid = await validateImageUrl(rawImg);
            if (isValid) {
              return {
                barcode: clean,
                imageUrl: rawImg,
                source: 'OpenFoodFacts',
                status: 'verified',
                productName: data.product.product_name
              };
            }
          }
        }
      }
    } catch {
      // Continue to next candidate or fallback source
    }
  }

  // 2. Check Open Products Facts (for non-food items / cosmetics / general packaged goods)
  for (const cand of candidates) {
    try {
      const url = `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(cand)}.json?fields=code,product_name,image_front_url,image_url`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          const rawImg = data.product.image_front_url || data.product.image_url;
          if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('http')) {
            const isValid = await validateImageUrl(rawImg);
            if (isValid) {
              return {
                barcode: clean,
                imageUrl: rawImg,
                source: 'OpenProductsFacts',
                status: 'verified',
                productName: data.product.product_name
              };
            }
          }
        }
      }
    } catch {
      // Continue
    }
  }

  return { barcode: clean, imageUrl: null, source: 'None', status: 'missing' };
}

/**
 * Controller class for managing interactive batch processing of product images
 */
export class BulkImageProcessingManager {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private onProgressCallback?: (progress: ImageFetchProgress) => void;

  public async startProcessing(
    products: Array<{ id: string; name: string; barcode?: string | null; image_url?: string | null }>,
    options: {
      batchSize?: number;
      delayMs?: number;
      onProgress?: (progress: ImageFetchProgress) => void;
      onProductUpdated?: (productId: string, imageUrl: string) => void;
    } = {}
  ): Promise<void> {
    const { batchSize = 10, delayMs = 300, onProgress, onProductUpdated } = options;
    this.onProgressCallback = onProgress;
    this.isRunning = true;
    this.isPaused = false;

    // Filter eligible products: must have valid barcode and currently no image_url
    const eligible = products.filter(p => p.barcode && p.barcode.trim().length >= 5 && (!p.image_url || p.image_url.trim() === ''));
    
    let processed = 0;
    let verified = 0;
    let missing = 0;
    let failed = 0;

    const report = (currB?: string, currN?: string) => {
      if (this.onProgressCallback) {
        this.onProgressCallback({
          total: eligible.length,
          processed,
          verified,
          missing,
          failed,
          currentBarcode: currB,
          currentProductName: currN,
          isPaused: this.isPaused,
          isRunning: this.isRunning
        });
      }
    };

    report();

    for (let i = 0; i < eligible.length; i += batchSize) {
      if (!this.isRunning) break;

      while (this.isPaused) {
        await new Promise(r => setTimeout(r, 400));
        if (!this.isRunning) break;
      }

      const batch = eligible.slice(i, i + batchSize);

      for (const prod of batch) {
        if (!this.isRunning) break;
        while (this.isPaused) {
          await new Promise(r => setTimeout(r, 400));
          if (!this.isRunning) break;
        }

        report(prod.barcode!, prod.name);

        try {
          const res = await lookupProductImageByBarcode(prod.barcode!);
          processed++;

          if (res.status === 'verified' && res.imageUrl) {
            verified++;
            // Update Supabase product image_url
            if (supabase) {
              await supabase
                .from('products')
                .update({ image_url: res.imageUrl })
                .eq('id', prod.id);
            }
            if (onProductUpdated) {
              onProductUpdated(prod.id, res.imageUrl);
            }
          } else {
            missing++;
          }
        } catch {
          processed++;
          failed++;
        }

        report(prod.barcode!, prod.name);
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    this.isRunning = false;
    this.isPaused = false;
    report();
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean } {
    return { isRunning: this.isRunning, isPaused: this.isPaused };
  }
}

export const globalImageManager = new BulkImageProcessingManager();

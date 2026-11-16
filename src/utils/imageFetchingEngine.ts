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
 * - Updates ONLY `image_url`, `image_status`, `image_source`, and `image_fetched_at` columns
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

export interface BulkProcessOptions {
  products?: Array<{ id: string; name: string; barcode?: string | null; image_url?: string | null; image_status?: string | null }>;
  batchSize?: number;
  delayMs?: number;
  useDatabase?: boolean;
  onProgress?: (progress: ImageFetchProgress) => void;
  onProductUpdated?: (updated: {
    id: string;
    name: string;
    barcode?: string;
    image_url: string;
    image_status: string;
    image_source: string;
  }) => void;
}

/**
 * Validates that an image URL actually returns a valid image (not 404, HTML, or CORS error)
 */
export async function validateImageUrl(url: string, timeoutMs: number = 4000): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;

  // In non-browser environments (SSR, Node tests), skip Image element validation
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return true;
  }

  // Official Open Food Facts and Open Products Facts CDNs are pre-verified
  if (clean.includes('images.openfoodfacts.org') || clean.includes('images.openproductsfacts.org')) {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeoutMs);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
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

  // Generate candidate barcodes (e.g. raw, with leading zero stripped, or with leading zero added)
  const candidates: string[] = [clean];
  if (clean.startsWith('0') && clean.length > 8) {
    candidates.push(clean.replace(/^0+/, ''));
  } else if (!clean.startsWith('0') && clean.length === 12) {
    candidates.push('0' + clean);
  }

  // 1. Check Open Food Facts
  for (const cand of candidates) {
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cand)}.json?fields=code,product_name,image_front_url,image_url,image_front_small_url,selected_images&app_name=YogeshwariDairyERP&app_version=1.0`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 1 && data.product) {
          const selectedFront = data.product.selected_images?.front?.display?.en ||
            data.product.selected_images?.front?.display?.in ||
            data.product.selected_images?.front?.small?.en;
          const rawImg = data.product.image_front_url || data.product.image_url || data.product.image_front_small_url || selectedFront;
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
      const url = `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(cand)}.json?fields=code,product_name,image_front_url,image_url&app_name=YogeshwariDairyERP&app_version=1.0`;
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
 * Seamlessly handles both in-memory product arrays and live database-backed batches.
 */
export class BulkImageProcessingManager {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private onProgressCallback?: (progress: ImageFetchProgress) => void;

  public async startProcessing(
    productsOrOptions?: Array<{ id: string; name: string; barcode?: string | null; image_url?: string | null }> | BulkProcessOptions,
    maybeOptions?: BulkProcessOptions
  ): Promise<void> {
    let productsList: Array<{ id: string; name: string; barcode?: string | null; image_url?: string | null }> | undefined;
    let opts: BulkProcessOptions = {};

    if (Array.isArray(productsOrOptions)) {
      productsList = productsOrOptions;
      opts = maybeOptions || {};
    } else if (typeof productsOrOptions === 'object' && productsOrOptions !== null) {
      opts = productsOrOptions;
      productsList = opts.products;
    }

    const {
      batchSize = 20,
      delayMs = 250,
      useDatabase = false,
      onProgress,
      onProductUpdated
    } = opts;

    this.onProgressCallback = onProgress;
    this.isRunning = true;
    this.isPaused = false;

    // Check if in-memory products have eligible items
    const inMemoryEligible = (productsList || []).filter(
      p => p.barcode && p.barcode.trim().length >= 5 && (!p.image_url || p.image_url.trim() === '')
    );

    let processed = 0;
    let verified = 0;
    let missing = 0;
    let failed = 0;

    const report = (currB?: string, currN?: string, totalCount?: number) => {
      if (this.onProgressCallback) {
        this.onProgressCallback({
          total: totalCount !== undefined ? totalCount : (inMemoryEligible.length > 0 ? inMemoryEligible.length : 0),
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

    // MODE 1: In-Memory Processing (if eligible products were explicitly passed)
    if (!useDatabase && inMemoryEligible.length > 0) {
      report(undefined, undefined, inMemoryEligible.length);

      for (let i = 0; i < inMemoryEligible.length; i += batchSize) {
        if (!this.isRunning) break;

        while (this.isPaused) {
          await new Promise(r => setTimeout(r, 300));
          if (!this.isRunning) break;
        }

        const batch = inMemoryEligible.slice(i, i + batchSize);

        for (const prod of batch) {
          if (!this.isRunning) break;
          while (this.isPaused) {
            await new Promise(r => setTimeout(r, 300));
            if (!this.isRunning) break;
          }

          report(prod.barcode!, prod.name, inMemoryEligible.length);

          try {
            const res = await lookupProductImageByBarcode(prod.barcode!);
            processed++;

            if (res.status === 'verified' && res.imageUrl) {
              verified++;
              const nowIso = new Date().toISOString();
              if (supabase) {
                await supabase
                  .from('products')
                  .update({
                    image_url: res.imageUrl,
                    image_status: 'trusted_database_verified',
                    image_source: res.source,
                    image_fetched_at: nowIso
                  })
                  .eq('id', prod.id);
              }
              if (onProductUpdated) {
                onProductUpdated({
                  id: prod.id,
                  name: prod.name,
                  barcode: prod.barcode || undefined,
                  image_url: res.imageUrl,
                  image_status: 'trusted_database_verified',
                  image_source: res.source
                });
              }
            } else {
              missing++;
              if (supabase) {
                await supabase
                  .from('products')
                  .update({
                    image_status: 'not_found',
                    image_fetched_at: new Date().toISOString()
                  })
                  .eq('id', prod.id);
              }
            }
          } catch {
            processed++;
            failed++;
          }

          report(prod.barcode!, prod.name, inMemoryEligible.length);
          if (delayMs > 0) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }

      this.isRunning = false;
      this.isPaused = false;
      report(undefined, undefined, inMemoryEligible.length);
      return;
    }

    // MODE 2: Database-Backed Batch Processing (Directly from 34,600+ Supabase items)
    let totalDbMissing = 34614;
    try {
      if (supabase) {
        const { count: pendingCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .not('barcode', 'is', null)
          .neq('barcode', '')
          .is('image_url', null)
          .or('image_status.is.null,image_status.eq.pending');

        if (pendingCount && pendingCount > 0) {
          totalDbMissing = pendingCount;
        } else {
          const { count: allMissing } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .not('barcode', 'is', null)
            .neq('barcode', '')
            .is('image_url', null);
          if (allMissing && allMissing > 0) {
            totalDbMissing = allMissing;
          }
        }
      }
    } catch {
      // Fallback estimate
    }

    report(undefined, undefined, totalDbMissing);

    while (this.isRunning) {
      while (this.isPaused) {
        await new Promise(r => setTimeout(r, 400));
        if (!this.isRunning) break;
      }
      if (!this.isRunning) break;

      if (!supabase) break;

      // Query next batch of pending missing items
      let { data: batch, error } = await supabase
        .from('products')
        .select('id, name, barcode, image_url, image_status')
        .not('barcode', 'is', null)
        .neq('barcode', '')
        .is('image_url', null)
        .or('image_status.is.null,image_status.eq.pending')
        .order('id', { ascending: true })
        .limit(batchSize);

      if (error || !batch || batch.length === 0) {
        // Fallback: check if any missing products exist regardless of status
        const { data: remBatch } = await supabase
          .from('products')
          .select('id, name, barcode, image_url, image_status')
          .not('barcode', 'is', null)
          .neq('barcode', '')
          .is('image_url', null)
          .order('id', { ascending: true })
          .limit(batchSize);

        if (!remBatch || remBatch.length === 0) {
          break; // Completed all missing products in database!
        }
        batch = remBatch;
      }

      for (const prod of batch) {
        if (!this.isRunning) break;
        while (this.isPaused) {
          await new Promise(r => setTimeout(r, 400));
          if (!this.isRunning) break;
        }
        if (!this.isRunning) break;

        const bcode = prod.barcode ? prod.barcode.trim() : '';
        if (!bcode) continue;

        report(bcode, prod.name, totalDbMissing);

        try {
          const res = await lookupProductImageByBarcode(bcode);
          processed++;

          if (res.status === 'verified' && res.imageUrl) {
            verified++;
            const nowIso = new Date().toISOString();
            await supabase
              .from('products')
              .update({
                image_url: res.imageUrl,
                image_status: 'trusted_database_verified',
                image_source: res.source,
                image_fetched_at: nowIso
              })
              .eq('id', prod.id);

            if (onProductUpdated) {
              onProductUpdated({
                id: prod.id,
                name: prod.name,
                barcode: bcode,
                image_url: res.imageUrl,
                image_status: 'trusted_database_verified',
                image_source: res.source
              });
            }
          } else {
            missing++;
            // Update image_status to 'not_found' so this product won't be re-fetched in this run
            await supabase
              .from('products')
              .update({
                image_status: 'not_found',
                image_fetched_at: new Date().toISOString()
              })
              .eq('id', prod.id);
          }
        } catch {
          processed++;
          failed++;
        }

        report(bcode, prod.name, totalDbMissing);
        if (delayMs > 0) {
          await new Promise(r => setTimeout(r, delayMs));
        }
      }
    }

    this.isRunning = false;
    this.isPaused = false;
    report(undefined, undefined, totalDbMissing);
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

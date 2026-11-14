/**
 * Yogeshwari Dairy Shop ERP - Barcode Lookup & Resolution Service
 * 
 * Provides robust barcode lookup with:
 * - Leading zero normalization (e.g. '890610501822' <-> '0890610501822')
 * - Direct Supabase table queries on `product_barcodes` and `products`
 * - Fallback to RPC function `fn_search_product_by_barcode`
 * - Consistent mapping to `Product` model
 */

import { supabase } from './supabase';
import { Product, ProductCategory, ProductUnit } from '../types';

export interface BarcodeSearchResult {
  found: boolean;
  product: Product | null;
  barcode: string;
  source: 'product_barcodes' | 'products' | 'rpc' | 'local';
}

/**
 * Generate variations of a barcode to handle leading zero differences
 * e.g., '890610501822' -> ['890610501822', '0890610501822']
 */
export function getBarcodeCandidates(rawBarcode: string): string[] {
  const clean = rawBarcode.trim();
  if (!clean) return [];

  const candidates = new Set<string>();
  candidates.add(clean);

  // If it doesn't start with 0, add version with leading 0 (EAN-13 from UPC-12)
  if (!clean.startsWith('0')) {
    candidates.add('0' + clean);
    candidates.add('00' + clean);
  }

  // Version with leading zeros stripped
  const noZero = clean.replace(/^0+/, '');
  if (noZero) {
    candidates.add(noZero);
    candidates.add('0' + noZero);
  }

  return Array.from(candidates);
}

/**
 * Lookup product across all barcode tables in Supabase
 */
export async function searchProductByBarcodeOnline(rawBarcode: string): Promise<BarcodeSearchResult> {
  const clean = rawBarcode.trim();
  if (!clean) {
    return { found: false, product: null, barcode: clean, source: 'local' };
  }

  const candidates = getBarcodeCandidates(clean);

  // 1. First attempt: Direct query on public.product_barcodes joining products
  try {
    const { data, error } = await supabase
      .from('product_barcodes')
      .select(`
        barcode,
        product_id,
        products (
          id,
          name,
          hindi_name,
          marathi_name,
          category,
          unit,
          purchase_price,
          selling_price,
          stock_quantity,
          min_stock_alert,
          shelf_life_days,
          brand,
          barcode,
          is_active,
          created_at
        )
      `)
      .in('barcode', candidates)
      .limit(1);

    if (!error && data && data.length > 0) {
      const match = data[0];
      const p = match.products as any;
      if (p) {
        const prod: Product = {
          id: p.id,
          name: p.name,
          hindi_name: p.hindi_name || undefined,
          marathi_name: p.marathi_name || undefined,
          category: (p.category as ProductCategory) || 'Bakery & Extras',
          unit: (p.unit as ProductUnit) || 'Piece',
          purchase_price: Number(p.purchase_price || 0),
          selling_price: Number(p.selling_price || 0),
          stock_quantity: Number(p.stock_quantity || 0),
          min_stock_alert: Number(p.min_stock_alert || 5),
          shelf_life_days: Number(p.shelf_life_days || 7),
          brand: p.brand || undefined,
          barcode: match.barcode || p.barcode || clean,
          is_active: p.is_active ?? true,
          created_at: p.created_at || new Date().toISOString()
        };
        return { found: true, product: prod, barcode: match.barcode, source: 'product_barcodes' };
      }
    }
  } catch (err) {
    console.warn('[BarcodeService] product_barcodes lookup error:', err);
  }

  // 2. Second attempt: Direct query on public.products table
  try {
    const { data: pData, error: pErr } = await supabase
      .from('products')
      .select('*')
      .in('barcode', candidates)
      .limit(1);

    if (!pErr && pData && pData.length > 0) {
      const p = pData[0];
      const prod: Product = {
        id: p.id,
        name: p.name,
        hindi_name: p.hindi_name || undefined,
        marathi_name: p.marathi_name || undefined,
        category: (p.category as ProductCategory) || 'Bakery & Extras',
        unit: (p.unit as ProductUnit) || 'Piece',
        purchase_price: Number(p.purchase_price || 0),
        selling_price: Number(p.selling_price || 0),
        stock_quantity: Number(p.stock_quantity || 0),
        min_stock_alert: Number(p.min_stock_alert || 5),
        shelf_life_days: Number(p.shelf_life_days || 7),
        brand: p.brand || undefined,
        barcode: p.barcode || clean,
        is_active: p.is_active ?? true,
        created_at: p.created_at || new Date().toISOString()
      };
      return { found: true, product: prod, barcode: p.barcode || clean, source: 'products' };
    }
  } catch (err) {
    console.warn('[BarcodeService] products table lookup error:', err);
  }

  // 3. Third attempt: Call RPC fn_search_product_by_barcode
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'fn_search_product_by_barcode',
      { p_barcode: clean }
    );

    if (!rpcErr && rpcData && rpcData.length > 0 && rpcData[0].found) {
      const row = rpcData[0];
      const prod: Product = {
        id: row.product_id,
        name: row.product_name,
        marathi_name: row.marathi_name || undefined,
        category: (row.category as ProductCategory) || 'Bakery & Extras',
        unit: (row.unit as ProductUnit) || 'Piece',
        brand: row.brand || undefined,
        purchase_price: Number(row.purchase_price || 0),
        selling_price: Number(row.selling_price || 0),
        stock_quantity: Number(row.current_stock || 0),
        min_stock_alert: 5,
        barcode: row.barcode || clean,
        is_active: true,
        created_at: new Date().toISOString()
      };
      return { found: true, product: prod, barcode: row.barcode || clean, source: 'rpc' };
    }
  } catch (err) {
    console.warn('[BarcodeService] RPC lookup fallback error:', err);
  }

  return { found: false, product: null, barcode: clean, source: 'local' };
}

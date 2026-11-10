import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialProducts, initialBatches, computeExpiryStatus, BatchItem } from './storeFallback.js';
import { AppError } from '../utils/AppError.js';

export interface StockSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockQuantity: number;
  totalStockValue: number;
}

export const getStockOverview = async () => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data: stockView, error: stockErr } = await supabaseClient
      .from('v_product_stock')
      .select('*, category:categories(name), brand:brands(name), unit:units(short_code)')
      .order('current_stock', { ascending: true });

    if (stockErr) throw new AppError(stockErr.message, 500, 'DATABASE_ERROR', stockErr);

    const items = stockView || [];
    const totalProducts = items.length;
    const activeProducts = items.filter((p) => p.is_active).length;
    const lowStockCount = items.filter((p) => p.stock_status === 'LOW').length;
    const outOfStockCount = items.filter((p) => p.stock_status === 'OUT_OF_STOCK').length;
    const totalStockQuantity = items.reduce((acc, p) => acc + Number(p.current_stock || 0), 0);
    const totalStockValue = items.reduce(
      (acc, p) => acc + Number(p.current_stock || 0) * Number(p.purchase_price || 0),
      0
    );

    return {
      summary: {
        totalProducts,
        activeProducts,
        lowStockCount,
        outOfStockCount,
        totalStockQuantity,
        totalStockValue: Math.round(totalStockValue * 100) / 100,
      },
      items,
    };
  }

  // Fallback in-memory
  const items = initialProducts.map((p) => {
    const batches = initialBatches.filter((b) => b.product_id === p.id);
    const currentStock = batches.reduce((sum, b) => sum + b.qty_remaining, 0);
    const stockStatus = currentStock === 0 ? 'OUT_OF_STOCK' : currentStock <= p.min_stock ? 'LOW' : 'NORMAL';

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      min_stock: p.min_stock,
      max_stock: p.max_stock,
      is_active: p.is_active,
      current_stock: currentStock,
      stock_status: stockStatus,
      stock_value: Math.round(currentStock * p.purchase_price * 100) / 100,
    };
  });

  const totalProducts = items.length;
  const activeProducts = items.filter((p) => p.is_active).length;
  const lowStockCount = items.filter((p) => p.stock_status === 'LOW').length;
  const outOfStockCount = items.filter((p) => p.stock_status === 'OUT_OF_STOCK').length;
  const totalStockQuantity = items.reduce((acc, p) => acc + p.current_stock, 0);
  const totalStockValue = items.reduce((acc, p) => acc + p.stock_value, 0);

  return {
    summary: {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      totalStockQuantity,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
    },
    items,
  };
};

export const getBatchesWithExpiry = async (productId?: string): Promise<BatchItem[]> => {
  if (isSupabaseConfigured() && supabaseClient) {
    let q = supabaseClient.from('v_batch_expiry_status').select('*');
    if (productId) {
      q = q.eq('product_id', productId);
    }
    const { data, error } = await q.order('expiry_date', { ascending: true });
    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }

  let batches = initialBatches;
  if (productId) {
    batches = batches.filter((b) => b.product_id === productId);
  }

  // Dynamically compute expiry status (Business Rule 3) and sort by FEFO
  return batches
    .map((b) => {
      const { status, daysDiff } = computeExpiryStatus(b.expiry_date);
      return {
        ...b,
        expiry_status: status,
        days_to_expiry: daysDiff,
      };
    })
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
};


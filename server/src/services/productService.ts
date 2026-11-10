import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialProducts, initialCategories, initialBrands, initialUnits, initialBatches, ProductItem } from './storeFallback.js';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from '../schemas/productSchemas.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

let inMemoryProducts = [...initialProducts];

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const getProducts = async (query: ProductQueryInput): Promise<PaginatedResult<ProductItem>> => {
  if (isSupabaseConfigured() && supabaseClient) {
    let q = supabaseClient
      .from('v_product_stock')
      .select('*, category:categories(*), brand:brands(*), unit:units(*)', { count: 'exact' });

    if (query.search) {
      q = q.or(`name.ilike.%${query.search}%,sku.ilike.%${query.search}%,barcode.ilike.%${query.search}%`);
    }

    if (query.category_id) {
      q = q.eq('category_id', query.category_id);
    }

    if (query.brand_id) {
      q = q.eq('brand_id', query.brand_id);
    }

    if (query.low_stock === 'true') {
      q = q.or('stock_status.eq.OUT_OF_STOCK,stock_status.eq.LOW');
    }

    if (query.is_active !== undefined) {
      q = q.eq('is_active', query.is_active === 'true');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await q.range(from, to).order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);

    const total = count || 0;
    return {
      items: (data as ProductItem[]) || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Fallback in-memory processing with stock calculation
  let filtered = inMemoryProducts.map((p) => {
    const category = initialCategories.find((c) => c.id === p.category_id);
    const brand = initialBrands.find((b) => b.id === p.brand_id);
    const unit = initialUnits.find((u) => u.id === p.unit_id);

    // Sum active non-expired batch remaining quantities
    const batches = initialBatches.filter((b) => b.product_id === p.id);
    const currentStock = batches.reduce((sum, b) => sum + b.qty_remaining, 0);

    let stockStatus: 'LOW' | 'NORMAL' | 'OVERSTOCK' = 'NORMAL';
    if (currentStock <= p.min_stock) {
      stockStatus = 'LOW';
    } else if (p.max_stock && currentStock > p.max_stock) {
      stockStatus = 'OVERSTOCK';
    }

    return {
      ...p,
      category,
      brand,
      unit,
      current_stock: currentStock,
      stock_status: stockStatus,
    };
  });

  if (query.search) {
    const s = query.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        (p.barcode && p.barcode.toLowerCase().includes(s))
    );
  }

  if (query.category_id) {
    filtered = filtered.filter((p) => p.category_id === query.category_id);
  }

  if (query.brand_id) {
    filtered = filtered.filter((p) => p.brand_id === query.brand_id);
  }

  if (query.low_stock === 'true') {
    filtered = filtered.filter((p) => (p.current_stock || 0) <= p.min_stock);
  }

  if (query.is_active !== undefined) {
    const activeBool = query.is_active === 'true';
    filtered = filtered.filter((p) => p.is_active === activeBool);
  }

  const total = filtered.length;
  const page = query.page || 1;
  const limit = query.limit || 50;
  const startIndex = (page - 1) * limit;
  const paginatedItems = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getProductById = async (id: string): Promise<ProductItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('v_product_stock')
      .select('*, category:categories(*), brand:brands(*), unit:units(*)')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Product not found', 404, 'NOT_FOUND');
    return data as ProductItem;
  }

  const p = inMemoryProducts.find((item) => item.id === id);
  if (!p) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const category = initialCategories.find((c) => c.id === p.category_id);
  const brand = initialBrands.find((b) => b.id === p.brand_id);
  const unit = initialUnits.find((u) => u.id === p.unit_id);
  const batches = initialBatches.filter((b) => b.product_id === p.id);
  const currentStock = batches.reduce((sum, b) => sum + b.qty_remaining, 0);

  return {
    ...p,
    category,
    brand,
    unit,
    current_stock: currentStock,
    stock_status: currentStock <= p.min_stock ? 'LOW' : 'NORMAL',
  };
};

export const createProduct = async (input: CreateProductInput): Promise<ProductItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('products')
      .insert([input])
      .select('*, category:categories(*), brand:brands(*), unit:units(*)')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Product SKU or Barcode already exists', 409, 'DUPLICATE_RESOURCE');
      }
      throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    }
    return data as ProductItem;
  }

  const duplicateSku = inMemoryProducts.find((p) => p.sku.toLowerCase() === input.sku.toLowerCase());
  if (duplicateSku) {
    throw new AppError(`Product with SKU '${input.sku}' already exists`, 409, 'DUPLICATE_RESOURCE');
  }

  const newProduct: ProductItem = {
    id: crypto.randomUUID(),
    name: input.name,
    category_id: input.category_id,
    brand_id: input.brand_id ?? null,
    unit_id: input.unit_id,
    sku: input.sku,
    barcode: input.barcode ?? null,
    purchase_price: input.purchase_price,
    selling_price: input.selling_price,
    gst_percent: input.gst_percent ?? 0,
    min_stock: input.min_stock ?? 0,
    max_stock: input.max_stock ?? 100,
    image_url: input.image_url || null,
    is_active: input.is_active ?? true,
    created_at: new Date().toISOString(),
  };

  inMemoryProducts.push(newProduct);
  return getProductById(newProduct.id);
};

export const updateProduct = async (id: string, input: UpdateProductInput): Promise<ProductItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('products')
      .update(input)
      .eq('id', id)
      .select('*, category:categories(*), brand:brands(*), unit:units(*)')
      .single();

    if (error || !data) throw new AppError('Failed to update product', 400, 'UPDATE_FAILED', error);
    return data as ProductItem;
  }

  const index = inMemoryProducts.findIndex((p) => p.id === id);
  if (index === -1) throw new AppError('Product not found', 404, 'NOT_FOUND');

  inMemoryProducts[index] = {
    ...inMemoryProducts[index],
    ...input,
  };

  return getProductById(id);
};

export const deleteProduct = async (id: string): Promise<void> => {
  if (isSupabaseConfigured() && supabaseClient) {
    // Soft delete product by deactivating
    const { error } = await supabaseClient
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new AppError(error.message, 400, 'DELETE_FAILED', error);
    return;
  }

  const index = inMemoryProducts.findIndex((p) => p.id === id);
  if (index === -1) throw new AppError('Product not found', 404, 'NOT_FOUND');
  inMemoryProducts[index].is_active = false;
};


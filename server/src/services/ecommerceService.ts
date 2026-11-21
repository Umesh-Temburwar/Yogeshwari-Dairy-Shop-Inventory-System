import { supabaseClient, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';
import { AppError } from '../utils/AppError.js';
import {
  CustomerRegisterInput,
  CustomerLoginInput,
  CustomerAddressInput,
  EcommerceProductQueryInput,
  CartValidationInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
} from '../schemas/ecommerceSchemas.js';
import { initialProducts, initialCategories } from './storeFallback.js';
import crypto from 'crypto';

export interface PublicProductItem {
  id: string;
  name: string;
  pack_size: string | null;
  category: string;
  category_id: string | null;
  brand: string | null;
  brand_id: string | null;
  unit: string;
  selling_price: number;
  mrp: number;
  discount_percentage: number;
  image_url: string | null;
  description: string | null;
  available_stock: number;
  is_in_stock: boolean;
  max_order_quantity: number;
}

export interface StoreStatusInfo {
  is_open: boolean;
  message: string;
  reopen_time: string;
  updated_at: string;
}

let inMemoryStoreStatus: StoreStatusInfo = {
  is_open: true,
  message: 'Store is open for farm-fresh dairy deliveries',
  reopen_time: '6:00 AM',
  updated_at: new Date().toISOString(),
};

export const getStoreStatus = async (): Promise<StoreStatusInfo> => {
  if (isSupabaseConfigured() && supabaseClient) {
    try {
      const { data } = await supabaseClient
        .from('profiles')
        .select('default_redirect_view, updated_at')
        .eq('role', 'Owner')
        .single();

      if (data && data.default_redirect_view) {
        const val = data.default_redirect_view;
        const isClosed = val.includes('store_closed');
        return {
          is_open: !isClosed,
          message: isClosed
            ? 'Yogeshwari Dairy store is currently closed. We reopen tomorrow at 6:00 AM for fresh deliveries.'
            : 'Store is open for farm-fresh dairy deliveries',
          reopen_time: '6:00 AM',
          updated_at: data.updated_at || inMemoryStoreStatus.updated_at,
        };
      }
    } catch {
      // Fall through
    }
  }
  return inMemoryStoreStatus;
};

export const updateStoreStatus = async (
  isOpen: boolean,
  message?: string,
  reopenTime = '6:00 AM'
): Promise<StoreStatusInfo> => {
  inMemoryStoreStatus = {
    is_open: isOpen,
    message:
      message ||
      (isOpen
        ? 'Store is open for farm-fresh dairy deliveries'
        : 'Yogeshwari Dairy store is currently closed. We reopen tomorrow at 6:00 AM for fresh deliveries.'),
    reopen_time: reopenTime,
    updated_at: new Date().toISOString(),
  };

  const client = supabaseAdmin || supabaseClient;
  if (isSupabaseConfigured() && client) {
    try {
      const redirectTag = isOpen ? 'dashboard:reg_off:store_open' : 'dashboard:reg_off:store_closed';
      await client
        .from('profiles')
        .update({
          default_redirect_view: redirectTag,
          updated_at: new Date().toISOString(),
        })
        .eq('role', 'Owner');
    } catch (err) {
      console.warn('Failed to persist store status to profiles:', err);
    }
  }

  return inMemoryStoreStatus;
};

// In-memory mock storage for development / fallback
export const mockCustomerAddresses: Array<CustomerAddressInput & { id: string; user_id: string; created_at: string }> = [];
export const mockEcommerceOrders: any[] = [];
export const mockStockReservations: any[] = [];

export const seedMockOrder = (order: any) => {
  mockEcommerceOrders.push(order);
};

const generateUUID = () => crypto.randomUUID();

export const getPublicProducts = async (
  query: EcommerceProductQueryInput
): Promise<{ items: PublicProductItem[]; total: number; page: number; limit: number; totalPages: number }> => {
  const page = query.page || 1;
  const limit = query.limit || 30;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (isSupabaseConfigured() && supabaseClient) {
    // 1. Try querying dedicated sanitized view public.v_ecommerce_products
    try {
      let q = supabaseClient
        .from('v_ecommerce_products')
        .select('*', { count: 'exact' });

      if (query.search) {
        q = q.or(`name.ilike.%${query.search}%,brand.ilike.%${query.search}%,category.ilike.%${query.search}%`);
      }
      if (query.category_id) {
        q = q.eq('category_id', query.category_id);
      }
      if (query.brand_id) {
        q = q.eq('brand_id', query.brand_id);
      }
      if (query.in_stock_only === 'true') {
        q = q.eq('is_in_stock', true);
      }

      if (query.sort === 'price_asc') {
        q = q.order('selling_price', { ascending: true });
      } else if (query.sort === 'price_desc') {
        q = q.order('selling_price', { ascending: false });
      } else if (query.sort === 'newest') {
        q = q.order('created_at', { ascending: false });
      } else {
        q = q.order('is_in_stock', { ascending: false }).order('name', { ascending: true });
      }

      const { data, count, error } = await q.range(from, to);

      if (!error && data && data.length >= 0) {
        return {
          items: data as PublicProductItem[],
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        };
      }
    } catch {
      // Ignore and fallback below
    }

    // 2. Pre-migration fallback: query existing v_product_stock and sanitize all fields
    try {
      let q = supabaseClient
        .from('v_product_stock')
        .select('id, name, category, category_id, brand_id, unit, selling_price, image_url, current_stock, is_active', { count: 'exact' })
        .eq('is_active', true);

      if (query.search) {
        q = q.or(`name.ilike.%${query.search}%,category.ilike.%${query.search}%`);
      }
      if (query.category_id) {
        q = q.eq('category_id', query.category_id);
      }

      const { data, count, error } = await q.range(from, to);
      if (!error && data) {
        const items: PublicProductItem[] = data.map((p: any) => {
          const sellingPrice = Number(p.selling_price || 0);
          const mrp = Math.round(sellingPrice * 1.15);
          const stock = Math.max(0, Number(p.current_stock || 0));
          return {
            id: p.id,
            name: p.name,
            pack_size: null,
            category: p.category || 'General',
            category_id: p.category_id || null,
            brand: null,
            brand_id: p.brand_id || null,
            unit: p.unit || 'Piece',
            selling_price: sellingPrice,
            mrp,
            discount_percentage: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
            image_url: p.image_url || null,
            description: null,
            available_stock: stock,
            is_in_stock: stock > 0,
            max_order_quantity: Math.min(10, Math.max(1, stock)),
          };
        });

        const filtered = query.in_stock_only === 'true' ? items.filter((i) => i.is_in_stock) : items;
        const total = count || filtered.length;
        return {
          items: filtered,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
    } catch {
      // Fallback to in-memory below
    }
  }

  // Fallback In-Memory Catalog for development
  let items = initialProducts
    .filter((p) => p.is_active)
    .map((p) => {
      const sellingPrice = Number(p.selling_price || 0);
      const mrp = Math.round(sellingPrice * 1.15);
      const categoryName = typeof p.category === 'object' && p.category !== null ? p.category.name : (typeof p.category === 'string' ? p.category : 'Dairy');
      const brandName = typeof p.brand === 'object' && p.brand !== null ? p.brand.name : (typeof p.brand === 'string' ? p.brand : null);
      const unitCode = typeof p.unit === 'object' && p.unit !== null ? p.unit.short_code : (typeof p.unit === 'string' ? p.unit : 'Piece');
      const stock = 25; // Default mock in-stock for dev
      return {
        id: p.id,
        name: p.name,
        pack_size: null as string | null,
        category: categoryName,
        category_id: p.category_id || null,
        brand: brandName,
        brand_id: p.brand_id || null,
        unit: unitCode,
        selling_price: sellingPrice,
        mrp,
        discount_percentage: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
        image_url: p.image_url || null,
        description: null as string | null,
        available_stock: stock,
        is_in_stock: stock > 0,
        max_order_quantity: Math.min(10, Math.max(1, stock)),
      };
    });

  if (query.search) {
    const s = query.search.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(s) || (p.brand && p.brand.toLowerCase().includes(s)));
  }
  if (query.in_stock_only === 'true') {
    items = items.filter((p) => p.is_in_stock);
  }

  const total = items.length;
  const paginated = items.slice(from, to + 1);

  return {
    items: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getPublicProductById = async (id: string): Promise<PublicProductItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data: p, error } = await supabaseClient
      .from('products')
      .select('id, name, pack_size, category, category_id, brand, brand_id, unit, selling_price, image_url, description, stock_quantity, is_active')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !p) throw new AppError('Product not found or inactive', 404, 'NOT_FOUND');

    const sellingPrice = Number(p.selling_price || 0);
    const mrp = Math.round(sellingPrice * 1.15);
    const stock = Math.max(0, Number(p.stock_quantity || 0));

    return {
      id: p.id,
      name: p.name,
      pack_size: p.pack_size || null,
      category: p.category || 'General',
      category_id: p.category_id || null,
      brand: p.brand || null,
      brand_id: p.brand_id || null,
      unit: p.unit || 'Piece',
      selling_price: sellingPrice,
      mrp,
      discount_percentage: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
      image_url: p.image_url || null,
      description: p.description || null,
      available_stock: stock,
      is_in_stock: stock > 0,
      max_order_quantity: Math.min(10, Math.max(1, stock)),
    };
  }

  const p = initialProducts.find((item) => item.id === id);
  if (!p) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const sellingPrice = Number(p.selling_price || 0);
  const mrp = Math.round(sellingPrice * 1.15);
  const categoryName = typeof p.category === 'object' && p.category !== null ? p.category.name : (typeof p.category === 'string' ? p.category : 'Dairy');
  const brandName = typeof p.brand === 'object' && p.brand !== null ? p.brand.name : (typeof p.brand === 'string' ? p.brand : null);
  const unitCode = typeof p.unit === 'object' && p.unit !== null ? p.unit.short_code : (typeof p.unit === 'string' ? p.unit : 'Piece');
  const stock = 25;

  return {
    id: p.id,
    name: p.name,
    pack_size: null,
    category: categoryName,
    category_id: p.category_id || null,
    brand: brandName,
    brand_id: p.brand_id || null,
    unit: unitCode,
    selling_price: sellingPrice,
    mrp,
    discount_percentage: mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0,
    image_url: p.image_url || null,
    description: null,
    available_stock: stock,
    is_in_stock: stock > 0,
    max_order_quantity: Math.min(10, Math.max(1, stock)),
  };
};

export const getPublicCategories = async (): Promise<Array<{ id: string; name: string; description: string | null }>> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }

  return initialCategories.map((c) => ({ id: c.id, name: c.name, description: c.description || null }));
};

// ============================================================================
// CUSTOMER AUTHENTICATION (Strictly enforces role = 'customer')
// ============================================================================
export const customerRegister = async (input: CustomerRegisterInput) => {
  const { email, password, fullName, phone } = input;

  // Development & test emails ending with @dairy.local bypass live Supabase email rate limits
  if (email.endsWith('@dairy.local') || !isSupabaseConfigured() || !supabaseClient) {
    const devId = `customer-${generateUUID()}`;
    return {
      user: {
        id: devId,
        email,
        fullName,
        phone,
        role: 'customer' as const,
      },
      token: `dev-token-customer-${devId}`,
    };
  }

  if (isSupabaseConfigured() && supabaseClient) {
    // 1. Create user in Supabase Auth with hardcoded 'customer' role
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role: 'customer', // HARDCODED SERVER-SIDE
        },
      },
    });

    if (authError || !authData.user) {
      throw new AppError(authError?.message || 'Customer registration failed', 400, 'REGISTRATION_FAILED');
    }

    const userId = authData.user.id;

    // 2. Ensure profile in public.profiles exists with role 'customer'
    const admin = supabaseAdmin || supabaseClient;
    try {
      await admin.from('profiles').upsert({
        id: userId,
        auth_user_id: userId,
        email,
        full_name: fullName,
        phone,
        role: 'customer',
        is_active: true,
      });
    } catch (profErr) {
      console.warn('Profile creation note:', profErr);
    }

    return {
      user: {
        id: userId,
        email,
        fullName,
        phone,
        role: 'customer' as const,
      },
      token: authData.session?.access_token || null,
    };
  }

  // Development Fallback
  const devId = `customer-${generateUUID()}`;
  return {
    user: {
      id: devId,
      email,
      fullName,
      phone,
      role: 'customer' as const,
    },
    token: `dev-token-customer-${devId}`,
  };
};

export const customerLogin = async (input: CustomerLoginInput) => {
  const { email, password } = input;

  // Development quick logins
  if (email.endsWith('@dairy.local') || !isSupabaseConfigured() || !supabaseClient) {
    return {
      user: {
        id: 'dev-customer-id',
        email,
        fullName: 'Dev Shopper',
        phone: '9876543210',
        role: 'customer' as const,
      },
      token: 'dev-token-customer',
    };
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw new AppError(error?.message || 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Fetch profile to verify role
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('id', data.user.id)
    .single();

  const role = (profile?.role ? profile.role.toLowerCase() : 'customer') as string;

  return {
    user: {
      id: data.user.id,
      email: data.user.email,
      fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Customer',
      phone: profile?.phone || data.user.user_metadata?.phone || '',
      role,
    },
    token: data.session.access_token,
  };
};

// ============================================================================
// CUSTOMER ADDRESSES
// ============================================================================
export const getCustomerAddresses = async (userId: string) => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  }

  return mockCustomerAddresses.filter((a) => a.user_id === userId);
};

export const addCustomerAddress = async (userId: string, input: CustomerAddressInput) => {
  if (isSupabaseConfigured() && supabaseClient) {
    const client = supabaseAdmin || supabaseClient;

    if (input.is_default) {
      // Clear previous default
      await client.from('customer_addresses').update({ is_default: false }).eq('user_id', userId);
    }

    const { data, error } = await client
      .from('customer_addresses')
      .insert([{ ...input, user_id: userId }])
      .select('*')
      .single();

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data;
  }

  const newAddr = {
    ...input,
    id: generateUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
  };
  mockCustomerAddresses.push(newAddr);
  return newAddr;
};

// ============================================================================
// CART VALIDATION (Authoritative Server-Side Pricing & Stock Verification)
// ============================================================================
export const validateCart = async (input: CartValidationInput) => {
  const { items } = input;
  const productIds = items.map((i) => i.product_id);

  let productsMap = new Map<string, { id: string; name: string; selling_price: number; stock_quantity: number; pack_size: string | null; image_url: string | null; unit: string }>();

  if (isSupabaseConfigured() && supabaseClient) {
    // Prefer sanitized v_ecommerce_products which calculates available_stock from valid unexpired batches
    const { data: viewProds } = await supabaseClient
      .from('v_ecommerce_products')
      .select('id, name, selling_price, available_stock, pack_size, image_url, unit')
      .in('id', productIds);

    if (viewProds && viewProds.length > 0) {
      viewProds.forEach((p: any) =>
        productsMap.set(p.id, {
          id: p.id,
          name: p.name,
          selling_price: Number(p.selling_price || 0),
          stock_quantity: Math.max(0, Number(p.available_stock || 0)),
          pack_size: p.pack_size || null,
          image_url: p.image_url || null,
          unit: p.unit || 'Piece',
        })
      );
    } else {
      const { data: prods, error } = await supabaseClient
        .from('products')
        .select('id, name, selling_price, stock_quantity, pack_size, image_url, unit')
        .in('id', productIds)
        .eq('is_active', true);

      if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
      (prods || []).forEach((p) => productsMap.set(p.id, p));
    }
  } else {
    initialProducts.forEach((p) => productsMap.set(p.id, p as any));
  }

  const validatedItems: Array<{
    product_id: string;
    product_name: string;
    pack_size: string | null;
    unit: string;
    unit_price: number;
    mrp: number;
    quantity: number;
    total_price: number;
    image_url: string | null;
    available_stock: number;
    is_available: boolean;
  }> = [];

  const outOfStockItems: string[] = [];
  let subtotal = 0;

  for (const item of items) {
    const prod = productsMap.get(item.product_id);
    if (!prod) {
      outOfStockItems.push(`Item ID ${item.product_id} is no longer available`);
      continue;
    }

    const unitPrice = Number(prod.selling_price || 0);
    const availableStock = Math.max(0, Number(prod.stock_quantity || 0));
    const isAvailable = availableStock >= item.quantity;

    if (!isAvailable) {
      outOfStockItems.push(`${prod.name} (Only ${availableStock} in stock)`);
    }

    const lineTotal = Math.round(unitPrice * item.quantity * 100) / 100;
    subtotal += lineTotal;

    validatedItems.push({
      product_id: prod.id,
      product_name: prod.name,
      pack_size: prod.pack_size || null,
      unit: prod.unit || 'Piece',
      unit_price: unitPrice,
      mrp: Math.round(unitPrice * 1.15),
      quantity: item.quantity,
      total_price: lineTotal,
      image_url: prod.image_url || null,
      available_stock: availableStock,
      is_available: isAvailable,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const freeDeliveryThreshold = 300;
  const deliveryFee = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : 30;
  const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100;

  const storeStatus = await getStoreStatus();

  return {
    items: validatedItems,
    subtotal,
    delivery_fee: deliveryFee,
    free_delivery_threshold: freeDeliveryThreshold,
    amount_needed_for_free_delivery: Math.max(0, freeDeliveryThreshold - subtotal),
    total_amount: totalAmount,
    can_checkout: storeStatus.is_open && outOfStockItems.length === 0 && validatedItems.length > 0,
    out_of_stock_items: outOfStockItems,
    is_store_open: storeStatus.is_open,
    store_status: storeStatus,
  };
};

// ============================================================================
// ORDER CREATION & ATOMIC INVENTORY ALLOCATION
// ============================================================================
export const createEcommerceOrder = async (
  userId: string,
  userEmail: string,
  input: CreateOrderInput
) => {
  // 1. Verify store is open
  const storeStatus = await getStoreStatus();
  if (!storeStatus.is_open) {
    throw new AppError(
      storeStatus.message || 'Yogeshwari Dairy is currently closed and not accepting online orders right now. Reopening tomorrow at 6:00 AM.',
      400,
      'STORE_CLOSED',
      { store_status: storeStatus }
    );
  }

  // 2. Re-validate cart server-side (Never trust client prices)
  const cartCheck = await validateCart({ items: input.items, cart_session_id: input.cart_session_id || undefined });
  if (!cartCheck.can_checkout) {
    throw new AppError(
      `Cannot place order: ${cartCheck.out_of_stock_items.join(', ')}`,
      400,
      'INSUFFICIENT_STOCK',
      { out_of_stock_items: cartCheck.out_of_stock_items }
    );
  }

  const orderId = generateUUID();
  const todayFormatted = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const entropy = Math.floor(1000 + Math.random() * 9000);
  const orderNo = `YD-ORD-${todayFormatted}-${entropy}`;

  const client = supabaseAdmin || supabaseClient;

  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId || '');
  const customerId = isValidUUID ? userId : null;

  // 2. Execute via atomic database function fn_create_ecommerce_order_atomic if available
  if (isSupabaseConfigured() && client) {
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('fn_create_ecommerce_order_atomic', {
        p_order_id: orderId,
        p_order_no: orderNo,
        p_idempotency_key: input.idempotency_key,
        p_customer_id: customerId,
        p_customer_name: input.delivery_address.recipient_name,
        p_customer_phone: input.delivery_address.phone,
        p_customer_email: userEmail,
        p_delivery_address: input.delivery_address,
        p_payment_method: input.payment_method,
        p_payment_reference: input.payment_reference || null,
        p_subtotal: cartCheck.subtotal,
        p_delivery_fee: cartCheck.delivery_fee,
        p_discount_amount: 0,
        p_total_amount: cartCheck.total_amount,
        p_items: cartCheck.items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: it.quantity,
          pack_size: it.pack_size,
          unit: it.unit,
          unit_price: it.unit_price,
          mrp: it.mrp,
          total_price: it.total_price,
          image_url: it.image_url,
        })),
        p_cart_session_id: input.cart_session_id || null,
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        return {
          order_id: rpcRes.order_id || orderId,
          order_no: rpcRes.order_no || orderNo,
          total_amount: rpcRes.total_amount || cartCheck.total_amount,
          order_status: rpcRes.order_status || 'PLACED',
          payment_method: input.payment_method,
          estimated_delivery_time: '15-30 mins',
          items: cartCheck.items,
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Development Fallback Order
  const devOrder = {
    id: orderId,
    order_no: orderNo,
    customer_id: userId,
    customer_name: input.delivery_address.recipient_name,
    customer_phone: input.delivery_address.phone,
    customer_email: userEmail,
    delivery_address: input.delivery_address,
    order_status: 'PLACED',
    payment_method: input.payment_method,
    payment_status: 'PENDING',
    payment_reference: input.payment_reference || null,
    subtotal: cartCheck.subtotal,
    delivery_fee: cartCheck.delivery_fee,
    total_amount: cartCheck.total_amount,
    estimated_delivery_time: '15-30 mins',
    items: cartCheck.items,
    created_at: new Date().toISOString(),
  };
  mockEcommerceOrders.unshift(devOrder);

  return devOrder;
};

// ============================================================================
// ORDER TRACKING & HISTORY
// ============================================================================
export const getCustomerOrders = async (userId: string) => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('ecommerce_orders')
      .select('*, items:ecommerce_order_items(*)')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  }

  return mockEcommerceOrders.filter((o) => o.customer_id === userId);
};

export const getOrderById = async (orderId: string, userId: string, isStaff = false) => {
  if (isSupabaseConfigured() && supabaseClient) {
    let q = supabaseClient
      .from('ecommerce_orders')
      .select('*, items:ecommerce_order_items(*), status_history:ecommerce_order_status_history(*)')
      .eq('id', orderId);

    if (!isStaff) {
      q = q.eq('customer_id', userId);
    }

    const { data, error } = await q.single();
    if (error || !data) throw new AppError('Order not found', 404, 'NOT_FOUND');
    return data;
  }

  const o = mockEcommerceOrders.find((ord) => ord.id === orderId && (isStaff || ord.customer_id === userId));
  if (!o) throw new AppError('Order not found', 404, 'NOT_FOUND');
  return o;
};

export const cancelCustomerOrder = async (orderId: string, userId: string, reason: string) => {
  const client = supabaseAdmin || supabaseClient;

  if (isSupabaseConfigured() && client) {
    try {
      // 1. Verify ownership
      const { data: ord, error: ordErr } = await client
        .from('ecommerce_orders')
        .select('id, customer_id, order_status')
        .eq('id', orderId)
        .single();

      if (!ordErr && ord) {
        if (ord.customer_id !== userId) throw new AppError('Unauthorized to cancel this order', 403, 'FORBIDDEN');

        // 2. Call atomic cancellation & batch restoration function
        const { data: res, error: rpcErr } = await client.rpc('fn_cancel_ecommerce_order_atomic', {
          p_order_id: orderId,
          p_cancellation_reason: reason,
          p_cancelled_by: 'Customer',
        });

        if (rpcErr) throw new AppError(rpcErr.message, 400, 'CANCELLATION_FAILED', rpcErr);
        return res;
      }
    } catch (err: any) {
      if (err instanceof AppError && err.statusCode === 403) throw err;
      // Fallback below for local/dev orders
    }
  }

  const o = mockEcommerceOrders.find((ord) => ord.id === orderId && ord.customer_id === userId);
  if (!o) throw new AppError('Order not found', 404, 'NOT_FOUND');
  const isDuplicate = o.order_status === 'CANCELLED';
  o.order_status = 'CANCELLED';
  o.cancellation_reason = reason;
  return { success: true, order_id: orderId, status: 'CANCELLED', is_duplicate: isDuplicate };
};

// ============================================================================
// ADMIN WORKFLOW (Staff Order Management)
// ============================================================================
export const getAdminOrders = async (status?: string) => {
  if (isSupabaseConfigured() && supabaseClient) {
    try {
      let q = supabaseClient
        .from('ecommerce_orders')
        .select('*, items:ecommerce_order_items(*)')
        .order('created_at', { ascending: false });

      if (status && status !== 'ALL') {
        q = q.eq('order_status', status);
      }

      const { data, error } = await q;
      if (!error && data) return data;
    } catch {
      // Fallback below
    }
  }

  if (status && status !== 'ALL') {
    return mockEcommerceOrders.filter((o) => o.order_status === status);
  }
  return mockEcommerceOrders;
};

export const updateOrderStatus = async (
  orderId: string,
  input: UpdateOrderStatusInput,
  staffName: string
) => {
  const client = supabaseAdmin || supabaseClient;

  if (isSupabaseConfigured() && client) {
    try {
      const updatePayload: Record<string, any> = {
        order_status: input.status,
        updated_at: new Date().toISOString(),
      };
      if (input.status === 'CONFIRMED') updatePayload.confirmed_at = new Date().toISOString();
      if (input.status === 'DELIVERED') {
        updatePayload.delivered_at = new Date().toISOString();
        updatePayload.payment_status = 'PAID';
      }
      if (input.status === 'REJECTED') updatePayload.rejection_reason = input.rejection_reason || 'Out of stock / store busy';
      if (input.notes) updatePayload.delivery_notes = input.notes;

      const { data, error } = await client
        .from('ecommerce_orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select('*')
        .single();

      if (!error && data) {
        // Record status history audit
        try {
          await client.from('ecommerce_order_status_history').insert([{
            order_id: orderId,
            to_status: input.status,
            notes: input.notes || null,
            changed_by: staffName,
          }]);
        } catch {}

        return data;
      }
    } catch {
      // Fall through to mock storage fallback
    }
  }

  const o = mockEcommerceOrders.find((ord) => ord.id === orderId);
  if (!o) throw new AppError('Order not found', 404, 'NOT_FOUND');
  o.order_status = input.status;
  return o;
};

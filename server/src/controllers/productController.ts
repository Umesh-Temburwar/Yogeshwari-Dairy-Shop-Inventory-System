import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ProductQueryInput } from '../schemas/productSchemas.js';

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

interface OfficialImageCandidate {
  url: string;
  label: string;
  source: 'openfoodfacts_barcode' | 'openfoodfacts_search';
  barcode?: string;
}

const isValidHttpUrl = (value: unknown): value is string =>
  typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'));

const extractOffUrls = (product?: OffProductPayload): string[] => {
  if (!product) return [];
  const urls: string[] = [];
  const push = (val: unknown) => {
    if (isValidHttpUrl(val)) {
      const normalized = val.trim().replace(/^http:\/\//i, 'https://');
      if (!urls.includes(normalized)) urls.push(normalized);
    }
  };
  push(product.image_front_url);
  push(product.image_url);
  const display = product.selected_images?.front?.display;
  if (display && typeof display === 'object') {
    for (const val of Object.values(display)) push(val);
  }
  return urls;
};

const fetchJsonWithTimeout = async <T>(url: string, timeoutMs = 7000): Promise<T | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'YogeshwariDairyPOS/1.0',
        Accept: 'application/json'
      }
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const lookupOfficialImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode.trim().replace(/\s+/g, '') : '';
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    const brand = typeof req.query.brand === 'string' ? req.query.brand.trim() : '';

    if (!barcode && !name && !brand) {
      sendSuccess(res, { candidates: [] });
      return;
    }

    const candidates: OfficialImageCandidate[] = [];
    const seen = new Set<string>();
    const addCandidate = (c: OfficialImageCandidate) => {
      if (candidates.length >= 4 || seen.has(c.url)) return;
      seen.add(c.url);
      candidates.push(c);
    };

    if (barcode && /^\d{8,14}$/.test(barcode)) {
      const endpoints = [
        `https://in.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,image_front_url,image_url,selected_images`,
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,brands,image_front_url,image_url,selected_images`
      ];
      for (const endpoint of endpoints) {
        if (candidates.length >= 4) break;
        const data = await fetchJsonWithTimeout<{ status?: number; product?: OffProductPayload }>(endpoint);
        if (data?.status === 1 && data.product) {
          const label = [data.product.brands, data.product.product_name].filter(Boolean).join(' - ') || `Barcode ${barcode}`;
          for (const url of extractOffUrls(data.product)) {
            addCandidate({ url, label, source: 'openfoodfacts_barcode', barcode });
          }
        }
      }
    }

    if (candidates.length < 4 && (name || brand)) {
      const q = [brand, name].filter(Boolean).join(' ').trim();
      const searchUrl =
        `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
        `&search_simple=1&action=process&json=1&page_size=8&fields=code,product_name,brands,image_front_url,image_url,selected_images`;
      const data = await fetchJsonWithTimeout<{ products?: OffProductPayload[] }>(searchUrl);
      const list = Array.isArray(data?.products) ? data.products : [];
      for (const item of list) {
        if (candidates.length >= 4) break;
        const urls = extractOffUrls(item);
        if (urls.length > 0) {
          const label = [item.brands, item.product_name].filter(Boolean).join(' - ') || q;
          addCandidate({ url: urls[0], label, source: 'openfoodfacts_search', barcode: item.code });
        }
      }
    }

    sendSuccess(res, { candidates });
  } catch (error) {
    next(error);
  }
};

export const listProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ProductQueryInput;
    const result = await productService.getProducts(query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.getProductById(req.params.id);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await productService.deleteProduct(req.params.id);
    sendSuccess(res, null, 'Product deactivated successfully');
  } catch (error) {
    next(error);
  }
};


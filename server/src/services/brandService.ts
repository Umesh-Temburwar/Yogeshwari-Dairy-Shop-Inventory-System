import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialBrands, BrandItem } from './storeFallback.js';
import { CreateBrandInput, UpdateBrandInput } from '../schemas/brandSchemas.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

let inMemoryBrands = [...initialBrands];

export const getBrands = async (): Promise<BrandItem[]> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }
  return inMemoryBrands;
};

export const getBrandById = async (id: string): Promise<BrandItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Brand not found', 404, 'NOT_FOUND');
    return data;
  }

  const brand = inMemoryBrands.find((b) => b.id === id);
  if (!brand) throw new AppError('Brand not found', 404, 'NOT_FOUND');
  return brand;
};

export const createBrand = async (input: CreateBrandInput): Promise<BrandItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('brands')
      .insert([input])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Brand with this name already exists', 409, 'DUPLICATE_RESOURCE');
      }
      throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    }
    return data;
  }

  const existing = inMemoryBrands.find((b) => b.name.toLowerCase() === input.name.toLowerCase());
  if (existing) {
    throw new AppError('Brand with this name already exists', 409, 'DUPLICATE_RESOURCE');
  }

  const newBrand: BrandItem = {
    id: crypto.randomUUID(),
    name: input.name,
    created_at: new Date().toISOString(),
  };

  inMemoryBrands.push(newBrand);
  return newBrand;
};

export const updateBrand = async (id: string, input: UpdateBrandInput): Promise<BrandItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('brands')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update brand', 400, 'UPDATE_FAILED', error);
    return data;
  }

  const index = inMemoryBrands.findIndex((b) => b.id === id);
  if (index === -1) throw new AppError('Brand not found', 404, 'NOT_FOUND');

  inMemoryBrands[index] = {
    ...inMemoryBrands[index],
    ...input,
  };
  return inMemoryBrands[index];
};

export const deleteBrand = async (id: string): Promise<void> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { error } = await supabaseClient
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400, 'DELETE_FAILED', error);
    return;
  }

  const index = inMemoryBrands.findIndex((b) => b.id === id);
  if (index === -1) throw new AppError('Brand not found', 404, 'NOT_FOUND');
  inMemoryBrands.splice(index, 1);
};


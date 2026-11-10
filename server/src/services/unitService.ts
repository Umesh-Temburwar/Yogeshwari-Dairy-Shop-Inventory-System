import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialUnits, UnitItem } from './storeFallback.js';
import { CreateUnitInput, UpdateUnitInput } from '../schemas/unitSchemas.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

let inMemoryUnits = [...initialUnits];

export const getUnits = async (): Promise<UnitItem[]> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('units')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }
  return inMemoryUnits;
};

export const getUnitById = async (id: string): Promise<UnitItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('units')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Unit not found', 404, 'NOT_FOUND');
    return data;
  }

  const unit = inMemoryUnits.find((u) => u.id === id);
  if (!unit) throw new AppError('Unit not found', 404, 'NOT_FOUND');
  return unit;
};

export const createUnit = async (input: CreateUnitInput): Promise<UnitItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('units')
      .insert([input])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Unit with this name already exists', 409, 'DUPLICATE_RESOURCE');
      }
      throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    }
    return data;
  }

  const existing = inMemoryUnits.find((u) => u.name.toLowerCase() === input.name.toLowerCase());
  if (existing) {
    throw new AppError('Unit with this name already exists', 409, 'DUPLICATE_RESOURCE');
  }

  const newUnit: UnitItem = {
    id: crypto.randomUUID(),
    name: input.name,
    short_code: input.short_code,
    created_at: new Date().toISOString(),
  };

  inMemoryUnits.push(newUnit);
  return newUnit;
};

export const updateUnit = async (id: string, input: UpdateUnitInput): Promise<UnitItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('units')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update unit', 400, 'UPDATE_FAILED', error);
    return data;
  }

  const index = inMemoryUnits.findIndex((u) => u.id === id);
  if (index === -1) throw new AppError('Unit not found', 404, 'NOT_FOUND');

  inMemoryUnits[index] = {
    ...inMemoryUnits[index],
    ...input,
  };
  return inMemoryUnits[index];
};

export const deleteUnit = async (id: string): Promise<void> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { error } = await supabaseClient
      .from('units')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400, 'DELETE_FAILED', error);
    return;
  }

  const index = inMemoryUnits.findIndex((u) => u.id === id);
  if (index === -1) throw new AppError('Unit not found', 404, 'NOT_FOUND');
  inMemoryUnits.splice(index, 1);
};


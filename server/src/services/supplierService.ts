import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialSuppliers, SupplierItem } from './storeFallback.js';
import { CreateSupplierInput, UpdateSupplierInput } from '../schemas/supplierSchemas.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

let inMemorySuppliers = [...initialSuppliers];

export const getSuppliers = async (): Promise<SupplierItem[]> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }
  return inMemorySuppliers;
};

export const getSupplierById = async (id: string): Promise<SupplierItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
    return data;
  }

  const supplier = inMemorySuppliers.find((s) => s.id === id);
  if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
  return supplier;
};

export const createSupplier = async (input: CreateSupplierInput): Promise<SupplierItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('suppliers')
      .insert([input])
      .select()
      .single();

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data;
  }

  const newSupplier: SupplierItem = {
    id: crypto.randomUUID(),
    name: input.name,
    contact_person: input.contact_person ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    gst_number: input.gst_number || null,
    created_at: new Date().toISOString(),
  };

  inMemorySuppliers.push(newSupplier);
  return newSupplier;
};

export const updateSupplier = async (id: string, input: UpdateSupplierInput): Promise<SupplierItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('suppliers')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update supplier', 400, 'UPDATE_FAILED', error);
    return data;
  }

  const index = inMemorySuppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

  inMemorySuppliers[index] = {
    ...inMemorySuppliers[index],
    ...input,
  };
  return inMemorySuppliers[index];
};

export const deleteSupplier = async (id: string): Promise<void> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { error } = await supabaseClient
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400, 'DELETE_FAILED', error);
    return;
  }

  const index = inMemorySuppliers.findIndex((s) => s.id === id);
  if (index === -1) throw new AppError('Supplier not found', 404, 'NOT_FOUND');
  inMemorySuppliers.splice(index, 1);
};


import { supabaseClient, isSupabaseConfigured } from '../config/supabase.js';
import { initialCategories, CategoryItem } from './storeFallback.js';
import { CreateCategoryInput, UpdateCategoryInput } from '../schemas/categorySchemas.js';
import { AppError } from '../utils/AppError.js';
import crypto from 'crypto';

let inMemoryCategories = [...initialCategories];

export const getCategories = async (): Promise<CategoryItem[]> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    return data || [];
  }
  return inMemoryCategories;
};

export const getCategoryById = async (id: string): Promise<CategoryItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new AppError('Category not found', 404, 'NOT_FOUND');
    return data;
  }

  const category = inMemoryCategories.find((c) => c.id === id);
  if (!category) throw new AppError('Category not found', 404, 'NOT_FOUND');
  return category;
};

export const createCategory = async (input: CreateCategoryInput): Promise<CategoryItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('categories')
      .insert([input])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AppError('Category with this name already exists', 409, 'DUPLICATE_RESOURCE');
      }
      throw new AppError(error.message, 500, 'DATABASE_ERROR', error);
    }
    return data;
  }

  const existing = inMemoryCategories.find((c) => c.name.toLowerCase() === input.name.toLowerCase());
  if (existing) {
    throw new AppError('Category with this name already exists', 409, 'DUPLICATE_RESOURCE');
  }

  const newCategory: CategoryItem = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description ?? null,
    created_at: new Date().toISOString(),
  };

  inMemoryCategories.push(newCategory);
  return newCategory;
};

export const updateCategory = async (id: string, input: UpdateCategoryInput): Promise<CategoryItem> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { data, error } = await supabaseClient
      .from('categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new AppError('Failed to update category', 400, 'UPDATE_FAILED', error);
    return data;
  }

  const index = inMemoryCategories.findIndex((c) => c.id === id);
  if (index === -1) throw new AppError('Category not found', 404, 'NOT_FOUND');

  inMemoryCategories[index] = {
    ...inMemoryCategories[index],
    ...input,
  };
  return inMemoryCategories[index];
};

export const deleteCategory = async (id: string): Promise<void> => {
  if (isSupabaseConfigured() && supabaseClient) {
    const { error } = await supabaseClient
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw new AppError(error.message, 400, 'DELETE_FAILED', error);
    return;
  }

  const index = inMemoryCategories.findIndex((c) => c.id === id);
  if (index === -1) throw new AppError('Category not found', 404, 'NOT_FOUND');
  inMemoryCategories.splice(index, 1);
};


import { createClient } from '@supabase/supabase-js';

// Default to environment variables or localStorage overrides
export const getSupabaseConfig = () => {
  const localUrl = localStorage.getItem('supabase_url');
  const localKey = localStorage.getItem('supabase_key');
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: localUrl || envUrl || '',
    key: localKey || envKey || ''
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (url) localStorage.setItem('supabase_url', url);
  else localStorage.removeItem('supabase_url');
  
  if (key) localStorage.setItem('supabase_key', key);
  else localStorage.removeItem('supabase_key');
};

const config = getSupabaseConfig();

export const supabase = (config.url && config.key) 
  ? createClient(config.url, config.key) 
  : null;

export const testSupabaseConnection = async (url: string, key: string): Promise<{ success: boolean; message: string }> => {
  try {
    if (!url || !key) {
      return { success: false, message: 'URL and Anon Key cannot be empty' };
    }
    const testClient = createClient(url, key);
    const { error } = await testClient.from('products').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: error.message || 'Connection failed' };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error while connecting to Supabase' };
  }
};


import { createClient } from '@supabase/supabase-js';

// RFC4122 v4 compliant UUID generator for Postgres UUID primary keys
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Canonical Cloud Supabase Credentials
const CANONICAL_CLOUD_URL = 'https://pfamoxreojbejufwhgiu.supabase.co';
const CANONICAL_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E';

// Default to environment variables or localStorage overrides
export const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_key') : null;
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // Prevent invalid localhost/127.0.0.1 overrides from breaking multi-device cloud synchronization
  const effectiveUrl = (localUrl && !localUrl.includes('localhost') && !localUrl.includes('127.0.0.1'))
    ? localUrl
    : (envUrl || CANONICAL_CLOUD_URL);

  const effectiveKey = (localKey && localKey.length > 20)
    ? localKey
    : (envKey || CANONICAL_CLOUD_KEY);

  return {
    url: effectiveUrl,
    key: effectiveKey
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
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    }) 
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


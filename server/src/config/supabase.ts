import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ENV } from './env.js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(ENV.SUPABASE_URL && (ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY));
};

if (isSupabaseConfigured()) {
  const url = ENV.SUPABASE_URL;
  const anonKey = ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY;
  supabaseClient = createClient(url, anonKey);

  if (ENV.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(url, ENV.SUPABASE_SERVICE_ROLE_KEY);
  } else {
    supabaseAdmin = supabaseClient;
  }
}

export { supabaseClient, supabaseAdmin };


import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
const CANONICAL_CLOUD_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmYW1veHJlb2piZWp1ZndoZ2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzNzc0MjEsImV4cCI6MjEwOTk1MzQyMX0.p97fdh4S8TxkVhQN5z14AApdFj6x5zsqPTQlLSXlD8E';

// Default to environment variables or localStorage overrides
export const getSupabaseConfig = () => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('supabase_key') : null;

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // Prevent invalid localhost/127.0.0.1 overrides from breaking multi-device cloud synchronization
  const effectiveUrl =
    localUrl && !localUrl.includes('localhost') && !localUrl.includes('127.0.0.1')
      ? localUrl
      : envUrl || CANONICAL_CLOUD_URL;

  const effectiveKey = localKey && localKey.length > 20 ? localKey : envKey || CANONICAL_CLOUD_KEY;

  return {
    url: effectiveUrl,
    key: effectiveKey,
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (url) localStorage.setItem('supabase_url', url);
  else localStorage.removeItem('supabase_url');

  if (key) localStorage.setItem('supabase_key', key);
  else localStorage.removeItem('supabase_key');
};

/**
 * Computes the canonical GoTrue localStorage key (`sb-<projectRef>-auth-token`)
 * matching @supabase/supabase-js default so existing valid sessions remain intact.
 */
export const getSupabaseAuthStorageKey = (url: string): string => {
  try {
    const projectRef = new URL(url).hostname.split('.')[0];
    if (projectRef) {
      return `sb-${projectRef}-auth-token`;
    }
  } catch {
    // Fall through to safe fallback key
  }
  return 'sb-ydo-auth-token';
};

/**
 * Inspects ONLY the Supabase auth storage entry before client init to remove
 * structurally corrupt JSON or an expired access token missing a refresh token.
 * NEVER clears valid or intact sessions.
 */
const sanitizeCorruptAuthStorage = (storageKey: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      window.localStorage.removeItem(storageKey);
      return;
    }

    const record = parsed as Record<string, unknown>;
    const refreshToken = typeof record.refresh_token === 'string' ? record.refresh_token.trim() : '';
    const accessToken = typeof record.access_token === 'string' ? record.access_token.trim() : '';
    const expiresAt = typeof record.expires_at === 'number' ? record.expires_at : null;
    const nowSec = Math.floor(Date.now() / 1000);

    // Only purge if unmistakably malformed (e.g. no access token, or expired with empty refresh token)
    if (!accessToken || (!refreshToken && expiresAt !== null && expiresAt <= nowSec)) {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(`${storageKey}-code-verifier`);
    }
  } catch {
    // Unparseable JSON in auth storage key — remove only this broken key
    try {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem(`${storageKey}-code-verifier`);
    } catch {
      // Ignore storage access errors
    }
  }
};

// Strict global singleton holder so Vite HMR / duplicate module evaluation never creates 2 GoTrue clients
interface SupabaseSingletonHolder {
  signature: string;
  storageKey: string;
  client: SupabaseClient;
}

const GLOBAL_SINGLETON_KEY = '__ydo_supabase_singleton_v1__';

const getGlobalScope = (): Record<string, unknown> => {
  if (typeof globalThis !== 'undefined') return globalThis as unknown as Record<string, unknown>;
  if (typeof window !== 'undefined') return window as unknown as Record<string, unknown>;
  return {};
};

const createSharedSupabaseClient = (): { client: SupabaseClient | null; storageKey: string } => {
  const config = getSupabaseConfig();
  const storageKey = getSupabaseAuthStorageKey(config.url);

  if (!config.url || !config.key) {
    return { client: null, storageKey };
  }

  const signature = `${config.url}::${config.key}`;
  const scope = getGlobalScope();
  const existing = scope[GLOBAL_SINGLETON_KEY] as SupabaseSingletonHolder | undefined;

  if (existing && existing.signature === signature) {
    return { client: existing.client, storageKey: existing.storageKey };
  }

  // If credentials changed at runtime, cleanly stop auto-refresh on any superseded instance
  if (existing && existing.signature !== signature) {
    try {
      existing.client.auth.stopAutoRefresh();
    } catch {
      // Ignore cleanup errors on superseded client
    }
  }

  sanitizeCorruptAuthStorage(storageKey);

  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });

  scope[GLOBAL_SINGLETON_KEY] = {
    signature,
    storageKey,
    client,
  } satisfies SupabaseSingletonHolder;

  return { client, storageKey };
};

const shared = createSharedSupabaseClient();

export const supabase: SupabaseClient | null = shared.client;
export const SUPABASE_AUTH_STORAGE_KEY: string = shared.storageKey;

/**
 * Classifies unrecoverable Supabase refresh-token / expired-session errors.
 * Explicitly returns `false` for offline or transient network/5xx errors so
 * temporary connectivity drops never force a logout.
 */
export const isInvalidRefreshTokenError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  // Never treat offline state as an invalid refresh token
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const errObj = error as {
    code?: unknown;
    message?: unknown;
    error_description?: unknown;
    status?: unknown;
    statusCode?: unknown;
    name?: unknown;
  };

  const code = typeof errObj.code === 'string' ? errObj.code.toLowerCase() : '';
  const message = typeof errObj.message === 'string' ? errObj.message.toLowerCase() : '';
  const desc = typeof errObj.error_description === 'string' ? errObj.error_description.toLowerCase() : '';
  const combined = `${code} ${message} ${desc}`;
  const status =
    typeof errObj.status === 'number'
      ? errObj.status
      : typeof errObj.statusCode === 'number'
      ? errObj.statusCode
      : null;

  // Transient network / server failures are NOT invalid refresh token errors
  if (
    status === 0 ||
    (status !== null && status >= 500) ||
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('network request failed') ||
    combined.includes('load failed') ||
    combined.includes('timeout') ||
    combined.includes('aborterror')
  ) {
    return false;
  }

  // Known unrecoverable GoTrue refresh-token error codes
  if (
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'invalid_refresh_token' ||
    code === 'session_not_found' ||
    code === 'session_expired'
  ) {
    return true;
  }

  // Known unrecoverable GoTrue refresh-token messages
  if (
    combined.includes('invalid refresh token') ||
    combined.includes('refresh token not found') ||
    combined.includes('already used') ||
    combined.includes('invalid_grant') ||
    combined.includes('session_not_found') ||
    combined.includes('token has expired or is invalid')
  ) {
    return true;
  }

  // AuthApiError 400 with token/refresh context
  if (status === 400 && (combined.includes('refresh') || combined.includes('token') || combined.includes('session'))) {
    return true;
  }

  return false;
};

// Single-flight deduplication promise to prevent concurrent stale-session cleanups or refresh loops
let inFlightStaleSessionClear: Promise<void> | null = null;

/**
 * Safely clears ONLY the broken Supabase local auth session when the refresh token
 * is genuinely unrecoverable (400 Invalid Refresh Token / Already Used / Revoked).
 * - Uses `{ scope: 'local' }` so other counters/devices stay signed in.
 * - Stops auto-refresh to prevent retry loops.
 * - Never exposes access/refresh tokens in logs.
 */
export const clearStaleSupabaseAuthSession = async (): Promise<void> => {
  if (inFlightStaleSessionClear) {
    return inFlightStaleSessionClear;
  }

  inFlightStaleSessionClear = (async () => {
    try {
      if (supabase) {
        try {
          supabase.auth.stopAutoRefresh();
        } catch {
          // Ignore timer stop errors
        }

        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // Ignore signOut errors when token is already dead
        }
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
          window.localStorage.removeItem(`${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`);
        } catch {
          // Ignore storage access errors
        }
      }
    } finally {
      inFlightStaleSessionClear = null;
    }
  })();

  return inFlightStaleSessionClear;
};

/**
 * Tests connectivity to a Supabase endpoint without spawning a persisting GoTrueClient
 * or competing autoRefreshToken timer.
 */
export const testSupabaseConnection = async (
  url: string,
  key: string
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!url || !key) {
      return { success: false, message: 'URL and Anon Key cannot be empty' };
    }

    const currentConfig = getSupabaseConfig();
    const clientToUse =
      supabase && url === currentConfig.url && key === currentConfig.key
        ? supabase
        : createClient(url, key, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storageKey: 'ydo-supabase-connection-test',
            },
          });

    const { error } = await clientToUse.from('products').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { success: false, message: error.message || 'Connection failed' };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error while connecting to Supabase';
    return { success: false, message };
  }
};

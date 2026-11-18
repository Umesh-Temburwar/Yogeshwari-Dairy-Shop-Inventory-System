/**
 * Deduplicated, TTL-cached cloud loader for Owner profile configuration
 * (`default_redirect_view` registration flag + `master_passcode_hash`).
 *
 * Consolidates previously separate `GET /profiles?role=eq.Owner` queries fired
 * across AuthContext, LoginPage, OwnerAdminCounterWidget, SettingsPage, and
 * security.ts into ONE single-flight query with a 5-minute TTL cache and
 * immediate invalidation on config writes.
 */

import { supabase } from './supabase';

export interface OwnerCloudConfig {
  default_redirect_view: string | null;
  master_passcode_hash: string | null;
}

const OWNER_CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedConfig: OwnerCloudConfig | null = null;
let cachedAt = 0;
let inFlightPromise: Promise<OwnerCloudConfig | null> | null = null;

export function invalidateOwnerConfigCache(): void {
  cachedConfig = null;
  cachedAt = 0;
}

export function updateOwnerConfigCachePartial(partial: Partial<OwnerCloudConfig>): void {
  cachedConfig = {
    default_redirect_view:
      partial.default_redirect_view !== undefined
        ? partial.default_redirect_view
        : cachedConfig?.default_redirect_view ?? null,
    master_passcode_hash:
      partial.master_passcode_hash !== undefined
        ? partial.master_passcode_hash
        : cachedConfig?.master_passcode_hash ?? null,
  };
  cachedAt = Date.now();
}

export async function fetchOwnerCloudConfig(forceRefresh = false): Promise<OwnerCloudConfig | null> {
  if (!supabase) return null;

  const now = Date.now();
  if (!forceRefresh && cachedConfig !== null && now - cachedAt < OWNER_CONFIG_TTL_MS) {
    return cachedConfig;
  }

  if (inFlightPromise && !forceRefresh) {
    return inFlightPromise;
  }

  const client = supabase;
  const request = (async (): Promise<OwnerCloudConfig | null> => {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('default_redirect_view, master_passcode_hash')
        .eq('role', 'Owner')
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0] as {
          default_redirect_view?: string | null;
          master_passcode_hash?: string | null;
        };
        const result: OwnerCloudConfig = {
          default_redirect_view: row.default_redirect_view ?? null,
          master_passcode_hash: row.master_passcode_hash ?? null,
        };
        cachedConfig = result;
        cachedAt = Date.now();
        return result;
      }

      // Fallback if master_passcode_hash column migration hasn't been applied on an older DB
      if (error && /master_passcode_hash/i.test(error.message || '')) {
        const { data: fallbackData, error: fallbackErr } = await client
          .from('profiles')
          .select('default_redirect_view')
          .eq('role', 'Owner')
          .limit(1);

        if (!fallbackErr && fallbackData && fallbackData.length > 0) {
          const row = fallbackData[0] as { default_redirect_view?: string | null };
          const result: OwnerCloudConfig = {
            default_redirect_view: row.default_redirect_view ?? null,
            master_passcode_hash: null,
          };
          cachedConfig = result;
          cachedAt = Date.now();
          return result;
        }
      }
    } catch {
      // Graceful offline fallback — callers retain localStorage state
    }

    return cachedConfig;
  })();

  inFlightPromise = request;
  try {
    return await request;
  } finally {
    if (inFlightPromise === request) {
      inFlightPromise = null;
    }
  }
}

/**
 * Yogeshwari Dairy Products - Cryptographic Security & Anti-Tamper Service
 * 
 * Provides:
 * 1. SHA-256 salted hash verification for Master Security Passcode.
 *    The raw passcode is NEVER stored in plain text anywhere in source or bundles.
 * 2. Brute-force protection with failed attempt tracking and timed lockout.
 * 3. Session security token generation and validation.
 */

import { supabase } from './supabase';
import {
  fetchOwnerCloudConfig,
  updateOwnerConfigCachePartial
} from './ownerConfigCache';

const SALT = 'YDO_MASTER_PASSCODE_SALT_v1_2026';
// Default pre-computed SHA-256 cryptographic salt-hash (used until user changes master passcode)
const DEFAULT_MASTER_HASH = '4b73c8ea67ccf828b42b2eed3ab6ac8fab85e62667607c1a572c044fa196cef1';

const STORAGE_MASTER_HASH = 'ydo_sec_master_hash_v1';
const STORAGE_MASTER_LENGTH = 'ydo_sec_master_length_v1';
const STORAGE_SESSION_TOKEN = 'ydo_sec_session_token_v1';
const STORAGE_FAILED_ATTEMPTS = 'ydo_sec_failed_attempts';
const STORAGE_LOCKOUT_UNTIL = 'ydo_sec_lockout_until';
const STORAGE_MASTER_LOCK_ENABLED = 'ydo_sec_master_lock_enabled_v1';
const STORAGE_UNLOCK_METHOD = 'ydo_sec_unlock_method_v1';
const SECURITY_SETTINGS_EVENT = 'ydo_security_settings_changed';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const PASSCODE_REGEX = /^\d{1,16}$/;
export const MIN_PASSCODE_LENGTH = 1;
export const MAX_PASSCODE_LENGTH = 16;

export type MasterUnlockMethod = 'both' | 'password' | 'fingerprint';

/**
 * Validates numeric digits-only master passcode of any length (1 to 16 digits).
 */
export function isValidMasterPasscodeFormat(value: string): boolean {
  return PASSCODE_REGEX.test(value.trim());
}

/** Whether Master Password lock screen is enabled (defaults to ON / true) */
export function isMasterLockEnabled(): boolean {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_MASTER_LOCK_ENABLED);
      if (stored === 'false') return false;
      if (stored === 'true') return true;
    }
  } catch {}
  return true;
}

export function setMasterLockEnabled(enabled: boolean): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_MASTER_LOCK_ENABLED, enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent(SECURITY_SETTINGS_EVENT));
    }
  } catch {}
}

/** Active unlock method for Master Security Gate ('both' | 'password' | 'fingerprint') */
export function getMasterUnlockMethod(): MasterUnlockMethod {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_UNLOCK_METHOD);
      if (stored === 'password' || stored === 'fingerprint' || stored === 'both') {
        return stored;
      }
    }
  } catch {}
  return 'both';
}

export function setMasterUnlockMethod(method: MasterUnlockMethod): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_UNLOCK_METHOD, method);
      window.dispatchEvent(new CustomEvent(SECURITY_SETTINGS_EVENT));
    }
  } catch {}
}

export function subscribeToSecuritySettings(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustom = () => listener();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_MASTER_LOCK_ENABLED || e.key === STORAGE_UNLOCK_METHOD) {
      listener();
    }
  };
  window.addEventListener(SECURITY_SETTINGS_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(SECURITY_SETTINGS_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

function isValidSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value.trim());
}

/**
 * Returns the active salted SHA-256 master passcode hash (custom if changed, else default).
 */
export function getActiveMasterHash(): string {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_MASTER_HASH);
      if (isValidSha256Hex(stored)) {
        return stored.trim().toLowerCase();
      }
    }
  } catch {}
  return DEFAULT_MASTER_HASH;
}

/**
 * Syncs custom master passcode SHA-256 hash from Supabase cloud (`public.profiles.master_passcode_hash`),
 * if the database migration has been applied and Supabase is connected.
 * Fails silently when offline or when column is not yet added.
 */
export async function syncMasterPasscodeHashFromCloud(forceRefresh = false): Promise<string> {
  if (!supabase) return getActiveMasterHash();

  try {
    const config = await fetchOwnerCloudConfig(forceRefresh);

    if (config && isValidSha256Hex(config.master_passcode_hash)) {
      const cloudHash = config.master_passcode_hash.trim().toLowerCase();
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_MASTER_HASH, cloudHash);
        }
      } catch {}
      return cloudHash;
    }
  } catch {
    // Graceful fallback to local hash when offline or column not yet created
  }

  return getActiveMasterHash();
}

/**
 * Returns the expected length of the master passcode (e.g. 8 for default, or custom length if set).
 */
export function getMasterPasscodeLength(): number | null {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_MASTER_LENGTH);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed >= MIN_PASSCODE_LENGTH && parsed <= MAX_PASSCODE_LENGTH) {
          return parsed;
        }
      }
    }
  } catch {}
  if (getActiveMasterHash() === DEFAULT_MASTER_HASH) {
    return 8;
  }
  return null;
}

export function setMasterPasscodeLength(len: number): void {
  try {
    if (typeof window !== 'undefined' && Number.isFinite(len) && len >= MIN_PASSCODE_LENGTH && len <= MAX_PASSCODE_LENGTH) {
      localStorage.setItem(STORAGE_MASTER_LENGTH, len.toString());
    }
  } catch {}
}

/**
 * Silently tests entered passcode against active master hash without penalizing failed attempts.
 * Enables instant auto-unlock as soon as the correct passcode is typed without pressing enter/unlock.
 */
export async function testMasterPasscodeSilently(enteredPin: string): Promise<boolean> {
  const trimmed = enteredPin.trim();
  if (!trimmed) return false;
  const activeHash = getActiveMasterHash();
  const computed = await computeSha256Hex(SALT + trimmed);
  return computed.length === 64 && computed.toLowerCase() === activeHash.toLowerCase();
}

/**
 * Computes SHA-256 hash in hex format using Web Crypto API
 */
export async function computeSha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) ||
                 (typeof window !== 'undefined' && window.crypto?.subtle);

  if (subtle) {
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  return '';
}

/**
 * Verifies entered passcode against encrypted SHA-256 salt-hash.
 * Plain-text passcode is never stored or compared in cleartext.
 */
export async function verifyMasterPasscode(enteredPin: string): Promise<{
  success: boolean;
  attemptsLeft: number;
  lockedUntil: number | null;
  error?: string;
}> {
  const now = Date.now();
  const lockoutUntil = getLockoutTimestamp();

  if (lockoutUntil && now < lockoutUntil) {
    return {
      success: false,
      attemptsLeft: 0,
      lockedUntil: lockoutUntil,
      error: 'SECURITY_LOCKED'
    };
  }

  const activeHash = getActiveMasterHash();
  const computed = await computeSha256Hex(SALT + enteredPin.trim());
  const isValid = computed.length === 64 && computed.toLowerCase() === activeHash.toLowerCase();

  if (isValid) {
    // Reset failed counter and lockout
    clearFailedAttempts();
    // Issue session token
    const token = await generateSessionToken();
    try {
      sessionStorage.setItem(STORAGE_SESSION_TOKEN, token);
    } catch {}
    return { success: true, attemptsLeft: MAX_ATTEMPTS, lockedUntil: null };
  } else {
    // Increment failed attempts
    const failed = incrementFailedAttempts();
    const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failed);

    if (attemptsLeft === 0) {
      const lockTime = now + LOCKOUT_DURATION_MS;
      setLockoutTimestamp(lockTime);
      return {
        success: false,
        attemptsLeft: 0,
        lockedUntil: lockTime,
        error: 'SECURITY_LOCKED'
      };
    }

    return {
      success: false,
      attemptsLeft,
      lockedUntil: null,
      error: 'INVALID_PASSCODE'
    };
  }
}

/**
 * Step 1 of Master Passcode Change:
 * Verifies the user's current 8-digit master passcode with full lockout protection
 * before unlocking the new passcode entry step.
 */
export async function verifyCurrentMasterPasscodeForChange(currentPin: string): Promise<{
  success: boolean;
  attemptsLeft: number;
  lockedUntil: number | null;
  error?: 'SECURITY_LOCKED' | 'INVALID_FORMAT' | 'INVALID_CURRENT_PASSCODE';
}> {
  const now = Date.now();
  const lockoutUntil = getLockoutTimestamp();

  if (lockoutUntil && now < lockoutUntil) {
    return {
      success: false,
      attemptsLeft: 0,
      lockedUntil: lockoutUntil,
      error: 'SECURITY_LOCKED'
    };
  }

  const trimmed = currentPin.trim();
  if (!isValidMasterPasscodeFormat(trimmed)) {
    return {
      success: false,
      attemptsLeft: Math.max(0, MAX_ATTEMPTS - getFailedAttempts()),
      lockedUntil: null,
      error: 'INVALID_FORMAT'
    };
  }

  // Pull latest cloud hash if available before verifying
  const activeHash = await syncMasterPasscodeHashFromCloud(true);
  const computed = await computeSha256Hex(SALT + trimmed);
  const isValid = computed.length === 64 && computed.toLowerCase() === activeHash.toLowerCase();

  if (isValid) {
    clearFailedAttempts();
    return { success: true, attemptsLeft: MAX_ATTEMPTS, lockedUntil: null };
  }

  const failed = incrementFailedAttempts();
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - failed);

  if (attemptsLeft === 0) {
    const lockTime = now + LOCKOUT_DURATION_MS;
    setLockoutTimestamp(lockTime);
    return {
      success: false,
      attemptsLeft: 0,
      lockedUntil: lockTime,
      error: 'SECURITY_LOCKED'
    };
  }

  return {
    success: false,
    attemptsLeft,
    lockedUntil: null,
    error: 'INVALID_CURRENT_PASSCODE'
  };
}

/**
 * Step 2 of Master Passcode Change:
 * Defense-in-depth re-verification of the current passcode, validation of the new 8-digit passcode,
 * salted SHA-256 hashing (plain text is NEVER stored), local persistence, optional Supabase cloud sync,
 * and security audit logging.
 */
export async function changeMasterPasscode(
  currentPin: string,
  newPin: string,
  confirmPin: string,
  actor?: { name?: string; email?: string; role?: string }
): Promise<{
  success: boolean;
  cloudSynced?: boolean;
  attemptsLeft?: number;
  lockedUntil?: number | null;
  error?:
    | 'SECURITY_LOCKED'
    | 'INVALID_CURRENT_PASSCODE'
    | 'INVALID_NEW_FORMAT'
    | 'PASSCODE_MISMATCH'
    | 'SAME_AS_CURRENT'
    | 'CRYPTO_UNAVAILABLE';
}> {
  const cleanCurrent = currentPin.trim();
  const cleanNew = newPin.trim();
  const cleanConfirm = confirmPin.trim();

  if (!isValidMasterPasscodeFormat(cleanNew)) {
    return { success: false, error: 'INVALID_NEW_FORMAT' };
  }

  if (cleanNew !== cleanConfirm) {
    return { success: false, error: 'PASSCODE_MISMATCH' };
  }

  if (cleanNew === cleanCurrent) {
    return { success: false, error: 'SAME_AS_CURRENT' };
  }

  // Always re-verify the current passcode cryptographically before saving any new hash
  const verifyRes = await verifyCurrentMasterPasscodeForChange(cleanCurrent);
  if (!verifyRes.success) {
    return {
      success: false,
      attemptsLeft: verifyRes.attemptsLeft,
      lockedUntil: verifyRes.lockedUntil,
      error: verifyRes.error === 'SECURITY_LOCKED' ? 'SECURITY_LOCKED' : 'INVALID_CURRENT_PASSCODE'
    };
  }

  const newHash = (await computeSha256Hex(SALT + cleanNew)).toLowerCase();
  if (!isValidSha256Hex(newHash)) {
    return { success: false, error: 'CRYPTO_UNAVAILABLE' };
  }

  // 1. Persist salted SHA-256 hash locally + passcode length
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_MASTER_HASH, newHash);
      setMasterPasscodeLength(cleanNew.length);
    }
  } catch {}

  // 2. Refresh active session token so current unlocked session remains valid
  try {
    const token = await generateSessionToken();
    sessionStorage.setItem(STORAGE_SESSION_TOKEN, token);
  } catch {}

  // 3. Best-effort sync to Supabase cloud (when column is available) + audit log
  let cloudSynced = false;
  if (supabase) {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          master_passcode_hash: newHash,
          updated_at: new Date().toISOString()
        })
        .eq('role', 'Owner');

      if (!updateError) {
        cloudSynced = true;
        updateOwnerConfigCachePartial({ master_passcode_hash: newHash });
      }
    } catch {
      // Column not yet migrated or offline — local hash still protects this device immediately
    }

    // Write security audit log (never log any passcode or hash)
    try {
      await supabase
        .from('admin_audit_logs')
        .insert({
          admin_name: actor?.name || 'Counter User',
          admin_email: actor?.email || 'yogeshwaridairy9896@gmail.com',
          admin_role: actor?.role || 'Owner',
          action_type: 'PRODUCT_UPDATED',
          title: 'Master Passcode Changed',
          details: 'Updated master security passcode from dashboard settings after verifying current passcode.',
          counter_name: actor?.role === 'Admin' ? 'Billing Counter' : 'Owner Master Counter'
        });
    } catch {
      // Non-blocking audit log
    }
  }

  return { success: true, cloudSynced };
}

/**
 * Checks if the current session has already successfully passed the Master Security verification.
 */
export async function isSessionSecurityValid(): Promise<boolean> {
  if (!isMasterLockEnabled()) return true;
  try {
    const token = sessionStorage.getItem(STORAGE_SESSION_TOKEN);
    if (!token) return false;
    
    // Parse timestamp and signature
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    
    const [timestampStr, signature] = parts;
    const expectedSig = await computeSha256Hex(SALT + timestampStr + 'UNLOCKED');
    return signature === expectedSig;
  } catch {
    return false;
  }
}

/**
 * Revokes security unlock (e.g. on manual Lock Counter or Logout).
 */
export function revokeSessionSecurity(): void {
  try {
    sessionStorage.removeItem(STORAGE_SESSION_TOKEN);
  } catch {}
}

/**
 * Issues a valid session token upon verified hardware biometric (fingerprint) authentication.
 * Dedicated for Nilesh Sakhare mobile fingerprint sensor verification.
 */
export async function grantBiometricSecurityUnlock(): Promise<boolean> {
  try {
    clearFailedAttempts();
    const token = await generateSessionToken();
    sessionStorage.setItem(STORAGE_SESSION_TOKEN, token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an encrypted session validation token.
 */
async function generateSessionToken(): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await computeSha256Hex(SALT + timestamp + 'UNLOCKED');
  return `${timestamp}.${signature}`;
}

export function getFailedAttempts(): number {
  try {
    const val = sessionStorage.getItem(STORAGE_FAILED_ATTEMPTS);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function incrementFailedAttempts(): number {
  try {
    const next = getFailedAttempts() + 1;
    sessionStorage.setItem(STORAGE_FAILED_ATTEMPTS, next.toString());
    return next;
  } catch {
    return 1;
  }
}

function clearFailedAttempts(): void {
  try {
    sessionStorage.removeItem(STORAGE_FAILED_ATTEMPTS);
    sessionStorage.removeItem(STORAGE_LOCKOUT_UNTIL);
  } catch {}
}

export function getLockoutTimestamp(): number | null {
  try {
    const val = sessionStorage.getItem(STORAGE_LOCKOUT_UNTIL);
    if (!val) return null;
    const time = parseInt(val, 10);
    if (Date.now() > time) {
      clearFailedAttempts();
      return null;
    }
    return time;
  } catch {
    return null;
  }
}

function setLockoutTimestamp(time: number): void {
  try {
    sessionStorage.setItem(STORAGE_LOCKOUT_UNTIL, time.toString());
  } catch {}
}

/**
 * Yogeshwari Dairy Products - Cryptographic Security & Anti-Tamper Service
 * 
 * Provides:
 * 1. SHA-256 salted hash verification for Master Security Passcode.
 *    The raw passcode is NEVER stored in plain text anywhere in source or bundles.
 * 2. Brute-force protection with failed attempt tracking and timed lockout.
 * 3. Session security token generation and validation.
 */

const SALT = 'YDO_MASTER_PASSCODE_SALT_v1_2026';
// Pre-computed SHA-256 cryptographic salt-hash of the secret master passcode
const MASTER_HASH = '4b73c8ea67ccf828b42b2eed3ab6ac8fab85e62667607c1a572c044fa196cef1';

const STORAGE_SESSION_TOKEN = 'ydo_sec_session_token_v1';
const STORAGE_FAILED_ATTEMPTS = 'ydo_sec_failed_attempts';
const STORAGE_LOCKOUT_UNTIL = 'ydo_sec_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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

  const computed = await computeSha256Hex(SALT + enteredPin.trim());
  const isValid = computed.toLowerCase() === MASTER_HASH.toLowerCase();

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
 * Checks if the current session has already successfully passed the Master Security verification.
 */
export async function isSessionSecurityValid(): Promise<boolean> {
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

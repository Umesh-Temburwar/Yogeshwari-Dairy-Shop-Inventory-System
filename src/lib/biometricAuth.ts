/**
 * YOGESHWARI DAIRY ERP - BIOMETRIC FINGERPRINT AUTHENTICATION SERVICE
 * Provides hardware-level mobile fingerprint / Touch ID authentication
 * for both Shop Owner and Admin profiles via Web Authentication API (WebAuthn).
 */

export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
    return true;
  } catch {
    return false;
  }
}

export interface BiometricProfileIdentity {
  email?: string | null;
  displayName?: string | null;
}

/**
 * Performs native mobile fingerprint / biometric scan via WebAuthn platform authenticator.
 * Supports any logged-in user (Owner or Admin) with per-user credential storage.
 */
export async function authenticateUserFingerprint(
  profile?: BiometricProfileIdentity
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return {
      success: false,
      error: 'Fingerprint hardware is not available on this device.'
    };
  }

  const isLocalhost =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (window.isSecureContext === false && !isLocalhost) {
    return {
      success: false,
      error: 'Mobile fingerprint requires a secure HTTPS connection.'
    };
  }

  const cleanEmail = (profile?.email || 'nilusakhare2003@gmail.com').trim().toLowerCase();
  const displayName = (profile?.displayName || 'Yogeshwari Dairy User').trim();
  const safeEmailKey = cleanEmail.replace(/[^a-z0-9]/g, '_').slice(0, 48) || 'user';
  const isLegacyNilesh = cleanEmail.includes('nilu') || cleanEmail.includes('nilesh');

  const STORAGE_KEY = isLegacyNilesh
    ? 'ydo_nilesh_webauthn_cred_id'
    : `ydo_webauthn_cred_${safeEmailKey}`;

  // 32-byte cryptographic random challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const storedCredId = localStorage.getItem(STORAGE_KEY);

  // 1. If this user already enrolled a fingerprint credential on this device, verify with .get()
  if (storedCredId) {
    try {
      const credIdBuffer = base64ToArrayBuffer(storedCredId);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: credIdBuffer,
              type: 'public-key',
              transports: ['internal']
            }
          ],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (assertion) {
        return { success: true };
      }
    } catch (err: unknown) {
      console.warn('WebAuthn get error, checking cancellation/fallback...', err);
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError') {
        return {
          success: false,
          error: 'Fingerprint verification was cancelled or did not match.'
        };
      }
    }
  }

  // 2. First-time enrollment on this device using .create() with platform fingerprint sensor
  try {
    const userId = new TextEncoder().encode(`ydo-biometric-${safeEmailKey}`);
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Yogeshwari Dairy ERP'
        },
        user: {
          id: userId,
          name: cleanEmail,
          displayName
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256 (Android/iOS biometric)
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      }
    })) as PublicKeyCredential;

    if (credential && credential.rawId) {
      const base64Id = uint8ArrayToBase64(new Uint8Array(credential.rawId));
      localStorage.setItem(STORAGE_KEY, base64Id);
      return { success: true };
    }

    return {
      success: false,
      error: 'Could not recognize fingerprint. Please try again.'
    };
  } catch (err: unknown) {
    console.error('WebAuthn biometric error:', err);
    const errName = err instanceof Error ? err.name : '';
    const errMsg = err instanceof Error ? err.message : '';
    if (errName === 'NotAllowedError') {
      return {
        success: false,
        error: 'Fingerprint scan was cancelled.'
      };
    }
    return {
      success: false,
      error: errMsg || 'Error during fingerprint scan. Please use master password.'
    };
  }
}

/** Backwards-compatible alias */
export async function authenticateNileshFingerprint(): Promise<{
  success: boolean;
  error?: string;
}> {
  return authenticateUserFingerprint({
    email: 'nilusakhare2003@gmail.com',
    displayName: 'Nilesh Sakhare (Admin)'
  });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

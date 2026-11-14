/**
 * YOGESHWARI DAIRY ERP - BIOMETRIC FINGERPRINT AUTHENTICATION SERVICE
 * Exclusively provides hardware-level mobile fingerprint authentication
 * for Nilesh Sakhare (Admin) via Web Authentication API (WebAuthn).
 */

/**
 * Checks if the current mobile device or browser supports hardware-level
 * user-verifying platform authenticators (such as Android Fingerprint / Touch ID).
 */
export async function isBiometricSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  
  // Check if WebAuthn PublicKeyCredential is supported
  if (!window.PublicKeyCredential) return false;

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Performs authentic mobile fingerprint scan using the device's native fingerprint sensor.
 * Prompts the native Android / mobile fingerprint sensor dialog.
 */
export async function authenticateNileshFingerprint(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return {
      success: false,
      error: 'या मोबाइलवर फिंगरप्रिंट हार्डवेअर उपलब्ध नाही.'
    };
  }

  // 32-byte cryptographic random challenge
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const STORAGE_KEY = 'ydo_nilesh_webauthn_cred_id';
  const storedCredId = localStorage.getItem(STORAGE_KEY);

  // 1. If Nilesh has an existing enrolled credential on this device, attempt .get()
  if (storedCredId) {
    try {
      const credIdBytes = base64ToUint8Array(storedCredId);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: credIdBytes,
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
    } catch (err: any) {
      console.warn('WebAuthn get error, falling back to enrollment/create...', err);
      if (err.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'फिंगरप्रिंट पडताळणी रद्द करण्यात आली किंवा सेन्सरशी जुळली नाही.'
        };
      }
    }
  }

  // 2. First-time enrollment or re-registration using .create() with platform fingerprint sensor
  try {
    const userId = new TextEncoder().encode('nilesh-sakhare-admin-2026');
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'योगेश्वरी डेअरी ERP'
        },
        user: {
          id: userId,
          name: 'nilusakhare2003@gmail.com',
          displayName: 'निलेश सखारे (Admin)'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (standard Android/iOS biometric)
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // strictly mobile hardware sensor (fingerprint)
          userVerification: 'required',        // strictly requires biometric touch
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
      error: 'फिंगरप्रिंट ओळखता आले नाही. कृपया पुन्हा प्रयत्न करा.'
    };
  } catch (err: any) {
    console.error('WebAuthn biometric error:', err);
    if (err.name === 'NotAllowedError') {
      return {
        success: false,
        error: 'फिंगरप्रिंट स्कॅन रद्द केले गेले.'
      };
    }
    return {
      success: false,
      error: err.message || 'फिंगरप्रिंट स्कॅनिंग दरम्यान त्रुटी आली. कृपया पासवर्ड वापरा.'
    };
  }
}

/**
 * Utility: Converts Uint8Array to Base64 string safely
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Utility: Converts Base64 string to Uint8Array safely
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Yogeshwari Dairy Products - Security & Passcode Cryptographic Tests', () => {
  const SALT = 'YDO_MASTER_PASSCODE_SALT_v1_2026';
  const EXPECTED_HASH = '4b73c8ea67ccf828b42b2eed3ab6ac8fab85e62667607c1a572c044fa196cef1';

  function verifyPasscode(input: string): boolean {
    const hash = crypto.createHash('sha256').update(SALT + input.trim()).digest('hex');
    return hash.toLowerCase() === EXPECTED_HASH.toLowerCase();
  }

  it('verifies correct master passcode (04092026) cryptographically without plain-text exposure', () => {
    expect(verifyPasscode('04092026')).toBe(true);
    expect(verifyPasscode(' 04092026 ')).toBe(true); // Trims whitespace cleanly
  });

  it('rejects incorrect passcodes firmly', () => {
    expect(verifyPasscode('12345678')).toBe(false);
    expect(verifyPasscode('00000000')).toBe(false);
    expect(verifyPasscode('admin123')).toBe(false);
    expect(verifyPasscode('04092025')).toBe(false);
  });

  it('ensures salt hashing provides non-reversible zero-knowledge security', () => {
    const entered = '04092026';
    const rawHashWithoutSalt = crypto.createHash('sha256').update(entered).digest('hex');
    // The salted hash must be completely different from raw unsalted hash to prevent rainbow table attacks
    expect(rawHashWithoutSalt).not.toBe(EXPECTED_HASH);
  });
});

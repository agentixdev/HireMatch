import { encryptSecret, decryptSecret } from '@/lib/crypto';

describe('Webhook secret encryption', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('without encryption key', () => {
    beforeEach(() => {
      delete process.env.WEBHOOK_ENCRYPTION_KEY;
    });

    it('returns plain: prefix when encrypting', () => {
      const result = encryptSecret('my-webhook-secret');
      expect(result).toBe('plain:my-webhook-secret');
    });

    it('decrypts plain: prefixed secrets', () => {
      const result = decryptSecret('plain:my-webhook-secret');
      expect(result).toBe('my-webhook-secret');
    });

    it('treats unprefixed strings as legacy plaintext', () => {
      const result = decryptSecret('legacy-secret-no-prefix');
      expect(result).toBe('legacy-secret-no-prefix');
    });
  });

  describe('with encryption key', () => {
    const TEST_KEY = 'a'.repeat(64); // 32 bytes as hex

    beforeEach(() => {
      process.env.WEBHOOK_ENCRYPTION_KEY = TEST_KEY;
    });

    it('encrypts and returns enc: prefix', () => {
      const encrypted = encryptSecret('my-secret-123');
      expect(encrypted.startsWith('enc:')).toBe(true);
      expect(encrypted.split(':').length).toBe(4);
    });

    it('round-trips correctly', () => {
      const original = 'whsec_test_secret_value_12345';
      const encrypted = encryptSecret(original);
      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(original);
    });

    it('produces different ciphertext for same input (random IV)', () => {
      const secret = 'same-secret';
      const enc1 = encryptSecret(secret);
      const enc2 = encryptSecret(secret);
      expect(enc1).not.toBe(enc2);
      // Both should decrypt to the same value
      expect(decryptSecret(enc1)).toBe(secret);
      expect(decryptSecret(enc2)).toBe(secret);
    });

    it('still decrypts plain: prefixed secrets', () => {
      expect(decryptSecret('plain:old-secret')).toBe('old-secret');
    });

    it('still handles legacy unprefixed secrets', () => {
      expect(decryptSecret('legacy-secret')).toBe('legacy-secret');
    });

    it('throws on malformed encrypted string', () => {
      expect(() => decryptSecret('enc:only-two-parts')).toThrow('Malformed encrypted secret');
    });

    it('handles empty string', () => {
      const encrypted = encryptSecret('');
      expect(decryptSecret(encrypted)).toBe('');
    });

    it('handles special characters', () => {
      const special = 'secret!@#$%^&*()_+-={}|[];\':",./<>?';
      const encrypted = encryptSecret(special);
      expect(decryptSecret(encrypted)).toBe(special);
    });
  });
});

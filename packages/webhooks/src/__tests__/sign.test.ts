import { signPayload, parseSignature, verifySignature } from '../sign';

describe('signPayload()', () => {
  const secret = 'whsec_test_secret_key';
  const payload = JSON.stringify({ event: 'candidate.created', data: { id: '123' } });

  it('produces a signature in t=<ts>,v1=<hex> format', () => {
    const result = signPayload(payload, secret, 1700000000);
    expect(result.signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    expect(result.timestamp).toBe(1700000000);
  });

  it('uses current time when no timestamp provided', () => {
    const before = Math.floor(Date.now() / 1000);
    const result = signPayload(payload, secret);
    const after = Math.floor(Date.now() / 1000);

    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  it('produces different signatures for different payloads', () => {
    const ts = 1700000000;
    const sig1 = signPayload('{"a":1}', secret, ts);
    const sig2 = signPayload('{"a":2}', secret, ts);
    expect(sig1.signature).not.toBe(sig2.signature);
  });

  it('produces different signatures for different secrets', () => {
    const ts = 1700000000;
    const sig1 = signPayload(payload, 'secret-a', ts);
    const sig2 = signPayload(payload, 'secret-b', ts);
    expect(sig1.signature).not.toBe(sig2.signature);
  });

  it('produces different signatures for different timestamps', () => {
    const sig1 = signPayload(payload, secret, 1700000000);
    const sig2 = signPayload(payload, secret, 1700000001);
    expect(sig1.signature).not.toBe(sig2.signature);
  });

  it('produces consistent signature for same inputs', () => {
    const sig1 = signPayload(payload, secret, 1700000000);
    const sig2 = signPayload(payload, secret, 1700000000);
    expect(sig1.signature).toBe(sig2.signature);
  });
});

describe('parseSignature()', () => {
  it('parses valid signature header', () => {
    const result = parseSignature('t=1700000000,v1=abcdef1234567890');
    expect(result).not.toBeNull();
    expect(result!.timestamp).toBe(1700000000);
    expect(result!.signatures).toEqual(['abcdef1234567890']);
  });

  it('handles multiple v1 signatures (for key rotation)', () => {
    const result = parseSignature('t=1700000000,v1=sig1,v1=sig2');
    expect(result!.signatures).toEqual(['sig1', 'sig2']);
  });

  it('returns null for empty string', () => {
    expect(parseSignature('')).toBeNull();
  });

  it('returns null for malformed header', () => {
    expect(parseSignature('garbage')).toBeNull();
  });

  it('returns null for missing timestamp', () => {
    expect(parseSignature('v1=abcdef')).toBeNull();
  });

  it('returns null for missing signature', () => {
    expect(parseSignature('t=1700000000')).toBeNull();
  });

  it('returns null for non-numeric timestamp', () => {
    expect(parseSignature('t=abc,v1=sig')).toBeNull();
  });
});

describe('verifySignature()', () => {
  const secret = 'whsec_verify_test';
  const payload = '{"event":"test"}';

  it('validates correct signature', () => {
    const { signature } = signPayload(payload, secret);
    // Use a generous maxAge so it doesn't expire during test
    const result = verifySignature(payload, signature, secret, { maxAgeMs: 60_000 });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('rejects tampered payload', () => {
    const { signature } = signPayload(payload, secret);
    const result = verifySignature('{"event":"tampered"}', signature, secret, { maxAgeMs: 60_000 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature mismatch');
  });

  it('rejects wrong secret', () => {
    const { signature } = signPayload(payload, secret);
    const result = verifySignature(payload, signature, 'wrong-secret', { maxAgeMs: 60_000 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature mismatch');
  });

  it('rejects invalid signature format', () => {
    const result = verifySignature(payload, 'not-a-valid-sig', secret);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Invalid signature format');
  });

  it('rejects expired signature', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const { signature } = signPayload(payload, secret, oldTimestamp);
    const result = verifySignature(payload, signature, secret, { maxAgeMs: 60_000 }); // 1 min max age
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature expired');
  });

  it('rejects future timestamp', () => {
    const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 min ahead
    const { signature } = signPayload(payload, secret, futureTimestamp);
    const result = verifySignature(payload, signature, secret, { maxAgeMs: 60_000 });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Signature timestamp in the future');
  });
});

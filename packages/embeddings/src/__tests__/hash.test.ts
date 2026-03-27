import { contentHash, bufferHash, hasContentChanged, compositeHash, fingerprint } from '../hash';

describe('contentHash()', () => {
  it('produces a 64-character hex string (SHA-256)', () => {
    const hash = contentHash('Hello, World!');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hash for same content', () => {
    const h1 = contentHash('test content');
    const h2 = contentHash('test content');
    expect(h1).toBe(h2);
  });

  it('produces different hashes for different content', () => {
    const h1 = contentHash('content A');
    const h2 = contentHash('content B');
    expect(h1).not.toBe(h2);
  });

  it('is case-sensitive', () => {
    const h1 = contentHash('Hello');
    const h2 = contentHash('hello');
    expect(h1).not.toBe(h2);
  });

  it('handles empty string', () => {
    const hash = contentHash('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles unicode content', () => {
    const hash = contentHash('Bonjour le monde! Die Welt 你好世界');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('whitespace matters', () => {
    const h1 = contentHash('hello world');
    const h2 = contentHash('hello  world');
    expect(h1).not.toBe(h2);
  });
});

describe('bufferHash()', () => {
  it('produces SHA-256 hash from buffer', () => {
    const buf = Buffer.from('test data', 'utf-8');
    const hash = bufferHash(buf);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('consistent for same buffer content', () => {
    const buf = Buffer.from('same content');
    const h1 = bufferHash(buf);
    const h2 = bufferHash(buf);
    expect(h1).toBe(h2);
  });

  it('matches contentHash for same string input', () => {
    const text = 'matching content';
    const h1 = contentHash(text);
    const h2 = bufferHash(Buffer.from(text, 'utf-8'));
    expect(h1).toBe(h2);
  });

  it('handles empty buffer', () => {
    const hash = bufferHash(Buffer.alloc(0));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('hasContentChanged()', () => {
  it('returns false when content matches hash', () => {
    const content = 'test content';
    const hash = contentHash(content);
    expect(hasContentChanged(content, hash)).toBe(false);
  });

  it('returns true when content differs from hash', () => {
    const hash = contentHash('original');
    expect(hasContentChanged('modified', hash)).toBe(true);
  });

  it('returns true for empty vs non-empty', () => {
    const hash = contentHash('something');
    expect(hasContentChanged('', hash)).toBe(true);
  });
});

describe('compositeHash()', () => {
  it('produces consistent hash for same parts', () => {
    const h1 = compositeHash(['part1', 'part2', 'part3']);
    const h2 = compositeHash(['part1', 'part2', 'part3']);
    expect(h1).toBe(h2);
  });

  it('different parts produce different hash', () => {
    const h1 = compositeHash(['a', 'b']);
    const h2 = compositeHash(['a', 'c']);
    expect(h1).not.toBe(h2);
  });

  it('order matters', () => {
    const h1 = compositeHash(['a', 'b']);
    const h2 = compositeHash(['b', 'a']);
    expect(h1).not.toBe(h2);
  });

  it('different count of parts produces different hash', () => {
    const h1 = compositeHash(['a']);
    const h2 = compositeHash(['a', 'a']);
    expect(h1).not.toBe(h2);
  });

  it('returns valid SHA-256 hex', () => {
    const hash = compositeHash(['test']);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('fingerprint()', () => {
  it('returns first 12 characters of the hash', () => {
    const fp = fingerprint('test content');
    const full = contentHash('test content');
    expect(fp).toBe(full.slice(0, 12));
    expect(fp).toHaveLength(12);
  });

  it('consistent for same content', () => {
    const fp1 = fingerprint('same');
    const fp2 = fingerprint('same');
    expect(fp1).toBe(fp2);
  });

  it('different for different content', () => {
    const fp1 = fingerprint('aaa');
    const fp2 = fingerprint('bbb');
    expect(fp1).not.toBe(fp2);
  });
});

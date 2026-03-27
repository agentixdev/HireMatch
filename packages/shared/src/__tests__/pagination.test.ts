import {
  encodeCursor,
  decodeCursor,
  clampPageSize,
  buildCursorResult,
  cursorWhereClause,
} from '../pagination';

describe('encodeCursor() / decodeCursor()', () => {
  it('round-trips id and timestamp string', () => {
    const cursor = encodeCursor('abc-123', '2025-01-15T10:00:00.000Z');
    const decoded = decodeCursor(cursor);

    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe('abc-123');
    expect(decoded!.ts).toBe('2025-01-15T10:00:00.000Z');
  });

  it('round-trips id and Date object', () => {
    const date = new Date('2025-06-01T12:30:00.000Z');
    const cursor = encodeCursor('uuid-456', date);
    const decoded = decodeCursor(cursor);

    expect(decoded!.id).toBe('uuid-456');
    expect(decoded!.ts).toBe('2025-06-01T12:30:00.000Z');
  });

  it('produces base64url-encoded string without padding', () => {
    const cursor = encodeCursor('test', '2025-01-01');
    // base64url chars only
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces different cursors for different inputs', () => {
    const c1 = encodeCursor('id1', '2025-01-01');
    const c2 = encodeCursor('id2', '2025-01-01');
    const c3 = encodeCursor('id1', '2025-01-02');
    expect(c1).not.toBe(c2);
    expect(c1).not.toBe(c3);
  });
});

describe('decodeCursor() error handling', () => {
  it('returns null for invalid base64', () => {
    expect(decodeCursor('!!!not-valid-base64!!!')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const notJson = Buffer.from('hello world', 'utf-8').toString('base64url');
    expect(decodeCursor(notJson)).toBeNull();
  });

  it('returns null for JSON without id field', () => {
    const noId = Buffer.from(JSON.stringify({ ts: '2025-01-01' }), 'utf-8').toString('base64url');
    expect(decodeCursor(noId)).toBeNull();
  });

  it('returns null for JSON without ts field', () => {
    const noTs = Buffer.from(JSON.stringify({ id: '123' }), 'utf-8').toString('base64url');
    expect(decodeCursor(noTs)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeCursor('')).toBeNull();
  });

  it('returns null for JSON with non-string id', () => {
    const badType = Buffer.from(JSON.stringify({ id: 123, ts: '2025-01-01' }), 'utf-8').toString('base64url');
    expect(decodeCursor(badType)).toBeNull();
  });
});

describe('clampPageSize()', () => {
  it('returns DEFAULT_PAGE_SIZE (25) for undefined', () => {
    expect(clampPageSize(undefined)).toBe(25);
  });

  it('returns DEFAULT_PAGE_SIZE for zero', () => {
    expect(clampPageSize(0)).toBe(25);
  });

  it('returns DEFAULT_PAGE_SIZE for negative', () => {
    expect(clampPageSize(-5)).toBe(25);
  });

  it('returns the value when within range', () => {
    expect(clampPageSize(50)).toBe(50);
  });

  it('clamps to MAX_PAGE_SIZE (100) for large values', () => {
    expect(clampPageSize(500)).toBe(100);
  });

  it('allows exactly MAX_PAGE_SIZE', () => {
    expect(clampPageSize(100)).toBe(100);
  });
});

describe('buildCursorResult()', () => {
  const makeItems = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      createdAt: new Date(2025, 0, 1 + i).toISOString(),
    }));

  it('detects hasMore when items exceed requestedSize', () => {
    const items = makeItems(11); // requested 10, got 11
    const result = buildCursorResult(items, 10);

    expect(result.items).toHaveLength(10);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns hasMore=false when items <= requestedSize', () => {
    const items = makeItems(5);
    const result = buildCursorResult(items, 10);

    expect(result.items).toHaveLength(5);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('handles empty items array', () => {
    const result = buildCursorResult([], 10);

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
    expect(result.prevCursor).toBeNull();
  });

  it('returns prevCursor for first item', () => {
    const items = makeItems(3);
    const result = buildCursorResult(items, 10);

    expect(result.prevCursor).not.toBeNull();
    const decoded = decodeCursor(result.prevCursor!);
    expect(decoded!.id).toBe('item-0');
  });

  it('reverses items for backward direction', () => {
    const items = makeItems(3);
    const result = buildCursorResult(items, 10, 'backward');

    expect(result.items[0].id).toBe('item-2');
    expect(result.items[2].id).toBe('item-0');
  });
});

describe('cursorWhereClause()', () => {
  it('returns null condition when cursor is null', () => {
    const result = cursorWhereClause(null);
    expect(result.condition).toBeNull();
    expect(result.params).toEqual([]);
    expect(result.orderBy).toBe('created_at DESC, id DESC');
  });

  it('returns null condition when cursor is undefined', () => {
    const result = cursorWhereClause(undefined);
    expect(result.condition).toBeNull();
  });

  it('returns null condition for invalid cursor', () => {
    const result = cursorWhereClause('not-a-valid-cursor');
    expect(result.condition).toBeNull();
    expect(result.params).toEqual([]);
  });

  it('returns correct condition for forward direction', () => {
    const cursor = encodeCursor('item-5', '2025-01-06T00:00:00.000Z');
    const result = cursorWhereClause(cursor, 'forward');

    expect(result.condition).toBe('(created_at, id) < ($1, $2)');
    expect(result.params).toEqual(['2025-01-06T00:00:00.000Z', 'item-5']);
    expect(result.orderBy).toBe('created_at DESC, id DESC');
  });

  it('returns correct condition for backward direction', () => {
    const cursor = encodeCursor('item-5', '2025-01-06T00:00:00.000Z');
    const result = cursorWhereClause(cursor, 'backward');

    expect(result.condition).toBe('(created_at, id) > ($1, $2)');
    expect(result.params).toEqual(['2025-01-06T00:00:00.000Z', 'item-5']);
    expect(result.orderBy).toBe('created_at ASC, id ASC');
  });

  it('uses custom column names', () => {
    const cursor = encodeCursor('x', '2025-01-01');
    const result = cursorWhereClause(cursor, 'forward', 'updated_at', 'uuid');

    expect(result.condition).toBe('(updated_at, uuid) < ($1, $2)');
    expect(result.orderBy).toBe('updated_at DESC, uuid DESC');
  });
});

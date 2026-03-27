import { success, paginatedSuccess, failure, generateRequestId } from '../envelope';
import type { PaginationMeta } from '../envelope';

describe('success()', () => {
  it('creates a success response with data', () => {
    const data = { id: '1', name: 'Alice' };
    const result = success(data, { requestId: 'req_abc' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.error).toBeNull();
    expect(result.meta.requestId).toBe('req_abc');
    expect(result.meta.timestamp).toBeDefined();
  });

  it('includes duration in meta when provided', () => {
    const result = success({ ok: true }, { requestId: 'req_1', duration: 42 });
    expect(result.meta.duration).toBe(42);
  });

  it('includes pagination meta when provided', () => {
    const pagination: PaginationMeta = {
      cursor: 'abc',
      nextCursor: 'def',
      hasMore: true,
      totalCount: 100,
      pageSize: 25,
    };
    const result = success([1, 2, 3], { requestId: 'req_2', pagination });
    expect(result.meta.pagination).toEqual(pagination);
  });

  it('handles null data', () => {
    const result = success(null, { requestId: 'req_3' });
    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('handles empty arrays', () => {
    const result = success([], { requestId: 'req_4' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

describe('paginatedSuccess()', () => {
  it('creates paginated response with cursor and total', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = paginatedSuccess(data, {
      requestId: 'req_pg1',
      cursor: 'cur1',
      nextCursor: 'cur2',
      hasMore: true,
      totalCount: 50,
      pageSize: 25,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.meta.pagination).toBeDefined();
    expect(result.meta.pagination!.cursor).toBe('cur1');
    expect(result.meta.pagination!.nextCursor).toBe('cur2');
    expect(result.meta.pagination!.hasMore).toBe(true);
    expect(result.meta.pagination!.totalCount).toBe(50);
    expect(result.meta.pagination!.pageSize).toBe(25);
  });

  it('handles empty data arrays with no next cursor', () => {
    const result = paginatedSuccess([], {
      requestId: 'req_pg2',
      cursor: null,
      nextCursor: null,
      hasMore: false,
      totalCount: 0,
      pageSize: 25,
    });

    expect(result.data).toEqual([]);
    expect(result.meta.pagination!.hasMore).toBe(false);
    expect(result.meta.pagination!.nextCursor).toBeNull();
    expect(result.meta.pagination!.totalCount).toBe(0);
  });

  it('preserves duration in meta', () => {
    const result = paginatedSuccess([1], {
      requestId: 'req_pg3',
      cursor: null,
      nextCursor: null,
      hasMore: false,
      pageSize: 10,
      duration: 123,
    });
    expect(result.meta.duration).toBe(123);
  });
});

describe('failure()', () => {
  it('creates error response with correct fields', () => {
    const result = failure(
      { code: 'AUTH_001', message: 'Unauthorized', statusCode: 401 } as any,
      'req_err1'
    );

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error!.code).toBe('AUTH_001');
    expect(result.error!.message).toBe('Unauthorized');
    expect(result.meta.requestId).toBe('req_err1');
  });

  it('creates error response from plain object', () => {
    const result = failure(
      { code: 'CUSTOM_ERR', message: 'Something went wrong' },
      'req_err2'
    );

    expect(result.success).toBe(false);
    expect(result.error!.code).toBe('CUSTOM_ERR');
    expect(result.error!.message).toBe('Something went wrong');
  });

  it('includes context in error when provided', () => {
    const result = failure(
      { code: 'VAL_001', message: 'Bad field', context: { field: 'email' } },
      'req_err3'
    );

    expect(result.error!.context).toEqual({ field: 'email' });
  });

  it('includes timestamp in meta', () => {
    const result = failure({ code: 'SYS_001', message: 'Error' }, 'req_err4');
    expect(result.meta.timestamp).toBeDefined();
    // Timestamp should be a valid ISO string
    expect(() => new Date(result.meta.timestamp)).not.toThrow();
  });
});

describe('generateRequestId()', () => {
  it('returns a string starting with req_', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

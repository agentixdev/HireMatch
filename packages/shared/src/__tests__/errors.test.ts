import { AppError, ErrorCode } from '../errors';

describe('AppError', () => {
  it('creates with correct code, message, and status', () => {
    const err = new AppError(ErrorCode.UNAUTHORIZED, 'Not authenticated');
    expect(err.code).toBe('AUTH_001');
    expect(err.message).toBe('Not authenticated');
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('AppError');
    expect(err.isOperational).toBe(true);
  });

  it('includes context when provided', () => {
    const err = new AppError(ErrorCode.VALIDATION_FAILED, 'Bad input', {
      context: { field: 'email', reason: 'invalid format' },
    });
    expect(err.context).toEqual({ field: 'email', reason: 'invalid format' });
  });

  it('sets isOperational to false when specified', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'Crash', {
      isOperational: false,
    });
    expect(err.isOperational).toBe(false);
  });

  it('includes a timestamp', () => {
    const before = new Date().toISOString();
    const err = new AppError(ErrorCode.NOT_FOUND, 'Gone');
    const after = new Date().toISOString();
    expect(err.timestamp >= before).toBe(true);
    expect(err.timestamp <= after).toBe(true);
  });

  it('preserves cause when provided', () => {
    const cause = new Error('original');
    const err = new AppError(ErrorCode.DATABASE_ERROR, 'DB fail', { cause });
    expect(err.cause).toBe(cause);
  });

  it('falls back to 500 for unknown error code', () => {
    const err = new AppError('UNKNOWN_999' as any, 'mystery');
    expect(err.statusCode).toBe(500);
  });
});

describe('ErrorCode -> HTTP status mapping', () => {
  const cases: Array<[ErrorCode, number]> = [
    [ErrorCode.UNAUTHORIZED, 401],
    [ErrorCode.FORBIDDEN, 403],
    [ErrorCode.TOKEN_EXPIRED, 401],
    [ErrorCode.TOKEN_INVALID, 401],
    [ErrorCode.INVALID_API_KEY, 401],
    [ErrorCode.MFA_REQUIRED, 403],
    [ErrorCode.RATE_LIMITED, 429],
    [ErrorCode.INSUFFICIENT_SCOPE, 403],
    [ErrorCode.VALIDATION_FAILED, 400],
    [ErrorCode.INVALID_COUNTRY, 400],
    [ErrorCode.MISSING_REQUIRED_FIELD, 400],
    [ErrorCode.FILE_TOO_LARGE, 413],
    [ErrorCode.NOT_FOUND, 404],
    [ErrorCode.ALREADY_EXISTS, 409],
    [ErrorCode.CONFLICT, 409],
    [ErrorCode.GONE, 410],
    [ErrorCode.TIER_LIMIT_EXCEEDED, 402],
    [ErrorCode.SUBSCRIPTION_REQUIRED, 402],
    [ErrorCode.USAGE_LIMIT_REACHED, 429],
    [ErrorCode.CV_PARSE_FAILED, 422],
    [ErrorCode.JD_PARSE_FAILED, 422],
    [ErrorCode.MATCH_FAILED, 500],
    [ErrorCode.WEBHOOK_DELIVERY_FAILED, 502],
    [ErrorCode.INTERNAL_ERROR, 500],
    [ErrorCode.SERVICE_UNAVAILABLE, 503],
    [ErrorCode.EXTERNAL_SERVICE_ERROR, 502],
    [ErrorCode.TIMEOUT, 504],
  ];

  it.each(cases)('%s maps to HTTP %d', (code, expectedStatus) => {
    const err = new AppError(code, 'test');
    expect(err.statusCode).toBe(expectedStatus);
  });
});

describe('AppError.toJSON()', () => {
  it('serializes to correct envelope format', () => {
    const err = new AppError(ErrorCode.NOT_FOUND, 'User not found', {
      context: { resource: 'user', id: '123' },
    });
    const json = err.toJSON();

    expect(json).toHaveProperty('error');
    const e = json.error as Record<string, unknown>;
    expect(e.code).toBe('RES_001');
    expect(e.message).toBe('User not found');
    expect(e.statusCode).toBe(404);
    expect(e.timestamp).toBeDefined();
    expect(e.context).toEqual({ resource: 'user', id: '123' });
  });

  it('omits context when not provided', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'Oops');
    const json = err.toJSON();
    const e = json.error as Record<string, unknown>;
    expect(e.context).toBeUndefined();
  });
});

describe('AppError static factories', () => {
  it('notFound() creates a 404 with resource info', () => {
    const err = AppError.notFound('Candidate', 'abc-123');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.message).toContain('Candidate');
    expect(err.message).toContain('abc-123');
    expect(err.context).toEqual({ resource: 'Candidate', id: 'abc-123' });
  });

  it('validation() creates a 400 with field info', () => {
    const err = AppError.validation('Invalid email', { email: 'must be valid' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(err.context).toEqual({ fields: { email: 'must be valid' } });
  });

  it('rateLimited() creates a 429 with retryAfter', () => {
    const err = AppError.rateLimited(5000);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe(ErrorCode.RATE_LIMITED);
    expect(err.context).toEqual({ retryAfterMs: 5000, retryAfter: 5 });
  });

  it('tierLimit() creates a 402 with usage info', () => {
    const err = AppError.tierLimit('API calls', 10000, 10500);
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe(ErrorCode.TIER_LIMIT_EXCEEDED);
    expect(err.message).toContain('10500/10000');
  });
});

describe('AppError.is()', () => {
  it('returns true for AppError instances', () => {
    const err = new AppError(ErrorCode.INTERNAL_ERROR, 'test');
    expect(AppError.is(err)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(AppError.is(new Error('nope'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(AppError.is(null)).toBe(false);
    expect(AppError.is('string')).toBe(false);
    expect(AppError.is(42)).toBe(false);
  });
});

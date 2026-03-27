import { NextResponse } from 'next/server';

// ---- Standard error codes ----
export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BILLING_LIMIT_EXCEEDED: 'BILLING_LIMIT_EXCEEDED',
  CONFLICT: 'CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiEnvelope<T = unknown> {
  data: T | null;
  meta: Record<string, unknown>;
  errors: Array<{ code: string; message: string; field?: string }>;
}

/**
 * Wrap successful data in the standard API envelope.
 */
export function successResponse<T>(
  data: T,
  meta: Record<string, unknown> = {},
  status = 200,
  headers?: Record<string, string>
): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json(
    { data, meta: { timestamp: new Date().toISOString(), ...meta }, errors: [] },
    { status, headers }
  );
}

/**
 * Return a standard error envelope.
 */
export function errorResponse(
  code: ErrorCodeType | string,
  message: string,
  status: number,
  field?: string
): NextResponse<ApiEnvelope<null>> {
  return NextResponse.json(
    {
      data: null,
      meta: { timestamp: new Date().toISOString() },
      errors: [{ code, message, ...(field ? { field } : {}) }],
    },
    { status }
  );
}

/**
 * Return a paginated response with cursor-based pagination metadata.
 */
export function paginatedResponse<T>(
  data: T[],
  cursor: string | null,
  total: number,
  extraMeta: Record<string, unknown> = {}
): NextResponse<ApiEnvelope<T[]>> {
  return NextResponse.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        pagination: {
          next_cursor: cursor,
          total,
          count: data.length,
        },
        ...extraMeta,
      },
      errors: [],
    },
    { status: 200 }
  );
}

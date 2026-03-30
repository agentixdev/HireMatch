import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Structured API error with HTTP status code and optional error code.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Converts an unknown error into a safe NextResponse.
 *
 * - Known ApiError instances return their status + message.
 * - Unknown errors are logged and return a generic 500 to avoid leaking internals.
 */
export function handleApiError(error: unknown, route?: string): NextResponse {
  if (error instanceof ApiError) {
    logger.warn('API error', {
      route,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(
      {
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      },
      { status: error.statusCode },
    );
  }

  // Unknown error — log full details but return generic message
  logger.error('Unhandled API error', error, { route });

  return NextResponse.json(
    { error: 'An unexpected error occurred. Please try again later.' },
    { status: 500 },
  );
}

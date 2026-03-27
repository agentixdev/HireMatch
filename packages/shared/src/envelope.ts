import type { AppError } from "./errors.js";

/** Standard API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
    duration?: number;
    pagination?: PaginationMeta;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
  pageSize: number;
}

/** Build a successful response envelope */
export function success<T>(
  data: T,
  options: {
    requestId: string;
    duration?: number;
    pagination?: PaginationMeta;
  }
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId: options.requestId,
      timestamp: new Date().toISOString(),
      duration: options.duration,
      pagination: options.pagination,
    },
  };
}

/** Build a paginated success response */
export function paginatedSuccess<T>(
  data: T[],
  options: {
    requestId: string;
    cursor: string | null;
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
    pageSize: number;
    duration?: number;
  }
): ApiResponse<T[]> {
  return success(data, {
    requestId: options.requestId,
    duration: options.duration,
    pagination: {
      cursor: options.cursor,
      nextCursor: options.nextCursor,
      hasMore: options.hasMore,
      totalCount: options.totalCount,
      pageSize: options.pageSize,
    },
  });
}

/** Build an error response envelope */
export function failure(
  err: AppError | { code: string; message: string; context?: Record<string, unknown> },
  requestId: string
): ApiResponse<never> {
  const isAppError = "statusCode" in err;
  return {
    success: false,
    data: null,
    error: {
      code: isAppError ? err.code : (err as { code: string }).code,
      message: err.message,
      context: err.context,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/** Generate a unique request ID */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

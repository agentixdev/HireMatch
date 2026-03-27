/** Application error codes */
export enum ErrorCode {
  // Auth errors (1xxx)
  UNAUTHORIZED = "AUTH_001",
  FORBIDDEN = "AUTH_002",
  TOKEN_EXPIRED = "AUTH_003",
  TOKEN_INVALID = "AUTH_004",
  INVALID_API_KEY = "AUTH_005",
  MFA_REQUIRED = "AUTH_006",
  MFA_INVALID = "AUTH_007",
  RATE_LIMITED = "AUTH_008",
  SESSION_EXPIRED = "AUTH_009",
  INSUFFICIENT_SCOPE = "AUTH_010",

  // Validation errors (2xxx)
  VALIDATION_FAILED = "VAL_001",
  INVALID_COUNTRY = "VAL_002",
  INVALID_LOCALE = "VAL_003",
  INVALID_EMAIL = "VAL_004",
  MISSING_REQUIRED_FIELD = "VAL_005",
  INVALID_FILE_TYPE = "VAL_006",
  FILE_TOO_LARGE = "VAL_007",

  // Resource errors (3xxx)
  NOT_FOUND = "RES_001",
  ALREADY_EXISTS = "RES_002",
  CONFLICT = "RES_003",
  GONE = "RES_004",

  // Billing errors (4xxx)
  TIER_LIMIT_EXCEEDED = "BIL_001",
  SUBSCRIPTION_REQUIRED = "BIL_002",
  PAYMENT_FAILED = "BIL_003",
  SUBSCRIPTION_CANCELLED = "BIL_004",
  USAGE_LIMIT_REACHED = "BIL_005",
  INVALID_TIER = "BIL_006",

  // Processing errors (5xxx)
  CV_PARSE_FAILED = "PROC_001",
  JD_PARSE_FAILED = "PROC_002",
  MATCH_FAILED = "PROC_003",
  EMBEDDING_FAILED = "PROC_004",
  SCRAPE_FAILED = "PROC_005",
  WEBHOOK_DELIVERY_FAILED = "PROC_006",
  QUEUE_FAILED = "PROC_007",

  // System errors (9xxx)
  INTERNAL_ERROR = "SYS_001",
  SERVICE_UNAVAILABLE = "SYS_002",
  EXTERNAL_SERVICE_ERROR = "SYS_003",
  DATABASE_ERROR = "SYS_004",
  STORAGE_ERROR = "SYS_005",
  TIMEOUT = "SYS_006",
}

/** HTTP status code mapping for error codes */
const ERROR_STATUS_MAP: Record<string, number> = {
  AUTH_001: 401,
  AUTH_002: 403,
  AUTH_003: 401,
  AUTH_004: 401,
  AUTH_005: 401,
  AUTH_006: 403,
  AUTH_007: 401,
  AUTH_008: 429,
  AUTH_009: 401,
  AUTH_010: 403,
  VAL_001: 400,
  VAL_002: 400,
  VAL_003: 400,
  VAL_004: 400,
  VAL_005: 400,
  VAL_006: 400,
  VAL_007: 413,
  RES_001: 404,
  RES_002: 409,
  RES_003: 409,
  RES_004: 410,
  BIL_001: 402,
  BIL_002: 402,
  BIL_003: 402,
  BIL_004: 402,
  BIL_005: 429,
  BIL_006: 400,
  PROC_001: 422,
  PROC_002: 422,
  PROC_003: 500,
  PROC_004: 500,
  PROC_005: 500,
  PROC_006: 502,
  PROC_007: 500,
  SYS_001: 500,
  SYS_002: 503,
  SYS_003: 502,
  SYS_004: 500,
  SYS_005: 500,
  SYS_006: 504,
};

/** Structured application error with error code, HTTP status, and optional context */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      context?: Record<string, unknown>;
      isOperational?: boolean;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code] ?? 500;
    this.context = options?.context;
    this.isOperational = options?.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /** Serialize to a JSON-safe object */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.context ? { context: this.context } : {}),
      },
    };
  }

  /** Check if an unknown value is an AppError */
  static is(err: unknown): err is AppError {
    return err instanceof AppError;
  }

  /** Create a not-found error with resource info */
  static notFound(resource: string, id: string): AppError {
    return new AppError(ErrorCode.NOT_FOUND, `${resource} not found: ${id}`, {
      context: { resource, id },
    });
  }

  /** Create a validation error */
  static validation(message: string, fields?: Record<string, string>): AppError {
    return new AppError(ErrorCode.VALIDATION_FAILED, message, {
      context: { fields },
    });
  }

  /** Create a rate limit error */
  static rateLimited(retryAfterMs: number): AppError {
    return new AppError(ErrorCode.RATE_LIMITED, "Rate limit exceeded", {
      context: { retryAfterMs, retryAfter: Math.ceil(retryAfterMs / 1000) },
    });
  }

  /** Create a tier limit error */
  static tierLimit(resource: string, limit: number, current: number): AppError {
    return new AppError(
      ErrorCode.TIER_LIMIT_EXCEEDED,
      `${resource} limit exceeded: ${current}/${limit}`,
      { context: { resource, limit, current } }
    );
  }
}

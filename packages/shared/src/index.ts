// Types
export type {
  CountryCode,
  Locale,
  UserRole,
  AuthScope,
  WebhookEventType,
  WebhookEvent,
  CandidateProfile,
  JobPosting,
  MatchResult,
} from "./types.js";
export {
  CountryCodeSchema,
  LocaleSchema,
  WebhookEventTypeSchema,
} from "./types.js";

// Constants
export {
  COUNTRIES,
  COUNTRY_CODES,
  LOCALES,
  DEFAULT_LOCALE,
  TIER_LIMITS,
  REGIONS,
  MAX_CV_SIZE_BYTES,
  MAX_PHOTO_SIZE_BYTES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./constants.js";
export type { TierName, Region } from "./constants.js";

// Errors
export { ErrorCode, AppError } from "./errors.js";

// Response envelope
export type { ApiResponse, PaginationMeta } from "./envelope.js";
export {
  success,
  paginatedSuccess,
  failure,
  generateRequestId,
} from "./envelope.js";

// Pagination
export type { CursorInput, CursorResult } from "./pagination.js";
export {
  encodeCursor,
  decodeCursor,
  clampPageSize,
  buildCursorResult,
  cursorWhereClause,
} from "./pagination.js";

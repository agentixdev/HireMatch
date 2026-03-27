// JWT
export type { TokenPayload, TokenPair, JwtConfig } from "./jwt.js";
export { generateTokenPair, verifyToken, decodeToken, isTokenExpired } from "./jwt.js";

// API Keys
export type { ApiKeyData, StoredApiKey } from "./api-key.js";
export {
  generateApiKey,
  hashApiKey,
  isValidApiKeyFormat,
  validateApiKey,
  isTestKey,
  getKeyMode,
} from "./api-key.js";

// MFA / TOTP
export type { TotpConfig } from "./mfa.js";
export {
  generateTotpSecret,
  generateTotp,
  verifyTotp,
  generateTotpUri,
  generateBackupCodes,
} from "./mfa.js";

// Middleware
export type { AuthRequest, AuthContext, AuthResult } from "./middleware.js";
export { authenticate, requireRole, requireScope, requireAll } from "./middleware.js";

// Rate limiting
export type { RateLimitConfig, RateLimitResult } from "./rate-limit.js";
export { SlidingWindowRateLimiter, createRateLimiter } from "./rate-limit.js";

// Audit
export type { AuditEntry, AuditSink } from "./audit.js";
export {
  audit,
  registerAuditSink,
  flushAuditBuffer,
  createAuditLogger,
} from "./audit.js";

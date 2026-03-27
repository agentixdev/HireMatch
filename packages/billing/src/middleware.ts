import { checkUsage, incrementUsage, type UsageCheckResult } from "./usage.js";

/** Billing middleware context */
export interface BillingContext {
  orgId: string;
  tierId: string;
}

/** Result of a billing check */
export type BillingCheckResult =
  | { allowed: true; usage: UsageCheckResult }
  | { allowed: false; usage: UsageCheckResult; error: string };

/**
 * Check if an API call is within the org's billing limits.
 * If allowed, increments the API call counter.
 */
export function requireWithinApiLimits(ctx: BillingContext): BillingCheckResult {
  const usage = checkUsage(ctx.orgId, "apiCalls", ctx.tierId);

  if (!usage.allowed) {
    return {
      allowed: false,
      usage,
      error: `API call limit reached (${usage.current}/${usage.limit}). Upgrade your plan.`,
    };
  }

  // Increment the counter
  incrementUsage(ctx.orgId, "apiCalls");

  return { allowed: true, usage };
}

/**
 * Check if a candidate view is within limits.
 */
export function requireWithinViewLimits(ctx: BillingContext): BillingCheckResult {
  const usage = checkUsage(ctx.orgId, "candidateViews", ctx.tierId);

  if (!usage.allowed) {
    return {
      allowed: false,
      usage,
      error: `Candidate view limit reached (${usage.current}/${usage.limit}). Upgrade your plan.`,
    };
  }

  incrementUsage(ctx.orgId, "candidateViews");
  return { allowed: true, usage };
}

/**
 * Generic limit checker that doesn't auto-increment.
 */
export function requireWithinLimits(
  ctx: BillingContext,
  resource: "apiCalls" | "activeSeats" | "activeSources" | "activeJobs" | "candidateViews"
): BillingCheckResult {
  const usage = checkUsage(ctx.orgId, resource, ctx.tierId);

  if (!usage.allowed) {
    return {
      allowed: false,
      usage,
      error: `${resource} limit reached (${usage.current}/${usage.limit}). Upgrade your plan.`,
    };
  }

  return { allowed: true, usage };
}

/**
 * Build a middleware function for Express/Hono/etc. style frameworks.
 * Returns a function that checks limits and calls next() or returns 402.
 */
export function createBillingMiddleware(
  getContext: (req: unknown) => BillingContext | null
): (req: unknown, res: any, next: () => void) => void {
  return (req, res, next) => {
    const ctx = getContext(req);
    if (!ctx) {
      next();
      return;
    }

    const result = requireWithinApiLimits(ctx);
    if (!result.allowed) {
      res.status(402).json({
        success: false,
        error: {
          code: "BIL_005",
          message: result.error,
          usage: result.usage,
        },
      });
      return;
    }

    // Add warning headers when usage is high
    if (result.usage.warning) {
      res.setHeader("X-Usage-Warning", "true");
      res.setHeader("X-Usage-Percent", String(Math.round(result.usage.percentUsed)));
    }

    next();
  };
}

import { getTier, type TierConfig } from "./tiers.js";

/** Usage record for a billing period */
export interface UsageRecord {
  orgId: string;
  tierId: string;
  period: string; // YYYY-MM format
  apiCalls: number;
  activeSeats: number;
  activeSources: number;
  activeJobs: number;
  candidateViews: number;
  updatedAt: string;
}

/** Usage check result */
export interface UsageCheckResult {
  allowed: boolean;
  resource: string;
  current: number;
  limit: number;
  percentUsed: number;
  warning: boolean;
}

/** In-memory usage store (replace with Redis/DB in production) */
const usageStore = new Map<string, UsageRecord>();

function getUsageKey(orgId: string, period: string): string {
  return `${orgId}:${period}`;
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get or create a usage record for an org and period.
 */
export function getUsageRecord(orgId: string, period?: string): UsageRecord {
  const p = period ?? getCurrentPeriod();
  const key = getUsageKey(orgId, p);
  const existing = usageStore.get(key);
  if (existing) return existing;

  const record: UsageRecord = {
    orgId,
    tierId: "starter",
    period: p,
    apiCalls: 0,
    activeSeats: 0,
    activeSources: 0,
    activeJobs: 0,
    candidateViews: 0,
    updatedAt: new Date().toISOString(),
  };
  usageStore.set(key, record);
  return record;
}

/**
 * Increment a usage counter.
 */
export function incrementUsage(
  orgId: string,
  resource: "apiCalls" | "candidateViews",
  amount = 1,
  period?: string
): UsageRecord {
  const record = getUsageRecord(orgId, period);
  record[resource] += amount;
  record.updatedAt = new Date().toISOString();
  return record;
}

/**
 * Set a gauge-type usage value.
 */
export function setUsageGauge(
  orgId: string,
  resource: "activeSeats" | "activeSources" | "activeJobs",
  value: number,
  period?: string
): UsageRecord {
  const record = getUsageRecord(orgId, period);
  record[resource] = value;
  record.updatedAt = new Date().toISOString();
  return record;
}

/**
 * Check if a specific resource usage is within limits for the org's tier.
 */
export function checkUsage(
  orgId: string,
  resource: "apiCalls" | "activeSeats" | "activeSources" | "activeJobs" | "candidateViews",
  tierId: string,
  period?: string
): UsageCheckResult {
  const tier = getTier(tierId);
  if (!tier) {
    return { allowed: false, resource, current: 0, limit: 0, percentUsed: 100, warning: false };
  }

  const record = getUsageRecord(orgId, period);

  const resourceToLimit: Record<string, keyof TierConfig["limits"]> = {
    apiCalls: "apiCallsPerMonth",
    activeSeats: "seats",
    activeSources: "sources",
    activeJobs: "jobs",
    candidateViews: "candidateViews",
  };

  const limitKey = resourceToLimit[resource];
  if (!limitKey) {
    return { allowed: false, resource, current: 0, limit: 0, percentUsed: 100, warning: false };
  }

  const limit = tier.limits[limitKey] as number;
  const current = record[resource];
  const percentUsed = limit === Infinity ? 0 : (current / limit) * 100;

  return {
    allowed: current < limit,
    resource,
    current,
    limit,
    percentUsed: Math.min(percentUsed, 100),
    warning: percentUsed >= 80 && percentUsed < 100,
  };
}

/**
 * Check all usage limits for an org.
 */
export function checkAllUsage(orgId: string, tierId: string): UsageCheckResult[] {
  const resources = [
    "apiCalls",
    "activeSeats",
    "activeSources",
    "activeJobs",
    "candidateViews",
  ] as const;

  return resources.map((r) => checkUsage(orgId, r, tierId));
}

/**
 * Reset the in-memory usage store (for testing).
 */
export function resetUsageStore(): void {
  usageStore.clear();
}

import { z } from "zod";
import { COUNTRIES, LOCALES } from "./constants.js";

/** Country code union — all 29 supported countries */
export type CountryCode = keyof typeof COUNTRIES;

/** Locale union — all 20 supported locales */
export type Locale = (typeof LOCALES)[number];

/** User roles */
export type UserRole = "candidate" | "recruiter" | "admin" | "system";

/** Authentication scopes */
export type AuthScope =
  | "read:candidates"
  | "write:candidates"
  | "read:jobs"
  | "write:jobs"
  | "read:matches"
  | "write:matches"
  | "read:billing"
  | "write:billing"
  | "admin:all"
  | "webhook:manage";

/** Webhook event type definitions */
export type WebhookEventType =
  | "candidate.created"
  | "candidate.updated"
  | "candidate.deleted"
  | "candidate.cv_parsed"
  | "job.created"
  | "job.updated"
  | "job.closed"
  | "job.deleted"
  | "match.found"
  | "match.score_updated"
  | "match.rejected"
  | "application.submitted"
  | "application.status_changed"
  | "visa.check_completed"
  | "visa.rules_updated"
  | "scrape.completed"
  | "scrape.failed"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "usage.limit_approaching"
  | "usage.limit_exceeded";

/** Webhook event payload */
export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  version: "1.0";
  data: T;
  metadata: {
    orgId: string;
    triggeredBy: string;
    correlationId: string;
  };
}

/** Zod schemas for runtime validation */
export const CountryCodeSchema = z.enum(
  Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]]
);

export const LocaleSchema = z.enum(LOCALES);

export const WebhookEventTypeSchema = z.enum([
  "candidate.created",
  "candidate.updated",
  "candidate.deleted",
  "candidate.cv_parsed",
  "job.created",
  "job.updated",
  "job.closed",
  "job.deleted",
  "match.found",
  "match.score_updated",
  "match.rejected",
  "application.submitted",
  "application.status_changed",
  "visa.check_completed",
  "visa.rules_updated",
  "scrape.completed",
  "scrape.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  "usage.limit_approaching",
  "usage.limit_exceeded",
]);

/** Candidate profile */
export interface CandidateProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  nationality: CountryCode;
  currentCountry: CountryCode;
  targetCountries: CountryCode[];
  skills: string[];
  experienceYears: number;
  educationLevel: "high_school" | "bachelor" | "master" | "phd" | "other";
  currentTitle?: string;
  desiredTitle?: string;
  salaryExpectation?: {
    min: number;
    max: number;
    currency: string;
  };
  visaStatus?: string;
  photoUrl?: string;
  cvUrl?: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
}

/** Job posting */
export interface JobPosting {
  id: string;
  orgId: string;
  title: string;
  description: string;
  country: CountryCode;
  city?: string;
  remote: boolean;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceMin: number;
  experienceMax: number;
  educationLevel: "high_school" | "bachelor" | "master" | "phd" | "any";
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  visaSponsor: boolean;
  status: "draft" | "active" | "paused" | "closed";
  createdAt: string;
  updatedAt: string;
}

/** Match result */
export interface MatchResult {
  id: string;
  candidateId: string;
  jobId: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  visaScore: number;
  salaryScore: number;
  explanation: string;
  matchedAt: string;
}

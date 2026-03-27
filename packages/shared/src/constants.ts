/** All 29 supported countries with metadata */
export const COUNTRIES = {
  US: { name: "United States", region: "north-america", currency: "USD", timezone: "America/New_York" },
  CA: { name: "Canada", region: "north-america", currency: "CAD", timezone: "America/Toronto" },
  GB: { name: "United Kingdom", region: "europe", currency: "GBP", timezone: "Europe/London" },
  CH: { name: "Switzerland", region: "europe", currency: "CHF", timezone: "Europe/Zurich" },
  DE: { name: "Germany", region: "europe", currency: "EUR", timezone: "Europe/Berlin" },
  FR: { name: "France", region: "europe", currency: "EUR", timezone: "Europe/Paris" },
  ES: { name: "Spain", region: "europe", currency: "EUR", timezone: "Europe/Madrid" },
  IT: { name: "Italy", region: "europe", currency: "EUR", timezone: "Europe/Rome" },
  NL: { name: "Netherlands", region: "europe", currency: "EUR", timezone: "Europe/Amsterdam" },
  BE: { name: "Belgium", region: "europe", currency: "EUR", timezone: "Europe/Brussels" },
  AT: { name: "Austria", region: "europe", currency: "EUR", timezone: "Europe/Vienna" },
  PT: { name: "Portugal", region: "europe", currency: "EUR", timezone: "Europe/Lisbon" },
  IE: { name: "Ireland", region: "europe", currency: "EUR", timezone: "Europe/Dublin" },
  SE: { name: "Sweden", region: "europe", currency: "SEK", timezone: "Europe/Stockholm" },
  DK: { name: "Denmark", region: "europe", currency: "DKK", timezone: "Europe/Copenhagen" },
  NO: { name: "Norway", region: "europe", currency: "NOK", timezone: "Europe/Oslo" },
  FI: { name: "Finland", region: "europe", currency: "EUR", timezone: "Europe/Helsinki" },
  PL: { name: "Poland", region: "europe", currency: "PLN", timezone: "Europe/Warsaw" },
  CZ: { name: "Czech Republic", region: "europe", currency: "CZK", timezone: "Europe/Prague" },
  RO: { name: "Romania", region: "europe", currency: "RON", timezone: "Europe/Bucharest" },
  IN: { name: "India", region: "asia", currency: "INR", timezone: "Asia/Kolkata" },
  MX: { name: "Mexico", region: "latin-america", currency: "MXN", timezone: "America/Mexico_City" },
  BR: { name: "Brazil", region: "latin-america", currency: "BRL", timezone: "America/Sao_Paulo" },
  AR: { name: "Argentina", region: "latin-america", currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
  CN: { name: "China", region: "asia", currency: "CNY", timezone: "Asia/Shanghai" },
  JP: { name: "Japan", region: "asia", currency: "JPY", timezone: "Asia/Tokyo" },
  KR: { name: "South Korea", region: "asia", currency: "KRW", timezone: "Asia/Seoul" },
  VN: { name: "Vietnam", region: "asia", currency: "VND", timezone: "Asia/Ho_Chi_Minh" },
  PH: { name: "Philippines", region: "asia", currency: "PHP", timezone: "Asia/Manila" },
} as const;

export const COUNTRY_CODES = Object.keys(COUNTRIES) as (keyof typeof COUNTRIES)[];

/** All 20 supported locales */
export const LOCALES = [
  "en", "fr", "de", "es", "it", "pt", "nl", "pl", "cs", "ro",
  "sv", "da", "no", "fi", "ja", "ko", "zh", "vi", "ar", "hi",
] as const;

export const DEFAULT_LOCALE = "en" as const;

/** Tier limits for each subscription plan */
export const TIER_LIMITS = {
  free: {
    maxJobs: 3,
    maxCandidateViews: 10,
    maxApiCalls: 0,
    maxSeats: 1,
    maxSources: 0,
    webhooks: false,
    customBranding: false,
    atsIntegration: false,
    prioritySupport: false,
  },
  starter: {
    maxJobs: 25,
    maxCandidateViews: 500,
    maxApiCalls: 10_000,
    maxSeats: 2,
    maxSources: 5,
    webhooks: true,
    customBranding: false,
    atsIntegration: false,
    prioritySupport: false,
  },
  pro: {
    maxJobs: 100,
    maxCandidateViews: 5_000,
    maxApiCalls: 100_000,
    maxSeats: 10,
    maxSources: Infinity,
    webhooks: true,
    customBranding: true,
    atsIntegration: true,
    prioritySupport: false,
  },
  enterprise: {
    maxJobs: Infinity,
    maxCandidateViews: Infinity,
    maxApiCalls: Infinity,
    maxSeats: Infinity,
    maxSources: Infinity,
    webhooks: true,
    customBranding: true,
    atsIntegration: true,
    prioritySupport: true,
  },
} as const;

export type TierName = keyof typeof TIER_LIMITS;

/** Regions for grouping countries */
export const REGIONS = ["north-america", "europe", "asia", "latin-america"] as const;
export type Region = (typeof REGIONS)[number];

/** Maximum file sizes */
export const MAX_CV_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Search
export {
  buildHybridSearchQuery,
  buildVectorSearchQuery,
  buildTextSearchQuery,
} from "./search.js";
export type { HybridSearchParams, HybridSearchResult } from "./search.js";

// Scoring
export type { ScoringWeights, ScoringInput, MatchScore } from "./score.js";
export { DEFAULT_WEIGHTS, computeMatchScore } from "./score.js";

// Filters
export type { FilterParams } from "./filters.js";
export {
  createFilter,
  filterByCountry,
  filterBySkills,
  filterByExperience,
  filterByVisaSponsor,
  filterBySalary,
  filterByStatus,
  filterByDateRange,
  filterByText,
  filterByEducation,
  compileFilter,
} from "./filters.js";

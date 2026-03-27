/**
 * Match scoring algorithm for candidate-job matching.
 *
 * Weighted scoring across five dimensions:
 *   Skills:     40%  (default)
 *   Experience: 20%
 *   Location:   15%
 *   Salary:     15%
 *   Visa:       10%
 */

export interface ScoringWeights {
  skills: number;
  experience: number;
  location: number;
  salary: number;
  visa: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 0.40,
  experience: 0.20,
  location: 0.15,
  salary: 0.15,
  visa: 0.10,
};

export interface ScoringInput {
  candidate: {
    skills: string[];
    experience_years: number;
    country?: string;
    visa_status?: string;
    salary_expectation_min?: number;
    salary_expectation_max?: number;
    languages?: string[];
  };
  job: {
    skills_required: string[];
    skills_nice_to_have?: string[];
    experience_min?: number;
    experience_max?: number;
    country?: string;
    visa_sponsorship: boolean;
    salary_min?: number;
    salary_max?: number;
    work_mode?: 'onsite' | 'remote' | 'hybrid';
    languages_required?: string[];
  };
  weights?: Partial<ScoringWeights>;
}

export interface MatchScore {
  score: number;
  breakdown: {
    skills_score: number;
    experience_score: number;
    location_score: number;
    salary_score: number;
    visa_score: number;
  };
  skills_overlap: number;
  missing_skills: string[];
  bonus_skills: string[];
  visa_eligible: boolean;
  sponsorship_required: boolean;
}

function normalize(arr: string[]): string[] {
  return arr.map(s => s.toLowerCase().trim());
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function scoreSkills(
  candidateSkills: string[],
  requiredSkills: string[],
  niceToHaveSkills: string[],
): { score: number; overlap: number; missing: string[]; bonus: string[] } {
  const cLower = normalize(candidateSkills);
  const rLower = normalize(requiredSkills);
  const nLower = normalize(niceToHaveSkills);

  const matched = rLower.filter(s => cLower.includes(s));
  const missing = requiredSkills.filter(
    s => !cLower.includes(s.toLowerCase().trim()),
  );
  const bonus = niceToHaveSkills.filter(
    s => cLower.includes(s.toLowerCase().trim()),
  );

  let score = rLower.length > 0 ? matched.length / rLower.length : 1;

  if (nLower.length > 0) {
    const bonusRatio = bonus.length / nLower.length;
    score = Math.min(1, score + bonusRatio * 0.1);
  }

  const overlap =
    rLower.length > 0
      ? Math.round((matched.length / rLower.length) * 100)
      : 100;

  return { score, overlap, missing, bonus };
}

function scoreExperience(
  candidateYears: number,
  minYears?: number,
  maxYears?: number,
): number {
  if (minYears === undefined && maxYears === undefined) return 1;

  if (minYears !== undefined && candidateYears < minYears) {
    return clamp01(1 - (minYears - candidateYears) / Math.max(minYears, 1));
  }

  if (maxYears !== undefined && candidateYears > maxYears + 5) {
    return 0.7;
  }

  if (maxYears !== undefined && candidateYears > maxYears) {
    return 0.85;
  }

  return 1;
}

function scoreLocation(
  candidateCountry?: string,
  jobCountry?: string,
  workMode?: string,
): number {
  if (!jobCountry || !candidateCountry) return 0.5;
  if (candidateCountry === jobCountry) return 1;
  if (workMode === 'remote') return 0.9;
  if (workMode === 'hybrid') return 0.4;
  return 0.2;
}

function scoreSalary(
  candidateMin?: number,
  _candidateMax?: number,
  jobMin?: number,
  jobMax?: number,
): number {
  if (!jobMin && !jobMax) return 0.5;
  if (!candidateMin) return 0.5;

  const jMax = jobMax ?? Infinity;

  if (candidateMin >= (jobMin ?? 0) && candidateMin <= jMax) return 1;
  if (jobMin && candidateMin < jobMin) return 0.8;

  if (jobMax && jobMax > 0) {
    const overBy = (candidateMin - jobMax) / jobMax;
    return clamp01(1 - overBy * 2);
  }

  return 0.5;
}

function scoreVisa(
  candidateCountry?: string,
  jobCountry?: string,
  visaSponsorship?: boolean,
): { score: number; eligible: boolean; sponsorshipRequired: boolean } {
  if (candidateCountry && jobCountry && candidateCountry === jobCountry) {
    return { score: 1, eligible: true, sponsorshipRequired: false };
  }

  if (visaSponsorship) {
    return { score: 0.8, eligible: true, sponsorshipRequired: true };
  }

  if (candidateCountry && jobCountry && candidateCountry !== jobCountry) {
    return { score: 0.1, eligible: false, sponsorshipRequired: false };
  }

  return { score: 0.5, eligible: true, sponsorshipRequired: false };
}

function resolveWeights(partial?: Partial<ScoringWeights>): ScoringWeights {
  if (!partial) return DEFAULT_WEIGHTS;
  return {
    skills: partial.skills ?? DEFAULT_WEIGHTS.skills,
    experience: partial.experience ?? DEFAULT_WEIGHTS.experience,
    location: partial.location ?? DEFAULT_WEIGHTS.location,
    salary: partial.salary ?? DEFAULT_WEIGHTS.salary,
    visa: partial.visa ?? DEFAULT_WEIGHTS.visa,
  };
}

/**
 * Compute a match score between a candidate and a job.
 */
export function computeMatchScore(input: ScoringInput): MatchScore {
  const { candidate, job } = input;
  const w = resolveWeights(input.weights);

  const skillsResult = scoreSkills(
    candidate.skills,
    job.skills_required,
    job.skills_nice_to_have ?? [],
  );

  const experience_score = scoreExperience(
    candidate.experience_years,
    job.experience_min,
    job.experience_max,
  );

  const location_score = scoreLocation(
    candidate.country,
    job.country,
    job.work_mode,
  );

  const salary_score = scoreSalary(
    candidate.salary_expectation_min,
    candidate.salary_expectation_max,
    job.salary_min,
    job.salary_max,
  );

  const visaResult = scoreVisa(
    candidate.country,
    job.country,
    job.visa_sponsorship,
  );

  const score =
    skillsResult.score * w.skills +
    experience_score * w.experience +
    location_score * w.location +
    salary_score * w.salary +
    visaResult.score * w.visa;

  return {
    score: round2(score),
    breakdown: {
      skills_score: round2(skillsResult.score),
      experience_score: round2(experience_score),
      location_score: round2(location_score),
      salary_score: round2(salary_score),
      visa_score: round2(visaResult.score),
    },
    skills_overlap: skillsResult.overlap,
    missing_skills: skillsResult.missing,
    bonus_skills: skillsResult.bonus,
    visa_eligible: visaResult.eligible,
    sponsorship_required: visaResult.sponsorshipRequired,
  };
}

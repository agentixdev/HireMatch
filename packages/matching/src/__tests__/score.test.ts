import { computeMatchScore, DEFAULT_WEIGHTS } from '../score';
import type { ScoringInput } from '../score';

function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    candidate: {
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'AWS'],
      experience_years: 5,
      country: 'US',
      salary_expectation_min: 110_000,
      salary_expectation_max: 140_000,
      ...(overrides.candidate ?? {}),
    },
    job: {
      skills_required: ['TypeScript', 'Node.js', 'PostgreSQL'],
      skills_nice_to_have: ['React', 'AWS'],
      experience_min: 3,
      experience_max: 7,
      country: 'US',
      visa_sponsorship: false,
      salary_min: 100_000,
      salary_max: 150_000,
      work_mode: 'onsite',
      ...(overrides.job ?? {}),
    },
    weights: overrides.weights,
  };
}

describe('computeMatchScore() - overall', () => {
  it('perfect match returns high score (>= 0.85)', () => {
    const result = computeMatchScore(makeInput());
    expect(result.score).toBeGreaterThanOrEqual(0.85);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  it('no overlap returns low score', () => {
    const result = computeMatchScore(makeInput({
      candidate: {
        skills: ['Java', 'C#', 'Oracle'],
        experience_years: 0,
        country: 'JP',
        salary_expectation_min: 300_000,
        salary_expectation_max: 400_000,
      },
    }));
    expect(result.score).toBeLessThan(0.4);
  });

  it('score is between 0 and 1', () => {
    const result = computeMatchScore(makeInput());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('returns breakdown for all dimensions', () => {
    const result = computeMatchScore(makeInput());
    expect(result.breakdown).toHaveProperty('skills_score');
    expect(result.breakdown).toHaveProperty('experience_score');
    expect(result.breakdown).toHaveProperty('location_score');
    expect(result.breakdown).toHaveProperty('salary_score');
    expect(result.breakdown).toHaveProperty('visa_score');
  });
});

describe('computeMatchScore() - skills', () => {
  it('all required skills matched gives high skills score', () => {
    const result = computeMatchScore(makeInput());
    expect(result.breakdown.skills_score).toBeGreaterThanOrEqual(0.9);
    expect(result.skills_overlap).toBe(100);
  });

  it('no required skills matched gives 0 skills score', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['Java', 'C#'], experience_years: 5, country: 'US' },
    }));
    expect(result.breakdown.skills_score).toBe(0);
    expect(result.skills_overlap).toBe(0);
  });

  it('partial skill match gives medium score', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript', 'Python'], experience_years: 5, country: 'US' },
    }));
    expect(result.breakdown.skills_score).toBeGreaterThan(0.1);
    expect(result.breakdown.skills_score).toBeLessThan(0.8);
  });

  it('missing skills are listed', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript'], experience_years: 5, country: 'US' },
    }));
    expect(result.missing_skills).toContain('Node.js');
    expect(result.missing_skills).toContain('PostgreSQL');
  });

  it('bonus skills from nice-to-have are listed', () => {
    const result = computeMatchScore(makeInput());
    expect(result.bonus_skills).toContain('React');
    expect(result.bonus_skills).toContain('AWS');
  });

  it('case-insensitive skill matching', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['typescript', 'node.js', 'postgresql'], experience_years: 5, country: 'US' },
    }));
    expect(result.skills_overlap).toBe(100);
  });
});

describe('computeMatchScore() - experience', () => {
  it('in-range experience gives 1.0', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript', 'Node.js', 'PostgreSQL'], experience_years: 5, country: 'US' },
    }));
    expect(result.breakdown.experience_score).toBe(1);
  });

  it('under-qualified reduces score', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript', 'Node.js', 'PostgreSQL'], experience_years: 1, country: 'US' },
    }));
    expect(result.breakdown.experience_score).toBeLessThan(1);
  });

  it('over-qualified has slight penalty', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript', 'Node.js', 'PostgreSQL'], experience_years: 10, country: 'US' },
    }));
    expect(result.breakdown.experience_score).toBeLessThan(1);
    expect(result.breakdown.experience_score).toBeGreaterThanOrEqual(0.5);
  });

  it('zero experience for non-zero requirement gives low score', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: ['TypeScript', 'Node.js', 'PostgreSQL'], experience_years: 0, country: 'US' },
    }));
    expect(result.breakdown.experience_score).toBeLessThan(0.5);
  });
});

describe('computeMatchScore() - location', () => {
  it('same country gives 1.0', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'US' },
      job: { skills_required: [], visa_sponsorship: false, country: 'US', work_mode: 'onsite' },
    }));
    expect(result.breakdown.location_score).toBe(1);
  });

  it('different country + remote gives 0.9', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'CA' },
      job: { skills_required: [], visa_sponsorship: false, country: 'US', work_mode: 'remote' },
    }));
    expect(result.breakdown.location_score).toBe(0.9);
  });

  it('different country + onsite gives 0.2', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'JP' },
      job: { skills_required: [], visa_sponsorship: false, country: 'US', work_mode: 'onsite' },
    }));
    expect(result.breakdown.location_score).toBe(0.2);
  });

  it('missing country gives 0.5', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: undefined },
      job: { skills_required: [], visa_sponsorship: false, country: 'US' },
    }));
    expect(result.breakdown.location_score).toBe(0.5);
  });
});

describe('computeMatchScore() - visa', () => {
  it('same country means no visa needed', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'US' },
      job: { skills_required: [], visa_sponsorship: false, country: 'US' },
    }));
    expect(result.breakdown.visa_score).toBe(1);
    expect(result.visa_eligible).toBe(true);
    expect(result.sponsorship_required).toBe(false);
  });

  it('different country + visa sponsor gives 0.8', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'CA' },
      job: { skills_required: [], visa_sponsorship: true, country: 'US' },
    }));
    expect(result.breakdown.visa_score).toBe(0.8);
    expect(result.sponsorship_required).toBe(true);
  });

  it('different country + no sponsor gives 0.1', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, country: 'JP' },
      job: { skills_required: [], visa_sponsorship: false, country: 'US' },
    }));
    expect(result.breakdown.visa_score).toBe(0.1);
    expect(result.visa_eligible).toBe(false);
  });
});

describe('computeMatchScore() - salary', () => {
  it('candidate within range gives 1.0', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, salary_expectation_min: 120_000 },
      job: { skills_required: [], visa_sponsorship: false, salary_min: 100_000, salary_max: 150_000 },
    }));
    expect(result.breakdown.salary_score).toBe(1);
  });

  it('no salary info gives 0.5', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, salary_expectation_min: undefined, salary_expectation_max: undefined },
      job: { skills_required: [], visa_sponsorship: false, salary_min: undefined, salary_max: undefined },
    }));
    expect(result.breakdown.salary_score).toBe(0.5);
  });

  it('candidate below range still scores decently', () => {
    const result = computeMatchScore(makeInput({
      candidate: { skills: [], experience_years: 0, salary_expectation_min: 80_000 },
      job: { skills_required: [], visa_sponsorship: false, salary_min: 100_000, salary_max: 150_000 },
    }));
    expect(result.breakdown.salary_score).toBe(0.8);
  });
});

describe('DEFAULT_WEIGHTS', () => {
  it('all weights sum to 1.0', () => {
    const total = Object.values(DEFAULT_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(Math.abs(total - 1.0)).toBeLessThan(0.001);
  });

  it('skills has the highest weight (0.40)', () => {
    expect(DEFAULT_WEIGHTS.skills).toBe(0.40);
    expect(DEFAULT_WEIGHTS.skills).toBeGreaterThan(DEFAULT_WEIGHTS.experience);
    expect(DEFAULT_WEIGHTS.skills).toBeGreaterThan(DEFAULT_WEIGHTS.location);
  });

  it('has 5 dimensions', () => {
    expect(Object.keys(DEFAULT_WEIGHTS)).toHaveLength(5);
  });
});

describe('computeMatchScore() - custom weights', () => {
  it('respects custom weights', () => {
    const result = computeMatchScore(makeInput({
      weights: { skills: 1.0, experience: 0, location: 0, salary: 0, visa: 0 },
    }));
    // Score should be entirely based on skills
    expect(result.score).toBe(result.breakdown.skills_score);
  });
});

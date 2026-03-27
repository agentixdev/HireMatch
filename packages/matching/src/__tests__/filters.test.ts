import {
  createFilter,
  filterByCountry,
  filterBySkills,
  filterByExperience,
  filterBySalary,
  filterByVisaSponsor,
  filterByStatus,
  filterByDateRange,
  filterByText,
  filterByEducation,
  compileFilter,
} from '../filters';

describe('createFilter()', () => {
  it('returns empty conditions and params', () => {
    const filter = createFilter();
    expect(filter.conditions).toEqual([]);
    expect(filter.params).toEqual([]);
  });
});

describe('filterByCountry()', () => {
  it('creates equality condition for country', () => {
    const filter = filterByCountry(createFilter(), 'US');
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toBe('country = $1');
    expect(filter.params).toEqual(['US']);
  });

  it('uses custom column name', () => {
    const filter = filterByCountry(createFilter(), 'CA', 'origin_country');
    expect(filter.conditions[0]).toBe('origin_country = $1');
    expect(filter.params).toEqual(['CA']);
  });

  it('increments parameter index correctly', () => {
    let filter = filterByCountry(createFilter(), 'US');
    filter = filterByCountry(filter, 'CA', 'origin_country');
    expect(filter.conditions[1]).toBe('origin_country = $2');
    expect(filter.params).toEqual(['US', 'CA']);
  });
});

describe('filterBySkills()', () => {
  it('uses && operator for array overlap', () => {
    const filter = filterBySkills(createFilter(), ['TypeScript', 'React']);
    expect(filter.conditions[0]).toBe('skills && $1');
    expect(filter.params).toEqual([['TypeScript', 'React']]);
  });

  it('uses custom column name', () => {
    const filter = filterBySkills(createFilter(), ['Python'], 'skills_required');
    expect(filter.conditions[0]).toBe('skills_required && $1');
  });

  it('skips filter for empty skills array', () => {
    const filter = filterBySkills(createFilter(), []);
    expect(filter.conditions).toHaveLength(0);
    expect(filter.params).toHaveLength(0);
  });
});

describe('filterByExperience()', () => {
  it('creates min condition only', () => {
    const filter = filterByExperience(createFilter(), 3);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toBe('experience_years >= $1');
    expect(filter.params).toEqual([3]);
  });

  it('creates max condition only', () => {
    const filter = filterByExperience(createFilter(), undefined, 10);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toBe('experience_years <= $1');
    expect(filter.params).toEqual([10]);
  });

  it('creates both min and max conditions', () => {
    const filter = filterByExperience(createFilter(), 3, 10);
    expect(filter.conditions).toHaveLength(2);
    expect(filter.conditions[0]).toBe('experience_years >= $1');
    expect(filter.conditions[1]).toBe('experience_years <= $2');
    expect(filter.params).toEqual([3, 10]);
  });

  it('skips filter when neither min nor max specified', () => {
    const filter = filterByExperience(createFilter());
    expect(filter.conditions).toHaveLength(0);
  });

  it('uses custom column name', () => {
    const filter = filterByExperience(createFilter(), 2, undefined, 'years');
    expect(filter.conditions[0]).toBe('years >= $1');
  });
});

describe('filterBySalary()', () => {
  it('creates overlap conditions with min and max', () => {
    const filter = filterBySalary(createFilter(), 80_000, 120_000);
    expect(filter.conditions).toHaveLength(2);
    expect(filter.conditions[0]).toContain('salary_max');
    expect(filter.conditions[1]).toContain('salary_min');
    expect(filter.params).toEqual([80_000, 120_000]);
  });

  it('handles only min salary', () => {
    const filter = filterBySalary(createFilter(), 50_000);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toContain('salary_max');
  });

  it('handles only max salary', () => {
    const filter = filterBySalary(createFilter(), undefined, 200_000);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toContain('salary_min');
  });

  it('uses custom column names', () => {
    const filter = filterBySalary(createFilter(), 50_000, 100_000, 'min_sal', 'max_sal');
    expect(filter.conditions[0]).toContain('max_sal');
    expect(filter.conditions[1]).toContain('min_sal');
  });
});

describe('filterByVisaSponsor()', () => {
  it('adds condition for true', () => {
    const filter = filterByVisaSponsor(createFilter(), true);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toBe('visa_sponsorship = $1');
    expect(filter.params).toEqual([true]);
  });

  it('adds condition for false', () => {
    const filter = filterByVisaSponsor(createFilter(), false);
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toBe('visa_sponsorship = $1');
    expect(filter.params).toEqual([false]);
  });
});

describe('filterByStatus()', () => {
  it('creates equality condition', () => {
    const filter = filterByStatus(createFilter(), 'active');
    expect(filter.conditions[0]).toBe('status = $1');
    expect(filter.params).toEqual(['active']);
  });

  it('uses custom column name', () => {
    const filter = filterByStatus(createFilter(), 'draft', 'job_status');
    expect(filter.conditions[0]).toBe('job_status = $1');
  });
});

describe('filterByDateRange()', () => {
  it('creates after condition with Date object', () => {
    const d = new Date('2025-01-01T00:00:00Z');
    const filter = filterByDateRange(createFilter(), d);
    expect(filter.conditions[0]).toBe('created_at >= $1');
    expect(filter.params[0]).toBe(d.toISOString());
  });

  it('creates after condition with string', () => {
    const filter = filterByDateRange(createFilter(), '2025-01-01');
    expect(filter.conditions[0]).toBe('created_at >= $1');
    expect(filter.params[0]).toBe('2025-01-01');
  });

  it('creates before condition', () => {
    const d = new Date('2025-12-31T23:59:59Z');
    const filter = filterByDateRange(createFilter(), undefined, d);
    expect(filter.conditions[0]).toBe('created_at <= $1');
  });

  it('creates both conditions', () => {
    const after = new Date('2025-01-01');
    const before = new Date('2025-12-31');
    const filter = filterByDateRange(createFilter(), after, before);
    expect(filter.conditions).toHaveLength(2);
  });

  it('uses custom column name', () => {
    const filter = filterByDateRange(createFilter(), '2025-01-01', undefined, 'updated_at');
    expect(filter.conditions[0]).toBe('updated_at >= $1');
  });
});

describe('filterByText()', () => {
  it('creates full-text search condition', () => {
    const filter = filterByText(createFilter(), 'senior engineer');
    expect(filter.conditions[0]).toContain("plainto_tsquery('english', $1)");
    expect(filter.params).toEqual(['senior engineer']);
  });

  it('skips for empty query', () => {
    const filter = filterByText(createFilter(), '   ');
    expect(filter.conditions).toHaveLength(0);
  });

  it('trims whitespace from query', () => {
    const filter = filterByText(createFilter(), '  typescript  ');
    expect(filter.params).toEqual(['typescript']);
  });

  it('uses custom column and language', () => {
    const filter = filterByText(createFilter(), 'test', 'my_vector', 'french');
    expect(filter.conditions[0]).toContain("plainto_tsquery('french', $1)");
    expect(filter.conditions[0]).toContain('my_vector');
  });
});

describe('filterByEducation()', () => {
  it('creates >= condition with numeric level', () => {
    const filter = filterByEducation(createFilter(), 3);
    expect(filter.conditions[0]).toBe('education_level >= $1');
    expect(filter.params).toEqual([3]);
  });

  it('uses custom column name', () => {
    const filter = filterByEducation(createFilter(), 2, 'edu_level');
    expect(filter.conditions[0]).toBe('edu_level >= $1');
  });
});

describe('compileFilter()', () => {
  it('returns empty clause for empty filter', () => {
    const result = compileFilter(createFilter());
    expect(result.clause).toBe('');
    expect(result.params).toEqual([]);
  });

  it('combines multiple filters with AND', () => {
    let filter = filterByCountry(createFilter(), 'US');
    filter = filterBySkills(filter, ['TypeScript']);
    filter = filterByExperience(filter, 3, 10);

    const result = compileFilter(filter);
    expect(result.clause).toContain(' AND ');
    expect(result.clause.split(' AND ')).toHaveLength(4);
    expect(result.params).toHaveLength(4);
  });

  it('single condition has no AND', () => {
    const filter = filterByCountry(createFilter(), 'US');
    const result = compileFilter(filter);
    expect(result.clause).not.toContain(' AND ');
    expect(result.clause).toBe('country = $1');
  });

  it('supports custom start index for parameter reindexing', () => {
    const filter = filterByCountry(createFilter(), 'US');
    const result = compileFilter(filter, 5);
    expect(result.clause).toBe('country = $5');
    expect(result.params).toEqual(['US']);
  });

  it('reindexes multiple params correctly', () => {
    let filter = filterByCountry(createFilter(), 'US');
    filter = filterByExperience(filter, 3);
    const result = compileFilter(filter, 10);
    expect(result.clause).toContain('$10');
    expect(result.clause).toContain('$11');
  });
});

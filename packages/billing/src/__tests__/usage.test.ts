import {
  getUsageRecord,
  incrementUsage,
  setUsageGauge,
  checkUsage,
  checkAllUsage,
  resetUsageStore,
} from '../usage';

beforeEach(() => {
  resetUsageStore();
});

describe('getUsageRecord()', () => {
  it('creates a new record with zero counters', () => {
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.orgId).toBe('org-1');
    expect(record.period).toBe('2025-06');
    expect(record.apiCalls).toBe(0);
    expect(record.candidateViews).toBe(0);
    expect(record.activeSeats).toBe(0);
    expect(record.activeSources).toBe(0);
    expect(record.activeJobs).toBe(0);
  });

  it('returns the same record for same org + period', () => {
    const r1 = getUsageRecord('org-1', '2025-06');
    r1.apiCalls = 5;
    const r2 = getUsageRecord('org-1', '2025-06');
    expect(r2.apiCalls).toBe(5);
  });

  it('returns different records for different orgs', () => {
    const r1 = getUsageRecord('org-1', '2025-06');
    const r2 = getUsageRecord('org-2', '2025-06');
    r1.apiCalls = 10;
    expect(r2.apiCalls).toBe(0);
  });

  it('uses current period when none specified', () => {
    const record = getUsageRecord('org-1');
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(record.period).toBe(expected);
  });
});

describe('incrementUsage()', () => {
  it('increments apiCalls by 1 by default', () => {
    incrementUsage('org-1', 'apiCalls', 1, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.apiCalls).toBe(1);
  });

  it('increments by custom amount', () => {
    incrementUsage('org-1', 'apiCalls', 10, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.apiCalls).toBe(10);
  });

  it('accumulates over multiple calls', () => {
    incrementUsage('org-1', 'apiCalls', 5, '2025-06');
    incrementUsage('org-1', 'apiCalls', 3, '2025-06');
    incrementUsage('org-1', 'apiCalls', 2, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.apiCalls).toBe(10);
  });

  it('increments candidateViews', () => {
    incrementUsage('org-1', 'candidateViews', 1, '2025-06');
    incrementUsage('org-1', 'candidateViews', 1, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.candidateViews).toBe(2);
  });

  it('updates updatedAt timestamp', () => {
    const before = new Date().toISOString();
    incrementUsage('org-1', 'apiCalls', 1, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.updatedAt >= before).toBe(true);
  });
});

describe('setUsageGauge()', () => {
  it('sets activeSeats', () => {
    setUsageGauge('org-1', 'activeSeats', 5, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.activeSeats).toBe(5);
  });

  it('overwrites previous value', () => {
    setUsageGauge('org-1', 'activeJobs', 10, '2025-06');
    setUsageGauge('org-1', 'activeJobs', 3, '2025-06');
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.activeJobs).toBe(3);
  });
});

describe('checkUsage()', () => {
  it('returns allowed=true when under limit', () => {
    incrementUsage('org-1', 'apiCalls', 5000, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'starter', '2025-06');
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(5000);
    expect(result.limit).toBe(10_000);
    expect(result.percentUsed).toBe(50);
  });

  it('returns allowed=false when at limit', () => {
    incrementUsage('org-1', 'apiCalls', 10_000, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'starter', '2025-06');
    expect(result.allowed).toBe(false);
    expect(result.percentUsed).toBe(100);
  });

  it('returns allowed=false when over limit', () => {
    incrementUsage('org-1', 'apiCalls', 15_000, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'starter', '2025-06');
    expect(result.allowed).toBe(false);
    expect(result.percentUsed).toBe(100); // capped at 100
  });

  it('triggers warning at 80% threshold', () => {
    incrementUsage('org-1', 'apiCalls', 8500, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'starter', '2025-06');
    expect(result.allowed).toBe(true);
    expect(result.warning).toBe(true);
    expect(result.percentUsed).toBe(85);
  });

  it('no warning below 80%', () => {
    incrementUsage('org-1', 'apiCalls', 7000, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'starter', '2025-06');
    expect(result.warning).toBe(false);
  });

  it('returns 0% for enterprise (Infinity limit)', () => {
    incrementUsage('org-1', 'apiCalls', 999_999, '2025-06');
    const result = checkUsage('org-1', 'apiCalls', 'enterprise', '2025-06');
    expect(result.allowed).toBe(true);
    expect(result.percentUsed).toBe(0);
    expect(result.warning).toBe(false);
  });

  it('returns allowed=false for invalid tier', () => {
    const result = checkUsage('org-1', 'apiCalls', 'fake', '2025-06');
    expect(result.allowed).toBe(false);
  });
});

describe('checkAllUsage()', () => {
  it('returns results for all 5 resource types', () => {
    const results = checkAllUsage('org-1', 'starter');
    expect(results).toHaveLength(5);
    const resources = results.map((r) => r.resource);
    expect(resources).toContain('apiCalls');
    expect(resources).toContain('activeSeats');
    expect(resources).toContain('activeSources');
    expect(resources).toContain('activeJobs');
    expect(resources).toContain('candidateViews');
  });

  it('all resources start within limits', () => {
    const results = checkAllUsage('org-1', 'starter');
    for (const r of results) {
      expect(r.allowed).toBe(true);
    }
  });
});

describe('resetUsageStore()', () => {
  it('clears all stored records', () => {
    incrementUsage('org-1', 'apiCalls', 100, '2025-06');
    resetUsageStore();
    const record = getUsageRecord('org-1', '2025-06');
    expect(record.apiCalls).toBe(0);
  });
});

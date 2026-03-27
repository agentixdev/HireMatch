import { TIERS, getTier, hasFeature, isWithinLimit, getLimit, getTiersAscending } from '../tiers';

describe('TIERS', () => {
  it('has starter, pro, enterprise tiers', () => {
    expect(TIERS).toHaveProperty('starter');
    expect(TIERS).toHaveProperty('pro');
    expect(TIERS).toHaveProperty('enterprise');
  });

  it('has exactly 3 tiers', () => {
    expect(Object.keys(TIERS)).toHaveLength(3);
  });
});

describe('Starter tier', () => {
  const starter = TIERS.starter;

  it('has correct API calls limit (10K)', () => {
    expect(starter.limits.apiCallsPerMonth).toBe(10_000);
  });

  it('has 2 seats', () => {
    expect(starter.limits.seats).toBe(2);
  });

  it('has 5 sources', () => {
    expect(starter.limits.sources).toBe(5);
  });

  it('has 25 jobs', () => {
    expect(starter.limits.jobs).toBe(25);
  });

  it('has webhooks enabled', () => {
    expect(starter.limits.webhooks).toBe(true);
  });

  it('does NOT have custom branding', () => {
    expect(starter.limits.customBranding).toBe(false);
  });

  it('costs $99/mo (9900 cents)', () => {
    expect(starter.monthlyPriceCents).toBe(9900);
  });
});

describe('Pro tier', () => {
  const pro = TIERS.pro;

  it('has correct API calls limit (100K)', () => {
    expect(pro.limits.apiCallsPerMonth).toBe(100_000);
  });

  it('has 10 seats', () => {
    expect(pro.limits.seats).toBe(10);
  });

  it('has unlimited sources', () => {
    expect(pro.limits.sources).toBe(Infinity);
  });

  it('has custom branding', () => {
    expect(pro.limits.customBranding).toBe(true);
  });

  it('has ATS integration', () => {
    expect(pro.limits.atsIntegration).toBe(true);
  });

  it('costs $499/mo (49900 cents)', () => {
    expect(pro.monthlyPriceCents).toBe(49900);
  });
});

describe('Enterprise tier', () => {
  const ent = TIERS.enterprise;

  it('has unlimited API calls', () => {
    expect(ent.limits.apiCallsPerMonth).toBe(Infinity);
  });

  it('has unlimited seats', () => {
    expect(ent.limits.seats).toBe(Infinity);
  });

  it('has unlimited sources', () => {
    expect(ent.limits.sources).toBe(Infinity);
  });

  it('has SSO enabled', () => {
    expect(ent.limits.ssoEnabled).toBe(true);
  });

  it('has priority support', () => {
    expect(ent.limits.prioritySupport).toBe(true);
  });

  it('has dedicated account manager', () => {
    expect(ent.limits.dedicatedAccount).toBe(true);
  });

  it('costs $999/mo (99900 cents)', () => {
    expect(ent.monthlyPriceCents).toBe(99900);
  });
});

describe('getTier()', () => {
  it('returns config for valid tier', () => {
    const tier = getTier('starter');
    expect(tier).not.toBeNull();
    expect(tier!.id).toBe('starter');
  });

  it('returns null for invalid tier', () => {
    expect(getTier('nonexistent')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getTier('')).toBeNull();
  });
});

describe('hasFeature()', () => {
  it('returns true for enabled boolean feature', () => {
    expect(hasFeature('pro', 'customBranding')).toBe(true);
  });

  it('returns false for disabled boolean feature', () => {
    expect(hasFeature('starter', 'customBranding')).toBe(false);
  });

  it('returns true for positive numeric feature', () => {
    expect(hasFeature('starter', 'apiCallsPerMonth')).toBe(true);
  });

  it('returns false for invalid tier', () => {
    expect(hasFeature('fake', 'webhooks')).toBe(false);
  });
});

describe('isWithinLimit()', () => {
  it('returns true when under limit', () => {
    expect(isWithinLimit('starter', 'apiCallsPerMonth', 5000)).toBe(true);
  });

  it('returns false when at limit', () => {
    expect(isWithinLimit('starter', 'apiCallsPerMonth', 10_000)).toBe(false);
  });

  it('returns false when over limit', () => {
    expect(isWithinLimit('starter', 'apiCallsPerMonth', 15_000)).toBe(false);
  });

  it('returns true for enterprise (unlimited)', () => {
    expect(isWithinLimit('enterprise', 'apiCallsPerMonth', 999_999)).toBe(true);
  });

  it('returns false for invalid tier', () => {
    expect(isWithinLimit('fake', 'apiCallsPerMonth', 0)).toBe(false);
  });
});

describe('getLimit()', () => {
  it('returns numeric limit for starter API calls', () => {
    expect(getLimit('starter', 'apiCallsPerMonth')).toBe(10_000);
  });

  it('returns Infinity for enterprise', () => {
    expect(getLimit('enterprise', 'apiCallsPerMonth')).toBe(Infinity);
  });

  it('returns Infinity for enabled boolean', () => {
    expect(getLimit('starter', 'webhooks')).toBe(Infinity);
  });

  it('returns 0 for disabled boolean', () => {
    expect(getLimit('starter', 'customBranding')).toBe(0);
  });

  it('returns 0 for invalid tier', () => {
    expect(getLimit('fake', 'apiCallsPerMonth')).toBe(0);
  });
});

describe('getTiersAscending()', () => {
  it('returns tiers sorted by price', () => {
    const sorted = getTiersAscending();
    expect(sorted).toHaveLength(3);
    expect(sorted[0].id).toBe('starter');
    expect(sorted[1].id).toBe('pro');
    expect(sorted[2].id).toBe('enterprise');
  });

  it('prices are strictly ascending', () => {
    const sorted = getTiersAscending();
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].monthlyPriceCents).toBeGreaterThan(sorted[i - 1].monthlyPriceCents);
    }
  });
});

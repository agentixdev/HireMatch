import {
  COUNTRIES,
  COUNTRY_CODES,
  LOCALES,
  TIER_LIMITS,
  REGIONS,
  DEFAULT_LOCALE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../constants';

describe('COUNTRIES', () => {
  it('has exactly 29 entries', () => {
    expect(Object.keys(COUNTRIES)).toHaveLength(29);
  });

  it('COUNTRY_CODES matches COUNTRIES keys', () => {
    expect(COUNTRY_CODES).toEqual(Object.keys(COUNTRIES));
    expect(COUNTRY_CODES).toHaveLength(29);
  });

  const expectedCountries = [
    'US', 'CA', 'GB', 'CH', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE',
    'AT', 'PT', 'IE', 'SE', 'DK', 'NO', 'FI', 'PL', 'CZ', 'RO',
    'IN', 'MX', 'BR', 'AR', 'CN', 'JP', 'KR', 'VN', 'PH',
  ];

  it('contains all 29 expected country codes', () => {
    for (const code of expectedCountries) {
      expect(COUNTRIES).toHaveProperty(code);
    }
  });

  it('each country has name, region, currency, and timezone', () => {
    for (const [code, country] of Object.entries(COUNTRIES)) {
      expect(country).toHaveProperty('name');
      expect(country).toHaveProperty('region');
      expect(country).toHaveProperty('currency');
      expect(country).toHaveProperty('timezone');
      expect(typeof country.name).toBe('string');
      expect(typeof country.currency).toBe('string');
      expect(country.currency.length).toBe(3); // ISO 4217
    }
  });

  it('each country region is a valid region', () => {
    const validRegions = new Set(REGIONS);
    for (const country of Object.values(COUNTRIES)) {
      expect(validRegions.has(country.region)).toBe(true);
    }
  });

  it('US has correct metadata', () => {
    expect(COUNTRIES.US).toEqual({
      name: 'United States',
      region: 'north-america',
      currency: 'USD',
      timezone: 'America/New_York',
    });
  });

  it('JP has correct metadata', () => {
    expect(COUNTRIES.JP).toEqual({
      name: 'Japan',
      region: 'asia',
      currency: 'JPY',
      timezone: 'Asia/Tokyo',
    });
  });
});

describe('LOCALES', () => {
  it('has exactly 20 entries', () => {
    expect(LOCALES).toHaveLength(20);
  });

  it('includes expected locales', () => {
    expect(LOCALES).toContain('en');
    expect(LOCALES).toContain('fr');
    expect(LOCALES).toContain('de');
    expect(LOCALES).toContain('ja');
    expect(LOCALES).toContain('ko');
    expect(LOCALES).toContain('zh');
    expect(LOCALES).toContain('ar');
    expect(LOCALES).toContain('hi');
  });

  it('DEFAULT_LOCALE is "en"', () => {
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('DEFAULT_LOCALE is in LOCALES', () => {
    expect(LOCALES).toContain(DEFAULT_LOCALE);
  });
});

describe('TIER_LIMITS', () => {
  it('has free, starter, pro, enterprise tiers', () => {
    expect(TIER_LIMITS).toHaveProperty('free');
    expect(TIER_LIMITS).toHaveProperty('starter');
    expect(TIER_LIMITS).toHaveProperty('pro');
    expect(TIER_LIMITS).toHaveProperty('enterprise');
  });

  it('free tier has restricted limits', () => {
    const free = TIER_LIMITS.free;
    expect(free.maxJobs).toBe(3);
    expect(free.maxCandidateViews).toBe(10);
    expect(free.maxApiCalls).toBe(0);
    expect(free.maxSeats).toBe(1);
    expect(free.webhooks).toBe(false);
  });

  it('starter tier has correct limits', () => {
    const starter = TIER_LIMITS.starter;
    expect(starter.maxApiCalls).toBe(10_000);
    expect(starter.maxSeats).toBe(2);
    expect(starter.maxSources).toBe(5);
    expect(starter.webhooks).toBe(true);
    expect(starter.customBranding).toBe(false);
  });

  it('pro tier has correct limits', () => {
    const pro = TIER_LIMITS.pro;
    expect(pro.maxApiCalls).toBe(100_000);
    expect(pro.maxSeats).toBe(10);
    expect(pro.maxSources).toBe(Infinity);
    expect(pro.webhooks).toBe(true);
    expect(pro.customBranding).toBe(true);
    expect(pro.atsIntegration).toBe(true);
  });

  it('enterprise tier has unlimited everything', () => {
    const ent = TIER_LIMITS.enterprise;
    expect(ent.maxJobs).toBe(Infinity);
    expect(ent.maxCandidateViews).toBe(Infinity);
    expect(ent.maxApiCalls).toBe(Infinity);
    expect(ent.maxSeats).toBe(Infinity);
    expect(ent.maxSources).toBe(Infinity);
    expect(ent.prioritySupport).toBe(true);
  });

  it('tiers are progressively less restrictive', () => {
    expect(TIER_LIMITS.free.maxApiCalls).toBeLessThan(TIER_LIMITS.starter.maxApiCalls);
    expect(TIER_LIMITS.starter.maxApiCalls).toBeLessThan(TIER_LIMITS.pro.maxApiCalls);
    expect(TIER_LIMITS.pro.maxApiCalls).toBeLessThan(TIER_LIMITS.enterprise.maxApiCalls);
  });
});

describe('REGIONS', () => {
  it('has exactly 4 regions', () => {
    expect(REGIONS).toHaveLength(4);
  });

  it('contains all expected regions', () => {
    expect(REGIONS).toContain('north-america');
    expect(REGIONS).toContain('europe');
    expect(REGIONS).toContain('asia');
    expect(REGIONS).toContain('latin-america');
  });
});

describe('Pagination defaults', () => {
  it('DEFAULT_PAGE_SIZE is 25', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
  });

  it('MAX_PAGE_SIZE is 100', () => {
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});

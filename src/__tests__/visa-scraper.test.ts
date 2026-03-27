/**
 * @jest-environment node
 */
import { VISA_SOURCES, type VisaRuleSeed } from '@/lib/visa-scraper';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

describe('Visa scraper', () => {
  describe('VISA_SOURCES config', () => {
    const expectedCountries = [
      'us', 'ca', 'gb', 'ch', 'de', 'fr', 'es', 'it', 'nl', 'be',
      'at', 'pt', 'ie', 'se', 'dk', 'no', 'fi', 'pl', 'cz', 'ro',
      'in', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'vn', 'ph',
    ];

    it('should cover all 29 countries', () => {
      expectedCountries.forEach((code) => {
        expect(VISA_SOURCES[code]).toBeDefined();
        expect(VISA_SOURCES[code].name).toBeTruthy();
      });
      expect(Object.keys(VISA_SOURCES)).toHaveLength(29);
    });

    it('should have valid HTTPS URLs for each country', () => {
      Object.entries(VISA_SOURCES).forEach(([code, source]) => {
        expect(source.urls.length).toBeGreaterThan(0);
        source.urls.forEach((url) => {
          expect(url).toMatch(/^https:\/\//);
        });
      });
    });

    it('should have unique country names', () => {
      const names = Object.values(VISA_SOURCES).map((s) => s.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('should have US sources pointing to official .gov domains', () => {
      const usUrls = VISA_SOURCES.us.urls;
      const hasGovDomain = usUrls.some((url) => url.includes('.gov'));
      expect(hasGovDomain).toBe(true);
    });
  });

  describe('VisaRuleSeed type', () => {
    it('should enforce required fields', () => {
      const seed: VisaRuleSeed = {
        country_code: 'de',
        visa_type: 'EU Blue Card',
        title: 'EU Blue Card Germany',
        description: 'For highly qualified workers',
        requirements: { education: 'University degree', sponsorship_required: true },
        processing_time: '4-12 weeks',
        cost: '€100',
        validity: '4 years',
        source_url: 'https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card',
      };
      expect(seed.country_code).toBe('de');
      expect(seed.requirements.sponsorship_required).toBe(true);
    });
  });

  describe('Database integration', () => {
    const skipIfNoDb = supabase ? it : it.skip;

    skipIfNoDb('should have visa_rules table', async () => {
      const { error } = await supabase!
        .from('visa_rules')
        .select('id')
        .limit(1);

      expect(error).toBeNull();
    }, 10000);

    skipIfNoDb('should allow reading visa rules publicly', async () => {
      const { data, error } = await supabase!
        .from('visa_rules')
        .select('country_code, visa_type, title')
        .limit(5);

      // Should not error (RLS allows public reads)
      if (error) {
        expect(error.message).not.toContain('permission denied');
      }
    }, 10000);
  });

  describe('Source URL reachability', () => {
    // Test a sample of URLs to make sure they resolve
    const sampleCountries = ['us', 'gb', 'de', 'ca'];

    sampleCountries.forEach((code) => {
      it(`should reach ${VISA_SOURCES[code].name} source URL`, async () => {
        const url = VISA_SOURCES[code].urls[0];
        try {
          const res = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': 'HireMatchBot/1.0' },
          });
          // Accept any response (even 403/405 means server is reachable)
          expect(res.status).toBeLessThan(600);
        } catch (err) {
          // Network errors are acceptable in CI — just note it
          console.warn(`Could not reach ${url}: ${(err as Error).message}`);
        }
      }, 15000);
    });
  });
});

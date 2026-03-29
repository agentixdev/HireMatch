import type { Metadata } from 'next';
import { createServerSupabase, createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import VisaCountrySection from './VisaCountrySection';
import VisaPaywall from './VisaPaywall';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export const metadata: Metadata = {
  title: 'Visa & Work Permit Rules by Country | HireMatch',
  description:
    'Browse work visa types, requirements, processing times, and costs across 29 countries. Data scraped and updated regularly from official government sources.',
  openGraph: {
    title: 'Visa & Work Permit Rules by Country | HireMatch',
    description:
      'Explore visa requirements for 29 countries including the US, UK, Canada, Germany, and more.',
    url: `${SITE_URL}/visa`,
  },
};

interface VisaRule {
  id: string;
  country_code: string;
  visa_type: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  processing_time: string | null;
  cost: string | null;
  validity: string | null;
  source_url: string | null;
  last_scraped_at: string;
  created_at: string;
  updated_at: string;
}

const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: 'us', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'ca', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'gb', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ch', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'de', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'fr', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'es', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'it', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'nl', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'be', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'at', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'pt', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'ie', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'se', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'dk', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'no', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'fi', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'pl', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'cz', name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'ro', name: 'Romania', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'in', name: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'mx', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'br', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'ar', name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}' },
  { code: 'cn', name: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'jp', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'kr', name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'vn', name: 'Vietnam', flag: '\u{1F1FB}\u{1F1F3}' },
  { code: 'ph', name: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}' },
];

export default async function VisaRulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createServiceClient();

  // Check auth + subscription tier
  const authClient = await createServerSupabase();
  const { data: { user } } = await authClient.auth.getUser();

  let hasPaidAccess = false;
  if (user) {
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (recruiter && recruiter.tier && recruiter.tier !== 'free') {
      hasPaidAccess = true;
    }
  }

  const FREE_PREVIEW_COUNT = 2; // Show first 2 countries free

  const { data: rules } = await supabase
    .from('visa_rules')
    .select('*')
    .order('country_code')
    .order('visa_type');

  const visaRules = (rules || []) as VisaRule[];

  // Group by country_code
  const grouped: Record<string, VisaRule[]> = {};
  for (const rule of visaRules) {
    const code = rule.country_code.toLowerCase();
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(rule);
  }

  // Sort countries: those with rules first, in COUNTRIES order
  const countriesWithRules = COUNTRIES.filter((c) => grouped[c.code]);

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Visa Rules', url: `${SITE_URL}/${locale}/visa` },
  ]);

  return (
    <>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <main className="min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 text-blue-400 text-xs font-medium mb-4">
              Visa & Work Permit Explorer
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Visa Rules by Country
            </h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Browse work visa types, requirements, processing times, and costs across 29 countries.
              Data is scraped and updated regularly from official sources.
            </p>
          </div>

          {/* Country sections */}
          {countriesWithRules.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-white/60 mb-2">No visa rules yet</h2>
              <p className="text-white/30 text-sm">
                Visa data is being collected. Check back soon.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {countriesWithRules.map((country, index) => (
                <VisaCountrySection
                  key={country.code}
                  flag={country.flag}
                  name={country.name}
                  rules={grouped[country.code]}
                  locked={!hasPaidAccess && index >= FREE_PREVIEW_COUNT}
                />
              ))}

              {!hasPaidAccess && countriesWithRules.length > FREE_PREVIEW_COUNT && (
                <VisaPaywall
                  isLoggedIn={!!user}
                  lockedCount={countriesWithRules.length - FREE_PREVIEW_COUNT}
                  locale={locale}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import Link from 'next/link';
import type { Metadata } from 'next';

const COUNTRIES: Record<string, { name: string; flag: string; description: string }> = {
  us: { name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', description: 'tech hubs like Silicon Valley, New York, and Austin' },
  ca: { name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}', description: 'thriving tech scenes in Toronto, Vancouver, and Montreal' },
  gb: { name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', description: "London's financial district and beyond" },
  de: { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', description: "Europe's largest economy with Berlin, Munich, and Frankfurt" },
  fr: { name: 'France', flag: '\u{1F1EB}\u{1F1F7}', description: 'Paris and the growing French tech ecosystem' },
  ch: { name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}', description: "Zurich and Geneva's high-salary market" },
  nl: { name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', description: "Amsterdam's startup-friendly ecosystem" },
  es: { name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', description: "Barcelona and Madrid's growing tech scene" },
  it: { name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', description: "Milan's business hub and emerging tech cities" },
  ie: { name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}', description: "Dublin's EMEA headquarters for global tech" },
  se: { name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}', description: "Stockholm's unicorn factory" },
  dk: { name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}', description: "Copenhagen's green tech and design scene" },
  no: { name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}', description: "Oslo's energy and maritime tech sector" },
  fi: { name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}', description: "Helsinki's gaming and mobile innovation hub" },
  at: { name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}', description: "Vienna's central European business center" },
  be: { name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', description: "Brussels' EU institutions and tech corridor" },
  pt: { name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', description: "Lisbon's booming startup and remote work scene" },
  pl: { name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}', description: "Warsaw and Krakow's fast-growing tech talent pool" },
  cz: { name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}', description: "Prague's central European tech hub" },
  ro: { name: 'Romania', flag: '\u{1F1F7}\u{1F1F4}', description: "Bucharest and Cluj's competitive engineering talent" },
  in: { name: 'India', flag: '\u{1F1EE}\u{1F1F3}', description: "Bangalore, Mumbai, and Hyderabad's massive tech workforce" },
  jp: { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', description: "Tokyo's innovative tech and engineering market" },
  kr: { name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', description: "Seoul's dynamic tech and electronics industry" },
  cn: { name: 'China', flag: '\u{1F1E8}\u{1F1F3}', description: "Shanghai and Shenzhen's global tech powerhouses" },
  br: { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', description: "São Paulo's Latin American tech capital" },
  mx: { name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}', description: "Mexico City and Guadalajara's nearshore tech boom" },
  ar: { name: 'Argentina', flag: '\u{1F1E6}\u{1F1F7}', description: "Buenos Aires' creative tech and startup culture" },
  vn: { name: 'Vietnam', flag: '\u{1F1FB}\u{1F1F3}', description: "Ho Chi Minh City's rapidly growing tech sector" },
  ph: { name: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}', description: "Manila's BPO and emerging tech workforce" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = 'Jobs by Country | HireMatch';
  const description = 'Browse job opportunities across 29 countries. Find tech jobs, engineering roles, and career opportunities worldwide with AI-powered matching.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/jobs/country`,
      siteName: 'HireMatch',
      type: 'website',
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/jobs/country`,
    },
  };
}

export default async function CountryIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createServiceClient();

  // Fetch job counts per country in one query
  const { data: countryCounts } = await supabase
    .from('jobs')
    .select('country', { count: 'exact', head: false })
    .eq('is_active', true);

  // Aggregate counts
  const countMap: Record<string, number> = {};
  if (countryCounts) {
    for (const row of countryCounts) {
      const c = row.country as string;
      countMap[c] = (countMap[c] || 0) + 1;
    }
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Jobs', url: `${SITE_URL}/${locale}/jobs` },
    { name: 'Countries', url: `${SITE_URL}/${locale}/jobs/country` },
  ]);

  const countryEntries = Object.entries(COUNTRIES).sort(
    (a, b) => (countMap[b[0]] || 0) - (countMap[a[0]] || 0)
  );

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
        />

        {/* Hero */}
        <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <nav className="flex items-center gap-2 text-sm text-white/40 mb-6">
              <Link href={`/${locale}/jobs`} className="hover:text-white/70 transition-colors">
                Jobs
              </Link>
              <span>/</span>
              <span className="text-white/60">Countries</span>
            </nav>

            <h1
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Jobs by Country
            </h1>
            <p className="text-lg text-white/50 max-w-2xl">
              Explore career opportunities across 29 countries. From Silicon Valley to
              Singapore, find your next role in the world&apos;s top tech markets.
            </p>
          </div>
        </section>

        {/* Country Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {countryEntries.map(([code, info]) => {
              const jobCount = countMap[code] || 0;
              return (
                <Link
                  key={code}
                  href={`/${locale}/jobs/country/${code}`}
                  className="group bg-white/[0.03] ring-1 ring-white/[0.08] rounded-2xl p-5 hover:ring-white/20 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{info.flag}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {info.name}
                      </h2>
                      <span className="text-sm text-white/40">
                        {jobCount.toLocaleString()} {jobCount === 1 ? 'job' : 'jobs'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-white/40 line-clamp-2">
                    Explore opportunities in {info.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <Footer />
      </main>
    </>
  );
}

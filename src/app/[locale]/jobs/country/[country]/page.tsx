import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JobsList from '@/components/JobsList';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Job } from '@/types';

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

export function generateStaticParams() {
  return Object.keys(COUNTRIES).map((country) => ({ country }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country } = await params;
  const info = COUNTRIES[country];
  if (!info) return {};

  const title = `Jobs in ${info.name} | HireMatch`;
  const description = `Browse open positions in ${info.name}. Find tech jobs, engineering roles, and career opportunities in ${info.description}. AI-powered matching across 29 countries.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/jobs/country/${country}`,
      siteName: 'HireMatch',
      type: 'website',
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/jobs/country/${country}`,
    },
  };
}

export default async function CountryJobsPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country } = await params;
  const info = COUNTRIES[country];
  if (!info) notFound();

  const supabase = await createServiceClient();

  const { data: jobs, count } = await supabase
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url)', { count: 'exact' })
    .eq('is_active', true)
    .eq('country', country)
    .order('created_at', { ascending: false })
    .range(0, 19);

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Jobs', url: `${SITE_URL}/${locale}/jobs` },
    { name: 'Countries', url: `${SITE_URL}/${locale}/jobs/country` },
    { name: info.name, url: `${SITE_URL}/${locale}/jobs/country/${country}` },
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
        />

        {/* SEO Hero Section */}
        <section className="border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <nav className="flex items-center gap-2 text-sm text-white/40 mb-6">
              <Link href={`/${locale}/jobs`} className="hover:text-white/70 transition-colors">
                Jobs
              </Link>
              <span>/</span>
              <Link href={`/${locale}/jobs/country`} className="hover:text-white/70 transition-colors">
                Countries
              </Link>
              <span>/</span>
              <span className="text-white/60">{info.name}</span>
            </nav>

            <h1
              className="text-4xl sm:text-5xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              <span className="mr-3">{info.flag}</span>
              Jobs in {info.name}
            </h1>

            <p className="text-lg text-white/50 max-w-2xl mb-6">
              Discover career opportunities in {info.description}. HireMatch connects you
              with top employers and provides AI-powered matching to find your perfect role.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <span className="px-4 py-2 bg-white/[0.05] ring-1 ring-white/[0.08] rounded-xl text-sm text-white/70">
                {(count || 0).toLocaleString()} {count === 1 ? 'open position' : 'open positions'}
              </span>
              <Link
                href={`/${locale}/visa`}
                className="px-4 py-2 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-xl text-sm text-blue-400 hover:bg-blue-500/15 transition-colors"
              >
                Visa guide for {info.name} &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Jobs List */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <JobsList
            jobs={(jobs || []) as unknown as (Job & { recruiter?: { company_name: string; company_logo_url?: string }; company_name?: string; company_logo?: string; external_url?: string; source?: string })[]}
            totalCount={count || 0}
            currentPage={1}
            searchQuery=""
            filters={{ country }}
          />
        </div>
        <Footer />
      </main>
    </>
  );
}

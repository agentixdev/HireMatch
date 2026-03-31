import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JobsList from '@/components/JobsList';
import type { Job } from '@/types';
import type { Metadata } from 'next';

// Revalidate every 5 minutes — balances freshness with performance
export const revalidate = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Browse Jobs — AI-Matched Careers in 29+ Countries | HireMatch',
    description:
      'Explore hundreds of jobs worldwide. Filter by country, work mode, and type. AI-powered matching helps you find the perfect role across 29 countries.',
    openGraph: {
      title: 'Browse Jobs | HireMatch',
      description: 'Explore hundreds of jobs worldwide with AI-powered matching across 29 countries.',
      url: `${SITE_URL}/${locale}/jobs`,
      siteName: 'HireMatch',
      type: 'website',
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/jobs`,
    },
  };
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; type?: string; mode?: string; page?: string; source?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  let query = supabase
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url)', { count: 'exact' })
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.country) query = query.eq('country', params.country.toLowerCase());
  if (params.type) query = query.eq('job_type', params.type);
  if (params.mode) query = query.eq('work_mode', params.mode);
  if (params.source) query = query.eq('source', params.source);
  if (params.q) query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`);

  const page = parseInt(params.page || '1');
  const perPage = 20;
  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data: jobs, count } = await query;

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <JobsList
            jobs={(jobs || []) as unknown as (Job & { recruiter?: { company_name: string; company_logo_url?: string }; company_name?: string; company_logo?: string; external_url?: string; source?: string })[]}
            totalCount={count || 0}
            currentPage={page}
            searchQuery={params.q || ''}
            filters={{ country: params.country, type: params.type, mode: params.mode, source: params.source }}
          />
        </div>
        <Footer />
      </main>
    </>
  );
}

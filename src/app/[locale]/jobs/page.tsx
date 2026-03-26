import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import JobsList from '@/components/JobsList';
import type { Job } from '@/types';

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; type?: string; mode?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  let query = supabase
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (params.country) query = query.eq('country', params.country);
  if (params.type) query = query.eq('job_type', params.type);
  if (params.mode) query = query.eq('work_mode', params.mode);
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
          <h1 className="text-3xl font-bold text-white mb-8">Browse Jobs</h1>
          <JobsList
            jobs={(jobs || []) as unknown as (Job & { recruiter?: { company_name: string; company_logo_url?: string } })[]}
            totalCount={count || 0}
            currentPage={page}
            searchQuery={params.q || ''}
            filters={{ country: params.country, type: params.type, mode: params.mode }}
          />
        </div>
      </main>
    </>
  );
}

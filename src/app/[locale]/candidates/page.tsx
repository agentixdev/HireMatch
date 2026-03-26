import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import CandidatesList from '@/components/CandidatesList';
import type { Candidate } from '@/types';

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; mode?: string; experience?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServiceClient();

  const page = parseInt(params.page || '1');
  const perPage = 24;

  // Build count query (same filters, no range)
  let countQuery = supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .eq('is_public', true);

  if (params.country) countQuery = countQuery.eq('country', params.country);
  if (params.mode) countQuery = countQuery.eq('remote_preference', params.mode);
  if (params.q) countQuery = countQuery.or(`full_name.ilike.%${params.q}%,headline.ilike.%${params.q}%`);
  if (params.experience) {
    const [min, max] = params.experience.split('-').map(Number);
    if (!isNaN(min)) countQuery = countQuery.gte('experience_years', min);
    if (!isNaN(max)) countQuery = countQuery.lte('experience_years', max);
  }

  // Build data query
  let query = supabase
    .from('candidates')
    .select('id, full_name, headline, photo_url, skills, experience_years, country, city, remote_preference, visa_status, open_to_work, available_now, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (params.country) query = query.eq('country', params.country);
  if (params.mode) query = query.eq('remote_preference', params.mode);
  if (params.q) query = query.or(`full_name.ilike.%${params.q}%,headline.ilike.%${params.q}%`);
  if (params.experience) {
    const [min, max] = params.experience.split('-').map(Number);
    if (!isNaN(min)) query = query.gte('experience_years', min);
    if (!isNaN(max)) query = query.lte('experience_years', max);
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const [{ data: candidates }, { count }] = await Promise.all([query, countQuery]);

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-white mb-8">Browse Candidates</h1>
          <CandidatesList
            candidates={(candidates || []) as unknown as Candidate[]}
            totalCount={count || 0}
            currentPage={page}
            searchQuery={params.q || ''}
            filters={{ country: params.country, mode: params.mode, experience: params.experience }}
          />
        </div>
      </main>
    </>
  );
}

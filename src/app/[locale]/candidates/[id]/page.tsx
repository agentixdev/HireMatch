import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import type { Candidate } from '@/types';
import CandidateDetailClient from './CandidateDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('candidates')
    .select('full_name, headline, photo_url, city, country, skills')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!data) return { title: 'Candidate Not Found' };

  const title = `${data.full_name}${data.headline ? ` — ${data.headline}` : ''} | HireMatch`;
  const description = data.headline
    ? `${data.full_name}: ${data.headline}. View skills, experience, and match score on HireMatch.`
    : `View ${data.full_name}'s professional profile, skills, and career history on HireMatch.`;
  const photo = data.photo_url || `${SITE_URL}/og-default.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/candidates/${id}`,
      siteName: 'HireMatch',
      images: [{ url: photo, width: 500, height: 667, alt: data.full_name }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [photo],
    },
  };
}

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!data) notFound();

  const candidate = data as unknown as Candidate;

  // Fetch related candidates (same top skill or same city, limit 4)
  const topSkill = candidate.skills?.[0];
  let related: Candidate[] = [];
  if (topSkill) {
    const { data: relatedData } = await supabase
      .from('candidates')
      .select('id, full_name, photo_url, headline, skills, experience_years, city, country')
      .eq('is_public', true)
      .neq('id', candidate.id)
      .contains('skills', [topSkill])
      .limit(4);
    if (relatedData) related = relatedData as unknown as Candidate[];
  }

  // If not enough related by skill, fill with same country
  if (related.length < 4) {
    const existingIds = [candidate.id, ...related.map((r) => r.id)];
    const { data: moreData } = await supabase
      .from('candidates')
      .select('id, full_name, photo_url, headline, skills, experience_years, city, country')
      .eq('is_public', true)
      .eq('country', candidate.country)
      .not('id', 'in', `(${existingIds.join(',')})`)
      .limit(4 - related.length);
    if (moreData) related = [...related, ...(moreData as unknown as Candidate[])];
  }

  return (
    <>
      <Header />
      <CandidateDetailClient candidate={candidate} relatedCandidates={related} />
    </>
  );
}

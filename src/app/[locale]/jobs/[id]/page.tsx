import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import Header from '@/components/Header';
import JobDetailClient from './JobDetailClient';
import type { Job, Recruiter } from '@/types';

const SITE_URL = 'https://www.hirematch.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('jobs')
    .select('title, description, industry, city, country, recruiter:recruiters(company_name, company_logo_url)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!data) return { title: 'Job Not Found | HireMatch' };

  const rec = data.recruiter as unknown as Pick<Recruiter, 'company_name' | 'company_logo_url'> | null;
  const title = `${data.title} at ${rec?.company_name || 'Company'} | HireMatch`;
  const description = data.description
    ? data.description.slice(0, 155).replace(/\s+\S*$/, '') + '...'
    : `${data.title} — ${data.industry} role${data.city ? ` in ${data.city}` : ''}. Apply on HireMatch.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${locale}/jobs/${id}`,
      siteName: 'HireMatch',
      images: rec?.company_logo_url ? [{ url: rec.company_logo_url, width: 200, height: 200 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/jobs/${id}`,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createServiceClient();

  // Fetch job + recruiter
  const { data } = await supabase
    .from('jobs')
    .select('*, recruiter:recruiters(id, user_id, company_name, company_logo_url, company_website, industry, company_size, country, city, bio, culture_tags, tier, stripe_customer_id, stripe_subscription_id, jobs_posted_count, candidate_views_remaining, created_at, updated_at)')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!data) notFound();

  const job = data as unknown as Job & { recruiter: Recruiter };
  const recruiter = job.recruiter;

  if (!recruiter) notFound();

  // Increment view count (fire-and-forget)
  supabase.from('jobs').update({ views_count: job.views_count + 1 }).eq('id', id).then(() => {}, () => {});

  // Fetch similar jobs (same industry or overlapping skills, max 4)
  const { data: similarRaw } = await supabase
    .from('jobs')
    .select('*, recruiter:recruiters(company_name, company_logo_url)')
    .eq('is_active', true)
    .eq('industry', job.industry)
    .neq('id', job.id)
    .limit(4);

  const similarJobs = (similarRaw || []).map((sj: Record<string, unknown>) => {
    const rec = sj.recruiter as { company_name?: string; company_logo_url?: string } | null;
    return {
      ...sj,
      recruiter: rec ? { company_name: rec.company_name || '', company_logo_url: rec.company_logo_url } : undefined,
    };
  }) as (Job & { recruiter?: Pick<Recruiter, 'company_name' | 'company_logo_url'> })[];

  // Build structured data
  const jobPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    ...(job.expires_at ? { validThrough: job.expires_at } : {}),
    employmentType: job.job_type === 'full-time' ? 'FULL_TIME' : job.job_type === 'part-time' ? 'PART_TIME' : job.job_type === 'contract' ? 'CONTRACTOR' : job.job_type === 'internship' ? 'INTERN' : 'OTHER',
    hiringOrganization: {
      '@type': 'Organization',
      name: recruiter.company_name,
      ...(recruiter.company_logo_url ? { logo: recruiter.company_logo_url } : {}),
      ...(recruiter.company_website ? { sameAs: recruiter.company_website } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.city ? { addressLocality: job.city } : {}),
        addressCountry: job.country?.toUpperCase(),
      },
    },
    ...(job.work_mode === 'remote' ? { jobLocationType: 'TELECOMMUTE' } : {}),
    ...(job.salary_min || job.salary_max ? {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.salary_currency || 'USD',
        value: {
          '@type': 'QuantitativeValue',
          ...(job.salary_min ? { minValue: job.salary_min } : {}),
          ...(job.salary_max ? { maxValue: job.salary_max } : {}),
          unitText: 'YEAR',
        },
      },
    } : {}),
    industry: job.industry,
    skills: job.skills_required?.join(', '),
  };

  // Strip the recruiter from the job object to pass them separately
  const { recruiter: _rec, ...jobOnly } = job;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }}
      />
      <Header />
      <main className="flex-1 bg-transparent">
        <JobDetailClient
          job={jobOnly as Job}
          recruiter={recruiter}
          similarJobs={similarJobs}
          locale={locale}
        />
      </main>
    </>
  );
}

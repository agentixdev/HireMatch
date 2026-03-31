import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase-server';
import { locales } from '@/i18n/request';
import { sampleBlogPosts } from '@/lib/blog-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServiceClient();
  const entries: MetadataRoute.Sitemap = [];

  // Static pages per locale
  const staticPages = ['', '/jobs', '/candidates', '/matchmaker', '/pricing', '/visa', '/blog', '/privacy', '/terms', '/referrals'];

  for (const locale of locales) {
    for (const page of staticPages) {
      const languages: Record<string, string> = {};
      for (const loc of locales) {
        languages[loc] = `${SITE_URL}/${loc}${page}`;
      }
      entries.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '/blog' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
        alternates: { languages },
      });
    }
  }

  // Helper: build alternates.languages map for a given path
  function buildAlternates(path: string) {
    const languages: Record<string, string> = {};
    for (const loc of locales) {
      languages[loc] = `${SITE_URL}/${loc}${path}`;
    }
    return { languages };
  }

  // Country landing pages
  const countryCodes = [
    'us', 'ca', 'gb', 'ch', 'de', 'fr', 'es', 'it', 'nl', 'be',
    'at', 'pt', 'ie', 'se', 'dk', 'no', 'fi', 'pl', 'cz', 'ro',
    'in', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'vn', 'ph',
  ];
  for (const locale of locales) {
    for (const cc of countryCodes) {
      entries.push({
        url: `${SITE_URL}/${locale}/jobs/country/${cc}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
        alternates: buildAlternates(`/jobs/country/${cc}`),
      });
    }
  }

  // Job listings
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (jobs) {
    for (const job of jobs) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/jobs/${job.id}`,
          lastModified: new Date(job.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: buildAlternates(`/jobs/${job.id}`),
        });
      }
    }
  }

  // Candidates (public profiles)
  const { data: candidates } = await supabase
    .from('candidates')
    .select('id, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (candidates) {
    for (const candidate of candidates) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/candidates/${candidate.id}`,
          lastModified: new Date(candidate.updated_at),
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: buildAlternates(`/candidates/${candidate.id}`),
        });
      }
    }
  }

  // Blog posts
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, locale, updated_at, published_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(5000);

  if (posts && posts.length > 0) {
    for (const post of posts) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: buildAlternates(`/blog/${post.slug}`),
        });
      }
    }
  } else {
    // Fallback: include sample blog posts so crawlers find them immediately
    for (const post of sampleBlogPosts) {
      for (const locale of locales) {
        entries.push({
          url: `${SITE_URL}/${locale}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at),
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: buildAlternates(`/blog/${post.slug}`),
        });
      }
    }
  }

  return entries;
}

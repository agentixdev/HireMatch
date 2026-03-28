import { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/supabase-server';
import { locales } from '@/i18n/request';
import { sampleBlogPosts } from '@/lib/blog-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServiceClient();
  const entries: MetadataRoute.Sitemap = [];

  // Static pages per locale
  const staticPages = ['', '/jobs', '/candidates', '/matchmaker', '/pricing', '/visa', '/blog'];

  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '/blog' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : 0.8,
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
      entries.push({
        url: `${SITE_URL}/en/jobs/${job.id}`,
        lastModified: new Date(job.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
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
      entries.push({
        url: `${SITE_URL}/en/candidates/${candidate.id}`,
        lastModified: new Date(candidate.updated_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
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
      entries.push({
        url: `${SITE_URL}/${post.locale || 'en'}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  } else {
    // Fallback: include sample blog posts so crawlers find them immediately
    for (const post of sampleBlogPosts) {
      entries.push({
        url: `${SITE_URL}/en/blog/${post.slug}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}

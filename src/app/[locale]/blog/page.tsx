import Image from 'next/image';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase-server';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import { sampleBlogPosts, BLOG_CATEGORIES, readingTime } from '@/lib/blog-data';
import type { BlogPost } from '@/types/blog';
import type { Metadata } from 'next';
import BlogFilters from './blog-filters';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export const metadata: Metadata = {
  title: 'Blog | HireMatch',
  description:
    'Recruitment insights, visa guides, career tips, and hiring best practices from HireMatch.',
  openGraph: {
    title: 'Blog | HireMatch',
    description:
      'Recruitment insights, visa guides, career tips, and hiring best practices from HireMatch.',
    type: 'website',
    url: `${SITE_URL}/en/blog`,
    siteName: 'HireMatch',
  },
  alternates: {
    canonical: `${SITE_URL}/en/blog`,
  },
};

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createServiceClient();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .not('published_at', 'is', null)
    .eq('locale', locale)
    .order('published_at', { ascending: false })
    .limit(50);

  // Use database posts if available, otherwise fall back to sample data
  const blogPosts: BlogPost[] =
    posts && posts.length > 0 ? (posts as BlogPost[]) : sampleBlogPosts;

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Blog', url: `${SITE_URL}/${locale}/blog` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Blog</h1>
        <p className="text-white/50 max-w-2xl">
          Recruitment insights, visa guides, career tips, and hiring best practices
          to help you navigate the global job market.
        </p>
      </div>

      {/* Categories + Search (client component) */}
      <BlogFilters
        posts={blogPosts}
        locale={locale}
        categories={BLOG_CATEGORIES as unknown as string[]}
        readingTimeFn={null}
      />
    </>
  );
}

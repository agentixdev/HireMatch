import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase-server';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';
import { sampleBlogPosts, readingTime } from '@/lib/blog-data';
import type { BlogPost } from '@/types/blog';
import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

async function getPost(slug: string): Promise<BlogPost | null> {
  const supabase = await createServiceClient();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (post) return post as BlogPost;

  // Fallback to sample data
  return sampleBlogPosts.find((p) => p.slug === slug) || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const blogPost = await getPost(slug);

  if (!blogPost) {
    return { title: 'Post Not Found | HireMatch' };
  }

  return {
    title: blogPost.meta_title || `${blogPost.title} | HireMatch Blog`,
    description: blogPost.meta_description || blogPost.excerpt,
    openGraph: {
      title: blogPost.meta_title || blogPost.title,
      description: blogPost.meta_description || blogPost.excerpt,
      type: 'article',
      publishedTime: blogPost.published_at || undefined,
      modifiedTime: blogPost.updated_at,
      authors: [blogPost.author || 'HireMatch Team'],
      tags: blogPost.tags,
      images: blogPost.cover_image_url
        ? [{ url: blogPost.cover_image_url }]
        : [{ url: `${SITE_URL}/og-default.png` }],
      url: `${SITE_URL}/${locale}/blog/${slug}`,
      siteName: 'HireMatch',
    },
    twitter: {
      card: 'summary_large_image',
      title: blogPost.meta_title || blogPost.title,
      description: blogPost.meta_description || blogPost.excerpt,
    },
    alternates: {
      canonical: `${SITE_URL}/${locale}/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const blogPost = await getPost(slug);

  if (!blogPost) {
    notFound();
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: 'Home', url: `${SITE_URL}/${locale}` },
    { name: 'Blog', url: `${SITE_URL}/${locale}/blog` },
    { name: blogPost.title, url: `${SITE_URL}/${locale}/blog/${slug}` },
  ]);

  const article = articleJsonLd(blogPost);
  const readTime = readingTime(blogPost.content);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />

      {/* Back link */}
      <Link
        href={`/${locale}/blog`}
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Blog
      </Link>

      <article>
        {/* Header */}
        <header className="mb-8">
          {/* Tags */}
          {blogPost.tags && blogPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {blogPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full ring-1 ring-blue-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            {blogPost.title}
          </h1>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-white/40">
            <span>{blogPost.author || 'HireMatch Team'}</span>
            {blogPost.published_at && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <time dateTime={blogPost.published_at}>
                  {new Date(blogPost.published_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </>
            )}
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{readTime}</span>
          </div>
        </header>

        {/* Cover image */}
        {blogPost.cover_image_url && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10 ring-1 ring-white/10">
            <Image
              src={blogPost.cover_image_url}
              alt={blogPost.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-p:text-white/70 prose-p:leading-relaxed
            prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white/90
            prose-ul:text-white/70 prose-ol:text-white/70
            prose-li:marker:text-white/30
            prose-blockquote:border-blue-500/50 prose-blockquote:text-white/60
            prose-code:text-blue-300 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-[#0B1120] prose-pre:ring-1 prose-pre:ring-white/10
            prose-img:rounded-xl prose-img:ring-1 prose-img:ring-white/10"
          dangerouslySetInnerHTML={{ __html: blogPost.content }}
        />
      </article>
    </>
  );
}

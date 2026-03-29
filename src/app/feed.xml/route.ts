import { createServiceClient } from '@/lib/supabase-server';
import { sampleBlogPosts } from '@/lib/blog-data';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const supabase = await createServiceClient();

  // Try DB posts first, fall back to sample posts
  const { data: dbPosts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, author, published_at, updated_at')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  const posts = dbPosts && dbPosts.length > 0
    ? dbPosts
    : sampleBlogPosts.map(p => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        author: p.author,
        published_at: p.published_at,
        updated_at: p.updated_at,
      }));

  const lastBuildDate = posts[0]?.published_at
    ? new Date(posts[0].published_at).toUTCString()
    : new Date().toUTCString();

  const items = posts.map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/en/blog/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/en/blog/${escapeXml(post.slug)}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      <author>${escapeXml(post.author || 'HireMatch Team')}</author>
      <pubDate>${new Date(post.published_at!).toUTCString()}</pubDate>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HireMatch Blog</title>
    <link>${SITE_URL}/en/blog</link>
    <description>AI-powered recruitment insights, visa compliance tips, and career advice from HireMatch.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    },
  });
}

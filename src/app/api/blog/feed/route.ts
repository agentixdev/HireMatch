import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';
  const supabase = await createServiceClient();

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, published_at, author, tags')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50);

  const items = (posts || [])
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/en/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/en/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <author>${post.author || 'HireMatch Team'}</author>
      <category>${(post.tags && post.tags[0]) || 'Recruitment'}</category>
    </item>`
    )
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HireMatch Blog — AI-Powered Recruitment Insights</title>
    <link>${SITE_URL}/en/blog</link>
    <description>Expert insights on AI recruitment, visa compliance, remote hiring, and career development across 29 countries.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/api/blog/feed" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

-- Blog posts table for SEO content
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author TEXT NOT NULL DEFAULT 'HireMatch Team',
  tags TEXT[] NOT NULL DEFAULT '{}',
  locale TEXT NOT NULL DEFAULT 'en',
  country_code TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta_title TEXT,
  meta_description TEXT
);

-- Indexes for common queries
CREATE INDEX idx_blog_posts_slug ON blog_posts (slug);
CREATE INDEX idx_blog_posts_locale ON blog_posts (locale);
CREATE INDEX idx_blog_posts_published ON blog_posts (published_at DESC NULLS LAST);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN (tags);

-- RLS policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= now());

-- Service role can do anything (admin operations use service client)
CREATE POLICY "Service role full access"
  ON blog_posts FOR ALL
  USING (true)
  WITH CHECK (true);

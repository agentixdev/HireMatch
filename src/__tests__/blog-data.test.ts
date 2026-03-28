/**
 * Tests for src/lib/blog-data.ts — sample blog posts, categories, reading time.
 */
import { sampleBlogPosts, BLOG_CATEGORIES, readingTime } from '@/lib/blog-data';
import type { BlogCategory } from '@/lib/blog-data';

// ─── readingTime ─────────────────────────────────────────────────────

describe('readingTime', () => {
  it('returns "1 min read" for very short content', () => {
    expect(readingTime('Hello world')).toBe('1 min read');
  });

  it('strips HTML tags before counting words', () => {
    const html = '<p>One</p> <strong>two</strong> <em>three</em>';
    expect(readingTime(html)).toBe('1 min read');
  });

  it('calculates correctly for ~230 words (1 min)', () => {
    const words = Array(230).fill('word').join(' ');
    expect(readingTime(words)).toBe('1 min read');
  });

  it('calculates correctly for ~460 words (2 min)', () => {
    const words = Array(460).fill('word').join(' ');
    expect(readingTime(words)).toBe('2 min read');
  });

  it('calculates correctly for ~690 words (3 min)', () => {
    const words = Array(690).fill('word').join(' ');
    expect(readingTime(words)).toBe('3 min read');
  });

  it('handles empty string', () => {
    expect(readingTime('')).toBe('1 min read');
  });

  it('handles content with only HTML tags', () => {
    expect(readingTime('<br/><hr/><div></div>')).toBe('1 min read');
  });

  it('handles nested HTML correctly', () => {
    const html = '<div><p><span>word1</span> word2 <a href="#">word3</a></p></div>';
    expect(readingTime(html)).toBe('1 min read');
  });

  it('never returns less than 1 min', () => {
    expect(readingTime('a')).toBe('1 min read');
  });
});

// ─── BLOG_CATEGORIES ─────────────────────────────────────────────────

describe('BLOG_CATEGORIES', () => {
  it('starts with "All"', () => {
    expect(BLOG_CATEGORIES[0]).toBe('All');
  });

  it('has at least 4 categories', () => {
    expect(BLOG_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });

  it('includes expected categories', () => {
    const cats = [...BLOG_CATEGORIES];
    expect(cats).toContain('AI & Recruitment');
    expect(cats).toContain('Visa & Compliance');
    expect(cats).toContain('Remote Hiring');
    expect(cats).toContain('Career Tips');
  });

  it('has no duplicates', () => {
    const set = new Set(BLOG_CATEGORIES);
    expect(set.size).toBe(BLOG_CATEGORIES.length);
  });

  it('type BlogCategory includes "All"', () => {
    const cat: BlogCategory = 'All';
    expect(cat).toBe('All');
  });
});

// ─── sampleBlogPosts ─────────────────────────────────────────────────

describe('sampleBlogPosts', () => {
  it('has at least 4 sample posts', () => {
    expect(sampleBlogPosts.length).toBeGreaterThanOrEqual(4);
  });

  it('each post has required fields', () => {
    for (const post of sampleBlogPosts) {
      expect(post.id).toBeTruthy();
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.excerpt).toBeTruthy();
      expect(post.content).toBeTruthy();
      expect(post.author).toBeTruthy();
      expect(post.locale).toBe('en');
      expect(post.tags).toBeInstanceOf(Array);
      expect(post.tags.length).toBeGreaterThan(0);
      expect(post.published_at).toBeTruthy();
    }
  });

  it('all slugs are unique', () => {
    const slugs = sampleBlogPosts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('all IDs are unique', () => {
    const ids = sampleBlogPosts.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all posts have valid published_at dates', () => {
    for (const post of sampleBlogPosts) {
      const date = new Date(post.published_at!);
      expect(date.getTime()).not.toBeNaN();
    }
  });

  it('posts have meta_title and meta_description', () => {
    for (const post of sampleBlogPosts) {
      expect(post.meta_title).toBeTruthy();
      expect(post.meta_description).toBeTruthy();
    }
  });

  it('post tags match at least one BLOG_CATEGORY (excluding "All")', () => {
    const categories = [...BLOG_CATEGORIES].filter((c) => c !== 'All');
    for (const post of sampleBlogPosts) {
      const hasMatch = post.tags.some((t) => categories.includes(t as BlogCategory));
      expect(hasMatch).toBe(true);
    }
  });

  it('post content contains HTML', () => {
    for (const post of sampleBlogPosts) {
      expect(post.content).toMatch(/<[a-z]+/i);
    }
  });

  it('readingTime works on all sample posts', () => {
    for (const post of sampleBlogPosts) {
      const rt = readingTime(post.content);
      expect(rt).toMatch(/^\d+ min read$/);
    }
  });
});

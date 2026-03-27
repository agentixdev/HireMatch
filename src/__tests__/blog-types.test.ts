import type { BlogPost, BlogPostInsert } from '@/types/blog';

describe('Blog types', () => {
  it('should have valid BlogPost type', () => {
    const post: BlogPost = {
      id: 'uuid-123',
      slug: 'hiring-in-germany',
      title: 'Complete Guide to Hiring in Germany',
      excerpt: 'Everything you need to know about work permits in Germany.',
      content: '# Guide\n\nFull article content here...',
      cover_image_url: 'https://example.com/image.jpg',
      author: 'HireMatch Team',
      tags: ['visa', 'germany', 'hiring'],
      locale: 'en',
      country_code: 'de',
      published_at: '2026-03-01T00:00:00Z',
      created_at: '2026-02-28T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
      meta_title: 'Hiring in Germany - HireMatch Guide',
      meta_description: 'Learn about German work visas and hiring compliance.',
    };
    expect(post.slug).toBe('hiring-in-germany');
    expect(post.tags).toContain('visa');
    expect(post.locale).toBe('en');
  });

  it('should allow optional fields to be undefined', () => {
    const post: BlogPost = {
      id: 'uuid-456',
      slug: 'test-post',
      title: 'Test Post',
      excerpt: 'A test.',
      content: 'Content',
      author: 'Admin',
      tags: [],
      locale: 'en',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    expect(post.cover_image_url).toBeUndefined();
    expect(post.published_at).toBeUndefined();
    expect(post.meta_title).toBeUndefined();
    expect(post.meta_description).toBeUndefined();
    expect(post.country_code).toBeUndefined();
  });

  it('should have valid BlogPostInsert type for creation', () => {
    const insert: BlogPostInsert = {
      slug: 'new-post',
      title: 'New Post',
      excerpt: 'Summary',
      content: 'Full content',
    };
    expect(insert.slug).toBe('new-post');
    // Optional fields default
    expect(insert.author).toBeUndefined();
    expect(insert.tags).toBeUndefined();
    expect(insert.locale).toBeUndefined();
  });
});

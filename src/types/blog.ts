export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url?: string;
  author: string;
  tags: string[];
  locale: string;
  country_code?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  meta_title?: string;
  meta_description?: string;
}

export interface BlogPostInsert {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url?: string;
  author?: string;
  tags?: string[];
  locale?: string;
  country_code?: string;
  published_at?: string;
  meta_title?: string;
  meta_description?: string;
}

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types/blog';

function readingTime(html: string): string {
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));
  return `${minutes} min read`;
}

export default function BlogFilters({
  posts,
  locale,
  categories,
}: {
  posts: BlogPost[];
  locale: string;
  categories: string[];
  readingTimeFn: null; // kept for serialization compat; we use local fn
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = posts;

    if (activeCategory !== 'All') {
      result = result.filter((p) => p.tags?.includes(activeCategory));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [posts, activeCategory, search]);

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search articles..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 ring-1 ring-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-blue-500/50 transition-colors"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-white/60 mb-2">No matching posts</h2>
          <p className="text-white/30 text-sm">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {filtered.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/blog/${post.slug}`}
              className="group bg-[#0F172A] ring-1 ring-white/10 rounded-2xl overflow-hidden hover:ring-white/20 transition-all"
            >
              {/* Cover image */}
              {post.cover_image_url && (
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}

              {/* Content */}
              <div className="p-5">
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full ring-1 ring-blue-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <h2 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors mb-2 line-clamp-2">
                  {post.title}
                </h2>

                <p className="text-sm text-white/50 line-clamp-3 mb-4">
                  {post.excerpt}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-white/30">
                  <div className="flex items-center gap-3">
                    <span>{post.author || 'HireMatch Team'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{readingTime(post.content)}</span>
                  </div>
                  {post.published_at && (
                    <time dateTime={post.published_at}>
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

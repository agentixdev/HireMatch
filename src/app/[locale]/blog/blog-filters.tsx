'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types/blog';
import {
  readingTime,
  getCategoryGradient,
  getPrimaryCategory,
  CATEGORY_BADGE_COLORS,
} from '@/lib/blog-data';

/** Check whether a URL is likely to resolve (basic heuristic). */
function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function BlogFilters({
  posts,
  locale,
  categories,
}: {
  posts: BlogPost[];
  locale: string;
  categories: string[];
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

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

  const handleImageError = (postId: string) => {
    setFailedImages((prev) => new Set(prev).add(postId));
  };

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
        {categories.map((cat) => {
          const badge = CATEGORY_BADGE_COLORS[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                isActive
                  ? badge
                    ? `${badge.bg} ${badge.text} ${badge.ring} ring-1`
                    : 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/10'
              }`}
            >
              {cat}
            </button>
          );
        })}
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
          {filtered.map((post, index) => {
            const gradient = getCategoryGradient(post.tags);
            const category = getPrimaryCategory(post.tags);
            const hasValidImage =
              isValidImageUrl(post.cover_image_url) && !failedImages.has(post.id);

            return (
              <Link
                key={post.id}
                href={`/${locale}/blog/${post.slug}`}
                className="group bg-[#0F172A] ring-1 ring-white/10 rounded-2xl overflow-hidden
                  hover:ring-white/25 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-500/10
                  transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                  opacity-0 animate-[fadeSlideUp_0.5s_ease-out_forwards]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Cover: image or gradient fallback */}
                {hasValidImage ? (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={post.cover_image_url!}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={() => handleImageError(post.id)}
                    />
                  </div>
                ) : (
                  <div
                    className={`relative aspect-[16/9] overflow-hidden bg-gradient-to-br ${gradient.from} ${gradient.via} ${gradient.to}`}
                  >
                    {/* Subtle dot mesh overlay */}
                    <div
                      className="absolute inset-0 opacity-[0.12]"
                      style={{
                        backgroundImage:
                          'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }}
                    />
                    {/* Decorative glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/10 blur-3xl" />
                    {/* Category label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-sm font-semibold tracking-wide ring-1 ring-white/20">
                        {category}
                      </span>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-5">
                  {/* Tags — temperature-coded badges */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags.slice(0, 3).map((tag) => {
                        const colors = CATEGORY_BADGE_COLORS[tag] || {
                          bg: 'bg-blue-500/10',
                          text: 'text-blue-400',
                          ring: 'ring-blue-500/20',
                        };
                        return (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 text-xs rounded-full ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
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
            );
          })}
        </div>
      )}

    </>
  );
}

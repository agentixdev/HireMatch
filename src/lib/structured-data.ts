import type { BlogPost } from '@/types/blog';
import type { Job, Candidate } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HireMatch',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description: 'AI-powered recruitment platform connecting job seekers with employers across 29+ countries.',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
    },
  };
}

export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HireMatch',
    url: SITE_URL,
    description: 'AI-powered recruitment platform connecting job seekers with employers across 29+ countries.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/en/jobs?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function jobPostingJsonLd(job: Job, companyName?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.created_at,
    validThrough: job.expires_at || undefined,
    employmentType: mapJobType(job.job_type),
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName || 'Confidential Employer',
      sameAs: SITE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: job.country?.toUpperCase(),
        addressLocality: job.city || undefined,
      },
    },
    ...(job.salary_min && job.salary_max
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.salary_currency || 'USD',
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.salary_min,
              maxValue: job.salary_max,
              unitText: 'YEAR',
            },
          },
        }
      : {}),
    skills: job.skills_required?.join(', '),
    url: `${SITE_URL}/en/jobs/${job.id}`,
  };
}

function mapJobType(type: string): string {
  const map: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    contract: 'CONTRACTOR',
    freelance: 'CONTRACTOR',
    internship: 'INTERN',
  };
  return map[type] || 'FULL_TIME';
}

export function personJsonLd(candidate: Candidate) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: candidate.full_name,
    jobTitle: candidate.headline || undefined,
    description: candidate.bio || undefined,
    knowsAbout: candidate.skills,
    url: `${SITE_URL}/en/candidates/${candidate.id}`,
    image: candidate.photo_url || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: candidate.country?.toUpperCase(),
      addressLocality: candidate.city || undefined,
    },
  };
}

export function articleJsonLd(post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
    image: post.cover_image_url || `${SITE_URL}/og-default.png`,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Organization',
      name: post.author || 'HireMatch Team',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'HireMatch',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/en/blog/${post.slug}`,
    },
    keywords: post.tags?.join(', '),
    url: `${SITE_URL}/en/blog/${post.slug}`,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

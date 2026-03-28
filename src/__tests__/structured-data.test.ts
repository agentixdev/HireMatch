import {
  organizationJsonLd,
  jobPostingJsonLd,
  personJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
} from '@/lib/structured-data';
import type { Job, Candidate } from '@/types';
import type { BlogPost } from '@/types/blog';

describe('Structured data (JSON-LD)', () => {
  describe('organizationJsonLd', () => {
    it('should return valid Organization schema', () => {
      const org = organizationJsonLd();
      expect(org['@context']).toBe('https://schema.org');
      expect(org['@type']).toBe('Organization');
      expect(org.name).toBe('HireMatch');
      expect(org.url).toBeTruthy();
      expect(org.contactPoint).toBeDefined();
      expect(org.contactPoint['@type']).toBe('ContactPoint');
    });
  });

  describe('jobPostingJsonLd', () => {
    const job: Job = {
      id: 'job-123',
      recruiter_id: 'rec-1',
      title: 'Senior React Developer',
      description: 'Build UIs',
      requirements: [],
      nice_to_haves: [],
      skills_required: ['React', 'TypeScript'],
      job_type: 'full-time',
      work_mode: 'remote',
      country: 'us',
      city: 'San Francisco',
      visa_sponsorship: true,
      industry: 'Technology',
      match_tags: [],
      is_active: true,
      is_featured: false,
      views_count: 0,
      applications_count: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      salary_min: 120000,
      salary_max: 180000,
      salary_currency: 'USD',
    };

    it('should return valid JobPosting schema', () => {
      const jld = jobPostingJsonLd(job, 'Acme Corp');
      expect(jld['@context']).toBe('https://schema.org');
      expect(jld['@type']).toBe('JobPosting');
      expect(jld.title).toBe('Senior React Developer');
      expect(jld.hiringOrganization.name).toBe('Acme Corp');
      expect(jld.employmentType).toBe('FULL_TIME');
    });

    it('should include salary when provided', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.baseSalary).toBeDefined();
      expect(jld.baseSalary?.value.minValue).toBe(120000);
      expect(jld.baseSalary?.value.maxValue).toBe(180000);
      expect(jld.baseSalary?.currency).toBe('USD');
    });

    it('should omit salary when not provided', () => {
      const noSalary = { ...job, salary_min: undefined, salary_max: undefined };
      const jld = jobPostingJsonLd(noSalary);
      expect(jld.baseSalary).toBeUndefined();
    });

    it('should map job types correctly', () => {
      const partTime = { ...job, job_type: 'part-time' as const };
      expect(jobPostingJsonLd(partTime).employmentType).toBe('PART_TIME');

      const contract = { ...job, job_type: 'contract' as const };
      expect(jobPostingJsonLd(contract).employmentType).toBe('CONTRACTOR');

      const internship = { ...job, job_type: 'internship' as const };
      expect(jobPostingJsonLd(internship).employmentType).toBe('INTERN');
    });

    it('should include location', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.jobLocation.address.addressCountry).toBe('US');
      expect(jld.jobLocation.address.addressLocality).toBe('San Francisco');
    });

    it('should default company name to Confidential', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.hiringOrganization.name).toBe('Confidential Employer');
    });
  });

  describe('personJsonLd', () => {
    const candidate: Candidate = {
      id: 'cand-1',
      user_id: 'user-1',
      full_name: 'Jane Smith',
      email: 'jane@example.com',
      country: 'gb',
      city: 'London',
      headline: 'Full Stack Developer',
      bio: 'Experienced developer',
      skills: ['Node.js', 'React'],
      experience_years: 8,
      education: [],
      work_history: [],
      certifications: [],
      languages: ['English'],
      match_tags: [],
      is_public: true,
      remote_preference: 'hybrid',
      photo_url: 'https://example.com/photo.jpg',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };

    it('should return valid Person schema', () => {
      const pjld = personJsonLd(candidate);
      expect(pjld['@context']).toBe('https://schema.org');
      expect(pjld['@type']).toBe('Person');
      expect(pjld.name).toBe('Jane Smith');
      expect(pjld.jobTitle).toBe('Full Stack Developer');
      expect(pjld.knowsAbout).toEqual(['Node.js', 'React']);
      expect(pjld.image).toBe('https://example.com/photo.jpg');
      expect(pjld.address.addressCountry).toBe('GB');
    });
  });

  describe('articleJsonLd', () => {
    const post: BlogPost = {
      id: 'post-1',
      slug: 'hiring-guide',
      title: 'Hiring Guide',
      excerpt: 'A guide to hiring',
      content: 'Full content',
      author: 'HireMatch Team',
      tags: ['hiring', 'guide'],
      locale: 'en',
      published_at: '2026-03-01T00:00:00Z',
      created_at: '2026-02-28T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
      meta_title: 'Hiring Guide - HireMatch',
      meta_description: 'Complete hiring guide',
    };

    it('should return valid Article schema', () => {
      const ajld = articleJsonLd(post);
      expect(ajld['@context']).toBe('https://schema.org');
      expect(ajld['@type']).toBe('Article');
      expect(ajld.headline).toBe('Hiring Guide - HireMatch');
      expect(ajld.author.name).toBe('HireMatch Team');
      expect(ajld.publisher.name).toBe('HireMatch');
      expect(ajld.keywords).toBe('hiring, guide');
    });

    it('should fall back to title when no meta_title', () => {
      const noMeta = { ...post, meta_title: undefined };
      expect(articleJsonLd(noMeta).headline).toBe('Hiring Guide');
    });
  });

  describe('breadcrumbJsonLd', () => {
    it('should return valid BreadcrumbList', () => {
      const items = [
        { name: 'Home', url: 'https://hirematch.com' },
        { name: 'Jobs', url: 'https://hirematch.com/jobs' },
        { name: 'React Dev', url: 'https://hirematch.com/jobs/123' },
      ];
      const bld = breadcrumbJsonLd(items);
      expect(bld['@type']).toBe('BreadcrumbList');
      expect(bld.itemListElement).toHaveLength(3);
      expect(bld.itemListElement[0].position).toBe(1);
      expect(bld.itemListElement[2].position).toBe(3);
      expect(bld.itemListElement[1].name).toBe('Jobs');
    });

    it('should handle empty breadcrumbs', () => {
      const bld = breadcrumbJsonLd([]);
      expect(bld.itemListElement).toHaveLength(0);
    });
  });
});

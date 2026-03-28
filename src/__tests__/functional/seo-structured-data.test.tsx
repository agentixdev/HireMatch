/**
 * Functional tests for SEO: robots.txt, sitemap, and structured data.
 * Tests real module output — no mocks.
 */
import {
  organizationJsonLd,
  jobPostingJsonLd,
  personJsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
} from '@/lib/structured-data';
import type { Job, Candidate } from '@/types';
import type { BlogPost } from '@/types/blog';

describe('SEO & Structured Data', () => {
  describe('Organization JSON-LD', () => {
    const org = organizationJsonLd();

    it('should be valid schema.org Organization', () => {
      expect(org['@context']).toBe('https://schema.org');
      expect(org['@type']).toBe('Organization');
      expect(org.name).toBe('HireMatch');
    });

    it('should include logo and contact point', () => {
      expect(org.logo).toContain('/logo.png');
      expect(org.contactPoint['@type']).toBe('ContactPoint');
      expect(org.contactPoint.contactType).toBe('customer support');
    });
  });

  describe('JobPosting JSON-LD', () => {
    const job: Job = {
      id: 'real-job-1',
      recruiter_id: 'rec-1',
      title: 'Senior Full Stack Developer',
      description: 'Join our team building next-gen recruitment tools',
      requirements: ['5+ years experience', 'TypeScript proficiency'],
      nice_to_haves: ['Next.js experience'],
      skills_required: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      job_type: 'full-time',
      work_mode: 'hybrid',
      country: 'de',
      city: 'Berlin',
      visa_sponsorship: true,
      industry: 'Technology',
      match_tags: ['fullstack', 'typescript'],
      is_active: true,
      is_featured: true,
      views_count: 250,
      applications_count: 15,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-15T00:00:00Z',
      salary_min: 70000,
      salary_max: 95000,
      salary_currency: 'EUR',
      expires_at: '2026-06-01T00:00:00Z',
    };

    it('should produce valid JobPosting with all fields', () => {
      const jld = jobPostingJsonLd(job, 'TechStartup GmbH');
      expect(jld['@type']).toBe('JobPosting');
      expect(jld.title).toBe('Senior Full Stack Developer');
      expect(jld.hiringOrganization.name).toBe('TechStartup GmbH');
      expect(jld.employmentType).toBe('FULL_TIME');
      expect(jld.jobLocation.address.addressCountry).toBe('DE');
      expect(jld.jobLocation.address.addressLocality).toBe('Berlin');
    });

    it('should include salary range in EUR', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.baseSalary).toBeDefined();
      expect(jld.baseSalary?.currency).toBe('EUR');
      expect(jld.baseSalary?.value.minValue).toBe(70000);
      expect(jld.baseSalary?.value.maxValue).toBe(95000);
      expect(jld.baseSalary?.value.unitText).toBe('YEAR');
    });

    it('should include skills as comma-separated string', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.skills).toContain('TypeScript');
      expect(jld.skills).toContain('React');
    });

    it('should include valid through date', () => {
      const jld = jobPostingJsonLd(job);
      expect(jld.validThrough).toBe('2026-06-01T00:00:00Z');
    });

    it('should map all job types correctly', () => {
      const types = [
        ['full-time', 'FULL_TIME'],
        ['part-time', 'PART_TIME'],
        ['contract', 'CONTRACTOR'],
        ['freelance', 'CONTRACTOR'],
        ['internship', 'INTERN'],
      ];
      types.forEach(([input, expected]) => {
        const jld = jobPostingJsonLd({ ...job, job_type: input as Job['job_type'] });
        expect(jld.employmentType).toBe(expected);
      });
    });

    it('should default unknown job types to FULL_TIME', () => {
      const jld = jobPostingJsonLd({ ...job, job_type: 'volunteer' as Job['job_type'] });
      expect(jld.employmentType).toBe('FULL_TIME');
    });
  });

  describe('Person JSON-LD', () => {
    const candidate: Candidate = {
      id: 'cand-real-1',
      user_id: 'user-real-1',
      full_name: 'Maria Schmidt',
      email: 'maria@example.com',
      country: 'de',
      city: 'Munich',
      headline: 'Data Scientist | ML Engineer',
      bio: 'Passionate about machine learning and NLP',
      skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL'],
      experience_years: 6,
      education: [{ degree: 'MSc Computer Science', institution: 'TU Munich', field: 'Computer Science', start_year: 2018 }],
      work_history: [],
      certifications: ['AWS ML Specialty'],
      languages: ['German', 'English', 'French'],
      match_tags: ['ml', 'data-science'],
      is_public: true,
      remote_preference: 'hybrid',
      photo_url: 'https://storage.example.com/photo.jpg',
      created_at: '2026-01-15',
      updated_at: '2026-03-20',
    };

    it('should produce valid Person schema', () => {
      const pjld = personJsonLd(candidate);
      expect(pjld['@type']).toBe('Person');
      expect(pjld.name).toBe('Maria Schmidt');
      expect(pjld.jobTitle).toBe('Data Scientist | ML Engineer');
    });

    it('should include skills as knowsAbout', () => {
      const pjld = personJsonLd(candidate);
      expect(pjld.knowsAbout).toContain('Python');
      expect(pjld.knowsAbout).toContain('TensorFlow');
      expect(pjld.knowsAbout).toHaveLength(4);
    });

    it('should include location', () => {
      const pjld = personJsonLd(candidate);
      expect(pjld.address.addressCountry).toBe('DE');
      expect(pjld.address.addressLocality).toBe('Munich');
    });
  });

  describe('Article JSON-LD', () => {
    const post: BlogPost = {
      id: 'post-real-1',
      slug: 'eu-blue-card-guide-2026',
      title: 'EU Blue Card Guide 2026: Everything You Need to Know',
      excerpt: 'Complete guide to the EU Blue Card for skilled workers',
      content: 'Full article content...',
      cover_image_url: 'https://hirematch.com/blog/blue-card.jpg',
      author: 'Immigration Team',
      tags: ['eu-blue-card', 'germany', 'visa', 'immigration'],
      locale: 'en',
      country_code: 'de',
      published_at: '2026-03-15T10:00:00Z',
      created_at: '2026-03-10T08:00:00Z',
      updated_at: '2026-03-20T14:00:00Z',
      meta_title: 'EU Blue Card 2026 Guide | HireMatch',
      meta_description: 'Everything about the EU Blue Card for Germany',
    };

    it('should produce valid Article schema', () => {
      const ajld = articleJsonLd(post);
      expect(ajld['@type']).toBe('Article');
      expect(ajld.headline).toBe('EU Blue Card 2026 Guide | HireMatch');
      expect(ajld.datePublished).toBe('2026-03-15T10:00:00Z');
      expect(ajld.dateModified).toBe('2026-03-20T14:00:00Z');
    });

    it('should include author and publisher', () => {
      const ajld = articleJsonLd(post);
      expect(ajld.author.name).toBe('Immigration Team');
      expect(ajld.publisher.name).toBe('HireMatch');
      expect(ajld.publisher.logo['@type']).toBe('ImageObject');
    });

    it('should include cover image', () => {
      const ajld = articleJsonLd(post);
      expect(ajld.image).toBe('https://hirematch.com/blog/blue-card.jpg');
    });

    it('should include keywords from tags', () => {
      const ajld = articleJsonLd(post);
      expect(ajld.keywords).toBe('eu-blue-card, germany, visa, immigration');
    });

    it('should use title when meta_title is not set', () => {
      const noMeta = { ...post, meta_title: undefined };
      expect(articleJsonLd(noMeta).headline).toBe(post.title);
    });

    it('should use excerpt when meta_description is not set', () => {
      const noMeta = { ...post, meta_description: undefined };
      expect(articleJsonLd(noMeta).description).toBe(post.excerpt);
    });
  });

  describe('Breadcrumb JSON-LD', () => {
    it('should produce numbered list items', () => {
      const items = [
        { name: 'Home', url: 'https://hirematch.com' },
        { name: 'Jobs', url: 'https://hirematch.com/en/jobs' },
        { name: 'Senior Dev', url: 'https://hirematch.com/en/jobs/123' },
      ];
      const bld = breadcrumbJsonLd(items);
      expect(bld['@type']).toBe('BreadcrumbList');
      expect(bld.itemListElement).toHaveLength(3);
      bld.itemListElement.forEach((item: { position: number }, i: number) => {
        expect(item.position).toBe(i + 1);
      });
    });
  });
});

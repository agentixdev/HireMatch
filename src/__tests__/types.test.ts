import type {
  Candidate, Recruiter, Job, Application, Match,
  VisaRequirement, WebhookConfig, QuizQuestion,
  ApplicationStatus, UserRole, RecruiterTier, CountryCode,
} from '@/types';

describe('Type definitions', () => {
  it('should have valid Candidate type', () => {
    const candidate: Candidate = {
      id: 'uuid',
      user_id: 'uuid',
      full_name: 'John Doe',
      email: 'john@example.com',
      country: 'us',
      remote_preference: 'remote',
      skills: ['TypeScript', 'React'],
      experience_years: 5,
      education: [],
      work_history: [],
      certifications: [],
      languages: ['English'],
      match_tags: ['frontend', 'react'],
      is_public: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    expect(candidate.full_name).toBe('John Doe');
    expect(candidate.skills).toContain('TypeScript');
  });

  it('should have valid Job type', () => {
    const job: Job = {
      id: 'uuid',
      recruiter_id: 'uuid',
      title: 'Senior React Developer',
      description: 'Build awesome UIs',
      requirements: ['5+ years React'],
      nice_to_haves: ['Next.js experience'],
      skills_required: ['React', 'TypeScript'],
      job_type: 'full-time',
      work_mode: 'remote',
      country: 'us',
      visa_sponsorship: true,
      industry: 'Technology',
      match_tags: ['react', 'frontend'],
      is_active: true,
      is_featured: false,
      views_count: 0,
      applications_count: 0,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    expect(job.title).toBe('Senior React Developer');
    expect(job.visa_sponsorship).toBe(true);
  });

  it('should have valid application statuses', () => {
    const statuses: ApplicationStatus[] = [
      'applied', 'reviewed', 'shortlisted', 'interview_scheduled',
      'interview_completed', 'offer_extended', 'offer_accepted',
      'hired', 'rejected', 'withdrawn',
    ];
    expect(statuses).toHaveLength(10);
  });

  it('should have valid recruiter tiers', () => {
    const tiers: RecruiterTier[] = ['free', 'pro', 'enterprise', 'agency'];
    expect(tiers).toHaveLength(4);
  });

  it('should support all 29 countries', () => {
    const countries: CountryCode[] = [
      'us', 'ca', 'gb', 'ch', 'de', 'fr', 'es', 'it', 'nl', 'be',
      'at', 'pt', 'ie', 'se', 'dk', 'no', 'fi', 'pl', 'cz', 'ro',
      'in', 'mx', 'br', 'ar', 'cn', 'jp', 'kr', 'vn', 'ph',
    ];
    expect(countries).toHaveLength(29);
  });
});

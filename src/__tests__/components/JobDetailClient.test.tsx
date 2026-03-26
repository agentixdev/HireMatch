import React from 'react';
import { render, screen } from '@testing-library/react';
import JobDetailClient from '@/app/[locale]/jobs/[id]/JobDetailClient';
import type { Job, Recruiter } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    img: ({ ...props }: any) => <img {...props} />,
    a: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useSpring: () => ({ set: jest.fn(), on: () => jest.fn() }),
  useInView: () => true,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('canvas-confetti', () => jest.fn());

const mockAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) };
const mockFrom = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({ data: null }),
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null }),
      }),
    }),
  }),
  insert: jest.fn().mockResolvedValue({ error: null }),
});
const mockRpc = jest.fn().mockReturnValue({ then: jest.fn() });

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: mockAuth,
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

const mockJob: Job = {
  id: 'job-001',
  recruiter_id: 'rec-001',
  title: 'Senior React Engineer',
  description: 'Build amazing user interfaces for our platform.',
  requirements: ['5+ years React experience', 'Strong TypeScript skills', 'CI/CD knowledge'],
  nice_to_haves: ['GraphQL experience', 'OSS contributions'],
  skills_required: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  job_type: 'full-time',
  work_mode: 'remote',
  country: 'us',
  city: 'San Francisco',
  salary_min: 150000,
  salary_max: 200000,
  salary_currency: 'USD',
  visa_sponsorship: true,
  experience_min: 5,
  experience_max: 10,
  education_level: 'Bachelor',
  industry: 'Technology',
  match_tags: ['react', 'typescript'],
  is_active: true,
  is_featured: false,
  views_count: 1234,
  applications_count: 56,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

const mockRecruiter: Recruiter = {
  id: 'rec-001',
  user_id: 'user-rec-001',
  company_name: 'TechCorp',
  company_logo_url: 'https://example.com/logo.png',
  company_website: 'https://techcorp.com',
  industry: 'Technology',
  company_size: '201-500',
  country: 'us',
  city: 'San Francisco',
  bio: 'We build great software.',
  culture_tags: ['Innovation', 'Remote-first', 'Flat hierarchy'],
  tier: 'pro',
  jobs_posted_count: 10,
  candidate_views_remaining: 100,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('JobDetailClient', () => {
  it('renders job title', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const titles = screen.getAllByText('Senior React Engineer');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders company name', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const companyNames = screen.getAllByText('TechCorp');
    expect(companyNames.length).toBeGreaterThan(0);
  });

  it('shows salary range when provided', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const salaryTexts = screen.getAllByText('USD 150k-200k');
    expect(salaryTexts.length).toBeGreaterThan(0);
  });

  it('shows all required skills as tags', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    for (const skill of ['React', 'TypeScript', 'Node.js', 'PostgreSQL']) {
      const skillEls = screen.getAllByText(skill);
      expect(skillEls.length).toBeGreaterThan(0);
    }
  });

  it('renders requirements list', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    expect(screen.getAllByText('5+ years React experience').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Strong TypeScript skills').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CI/CD knowledge').length).toBeGreaterThan(0);
  });

  it('renders nice-to-have list', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    expect(screen.getAllByText('GraphQL experience').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OSS contributions').length).toBeGreaterThan(0);
  });

  it('shows company industry in sidebar', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const industryLabels = screen.getAllByText('Technology');
    expect(industryLabels.length).toBeGreaterThan(0);
  });

  it('shows company size in sidebar', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const sizeTexts = screen.getAllByText('201-500 employees');
    expect(sizeTexts.length).toBeGreaterThan(0);
  });

  it('shows company website link', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const visitLinks = screen.getAllByText('Visit');
    expect(visitLinks.length).toBeGreaterThan(0);
  });

  it('shows culture tags', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    for (const tag of ['Innovation', 'Remote-first', 'Flat hierarchy']) {
      const tagEls = screen.getAllByText(tag);
      expect(tagEls.length).toBeGreaterThan(0);
    }
  });

  it('shows "Visa Sponsored" badge when visa_sponsorship is true', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const visaBadges = screen.getAllByText('Visa Sponsored');
    expect(visaBadges.length).toBeGreaterThan(0);
  });

  it('does not show visa badge when visa_sponsorship is false', () => {
    render(<JobDetailClient job={{ ...mockJob, visa_sponsorship: false }} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    expect(screen.queryByText('Visa Sponsored')).not.toBeInTheDocument();
  });

  it('shows work mode badge for remote', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const remoteBadges = screen.getAllByText('Remote');
    expect(remoteBadges.length).toBeGreaterThan(0);
  });

  it('shows work mode badge for hybrid', () => {
    render(<JobDetailClient job={{ ...mockJob, work_mode: 'hybrid' }} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const hybridBadges = screen.getAllByText('Hybrid');
    expect(hybridBadges.length).toBeGreaterThan(0);
  });

  it('shows apply button', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const applyButtons = screen.getAllByText('Sign In to Apply');
    expect(applyButtons.length).toBeGreaterThan(0);
  });

  it('shows job description text', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const descTexts = screen.getAllByText('Build amazing user interfaces for our platform.');
    expect(descTexts.length).toBeGreaterThan(0);
  });

  it('renders without salary when not provided', () => {
    const jobNoSalary = { ...mockJob, salary_min: undefined, salary_max: undefined };
    render(<JobDetailClient job={jobNoSalary} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
  });

  it('shows experience range', () => {
    render(<JobDetailClient job={mockJob} recruiter={mockRecruiter} similarJobs={[]} locale="en" />);
    const expTexts = screen.getAllByText(/5-10 yr/);
    expect(expTexts.length).toBeGreaterThan(0);
  });
});

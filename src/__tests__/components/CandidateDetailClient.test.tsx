import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateDetailClient from '@/app/[locale]/candidates/[id]/CandidateDetailClient';
import type { Candidate } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('next/link', () => ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('next/image', () => ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />);

const mockCandidate: Candidate = {
  id: 'cand-abc',
  user_id: 'user-abc',
  full_name: 'Alice Johnson',
  email: 'alice@example.com',
  phone: '+1-555-1234',
  photo_url: 'https://example.com/alice.jpg',
  headline: 'Senior Software Engineer at TechCorp',
  bio: 'Passionate engineer with 10 years of experience building scalable systems.',
  country: 'us',
  city: 'New York',
  remote_preference: 'remote',
  skills: ['React', 'TypeScript', 'Go', 'PostgreSQL', 'Kubernetes'],
  experience_years: 10,
  education: [
    {
      institution: 'MIT',
      degree: 'B.S.',
      field: 'Computer Science',
      start_year: 2012,
      end_year: 2016,
    },
    {
      institution: 'Stanford',
      degree: 'M.S.',
      field: 'Machine Learning',
      start_year: 2016,
      end_year: 2018,
    },
  ],
  work_history: [
    {
      company: 'TechCorp',
      title: 'Senior Software Engineer',
      description: 'Led a team of 5 engineers.',
      start_date: '2021-01-01',
      end_date: undefined,
      is_current: true,
      skills: ['React', 'TypeScript'],
    },
    {
      company: 'StartupXYZ',
      title: 'Software Engineer',
      description: 'Built core backend systems.',
      start_date: '2018-06-01',
      end_date: '2020-12-31',
      is_current: false,
      skills: ['Go', 'PostgreSQL'],
    },
  ],
  certifications: ['AWS Solutions Architect', 'Google Cloud Professional'],
  languages: ['English', 'Spanish', 'French'],
  visa_status: 'citizen',
  is_public: true,
  available_now: true,
  notice_period: 'immediate',
  match_tags: ['react', 'typescript', 'go'],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const mockRelated: Candidate[] = [
  {
    ...mockCandidate,
    id: 'cand-rel-1',
    full_name: 'Bob Smith',
    headline: 'Backend Developer',
    photo_url: undefined,
  },
  {
    ...mockCandidate,
    id: 'cand-rel-2',
    full_name: 'Carol Lee',
    headline: 'Product Manager',
  },
];

describe('CandidateDetailClient', () => {
  it('renders candidate name', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const names = screen.getAllByText('Alice Johnson');
    expect(names.length).toBeGreaterThan(0);
  });

  it('shows headline with correct industry color styling (blue for SWE)', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const headlines = screen.getAllByText('Senior Software Engineer at TechCorp');
    expect(headlines.length).toBeGreaterThan(0);
    // At least one should have blue industry color
    const hasBlueColor = headlines.some(el => el.style.color === '#60a5fa' || el.style.color === 'rgb(96, 165, 250)');
    expect(hasBlueColor).toBe(true);
  });

  it('renders bio text', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const bioTexts = screen.getAllByText('Passionate engineer with 10 years of experience building scalable systems.');
    expect(bioTexts.length).toBeGreaterThan(0);
  });

  it('shows all skills as tags', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    for (const skill of ['React', 'TypeScript', 'Go', 'PostgreSQL', 'Kubernetes']) {
      const skillEls = screen.getAllByText(skill);
      expect(skillEls.length).toBeGreaterThan(0);
    }
  });

  it('renders work history entries with company name and title', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const techCorps = screen.getAllByText('TechCorp');
    expect(techCorps.length).toBeGreaterThan(0);
    const seniorTitles = screen.getAllByText('Senior Software Engineer');
    expect(seniorTitles.length).toBeGreaterThan(0);
    expect(screen.getAllByText('StartupXYZ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Software Engineer').length).toBeGreaterThan(0);
  });

  it('renders work history date ranges', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    // Current job shows "Present"
    const presentEls = screen.getAllByText(/Present/);
    expect(presentEls.length).toBeGreaterThan(0);
  });

  it('renders education entries (institution, degree, field)', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    expect(screen.getAllByText('MIT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stanford').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/B\.S\. in Computer Science/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/M\.S\. in Machine Learning/).length).toBeGreaterThan(0);
  });

  it('shows certifications', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    expect(screen.getAllByText('AWS Solutions Architect').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Google Cloud Professional').length).toBeGreaterThan(0);
  });

  it('shows languages', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    for (const lang of ['English', 'Spanish', 'French']) {
      expect(screen.getAllByText(lang).length).toBeGreaterThan(0);
    }
  });

  it('shows "Available Now" badge when available_now is true', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const availBadges = screen.getAllByText(/Available/i);
    expect(availBadges.length).toBeGreaterThan(0);
  });

  it('does not show "Available Now" when available_now is false', () => {
    render(<CandidateDetailClient candidate={{ ...mockCandidate, available_now: false }} relatedCandidates={[]} />);
    expect(screen.queryByText('Available Now')).not.toBeInTheDocument();
    // Desktop variant says just "Available"
    const availEls = screen.queryAllByText(/^Available$/);
    // Might have "Available" in Quick Facts for different context, so just check badge-specific ones are gone
    // The badge specifically has class with green styling - we can't check class easily, so just verify no extra badge
    expect(availEls.length).toBe(0);
  });

  it('endorse button toggles on click', async () => {
    const user = userEvent.setup();
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);

    // There are multiple endorse buttons (mobile + desktop)
    const endorseBtns = screen.getAllByRole('button', { name: /endorse/i });
    expect(endorseBtns.length).toBeGreaterThan(0);

    const btn = endorseBtns[0];
    expect(btn).toHaveTextContent('Endorse');

    await user.click(btn);
    expect(btn).toHaveTextContent('Endorsed');

    await user.click(btn);
    expect(btn).toHaveTextContent('Endorse');
  });

  it('share button renders', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const shareBtns = screen.getAllByRole('button', { name: /share/i });
    expect(shareBtns.length).toBeGreaterThan(0);
  });

  it('share button opens share menu on click', async () => {
    const user = userEvent.setup();
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);

    const shareBtns = screen.getAllByRole('button', { name: /share/i });
    await user.click(shareBtns[0]);

    expect(screen.getAllByText('Copy Link').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LinkedIn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
  });

  it('renders related candidates grid', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={mockRelated} />);
    expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Carol Lee').length).toBeGreaterThan(0);
  });

  it('renders SWE role badge', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={[]} />);
    const sweBadges = screen.getAllByText('SWE');
    expect(sweBadges.length).toBeGreaterThan(0);
  });

  it('renders initials fallback for related candidate without photo', () => {
    render(<CandidateDetailClient candidate={mockCandidate} relatedCandidates={mockRelated} />);
    // Bob Smith has no photo -> should show "BS"
    expect(screen.getAllByText('BS').length).toBeGreaterThan(0);
  });
});

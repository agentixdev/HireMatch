import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateCard from '@/components/CandidateCard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('next/link', () => ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('next/image', () => ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />);

const baseCandidate = {
  id: 'cand-123',
  full_name: 'Jane Doe',
  headline: 'Senior Software Engineer',
  photo_url: 'https://example.com/photo.jpg',
  skills: ['React', 'TypeScript', 'Node.js', 'GraphQL', 'AWS'],
  experience_years: 8,
  country: 'us',
  city: 'San Francisco',
  is_public: true,
  visa_status: 'citizen',
};

describe('CandidateCard', () => {
  it('renders candidate name', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('renders headline', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
  });

  it('shows SWE role badge for software engineer headline', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.getByText('SWE')).toBeInTheDocument();
  });

  it('shows PM role badge for product manager headline', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'Product Manager at Meta' }} />);
    expect(screen.getByText('PM')).toBeInTheDocument();
  });

  it('shows DS role badge for data science headline', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'Data Scientist' }} />);
    expect(screen.getByText('DS')).toBeInTheDocument();
  });

  it('shows UXD role badge for designer headline', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'UX Designer' }} />);
    expect(screen.getByText('UXD')).toBeInTheDocument();
  });

  it('shows fallback abbreviation for unknown role', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'Chef Extraordinaire' }} />);
    expect(screen.getByText('CHE')).toBeInTheDocument();
  });

  it('shows "Available Now" badge when available_now is true', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, available_now: true }} />);
    expect(screen.getByText('Available Now')).toBeInTheDocument();
  });

  it('does not show "Available Now" badge when available_now is false', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, available_now: false }} />);
    expect(screen.queryByText('Available Now')).not.toBeInTheDocument();
  });

  it('shows first 3 skills as tags and overflow count', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.queryByText('GraphQL')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show overflow count when 3 or fewer skills', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, skills: ['React', 'TypeScript'] }} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('shows match score when provided', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, match_score: 87 }} />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('does not show match score when not provided', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it('renders photo when photo_url exists', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    const img = screen.getByAltText('Jane Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('renders initials fallback when no photo', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, photo_url: undefined }} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.queryByAltText('Jane Doe')).not.toBeInTheDocument();
  });

  it('renders single initial for single-name candidate', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, full_name: 'Madonna', photo_url: undefined }} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('links to correct candidate detail page', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    const links = screen.getAllByRole('link');
    const candidateLinks = links.filter(link => link.getAttribute('href') === '/candidates/cand-123');
    expect(candidateLinks.length).toBeGreaterThan(0);
  });

  it('endorse button toggles state on click', async () => {
    const user = userEvent.setup();
    render(<CandidateCard candidate={baseCandidate} />);

    const endorseBtn = screen.getByRole('button', { name: /endorse/i });
    expect(endorseBtn).toHaveTextContent('Endorse');

    await user.click(endorseBtn);
    expect(endorseBtn).toHaveTextContent('Endorsed');

    await user.click(endorseBtn);
    expect(endorseBtn).toHaveTextContent('Endorse');
  });

  it('shows "Hot Candidate" trending badge when trending is true', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, trending: true }} />);
    expect(screen.getByText('Hot Candidate')).toBeInTheDocument();
  });

  it('does not show trending badge when trending is false', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, trending: false }} />);
    expect(screen.queryByText('Hot Candidate')).not.toBeInTheDocument();
  });

  it('uses blue industry color for software engineer headline', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    const headlineEl = screen.getByText('Senior Software Engineer');
    expect(headlineEl).toHaveStyle({ color: '#60a5fa' });
  });

  it('uses green industry color for finance headline', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'Finance Director' }} />);
    const headlineEl = screen.getByText('Finance Director');
    expect(headlineEl).toHaveStyle({ color: '#34d399' });
  });

  it('uses pink industry color for designer headline', () => {
    render(<CandidateCard candidate={{ ...baseCandidate, headline: 'Lead Designer' }} />);
    const headlineEl = screen.getByText('Lead Designer');
    expect(headlineEl).toHaveStyle({ color: '#f472b6' });
  });

  it('shows View Profile button', () => {
    render(<CandidateCard candidate={baseCandidate} />);
    expect(screen.getByText(/View Profile/)).toBeInTheDocument();
  });
});

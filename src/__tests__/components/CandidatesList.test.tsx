import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidatesList from '@/components/CandidatesList';
import type { Candidate } from '@/types';

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

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeCandidates(count: number): Candidate[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `cand-${i}`,
    user_id: `user-${i}`,
    full_name: `Candidate ${i}`,
    email: `cand${i}@example.com`,
    headline: 'Software Engineer',
    photo_url: undefined,
    skills: ['React', 'TypeScript'],
    experience_years: 5,
    country: 'us' as const,
    city: 'NYC',
    is_public: true,
    remote_preference: 'remote' as const,
    education: [],
    work_history: [],
    certifications: [],
    languages: ['English'],
    match_tags: [],
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  }));
}

describe('CandidatesList', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders all candidate cards', () => {
    const candidates = makeCandidates(3);
    render(
      <CandidatesList
        candidates={candidates}
        totalCount={3}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('Candidate 0')).toBeInTheDocument();
    expect(screen.getByText('Candidate 1')).toBeInTheDocument();
    expect(screen.getByText('Candidate 2')).toBeInTheDocument();
  });

  it('shows empty state when no candidates', () => {
    render(
      <CandidatesList
        candidates={[]}
        totalCount={0}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('No candidates found matching your criteria.')).toBeInTheDocument();
  });

  it('shows correct total count', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(3)}
        totalCount={42}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('42 candidates found')).toBeInTheDocument();
  });

  it('shows singular count for 1 candidate', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('1 candidate found')).toBeInTheDocument();
  });

  it('search form submits and navigates with query params', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );

    const input = screen.getByPlaceholderText('Search candidates by name or headline...');
    await user.type(input, 'React developer');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('q=React+developer');
  });

  it('country filter changes update URL', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );

    const countrySelect = screen.getByDisplayValue('All Countries');
    await user.selectOptions(countrySelect, 'us');

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('country=us');
  });

  it('work mode filter changes update URL', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );

    const modeSelect = screen.getByDisplayValue('All Work Modes');
    await user.selectOptions(modeSelect, 'remote');

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('mode=remote');
  });

  it('experience filter changes update URL', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );

    const expSelect = screen.getByDisplayValue('All Experience');
    await user.selectOptions(expSelect, '3-5');

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('experience=3-5');
  });

  it('pagination shows Previous and Next buttons on middle page', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(24)}
        totalCount={72}
        currentPage={2}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('pagination hides Previous on first page', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(24)}
        totalCount={48}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('pagination hides Next on last page', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(24)}
        totalCount={48}
        currentPage={2}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('pagination navigates to correct page on Next click', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(24)}
        totalCount={48}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );

    await user.click(screen.getByText('Next'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('page=2');
  });

  it('pagination navigates to correct page on Previous click', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(24)}
        totalCount={72}
        currentPage={3}
        searchQuery=""
        filters={{}}
      />
    );

    await user.click(screen.getByText('Previous'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('page=2');
  });

  it('does not show pagination when total fits in one page', () => {
    render(
      <CandidatesList
        candidates={makeCandidates(10)}
        totalCount={10}
        currentPage={1}
        searchQuery=""
        filters={{}}
      />
    );
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('preserves existing filters when searching', async () => {
    const user = userEvent.setup();
    render(
      <CandidatesList
        candidates={makeCandidates(1)}
        totalCount={1}
        currentPage={1}
        searchQuery=""
        filters={{ country: 'us', mode: 'remote' }}
      />
    );

    const input = screen.getByPlaceholderText('Search candidates by name or headline...');
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const calledUrl = mockPush.mock.calls[0][0];
    expect(calledUrl).toContain('country=us');
    expect(calledUrl).toContain('mode=remote');
    expect(calledUrl).toContain('q=Test');
  });
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
let mockPathname = '/en/dashboard/candidate/applications';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

const mockUser = { id: 'test-user-id', email: 'test@test.com' };
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: mockUser } });

const mockApplications = [
  {
    id: 'app-1',
    status: 'applied',
    match_score: 88,
    created_at: '2025-03-01T00:00:00Z',
    job: { id: 'job-1', title: 'React Developer', city: 'NYC', work_mode: 'remote' },
  },
  {
    id: 'app-2',
    status: 'shortlisted',
    match_score: 95,
    created_at: '2025-03-10T00:00:00Z',
    job: { id: 'job-2', title: 'Senior Frontend Engineer', city: 'SF', work_mode: 'hybrid' },
  },
  {
    id: 'app-3',
    status: 'rejected',
    match_score: null,
    created_at: '2025-02-15T00:00:00Z',
    job: { id: 'job-3', title: 'Full Stack Developer', city: 'London', work_mode: 'onsite' },
  },
  {
    id: 'app-4',
    status: 'applied',
    match_score: 72,
    created_at: '2025-03-15T00:00:00Z',
    job: { id: 'job-4', title: 'TypeScript Engineer', city: 'Berlin', work_mode: 'remote' },
  },
];

// Build the mock chain for supabase from() calls
const mockOrderResult = jest.fn().mockResolvedValue({ data: mockApplications });
const mockEqChain = jest.fn().mockReturnValue({ order: mockOrderResult });
const mockSelectChain = jest.fn().mockReturnValue({ eq: mockEqChain });
const mockCandidateSingle = jest.fn().mockResolvedValue({
  data: { id: 'cand-1', full_name: 'Jane Developer' },
});

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'candidates') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: mockCandidateSingle,
            }),
          }),
        };
      }
      if (table === 'applications') {
        return {
          select: mockSelectChain,
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
      };
    }),
  }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = typeof tag === 'string' ? tag : 'div';
      const { initial, animate, exit, transition, variants, custom, layout,
              whileHover, whileTap, whileFocus, whileDrag, whileInView, ...rest } = props;
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

import CandidateApplications from '@/app/[locale]/dashboard/candidate/applications/page';

/* ---- Tests ---- */

describe('Candidate Applications', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
  });

  it('renders applications list after loading', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    expect(screen.getByText('React Developer')).toBeInTheDocument();
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('shows correct status badges', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Applied').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Shortlisted')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('filter pills work for each status', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    // Click on Applied filter pill
    const appliedPill = screen.getByText('Applied (2)');
    await user.click(appliedPill);

    // Should show only applied applications
    await waitFor(() => {
      expect(screen.getByText('React Developer')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Engineer')).toBeInTheDocument();
      // Shortlisted and Rejected should be filtered out
      expect(screen.queryByText('Senior Frontend Engineer')).not.toBeInTheDocument();
      expect(screen.queryByText('Full Stack Developer')).not.toBeInTheDocument();
    });
  });

  it('shows "All" count correctly', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    expect(screen.getByText('All (4)')).toBeInTheDocument();
    expect(screen.getByText('4 total')).toBeInTheDocument();
  });

  it('shows empty state when no applications', async () => {
    mockOrderResult.mockResolvedValueOnce({ data: [] });

    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('No applications yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Browse Jobs')).toBeInTheDocument();
  });

  it('links to job details', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('React Developer')).toBeInTheDocument();
    });

    const jobLink = screen.getByText('React Developer');
    expect(jobLink.closest('a')).toHaveAttribute('href', '/jobs/job-1');
  });

  it('shows match score when present', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('clicking All filter shows all applications after filtering', async () => {
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(screen.getByText('My Applications')).toBeInTheDocument();
    });

    // First filter to shortlisted
    await user.click(screen.getByText('Shortlisted (1)'));

    await waitFor(() => {
      expect(screen.queryByText('React Developer')).not.toBeInTheDocument();
    });

    // Then click All to see everything
    await user.click(screen.getByText('All (4)'));

    await waitFor(() => {
      expect(screen.getByText('React Developer')).toBeInTheDocument();
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
      expect(screen.getByText('TypeScript Engineer')).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<CandidateApplications />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth');
    });
  });
});

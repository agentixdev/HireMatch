import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
let mockPathname = '/en/dashboard/recruiter/search';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

const mockCandidates = [
  {
    id: 'c1',
    full_name: 'Alice React',
    headline: 'Senior React Developer',
    photo_url: null,
    skills: ['React', 'TypeScript'],
    experience_years: 5,
    country: 'US',
    city: 'New York',
    is_public: true,
    match_score: 92,
  },
  {
    id: 'c2',
    full_name: 'Bob Python',
    headline: 'ML Engineer',
    photo_url: null,
    skills: ['Python', 'Machine Learning'],
    experience_years: 8,
    country: 'UK',
    city: 'London',
    is_public: true,
    match_score: 85,
  },
];

// Use a Proxy-based approach for supabase method chaining
const createChainProxy = (finalData: any): any => {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === 'then') {
        return (fn: any) => Promise.resolve(finalData).then(fn);
      }
      if (prop === 'catch' || prop === 'finally') {
        return (fn: any) => Promise.resolve(finalData)[prop as 'catch' | 'finally'](fn);
      }
      return jest.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
};

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { signOut: jest.fn().mockResolvedValue({}) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(
        createChainProxy({ data: mockCandidates, count: 2, error: null })
      ),
    }),
  }),
}));

// The search page uses fetch('/api/candidates/search') instead of supabase directly
const mockFetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ candidates: mockCandidates, total: 2 }),
});

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = typeof tag === 'string' ? tag : 'div';
      const { initial, animate, exit, transition, variants, custom, layout,
              whileHover, whileTap, whileFocus, whileDrag, whileInView,
              onViewportEnter, onViewportLeave, ...rest } = props;
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children, mode: _m }: any) => <>{children}</>,
  useAnimation: () => ({ start: jest.fn() }),
  useInView: () => true,
  useMotionValue: () => ({
    get: () => 0,
    set: jest.fn(),
    on: jest.fn().mockReturnValue(jest.fn()),
  }),
  useTransform: () => ({
    get: () => 0,
    on: jest.fn().mockReturnValue(jest.fn()),
  }),
  animate: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

jest.mock('@/components/CandidateCard', () => ({
  __esModule: true,
  default: ({ candidate }: any) => (
    <div data-testid={`candidate-card-${candidate.id}`}>
      <span>{candidate.full_name}</span>
      <span>{candidate.headline}</span>
    </div>
  ),
}));

import RecruiterSearchPage from '@/app/[locale]/dashboard/recruiter/search/page';

/* ---- Tests ---- */

// The component has a 600ms setTimeout in fetchCandidates + 350ms debounce
jest.useFakeTimers();

describe('Recruiter Search', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    global.fetch = originalFetch;
  });

  it('renders search interface', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    expect(screen.getByText('Find Candidates')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name, skills, or headline...')).toBeInTheDocument();
  });

  it('has a search input', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name, skills, or headline...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.tagName.toLowerCase()).toBe('input');
  });

  it('has a toggle filters button', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    const filterButton = screen.getByLabelText('Toggle filters');
    expect(filterButton).toBeInTheDocument();
  });

  it('shows filter panel when toggle clicked', async () => {
    const realUser = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    await realUser.click(screen.getByLabelText('Toggle filters'));

    await waitFor(() => {
      expect(screen.getByText('Country')).toBeInTheDocument();
      expect(screen.getByText('Remote Preference')).toBeInTheDocument();
      expect(screen.getByText('Visa Status')).toBeInTheDocument();
      expect(screen.getByText('Skills')).toBeInTheDocument();
    });
  });

  it('shows skill filter chips in filter panel', async () => {
    const realUser = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    await realUser.click(screen.getByLabelText('Toggle filters'));

    await waitFor(() => {
      // Popular skills from the component
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('Node.js')).toBeInTheDocument();
    });
  });

  it('shows experience range in filter panel', async () => {
    const realUser = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    await realUser.click(screen.getByLabelText('Toggle filters'));

    await waitFor(() => {
      expect(screen.getByText(/Experience.*0.*-.*30/)).toBeInTheDocument();
    });
  });

  it('has a Search button', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('displays results after search completes', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    // Advance past debounce (350ms) + setTimeout in fetch (600ms)
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByText(/candidate.*found/i)).toBeInTheDocument();
    });
  });

  it('shows candidate cards when results are returned', async () => {
    await act(async () => {
      render(<RecruiterSearchPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId('candidate-card-c1')).toBeInTheDocument();
      expect(screen.getByTestId('candidate-card-c2')).toBeInTheDocument();
      expect(screen.getByText('Alice React')).toBeInTheDocument();
      expect(screen.getByText('Bob Python')).toBeInTheDocument();
    });
  });
});

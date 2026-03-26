import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockPathname = '/en/dashboard/recruiter/post-job';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      postJob: 'Post a Job',
    };
    return map[key] || key;
  },
}));

const mockUser = { id: 'recruiter-user-id', email: 'recruiter@test.com' };
const mockGetUser = jest.fn().mockResolvedValue({ data: { user: mockUser } });
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockRpc = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockImplementation((table: string) => {
      if (table === 'recruiters') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'rec-123', country: 'us', industry: 'tech', company_name: 'TestCo' },
              }),
            }),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          insert: mockInsert,
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1 }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null }),
        insert: mockInsert,
        update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      };
    }),
    rpc: mockRpc,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => {
      const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
        const Tag = typeof tag === 'string' ? tag : 'div';
        const { initial, animate, exit, transition, variants, custom, layout,
                whileHover, whileTap, whileFocus, whileDrag, whileInView, ...rest } = props;
        return React.createElement(Tag, { ...rest, ref }, children);
      });
      Component.displayName = `motion.${String(tag)}`;
      return Component;
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({ start: jest.fn() }),
  useInView: () => true,
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

import PostJobPage from '@/app/[locale]/dashboard/recruiter/post-job/page';

/* ---- Helpers ---- */

async function goToFormPhase() {
  render(<PostJobPage />);

  await waitFor(() => {
    expect(screen.getByText('Build Manually')).toBeInTheDocument();
  });

  // Click the Build Manually h3 — find its parent button and click it
  const h3 = screen.getByText('Build Manually');
  const btn = h3.closest('button');
  if (btn) {
    fireEvent.click(btn);
  } else {
    fireEvent.click(h3);
  }

  await waitFor(() => {
    expect(screen.getByText('Job Title *')).toBeInTheDocument();
  });
}

/* ---- Tests ---- */

describe('Job Posting', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    mockInsert.mockResolvedValue({ error: null });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders initial phase chooser with three options', async () => {
    render(<PostJobPage />);

    await waitFor(() => {
      expect(screen.getByText('Post a Job')).toBeInTheDocument();
    });

    expect(screen.getByText('Paste Existing JD')).toBeInTheDocument();
    expect(screen.getByText('Generate with AI')).toBeInTheDocument();
    expect(screen.getByText('Build Manually')).toBeInTheDocument();
  });

  it('navigates to form phase when clicking Build Manually', async () => {
    await goToFormPhase();
    expect(screen.getByText('Description *')).toBeInTheDocument();
  });

  it('can fill in title and description in form mode', async () => {
    await goToFormPhase();

    const titleInput = screen.getByPlaceholderText('Senior Full Stack Developer');
    fireEvent.change(titleInput, { target: { value: 'Senior React Developer' } });
    expect(titleInput).toHaveValue('Senior React Developer');

    const descInput = screen.getByPlaceholderText(/Describe the role/);
    fireEvent.change(descInput, { target: { value: 'Build amazing products' } });
    expect(descInput).toHaveValue('Build amazing products');
  });

  it('validation prevents empty required fields on submit', async () => {
    await goToFormPhase();

    // Submit without filling required fields — click the submit button specifically
    const postJobButtons = screen.getAllByText('Post Job');
    const submitBtn = postJobButtons.find(el => el.tagName === 'BUTTON');
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(screen.getByText('Job title is required')).toBeInTheDocument();
    });
  });

  it('shows work mode selector options in form', async () => {
    await goToFormPhase();

    const pageText = document.body.textContent;
    expect(pageText).toContain('Remote');
    expect(pageText).toContain('Hybrid');
  });

  it('shows job type options in form', async () => {
    await goToFormPhase();

    const pageText = document.body.textContent;
    expect(
      pageText?.includes('full-time') || pageText?.includes('Full-time') ||
      pageText?.includes('Full Time')
    ).toBe(true);
  });

  it('AI paste mode shows textarea for JD input', async () => {
    render(<PostJobPage />);

    await waitFor(() => {
      expect(screen.getByText('Paste Existing JD')).toBeInTheDocument();
    });

    const h3 = screen.getByText('Paste Existing JD');
    const btn = h3.closest('button');
    fireEvent.click(btn || h3);

    await waitFor(() => {
      expect(screen.getByText('Paste Your Job Description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Paste your full job description/)).toBeInTheDocument();
    });
  });

  it('AI parse calls fetch with JD text', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        parsed: {
          title: 'Backend Engineer',
          description: 'Build APIs',
          requirements: ['3+ years Python'],
          skills_required: ['Python', 'Django'],
          work_mode: 'remote',
          job_type: 'full-time',
        },
      }),
    });

    render(<PostJobPage />);

    await waitFor(() => {
      expect(screen.getByText('Paste Existing JD')).toBeInTheDocument();
    });

    const h3 = screen.getByText('Paste Existing JD');
    fireEvent.click(h3.closest('button') || h3);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Paste your full job description/)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Paste your full job description/);
    fireEvent.change(textarea, { target: { value: 'We are looking for a Backend Engineer' } });

    fireEvent.click(screen.getByText('Extract with AI'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/parse-jd',
        expect.objectContaining({ method: 'POST' })
      );
    }, { timeout: 5000 });
  });

  it('redirects unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<PostJobPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth');
    });
  });

  it('submit creates job in database after filling required fields', async () => {
    await goToFormPhase();

    const titleInput = screen.getByPlaceholderText('Senior Full Stack Developer');
    fireEvent.change(titleInput, { target: { value: 'React Dev' } });

    const descInput = screen.getByPlaceholderText(/Describe the role/);
    fireEvent.change(descInput, { target: { value: 'Great job' } });

    const postJobButtons = screen.getAllByText('Post Job');
    const submitBtn = postJobButtons.find(el => el.tagName === 'BUTTON');
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'React Dev',
          description: 'Great job',
        })
      );
    });
  });
});

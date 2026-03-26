import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
let mockPathname = '/en/dashboard/candidate/onboarding';

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

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
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
  useAnimation: () => ({ start: jest.fn() }),
  useInView: () => true,
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('@/components/AvatarUpload', () => ({
  __esModule: true,
  default: ({ onUpload }: any) => (
    <button data-testid="avatar-upload" onClick={() => onUpload('https://photo.url/avatar.jpg')}>
      Upload Photo
    </button>
  ),
}));

import CandidateOnboarding from '@/app/[locale]/dashboard/candidate/onboarding/page';

/* ---- Tests ---- */

describe('Candidate Onboarding', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders first step (choose-path) with two options', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText("Let's Build Your Profile")).toBeInTheDocument();
    });

    expect(screen.getByText('Upload Your Resume')).toBeInTheDocument();
    expect(screen.getByText('Build From Scratch')).toBeInTheDocument();
  });

  it('can navigate to manual path (Build From Scratch)', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Build From Scratch')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Build From Scratch'));

    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  it('can fill in name and headline in manual mode', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Build From Scratch')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Build From Scratch'));

    await waitFor(() => {
      expect(screen.getByText('Full Name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Developer' } });
    expect(nameInput).toHaveValue('Jane Developer');

    const headlineInput = screen.getByPlaceholderText('Senior React Developer | 8 years experience');
    fireEvent.change(headlineInput, { target: { value: 'ML Engineer' } });
    expect(headlineInput).toHaveValue('ML Engineer');
  });

  it('can navigate to next step (Continue)', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Build From Scratch')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Build From Scratch'));

    await waitFor(() => {
      expect(screen.getByText('Continue')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Skills & Experience')).toBeInTheDocument();
    });
  });

  it('shows resume upload path with drag-and-drop area', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Upload Your Resume')).toBeInTheDocument();
    });

    // Click "Upload Your Resume" card
    await user.click(screen.getByText('Upload Your Resume'));

    await waitFor(() => {
      // Should show the upload step with file input
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
    });
  });

  it('shows file input for CV upload', async () => {
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(screen.getByText('Upload Your Resume')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Upload Your Resume'));

    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      expect(fileInput?.getAttribute('accept')).toContain('.pdf');
    });
  });

  it('redirects unauthenticated users', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<CandidateOnboarding />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('auth'));
    });
  });

  it('shows all onboarding steps in sequence (manual path)', async () => {
    render(<CandidateOnboarding />);

    // Step 1: Choose path
    await waitFor(() => {
      expect(screen.getByText("Let's Build Your Profile")).toBeInTheDocument();
    });

    // Navigate to manual-basic
    await user.click(screen.getByText('Build From Scratch'));
    await waitFor(() => {
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    // Navigate to manual-skills
    await user.click(screen.getByText('Continue'));
    await waitFor(() => {
      expect(screen.getByText('Skills & Experience')).toBeInTheDocument();
    });
  });
});

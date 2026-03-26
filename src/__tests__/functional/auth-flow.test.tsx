import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
const mockGet = jest.fn().mockReturnValue(null);

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      signInTitle: 'Sign In',
      signUpTitle: 'Sign Up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      selectRole: 'Select Role',
      candidateRole: 'Candidate',
      recruiterRole: 'Recruiter',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
    };
    return map[key] || key;
  },
}));

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      signOut: jest.fn(),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null }),
      resend: jest.fn().mockResolvedValue({ error: null }),
    },
    from: mockFrom,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = typeof tag === 'string' ? tag : 'div';
      return React.createElement(Tag, { ...props, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useAnimation: () => ({ start: jest.fn() }),
  useInView: () => true,
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

jest.mock('@/components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

import AuthPage from '@/app/[locale]/auth/page';

/* ---- Tests ---- */

describe('Auth Flow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(null);
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'candidate' } }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  it('renders sign-in form by default', () => {
    render(<AuthPage />);
    // h1 title says Sign In
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
  });

  it('can toggle to sign-up mode', async () => {
    render(<AuthPage />);
    // The toggle link button in the bottom section
    const toggleButtons = screen.getAllByText('Sign Up');
    // Click the toggle (not the submit button, which doesn't exist yet in signin mode)
    await user.click(toggleButtons[0]);
    expect(screen.getByText('Select Role')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
  });

  it('email and password inputs accept user input', async () => {
    render(<AuthPage />);
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = document.querySelector('input[type="password"]')!;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('sign-in form calls supabase.auth.signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    render(<AuthPage />);

    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(document.querySelector('input[type="password"]')!, 'password123');

    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('sign-up form calls supabase.auth.signUp with role metadata', async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'new-user' }, session: { access_token: 'tok' } },
      error: null,
    });

    render(<AuthPage />);
    // Switch to sign-up mode
    const toggleButtons = screen.getAllByText('Sign Up');
    await user.click(toggleButtons[0]);

    await user.type(screen.getByPlaceholderText('John Doe'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@test.com');

    const passwordInputs = document.querySelectorAll('input[type="password"]');
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'password123');

    // Submit button is type="submit"
    const submitButton = screen.getByRole('button', { name: 'Sign Up' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@test.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { role: 'candidate', full_name: 'Jane Doe' },
          }),
        })
      );
    });
  });

  it('role selector shows candidate/recruiter options', async () => {
    render(<AuthPage />);
    const toggleButtons = screen.getAllByText('Sign Up');
    await user.click(toggleButtons[0]);

    expect(screen.getByText('Candidate')).toBeInTheDocument();
    expect(screen.getByText('Recruiter')).toBeInTheDocument();
  });

  it('redirects after successful sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'recruiter' } }),
    });

    render(<AuthPage />);
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await user.type(document.querySelector('input[type="password"]')!, 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/recruiter');
    });
  });

  it('shows error message on failed sign-in', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(<AuthPage />);
    await user.type(screen.getByPlaceholderText('you@example.com'), 'wrong@test.com');
    await user.type(document.querySelector('input[type="password"]')!, 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('"Forgot Password?" link is accessible', () => {
    render(<AuthPage />);
    const forgotLink = screen.getByText('Forgot Password?');
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink.closest('a')).toHaveAttribute('href', '/auth/forgot-password');
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
let mockPathname = '/en/dashboard/candidate/profile';

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
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

const candidateData = {
  user_id: 'test-user-id',
  full_name: 'Jane Developer',
  headline: 'Senior React Developer',
  bio: 'Passionate about building great UIs',
  skills: ['React', 'TypeScript', 'Node.js'],
  country: 'us',
  city: 'San Francisco',
  remote_preference: 'remote',
  visa_status: 'citizen',
  salary_expectation_min: 120000,
  salary_expectation_max: 160000,
  is_public: true,
  photo_url: 'https://example.com/photo.jpg',
  cv_url: 'https://example.com/cv.pdf',
  cv_parsed_at: '2025-01-01T00:00:00Z',
  available_now: true,
  notice_period: '',
  available_from: '',
  open_to_relocation: false,
};

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: jest.fn().mockResolvedValue({}),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: candidateData }),
      update: mockUpdate,
    }),
  }),
}));

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag) => React.forwardRef(({ children, ...props }: any, ref: any) => {
      const Tag = typeof tag === 'string' ? tag : 'div';
      const { initial, animate, exit, transition, variants, custom, layout,
              whileHover, whileTap, whileFocus, whileDrag, whileInView,
              strokeDashoffset, strokeDasharray, ...rest } = props;
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

jest.mock('@/components/AvatarUpload', () => ({
  __esModule: true,
  default: ({ onUpload, currentUrl }: any) => (
    <div data-testid="avatar-upload">
      <span>{currentUrl ? 'Has Photo' : 'No Photo'}</span>
      <button onClick={() => onUpload('https://new-photo.url')}>Change Photo</button>
    </div>
  ),
}));

import EditProfilePage from '@/app/[locale]/dashboard/candidate/profile/page';

/* ---- Tests ---- */

describe('Candidate Profile', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: mockUser } });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders profile sections after loading', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Photo & Identity')).toBeInTheDocument();
    expect(screen.getByText('Resume / CV')).toBeInTheDocument();
    expect(screen.getByText('Skills & Expertise')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Location & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Compensation & Visibility')).toBeInTheDocument();
  });

  it('loads and displays candidate data in inputs', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Jane Developer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Senior React Developer')).toBeInTheDocument();
  });

  it('Available Now toggle displays correct state', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Available Now')).toBeInTheDocument();
    });

    // The badge should show "Available now" since data has available_now: true
    expect(screen.getByText('Available now')).toBeInTheDocument();
  });

  it('can add a new skill', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Skills & Expertise')).toBeInTheDocument();
    });

    // Existing skills should be visible (defaultOpen is true)
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // Type a new skill and click the Add button next to the skill input
    const skillInput = screen.getByPlaceholderText('Type a skill...');
    fireEvent.change(skillInput, { target: { value: 'GraphQL' } });

    // Find the Add button that is next to the skill input (not the quick-add buttons)
    const addButtons = screen.getAllByText('Add');
    // The skill Add button is the one in the same flex container as the input
    const skillAddButton = addButtons.find(btn =>
      btn.closest('.flex.gap-2')?.querySelector('input[placeholder="Type a skill..."]')
    );
    await user.click(skillAddButton!);

    expect(screen.getByText('GraphQL')).toBeInTheDocument();
  });

  it('can remove an existing skill', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    // Find the React skill pill and its remove button (the x)
    const reactSkill = screen.getByText('React');
    const removeButton = reactSkill.closest('span')?.querySelector('button');
    expect(removeButton).toBeTruthy();

    await user.click(removeButton!);

    // After removal, React should not be in the skills chips anymore
    // (it may still appear in quick-add suggestions, so check specifically for the pill)
    await waitFor(() => {
      const skillPills = document.querySelectorAll('span.px-3.py-1\\.5');
      const pillTexts = Array.from(skillPills).map(el => el.textContent?.replace('\u00d7', '').trim());
      expect(pillTexts).not.toContain('React');
    });
  });

  it('CV upload section shows Uploaded badge', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Resume / CV')).toBeInTheDocument();
    });

    // Since cvUrl is set, the badge should show "Uploaded"
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('CV section shows Current CV when expanded', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Resume / CV')).toBeInTheDocument();
    });

    // Click to expand the Resume / CV section (not defaultOpen)
    await user.click(screen.getByText('Resume / CV'));

    await waitFor(() => {
      expect(screen.getByText('Current CV')).toBeInTheDocument();
    });
  });

  it('profile completeness indicator shows correct percentage', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    // Completeness: fullName(10) + headline(12) + bio(10) + skills>0(10) + city(5)
    // + remotePreference!='any'(5) + visaStatus(5) + photoUrl(10) + cvUrl(10) + availableNow(5)
    // + salary(5) + isPublic(5) = 92
    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument();
    });
  });

  it('can expand/collapse sections (progressive disclosure)', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Location & Preferences')).toBeInTheDocument();
    });

    // Location & Preferences is not defaultOpen, so click to open
    await user.click(screen.getByText('Location & Preferences'));

    await waitFor(() => {
      expect(screen.getByText('Work Mode')).toBeInTheDocument();
    });
  });

  it('Save button submits updated data', async () => {
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Save Profile'));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('redirects unauthenticated users to auth page', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    render(<EditProfilePage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth');
    });
  });
});

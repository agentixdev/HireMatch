import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---- Mocks ---- */

const mockPush = jest.fn();
let mockPathname = '/en/dashboard/candidate';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { signOut: jest.fn().mockResolvedValue({}) },
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
}));

jest.mock('@iconify/react', () => ({
  Icon: ({ icon, ...props }: any) => <span data-testid={`icon-${icon}`} {...props} />,
}));

import DashboardLayout from '@/components/DashboardLayout';

/* ---- Tests ---- */

describe('Dashboard Navigation', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/en/dashboard/candidate';
  });

  it('renders sidebar with correct links for candidate role', () => {
    render(
      <DashboardLayout role="candidate" userName="John Doe">
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('My Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Applications').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Matchmaker').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('renders sidebar with correct links for recruiter role', () => {
    mockPathname = '/en/dashboard/recruiter';
    render(
      <DashboardLayout role="recruiter" userName="HR Manager">
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Post Job').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Applications').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Search').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Company').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Settings').length).toBeGreaterThanOrEqual(1);
  });

  it('shows user name in sidebar', () => {
    render(
      <DashboardLayout role="candidate" userName="John Doe">
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows "User" when no userName provided', () => {
    render(
      <DashboardLayout role="candidate">
        <div>Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('User')).toBeInTheDocument();
  });

  it('all nav links point to correct routes for candidate', () => {
    render(
      <DashboardLayout role="candidate" userName="Test">
        <div>Content</div>
      </DashboardLayout>
    );

    const expectedHrefs = [
      '/dashboard/candidate',
      '/dashboard/candidate/profile',
      '/dashboard/candidate/applications',
      '/matchmaker',
      '/dashboard/candidate/settings',
    ];

    const links = document.querySelectorAll('nav a');
    // Desktop sidebar + mobile bottom bar have links
    const hrefs = Array.from(links).map(a => a.getAttribute('href'));
    for (const expected of expectedHrefs) {
      expect(hrefs).toContain(expected);
    }
  });

  it('all nav links point to correct routes for recruiter', () => {
    mockPathname = '/en/dashboard/recruiter';
    render(
      <DashboardLayout role="recruiter" userName="Test">
        <div>Content</div>
      </DashboardLayout>
    );

    const expectedHrefs = [
      '/dashboard/recruiter',
      '/dashboard/recruiter/post-job',
      '/dashboard/recruiter/applications',
      '/dashboard/recruiter/search',
      '/dashboard/recruiter/profile',
      '/dashboard/recruiter/settings',
    ];

    const links = document.querySelectorAll('nav a');
    const hrefs = Array.from(links).map(a => a.getAttribute('href'));
    for (const expected of expectedHrefs) {
      expect(hrefs).toContain(expected);
    }
  });

  it('active link is highlighted for candidate dashboard', () => {
    mockPathname = '/en/dashboard/candidate';
    render(
      <DashboardLayout role="candidate" userName="Test">
        <div>Content</div>
      </DashboardLayout>
    );

    // The Dashboard link for candidate should have the active class
    const dashboardLink = document.querySelector('a[href="/dashboard/candidate"]');
    expect(dashboardLink).toBeTruthy();
    expect(dashboardLink!.className).toContain('text-blue-400');
  });

  it('collapse sidebar toggle works', async () => {
    render(
      <DashboardLayout role="candidate" userName="John Doe">
        <div>Content</div>
      </DashboardLayout>
    );

    // Initially sidebar should show labels
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Click the collapse button
    const collapseButton = screen.getByLabelText('Collapse sidebar');
    await user.click(collapseButton);

    // After collapse, the expand button should appear
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <DashboardLayout role="candidate" userName="Test">
        <div data-testid="child-content">My Content</div>
      </DashboardLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('My Content')).toBeInTheDocument();
  });
});

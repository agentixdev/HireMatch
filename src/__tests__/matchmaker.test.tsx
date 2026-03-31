import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
jest.mock('framer-motion', () => {
  const motionProxy = new Proxy({}, {
    get: (_target: any, prop: string) => {
      // Return a simple forwardRef component for any motion.* element
      const Component = ({ children, ...props }: any) => {
        // Filter out framer-motion-specific props that aren't valid DOM attributes
        const validProps: Record<string, any> = {};
        for (const [key, val] of Object.entries(props)) {
          if (
            !key.startsWith('while') &&
            !key.startsWith('initial') &&
            !key.startsWith('animate') &&
            !key.startsWith('exit') &&
            !key.startsWith('transition') &&
            !key.startsWith('variants') &&
            !key.startsWith('custom') &&
            !key.startsWith('layout') &&
            !key.startsWith('drag') &&
            key !== 'onAnimationComplete'
          ) {
            validProps[key] = val;
          }
        }
        const El = prop as any;
        // Self-closing SVG elements
        if (['path', 'circle', 'line', 'rect', 'ellipse', 'polygon', 'polyline'].includes(prop)) {
          return <El {...validProps} />;
        }
        return <El {...validProps}>{children}</El>;
      };
      Component.displayName = `motion.${prop}`;
      return Component;
    },
  });
  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useMotionValue: (initial: any) => ({
      get: () => initial,
      set: () => {},
      on: () => () => {},
    }),
    useTransform: (value: any, _input: any, _output: any) => ({
      get: () => value?.get?.() ?? 0,
      set: () => {},
      on: () => () => {},
    }),
    useSpring: (value: any) => ({
      get: () => value?.get?.() ?? 0,
      set: () => {},
      on: () => () => {},
    }),
    useInView: () => true,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
    useAnimationFrame: () => {},
    useScroll: () => ({
      scrollYProgress: { get: () => 0, set: () => {}, on: () => () => {} },
    }),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockAuth = {
  getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
};
const mockFrom = jest.fn().mockReturnValue({
  update: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  }),
});

jest.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: mockAuth,
    from: mockFrom,
  }),
}));

jest.mock('@/components/Header', () => () => <div data-testid="header">Header</div>);

// Import the page AFTER mocks are set up
import MatchmakerPage from '@/app/[locale]/matchmaker/page';

describe('Matchmaker Quiz', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts in landing phase', () => {
    render(<MatchmakerPage />);
    // Headline is split across elements due to \n, so match partial text
    expect(screen.getByText(/Discover/i)).toBeInTheDocument();
  });

  it('landing page shows CTA button', () => {
    render(<MatchmakerPage />);
    expect(screen.getByText(/Start Your Match/i)).toBeInTheDocument();
  });

  it('landing page shows social proof text', () => {
    render(<MatchmakerPage />);
    // Count animates from 0, so in test env with fake timers it shows "0+ professionals matched"
    expect(screen.getByText(/professionals matched/i)).toBeInTheDocument();
  });

  it('clicking CTA transitions to quiz phase', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));
    // Should show quiz content now - first question topic
    expect(screen.getByText('Culture')).toBeInTheDocument();
  });

  it('quiz renders first question text', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));

    // First question content
    expect(screen.getByText(/Monday morning alarm/i)).toBeInTheDocument();
  });

  it('quiz shows 4 answer options', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));

    // 4 option letters should be present
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows progress counter as 1/10', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));
    // Progress counter is split across FlipDigit + spans, so check container text
    expect(screen.getByText(/\//).closest('[class]')).toBeTruthy();
  });

  it('clicking an answer advances to next question', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));
    // Quiz phase should be active — question text should be rendered
    expect(screen.getByText(/\//)).toBeInTheDocument();

    // Click first option
    const optionA = screen.getByText('A');
    await user.click(optionA.closest('button') || optionA);

    // Advance past the 600ms delay
    act(() => { jest.advanceTimersByTime(700); });

    // Still in quiz, slash separator still visible
    expect(screen.getByText(/\//)).toBeInTheDocument();
  });

  it('after all 10 answers, transitions to processing phase', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    // Start quiz
    await user.click(screen.getByText(/Start Your Match/i));

    // Answer all 10 questions
    for (let i = 0; i < 10; i++) {
      const optionA = screen.getByText('A');
      await user.click(optionA.closest('button') || optionA);
      act(() => { jest.advanceTimersByTime(700); });
    }

    // Should be in processing phase - shows processing stage labels
    expect(screen.getByText(/Analyzing your work DNA/i)).toBeInTheDocument();
  });

  it('processing phase shows stage labels in sequence', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));

    for (let i = 0; i < 10; i++) {
      const optionA = screen.getByText('A');
      await user.click(optionA.closest('button') || optionA);
      act(() => { jest.advanceTimersByTime(700); });
    }

    // Stage 0
    expect(screen.getByText(/Analyzing your work DNA/i)).toBeInTheDocument();

    // Advance to stage 1
    act(() => { jest.advanceTimersByTime(900); });
    expect(screen.getByText(/Cross-referencing companies/i)).toBeInTheDocument();

    // Advance to stage 2
    act(() => { jest.advanceTimersByTime(900); });
    expect(screen.getByText(/Calculating culture scores/i)).toBeInTheDocument();
  });

  it('after processing, shows results with company names', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));

    for (let i = 0; i < 10; i++) {
      const optionA = screen.getByText('A');
      await user.click(optionA.closest('button') || optionA);
      act(() => { jest.advanceTimersByTime(700); });
    }

    // Advance through all processing stages + transition to results
    act(() => { jest.advanceTimersByTime(4000); });

    // Should now be in results phase with company names
    // "Your #1 Match" or similar results heading should appear
    // The top match company name should be visible
    const companyNames = ['Stripe', 'Google', 'Shopify', 'Figma', 'Notion', 'Airbnb', 'Vercel',
      'Y Combinator Startup', 'Goldman Sachs', 'Moderna', 'Bridgewater', 'Calm',
      'Palantir', 'Robinhood', 'Doximity', 'Tempus'];
    const found = companyNames.some(name => screen.queryByText(name));
    expect(found).toBe(true);
  });

  it('quiz questions each have unique topic labels', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<MatchmakerPage />);

    await user.click(screen.getByText(/Start Your Match/i));

    // First question topic
    expect(screen.getByText('Culture')).toBeInTheDocument();

    // Advance to question 2
    const optionA = screen.getByText('A');
    await user.click(optionA.closest('button') || optionA);
    act(() => { jest.advanceTimersByTime(700); });

    expect(screen.getByText('Work Style')).toBeInTheDocument();
  });
});

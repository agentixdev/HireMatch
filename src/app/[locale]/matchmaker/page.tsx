'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';

// ── Types ──────────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  q: string;
  icon: string;
  topic: string;
  color: string;
  colorHex: string;
  opts: string[];
  tagWeights: Record<string, number>[];
}

interface CompanyMatch {
  name: string;
  industry: string;
  logo: string;
  brandColor: string;
  score: number;
  cultureTags: string[];
  whyMatch: string[];
}

// ── Company Database ───────────────────────────────────────────

const COMPANIES: {
  name: string;
  industry: string;
  industryGroup: string;
  logo: string;
  brandColor: string;
  cultureTags: string[];
  weights: Record<string, number>;
}[] = [
  {
    name: 'Stripe',
    industry: 'Fintech',
    industryGroup: 'Finance & Fintech',
    logo: '/companies/stripe.svg',
    brandColor: '#635BFF',
    cultureTags: ['Meritocracy', 'Writing culture', 'Deep work'],
    weights: { impact: 3, solo: 2, quality: 3, equity: 2, ic: 3, flow: 2, data: 2, direct: 2 },
  },
  {
    name: 'Google',
    industry: 'Big Tech',
    industryGroup: 'Technology Companies',
    logo: '/companies/google.svg',
    brandColor: '#4285F4',
    cultureTags: ['20% time', 'Data-driven', 'Scale thinking'],
    weights: { impact: 3, team: 2, salary: 2, data: 3, campus: 3, coaching: 2, balance: 1 },
  },
  {
    name: 'Shopify',
    industry: 'E-Commerce Tech',
    industryGroup: 'Technology Companies',
    logo: '/companies/shopify.svg',
    brandColor: '#96BF48',
    cultureTags: ['Remote-first', 'Entrepreneurial', 'Ship fast'],
    weights: { autonomy: 3, remote: 3, ship: 2, equity: 2, founded: 2, challenge: 2 },
  },
  {
    name: 'Goldman Sachs',
    industry: 'Investment Banking',
    industryGroup: 'Finance & Fintech',
    logo: '/companies/gs.svg',
    brandColor: '#7399C6',
    cultureTags: ['High performance', 'Prestige', 'Structured growth'],
    weights: { salary: 3, office: 3, pressure: 3, lead: 2, dept: 2, deal: 3 },
  },
  {
    name: 'Figma',
    industry: 'Design Tech',
    industryGroup: 'Technology Companies',
    logo: '/companies/figma.svg',
    brandColor: '#A259FF',
    cultureTags: ['Design-first', 'Collaborative', 'Playful'],
    weights: { team: 3, cowork: 2, creative: 2, mentor: 2, equal: 2, ship: 2, balance: 1 },
  },
  {
    name: 'Moderna',
    industry: 'Biotech',
    industryGroup: 'Healthcare & Biotech',
    logo: '/companies/moderna.svg',
    brandColor: '#00A1DF',
    cultureTags: ['Mission-driven', 'Science-first', 'Bold bets'],
    weights: { impact: 3, mission: 3, solve: 3, quality: 2, campus: 1, data: 2 },
  },
  {
    name: 'Notion',
    industry: 'Productivity SaaS',
    industryGroup: 'Technology Companies',
    logo: '/companies/notion.svg',
    brandColor: '#000000',
    cultureTags: ['Craft obsessed', 'Small teams', 'Remote-friendly'],
    weights: { solo: 2, remote: 2, quality: 3, ship: 2, ic: 2, creative: 2, flow: 2 },
  },
  {
    name: 'Bridgewater',
    industry: 'Hedge Fund',
    industryGroup: 'Finance & Fintech',
    logo: '/companies/bridgewater.svg',
    brandColor: '#1B3A5C',
    cultureTags: ['Radical transparency', 'Idea meritocracy', 'Intense feedback'],
    weights: { direct: 3, data: 3, challenge: 3, pressure: 2, salary: 2, office: 2 },
  },
  {
    name: 'Airbnb',
    industry: 'Travel Tech',
    industryGroup: 'Technology Companies',
    logo: '/companies/airbnb.svg',
    brandColor: '#FF5A5F',
    cultureTags: ['Belong anywhere', 'Design thinking', 'Remote-first'],
    weights: { remote: 3, creative: 2, mission: 2, balance: 2, team: 2, ship: 1 },
  },
  {
    name: 'Tempus',
    industry: 'Health Tech',
    industryGroup: 'Healthcare & Biotech',
    logo: '/companies/tempus.svg',
    brandColor: '#00B4D8',
    cultureTags: ['AI + Healthcare', 'Data-obsessed', 'Fast growth'],
    weights: { impact: 3, data: 3, solve: 2, pressure: 1, equity: 2, mission: 2 },
  },
  {
    name: 'Y Combinator Startup',
    industry: 'Early-Stage Startup',
    industryGroup: 'Startups',
    logo: '/companies/yc.svg',
    brandColor: '#FF6600',
    cultureTags: ['Move fast', 'Wear all hats', 'Equity-heavy'],
    weights: { equity: 3, founded: 3, autonomy: 3, ship: 3, pressure: 2, solo: 2 },
  },
  {
    name: 'Calm',
    industry: 'Wellness Tech',
    industryGroup: 'Startups',
    logo: '/companies/calm.svg',
    brandColor: '#4A90D9',
    cultureTags: ['Wellbeing-first', 'Sustainable pace', 'Mission-driven'],
    weights: { balance: 3, mission: 3, remote: 2, team: 2, mentor: 1, creative: 1 },
  },
  {
    name: 'Palantir',
    industry: 'Data Analytics',
    industryGroup: 'Technology Companies',
    logo: '/companies/palantir.svg',
    brandColor: '#101010',
    cultureTags: ['Mission critical', 'Elite engineering', 'High intensity'],
    weights: { solve: 3, pressure: 3, impact: 3, data: 3, direct: 2, office: 2 },
  },
  {
    name: 'Robinhood',
    industry: 'Fintech',
    industryGroup: 'Finance & Fintech',
    logo: '/companies/robinhood.svg',
    brandColor: '#00C805',
    cultureTags: ['Democratize finance', 'Move fast', 'Young culture'],
    weights: { mission: 2, ship: 3, equity: 2, team: 2, cowork: 1, pressure: 2 },
  },
  {
    name: 'Doximity',
    industry: 'Healthcare Platform',
    industryGroup: 'Healthcare & Biotech',
    logo: '/companies/doximity.svg',
    brandColor: '#0077B5',
    cultureTags: ['Doctor-focused', 'Remote-first', 'Profitable growth'],
    weights: { remote: 3, impact: 2, balance: 2, data: 2, quality: 2, salary: 2 },
  },
  {
    name: 'Vercel',
    industry: 'Developer Tools',
    industryGroup: 'Startups',
    logo: '/companies/vercel.svg',
    brandColor: '#000000',
    cultureTags: ['Developer-first', 'Ship weekly', 'Remote global'],
    weights: { ship: 3, remote: 3, autonomy: 2, ic: 2, solve: 2, creative: 1 },
  },
];

// ── Questions ──────────────────────────────────────────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    q: 'Your Monday morning alarm\ngoes off. What gets you\nout of bed?',
    icon: '🌅',
    topic: 'Culture',
    color: 'from-purple-500/20 to-purple-600/10',
    colorHex: '#a855f7',
    opts: [
      'The passion for what I\'m building',
      'Honestly? The paycheck',
      'My team is counting on me',
      'Knowing my work makes a real difference',
    ],
    tagWeights: [
      { creative: 3, ship: 2, autonomy: 2, founded: 1 },
      { salary: 3, office: 2, pressure: 1 },
      { team: 3, mentor: 2, cowork: 1 },
      { impact: 3, mission: 3, solve: 1 },
    ],
  },
  {
    id: 2,
    q: 'A critical project deadline\nis tomorrow. What\'s your move?',
    icon: '🔥',
    topic: 'Work Style',
    color: 'from-red-500/20 to-red-600/10',
    colorHex: '#ef4444',
    opts: [
      'Solo sprint \u2014 headphones on, world off',
      'Rally the team for a war room session',
      'Negotiate an extension \u2014 quality matters',
      'Already done. I finished it early.',
    ],
    tagWeights: [
      { solo: 3, flow: 2, autonomy: 2, ic: 1 },
      { team: 3, cowork: 2, pressure: 1 },
      { quality: 3, balance: 2, data: 1 },
      { ship: 3, pressure: 2, autonomy: 1 },
    ],
  },
  {
    id: 3,
    q: 'Your dream office\nlooks like...',
    icon: '🏢',
    topic: 'Environment',
    color: 'from-emerald-500/20 to-emerald-600/10',
    colorHex: '#10b981',
    opts: [
      'Silicon Valley campus with free everything',
      'My cozy home office, pants optional',
      'A bustling co-working space full of energy',
      'Corner office, 40th floor, city view',
    ],
    tagWeights: [
      { campus: 3, team: 2, salary: 1 },
      { remote: 3, balance: 2, autonomy: 2 },
      { cowork: 3, creative: 2, team: 1 },
      { office: 3, salary: 2, lead: 2, dept: 1 },
    ],
  },
  {
    id: 4,
    q: 'Which achievement would\nmake you proudest?',
    icon: '🏆',
    topic: 'Values',
    color: 'from-amber-500/20 to-amber-600/10',
    colorHex: '#f59e0b',
    opts: [
      'Shipped a product used by millions',
      'Mentored a junior dev to their first promotion',
      'Closed the biggest deal in company history',
      'Solved a technical problem nobody else could',
    ],
    tagWeights: [
      { ship: 3, impact: 3, creative: 1 },
      { mentor: 3, team: 2, coaching: 2 },
      { deal: 3, salary: 2, pressure: 1 },
      { solve: 3, ic: 3, data: 2 },
    ],
  },
  {
    id: 5,
    q: 'Your ideal manager is\nsomeone who...',
    icon: '👤',
    topic: 'Leadership',
    color: 'from-blue-500/20 to-blue-600/10',
    colorHex: '#3b82f6',
    opts: [
      'Sets the vision and disappears',
      'Coaches me weekly with honest feedback',
      'Collaborates as an equal \u2014 no hierarchy',
      'Challenges me constantly to level up',
    ],
    tagWeights: [
      { autonomy: 3, remote: 2, ic: 1 },
      { coaching: 3, mentor: 2, quality: 1 },
      { equal: 3, team: 2, creative: 1 },
      { challenge: 3, pressure: 2, data: 1 },
    ],
  },
  {
    id: 6,
    q: "It's Friday 4pm.\nWhat are you doing?",
    icon: '🎉',
    topic: 'Balance',
    color: 'from-pink-500/20 to-pink-600/10',
    colorHex: '#ec4899',
    opts: [
      'Wrapping up and heading out \u2014 life awaits',
      'Deep in flow state, can\'t stop now',
      'Team happy hour, building relationships',
      'Planning next week \u2014 staying ahead',
    ],
    tagWeights: [
      { balance: 3, remote: 2 },
      { flow: 3, solo: 2, ic: 2, ship: 1 },
      { team: 3, cowork: 2, creative: 1 },
      { pressure: 2, lead: 2, ship: 2, data: 1 },
    ],
  },
  {
    id: 7,
    q: 'A colleague takes credit\nfor your idea. You...',
    icon: '😤',
    topic: 'Conflict',
    color: 'from-orange-500/20 to-orange-600/10',
    colorHex: '#f97316',
    opts: [
      'Confront them directly \u2014 clear the air',
      'Let it go this time \u2014 pick your battles',
      'Escalate to your manager with evidence',
      'Prove your contribution publicly next time',
    ],
    tagWeights: [
      { direct: 3, pressure: 1, challenge: 1 },
      { balance: 2, team: 2, mentor: 1 },
      { data: 2, coaching: 2, office: 1 },
      { autonomy: 2, ship: 2, impact: 2, creative: 1 },
    ],
  },
  {
    id: 8,
    q: 'Which company culture headline\nexcites you most?',
    icon: '📰',
    topic: 'Culture Fit',
    color: 'from-cyan-500/20 to-cyan-600/10',
    colorHex: '#06b6d4',
    opts: [
      '"We ship fast and break things"',
      '"Our people come first \u2014 always"',
      '"Data drives every decision we make"',
      '"Making the world better, one product at a time"',
    ],
    tagWeights: [
      { ship: 3, pressure: 2, autonomy: 1 },
      { team: 3, balance: 2, mentor: 2 },
      { data: 3, quality: 2, solve: 1 },
      { mission: 3, impact: 3, creative: 1 },
    ],
  },
  {
    id: 9,
    q: 'Your salary vs equity\npreference is...',
    icon: '💰',
    topic: 'Compensation',
    color: 'from-green-500/20 to-green-600/10',
    colorHex: '#22c55e',
    opts: [
      'Max salary \u2014 I like certainty',
      'Balanced \u2014 fair base with solid equity',
      'Heavy equity \u2014 I bet on the upside',
      'Doesn\'t matter if the mission is right',
    ],
    tagWeights: [
      { salary: 3, office: 1 },
      { salary: 1, equity: 2, balance: 1 },
      { equity: 3, founded: 2, autonomy: 1 },
      { mission: 3, impact: 2 },
    ],
  },
  {
    id: 10,
    q: 'Where do you see yourself\nin 3 years?',
    icon: '🔮',
    topic: 'Ambition',
    color: 'from-indigo-500/20 to-indigo-600/10',
    colorHex: '#6366f1',
    opts: [
      'Leading a team of 10+',
      'The deepest individual contributor on the team',
      'Running my own startup',
      'Running a department or division',
    ],
    tagWeights: [
      { lead: 3, team: 2, coaching: 1 },
      { ic: 3, solve: 2, flow: 2, quality: 1 },
      { founded: 3, equity: 2, autonomy: 2, ship: 1 },
      { dept: 3, lead: 2, salary: 2, office: 1 },
    ],
  },
];

// ── Scoring Engine ─────────────────────────────────────────────

function calculateMatches(answers: number[]): CompanyMatch[] {
  const userProfile: Record<string, number> = {};

  answers.forEach((optIdx, qIdx) => {
    const question = QUIZ_QUESTIONS[qIdx];
    if (!question) return;
    const weights = question.tagWeights[optIdx];
    if (!weights) return;
    Object.entries(weights).forEach(([tag, weight]) => {
      userProfile[tag] = (userProfile[tag] || 0) + weight;
    });
  });

  const maxUserScore = Math.max(...Object.values(userProfile), 1);

  return COMPANIES.map((company) => {
    let matchScore = 0;
    let maxPossible = 0;

    Object.entries(company.weights).forEach(([tag, companyWeight]) => {
      const userWeight = userProfile[tag] || 0;
      matchScore += Math.min(userWeight, companyWeight) * companyWeight;
      maxPossible += companyWeight * companyWeight;
    });

    // Bonus for shared strong traits
    Object.entries(userProfile).forEach(([tag, userWeight]) => {
      const companyWeight = company.weights[tag] || 0;
      if (userWeight >= 4 && companyWeight >= 2) {
        matchScore += 2;
      }
    });

    const rawScore = maxPossible > 0 ? (matchScore / maxPossible) * 100 : 0;
    // Normalize to 55-98 range for realistic feel
    const normalizedScore = Math.round(55 + (rawScore / 100) * 43);
    const clampedScore = Math.min(98, Math.max(55, normalizedScore));

    // Generate "why you match" reasons
    const whyMatch: string[] = [];
    const sharedTags = Object.entries(company.weights)
      .filter(([tag]) => (userProfile[tag] || 0) >= 2)
      .sort(([, a], [, b]) => b - a);

    const tagLabels: Record<string, string> = {
      impact: 'You both value making real impact',
      team: 'Strong alignment on collaborative work',
      remote: 'You thrive in their remote-first setup',
      ship: 'Your "ship fast" mentality fits perfectly',
      mission: 'Shared passion for meaningful mission',
      data: 'Your data-driven approach matches theirs',
      autonomy: 'They trust people to own their work \u2014 like you',
      solve: 'You\'re both obsessed with hard problems',
      balance: 'Work-life harmony is a shared priority',
      quality: 'You share their craft-over-speed philosophy',
      salary: 'Compensation philosophy aligns',
      creative: 'Creative, experimental culture matches you',
      mentor: 'Their coaching culture fits your style',
      pressure: 'You both thrive under high intensity',
      equity: 'Equity-first mindset is mutual',
      founded: 'Your entrepreneurial DNA matches',
      ic: 'Deep IC track fits your ambitions',
      lead: 'Leadership development is a shared focus',
      flow: 'They protect deep work time \u2014 your sweet spot',
    };

    sharedTags.slice(0, 4).forEach(([tag]) => {
      if (tagLabels[tag]) whyMatch.push(tagLabels[tag]);
    });

    if (whyMatch.length < 2) {
      whyMatch.push(`Your work style aligns with ${company.name}'s culture`);
    }

    return {
      name: company.name,
      industry: company.industry,
      logo: company.logo,
      brandColor: company.brandColor,
      score: clampedScore,
      cultureTags: company.cultureTags,
      whyMatch,
    };
  }).sort((a, b) => b.score - a.score);
}

// ── Fake competitor data generator ─────────────────────────────

function generateCompetitors(topScore: number) {
  const names = ['Alex M.', 'Jordan K.', 'Taylor R.', 'Sam P.', 'Casey L.'];
  const scores = names.map((name, i) => ({
    name,
    score: Math.max(45, topScore - 3 - Math.floor(Math.random() * 25) - i * 4),
    avatar: `hsl(${(i * 72 + 200) % 360}, 60%, 50%)`,
  }));
  return scores.sort((a, b) => b.score - a.score);
}

// ── Component ──────────────────────────────────────────────────

export default function MatchmakerPage() {
  const router = useRouter();
  const supabase = createClient();

  // Phases: 'landing' | 'quiz' | 'processing' | 'results'
  const [phase, setPhase] = useState<'landing' | 'quiz' | 'processing' | 'results'>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [direction, setDirection] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsAuthenticated(true);
    });
  }, []);

  const results = useMemo(() => {
    if (answers.length < QUIZ_QUESTIONS.length) return null;
    return calculateMatches(answers);
  }, [answers]);

  const competitors = useMemo(() => {
    if (!results) return [];
    return generateCompetitors(results[0]?.score || 75);
  }, [results]);

  const userRank = useMemo(() => {
    if (!results || !competitors.length) return 1;
    const topScore = results[0]?.score || 75;
    const higher = competitors.filter((c) => c.score > topScore).length;
    return higher + 1;
  }, [results, competitors]);

  // ── Processing phase animation ──────────────────────────────

  const PROCESSING_STAGES = [
    { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'Analyzing your work DNA...' },
    { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Cross-referencing companies...' },
    { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Calculating culture scores...' },
    { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'Revealing your matches...' },
  ];

  useEffect(() => {
    if (phase !== 'processing' || !results) return;
    // Use ref to avoid synchronous setState in effect body
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setProcessingStage(0), 0));
    timers.push(setTimeout(() => setProcessingStage(1), 800));
    timers.push(setTimeout(() => setProcessingStage(2), 1700));
    timers.push(setTimeout(() => setProcessingStage(3), 2600));
    timers.push(
      setTimeout(() => {
        setPhase('results');
        // Count up score
        const target = results[0]?.score || 0;
        const dur = 1500;
        const start = performance.now();
        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / dur, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayScore(Math.round(target * eased));
          if (progress < 1) requestAnimationFrame(tick);
          else {
            // Confetti burst for high scores
            if (target >= 75) setShowConfetti(true);
          }
        }
        requestAnimationFrame(tick);
      }, 3500)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, results]);

  // Save results to Supabase for authenticated users
  useEffect(() => {
    if (phase !== 'results' || !isAuthenticated || !results) return;

    async function saveResults() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const topTags = Object.entries(
          answers.reduce<Record<string, number>>((acc, optIdx, qIdx) => {
            const q = QUIZ_QUESTIONS[qIdx];
            if (!q) return acc;
            const weights = q.tagWeights[optIdx];
            if (!weights) return acc;
            Object.entries(weights).forEach(([tag, w]) => {
              acc[tag] = (acc[tag] || 0) + w;
            });
            return acc;
          }, {})
        )
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([tag]) => tag);

        await supabase
          .from('candidates')
          .update({
            quiz_answers: Object.fromEntries(answers.map((a, i) => [i, a])),
            match_tags: topTags,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        setSavedToProfile(true);
        setTimeout(() => setSavedToProfile(false), 4000);
      } catch (err) {
        console.error('Failed to save quiz results:', err);
      }
    }

    saveResults();
  }, [phase]);

  // ── Handlers ────────────────────────────────────────────────

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      if (selectedOption !== null) return;
      setSelectedOption(optionIndex);
      setTimeout(() => {
        setDirection(1);
        setAnswers((prev) => [...prev, optionIndex]);
        if (step < QUIZ_QUESTIONS.length - 1) {
          setStep((s) => s + 1);
        } else {
          setPhase('processing');
        }
        setSelectedOption(null);
      }, 600);
    },
    [selectedOption, step]
  );

  const handleBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setAnswers((prev) => prev.slice(0, -1));
      setStep((s) => s - 1);
    }
  }, [step]);

  const handleRetake = useCallback(() => {
    setPhase('quiz');
    setStep(0);
    setAnswers([]);
    setDirection(1);
    setSelectedOption(null);
    setProcessingStage(0);
    setDisplayScore(0);
    setShowAllMatches(false);
    setShowConfetti(false);
    setShowShareModal(false);
    setShareCopied(false);
  }, []);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  // ================================================================
  // LANDING PHASE
  // ================================================================

  if (phase === 'landing') {
    return (
      <>
        <Header />
        <main className="flex-1 bg-transparent relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[120px]"
              animate={{
                background: [
                  'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
              animate={{
                background: [
                  'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
                ],
                scale: [1, 1.15, 1],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/20"
                style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.1, 0.4, 0.1],
                }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
              />
            ))}
          </div>

          <div className="relative max-w-3xl mx-auto px-4 pt-16 pb-20 text-center">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-[48px] sm:text-[64px] md:text-[72px] tracking-[2px] leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6"
              style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '2px' }}
            >
              Discover Where You{'\n'}Truly Belong
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="text-[16px] sm:text-[18px] text-white/50 max-w-[520px] mx-auto leading-relaxed mb-3"
            >
              In 2 minutes, our AI will analyze your work DNA and match you with
              companies that share your values, pace, and vision.
            </motion.p>

            {/* Social proof */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[13px] text-white/30 mb-10"
            >
              47,000+ professionals matched
            </motion.p>

            {/* CTA Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setPhase('quiz');
                setStep(0);
              }}
              className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-[16px] rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] cursor-pointer"
            >
              Start Your Match
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </motion.button>

            {/* Preview Cards */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
                  title: 'Your Work DNA',
                  desc: 'Discover your unique work style, values, and culture preferences',
                  color: '#6366f1',
                },
                {
                  icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                  title: 'Top Company Matches',
                  desc: 'AI-ranked companies that fit your personality and ambitions',
                  color: '#a855f7',
                },
                {
                  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                  title: 'Your Competition',
                  desc: 'See how you stack up against other candidates in real time',
                  color: '#ec4899',
                },
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.12, duration: 0.5 }}
                  className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 text-left"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: card.color + '18' }}
                  >
                    <svg
                      className="w-5 h-5"
                      style={{ color: card.color }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
                    </svg>
                  </div>
                  <h3 className="text-[14px] font-bold text-white mb-1">{card.title}</h3>
                  <p className="text-[12px] text-white/40 leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  // ================================================================
  // QUIZ PHASE
  // ================================================================

  if (phase === 'quiz') {
    const question = QUIZ_QUESTIONS[step];

    return (
      <>
        <Header />
        <div className="relative min-h-screen overflow-hidden">
          {/* Temperature ambient background */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              key={`glow-${step}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[120px]"
              style={{ backgroundColor: question.colorHex + '12' }}
            />
            <motion.div
              className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
              style={{ backgroundColor: question.colorHex + '08' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Progress heat line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: step / QUIZ_QUESTIONS.length }}
              style={{
                background: `linear-gradient(90deg, ${question.colorHex}00, ${question.colorHex}40, ${question.colorHex}00)`,
              }}
            />
          </div>

          <div className="relative px-4 pt-4 pb-20 max-w-2xl mx-auto">
            {/* ── Segmented Progress Bar ── */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-white/25 tabular-nums">
                  {step + 1} / {QUIZ_QUESTIONS.length}
                </span>
              </div>
              <div className="flex gap-1.5 relative">
                {QUIZ_QUESTIONS.map((q, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                    {i <= step && (
                      <div
                        className="h-full rounded-full relative overflow-hidden"
                        style={{
                          backgroundColor: i < step ? q.colorHex : question.colorHex,
                          width: '100%',
                          animation:
                            i === step ? 'barGrow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                        }}
                      >
                        {i === step && (
                          <div
                            className="absolute inset-0"
                            style={{
                              background:
                                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                              backgroundSize: '200% 100%',
                              animation: 'shimmerSlide 1.2s linear infinite',
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Quiz Card ── */}
            <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 sm:p-8 md:p-10">
              <div className="relative overflow-hidden" style={{ minHeight: 420 }}>
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                    className="w-full"
                  >
                    {/* Topic label */}
                    <div className="mt-4">
                      <span
                        className="text-[11px] font-black uppercase tracking-[3px]"
                        style={{ color: question.colorHex }}
                      >
                        {question.topic}
                      </span>
                    </div>

                    {/* Question */}
                    <div className="mb-6 sm:mb-8 mt-4">
                      <h2 className="text-2xl sm:text-3xl font-bold text-white leading-[1.15] whitespace-pre-line">
                        {question.q}
                      </h2>
                    </div>

                    {/* Options - CNN-style */}
                    <div className="space-y-3">
                      {question.opts.map((opt, i) => {
                        const isSelected = selectedOption === i;
                        const isDimmed = selectedOption !== null && selectedOption !== i;

                        return (
                          <motion.button
                            key={i}
                            onClick={() => handleAnswer(i)}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.06 }}
                            whileHover={selectedOption === null ? { x: 4 } : {}}
                            whileTap={selectedOption === null ? { scale: 0.98 } : {}}
                            disabled={selectedOption !== null}
                            className="w-full text-left flex items-center gap-0 rounded-xl overflow-hidden cursor-pointer disabled:cursor-default group relative"
                            style={{
                              opacity: isDimmed ? 0.15 : 1,
                              transform: `scale(${isSelected ? 1.02 : isDimmed ? 0.98 : 1})`,
                              transition:
                                'opacity 0.25s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            }}
                          >
                            {/* Left accent bar */}
                            <div
                              className="self-stretch rounded-l flex-shrink-0"
                              style={{
                                backgroundColor: question.colorHex,
                                width: isSelected ? 6 : 4,
                                opacity: isSelected ? 1 : 0.4,
                                transition: 'width 0.2s, opacity 0.2s',
                              }}
                            />

                            {/* Fill bar animation */}
                            {isSelected && (
                              <motion.div
                                className="absolute inset-0 rounded-r"
                                style={{ backgroundColor: question.colorHex + '18' }}
                                initial={{ scaleX: 0, transformOrigin: 'left' }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}

                            {/* Pulse ring burst */}
                            {isSelected && (
                              <motion.div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                initial={{ boxShadow: `0 0 0 0px ${question.colorHex}50` }}
                                animate={{ boxShadow: '0 0 0 16px transparent' }}
                                transition={{ duration: 0.5 }}
                                aria-hidden="true"
                              />
                            )}

                            {/* Content */}
                            <div
                              className={`relative flex items-center gap-3 w-full py-4 px-5 sm:px-6 transition-colors ${
                                isSelected ? '' : 'group-hover:bg-white/[0.04]'
                              }`}
                            >
                              {/* Letter badge */}
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
                                style={{
                                  backgroundColor: isSelected
                                    ? question.colorHex
                                    : 'rgba(255,255,255,0.06)',
                                  color: isSelected ? '#000' : 'rgba(255,255,255,0.35)',
                                  borderWidth: 1,
                                  borderColor: isSelected
                                    ? question.colorHex
                                    : 'rgba(255,255,255,0.08)',
                                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                }}
                              >
                                {isSelected ? (
                                  <svg
                                    className="w-4 h-4"
                                    aria-hidden="true"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  optionLetters[i]
                                )}
                              </div>

                              {/* Option text */}
                              <span
                                className={`text-[14px] sm:text-[16px] font-semibold transition-colors ${
                                  isSelected ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                                }`}
                              >
                                {opt}
                              </span>

                              {/* Selection success dot */}
                              {isSelected && (
                                <motion.div
                                  className="ml-auto flex-shrink-0"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                                >
                                  <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${question.colorHex}30` }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: question.colorHex }}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Back button */}
                    {step > 0 && selectedOption === null && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        onClick={handleBack}
                        className="mt-6 text-[11px] text-white/25 hover:text-white/50 transition-colors cursor-pointer flex items-center gap-1.5 uppercase tracking-[2px] font-bold"
                      >
                        <svg
                          className="h-3 w-3"
                          aria-hidden="true"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        Back
                      </motion.button>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Keyframe animations */}
          <style jsx global>{`
            @keyframes barGrow {
              0% { transform: scaleX(0); transform-origin: left; }
              100% { transform: scaleX(1); transform-origin: left; }
            }
            @keyframes shimmerSlide {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      </>
    );
  }

  // ================================================================
  // PROCESSING PHASE
  // ================================================================

  if (phase === 'processing') {
    const topColor = results?.[0]?.brandColor || '#a855f7';

    return (
      <>
        <Header />
        <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
          {/* Pulsing radial gradient background */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  `radial-gradient(ellipse at 50% 50%, ${topColor}08 0%, transparent 70%)`,
                  `radial-gradient(ellipse at 50% 50%, ${topColor}15 0%, transparent 70%)`,
                  `radial-gradient(ellipse at 50% 50%, ${topColor}08 0%, transparent 70%)`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Orbiting particles */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full"
                style={{ backgroundColor: topColor, left: '50%', top: '50%', opacity: 0.4 }}
                animate={{
                  x: [0, Math.cos((i * 120 * Math.PI) / 180) * 120, 0],
                  y: [0, Math.sin((i * 120 * Math.PI) / 180) * 120, 0],
                  scale: [0.5, 1.5, 0.5],
                  opacity: [0.2, 0.6, 0.2],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="relative text-center px-4 max-w-md">
            {/* Spinning dual-ring loader */}
            <motion.div
              className="mx-auto w-20 h-20 rounded-full mb-8 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <div
                className="absolute inset-0 rounded-full border-2 border-transparent"
                style={{ borderTopColor: topColor, borderRightColor: `${topColor}40` }}
              />
              <motion.div
                className="absolute inset-2 rounded-full border-2 border-transparent"
                style={{ borderBottomColor: topColor, borderLeftColor: `${topColor}40` }}
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: topColor, boxShadow: `0 0 20px ${topColor}60` }}
                />
              </motion.div>
            </motion.div>

            {/* Stages */}
            <div className="space-y-3">
              {PROCESSING_STAGES.map((stage, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: processingStage >= i ? 1 : 0.15,
                    x: processingStage >= i ? 0 : -20,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ${
                      processingStage > i
                        ? 'bg-green-500/20 ring-green-500/30'
                        : processingStage === i
                          ? 'ring-white/20'
                          : 'ring-white/5'
                    }`}
                    style={
                      processingStage === i
                        ? {
                            backgroundColor: `${topColor}15`,
                            boxShadow: `0 0 0 1px ${topColor}30`,
                          }
                        : undefined
                    }
                    animate={processingStage === i ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    {processingStage > i ? (
                      <motion.svg
                        className="w-4 h-4 text-green-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    ) : (
                      <svg
                        className={`w-4 h-4 ${processingStage === i ? 'text-white/70' : 'text-white/20'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={stage.icon} />
                      </svg>
                    )}
                  </motion.div>
                  <span
                    className={`text-sm font-medium ${
                      processingStage > i
                        ? 'text-green-400/70'
                        : processingStage === i
                          ? 'text-white/80'
                          : 'text-white/20'
                    }`}
                  >
                    {stage.label}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Progress bar */}
            <motion.div className="mt-8 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: topColor }}
                initial={{ width: '0%' }}
                animate={{
                  width: `${((processingStage + 1) / PROCESSING_STAGES.length) * 100}%`,
                }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              />
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  // ================================================================
  // RESULTS PHASE
  // ================================================================

  if (!results || results.length === 0) return null;

  const topMatch = results[0];

  // Temperature helpers for every match card
  function getTemperature(score: number) {
    if (score >= 80) return { color: '#22c55e', label: 'Strong fit' };
    if (score >= 60) return { color: '#a855f7', label: 'Good fit' };
    if (score >= 40) return { color: '#3b82f6', label: 'Moderate fit' };
    return { color: '#6b7280', label: 'Exploring options' };
  }

  const topTemp = getTemperature(topMatch.score);
  const temperatureColor = topTemp.color;
  const temperatureLabel = topTemp.label;

  const scoreGradient =
    topMatch.score >= 80
      ? 'from-green-400 to-emerald-500'
      : topMatch.score >= 60
        ? 'from-blue-400 via-purple-400 to-indigo-500'
        : topMatch.score >= 40
          ? 'from-blue-400 to-cyan-500'
          : 'from-gray-400 to-gray-500';

  const totalCandidates = competitors.length + 7;

  const avgCompetitorScore = competitors.length
    ? Math.round(competitors.reduce((sum, c) => sum + c.score, 0) / competitors.length)
    : 0;

  // ── Radar Chart Data ──
  const radarAxes = [
    { label: 'Impact', key: 'impact' },
    { label: 'Autonomy', key: 'autonomy' },
    { label: 'Teamwork', key: 'team' },
    { label: 'Growth', key: 'challenge' },
    { label: 'Balance', key: 'balance' },
    { label: 'Innovation', key: 'creative' },
  ];

  const userRadarProfile: Record<string, number> = {};
  answers.forEach((optIdx, qIdx) => {
    const question = QUIZ_QUESTIONS[qIdx];
    if (!question) return;
    const weights = question.tagWeights[optIdx];
    if (!weights) return;
    Object.entries(weights).forEach(([tag, weight]) => {
      userRadarProfile[tag] = (userRadarProfile[tag] || 0) + weight;
    });
  });

  const maxRadarVal = Math.max(...radarAxes.map((a) => userRadarProfile[a.key] || 0), 1);
  const radarValues = radarAxes.map((a) => Math.min(1, (userRadarProfile[a.key] || 0) / maxRadarVal));

  const radarCx = 120;
  const radarCy = 120;
  const radarR = 90;
  const radarAngleStep = (2 * Math.PI) / radarAxes.length;

  function radarPoint(index: number, value: number) {
    const angle = -Math.PI / 2 + index * radarAngleStep;
    return {
      x: radarCx + Math.cos(angle) * radarR * value,
      y: radarCy + Math.sin(angle) * radarR * value,
    };
  }

  const radarPathPoints = radarValues.map((v, i) => radarPoint(i, v));
  const radarPathD =
    radarPathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';

  // Rank badge helper
  function getRankBadge(rank: number) {
    if (rank === 1)
      return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'ring-yellow-500/30' };
    if (rank === 2)
      return { bg: 'bg-gray-400/20', text: 'text-gray-300', border: 'ring-gray-400/30' };
    if (rank === 3)
      return { bg: 'bg-amber-700/20', text: 'text-amber-600', border: 'ring-amber-700/30' };
    return { bg: 'bg-white/[0.06]', text: 'text-white/40', border: 'ring-white/[0.08]' };
  }

  return (
    <>
      <Header />
      <div ref={resultsRef} className="relative min-h-screen overflow-hidden bg-[#0F172A]">
        {/* ── Three-Layer Background Ambiance ── */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Layer 1: Primary industry glow — large centered blur, 700px */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full blur-[160px]"
            style={{
              width: 700,
              height: 700,
              backgroundColor: `${topMatch.brandColor}14`,
            }}
          />
          {/* Layer 2: Secondary temperature glow that shifts color based on score */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: `${temperatureColor}10` }}
          />
          {/* Layer 3: Breathing industry orb on the left, scale pulse 1→1.2→1 over 5s */}
          <motion.div
            className="absolute top-1/3 -left-20 w-[300px] h-[300px] rounded-full blur-[80px]"
            style={{ backgroundColor: `${topMatch.brandColor}18` }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Confetti burst */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4'][
                    i % 6
                  ],
                  left: `${(i * 37 + 13) % 100}%`,
                  top: '-5%',
                }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{
                  y: typeof window !== 'undefined' ? window.innerHeight + 100 : 900,
                  rotate: ((i * 73 + 41) % 720) - 360,
                  x: (((i * 53 + 17) % 300) - 150),
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2 + ((i * 31 + 7) % 15) / 10,
                  delay: (i * 17 % 50) / 100,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        {/* ── Share Modal ── */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowShareModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-full max-w-sm rounded-2xl bg-[#0F172A] ring-1 ring-white/10 p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-white mb-2">Share Your Results</h3>
                <p className="text-[13px] text-white/50 mb-5">
                  Challenge your friends to beat your {topMatch.score}% match with {topMatch.name}!
                </p>

                <div className="space-y-2 mb-5">
                  {/* Twitter/X */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm a ${topMatch.score}% match with ${topMatch.name} on HireMatch! Can you beat my score?`)}&url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white text-[14px] font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    Share on X
                  </a>
                  {/* LinkedIn */}
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white text-[14px] font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    Share on LinkedIn
                  </a>
                </div>

                {/* Copy link */}
                <button
                  onClick={() => {
                    const text = `I'm a ${topMatch.score}% match with ${topMatch.name} on HireMatch! Take the quiz: ${typeof window !== 'undefined' ? window.location.href : ''}`;
                    navigator.clipboard.writeText(text);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="w-full py-3 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] text-[13px] text-white/60 hover:text-white transition-colors font-medium"
                >
                  {shareCopied ? 'Copied!' : 'Copy Link'}
                </button>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full mt-3 py-2 text-[12px] text-white/30 hover:text-white/50 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative px-4 pt-4 pb-20 max-w-3xl mx-auto">
          {/* Saved to profile notification */}
          <AnimatePresence>
            {savedToProfile && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 p-3 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-green-400 text-sm text-center"
              >
                Results saved to your profile!
              </motion.div>
            )}
          </AnimatePresence>

          {/* ══ FEATURED MATCH — SPOTLIGHT REVEAL ══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl overflow-hidden mb-8"
          >
            {/* Spotlight curtain — radial gradient that lifts */}
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.8, delay: 0.2, ease: 'easeOut' }}
              style={{
                background: `radial-gradient(circle at 50% 35%, transparent 0%, ${topMatch.brandColor}15 30%, rgba(15,23,42,0.95) 70%)`,
              }}
            />

            {/* Edge glow in brand color */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none z-[5]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1.2 }}
              style={{
                boxShadow: `inset 0 0 80px ${topMatch.brandColor}25, 0 0 60px ${topMatch.brandColor}15, 0 0 120px ${topMatch.brandColor}08`,
              }}
            />

            <div className="relative bg-white/[0.03] ring-1 ring-white/10 rounded-2xl overflow-hidden">
              {/* Industry gradient bar at top */}
              <div
                className="h-1 w-full"
                style={{
                  background: `linear-gradient(90deg, ${topMatch.brandColor}00, ${topMatch.brandColor}, ${topMatch.brandColor}00)`,
                }}
              />

              <div className="p-8 sm:p-10">
                {/* ── Large Circular Logo with Glow Ring ── */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
                    className="relative w-24 h-24 mx-auto mb-5"
                  >
                    {/* Outer glow ring — animated */}
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          `0 0 0 4px ${topMatch.brandColor}30, 0 0 40px ${topMatch.brandColor}20`,
                          `0 0 0 6px ${topMatch.brandColor}50, 0 0 60px ${topMatch.brandColor}35`,
                          `0 0 0 4px ${topMatch.brandColor}30, 0 0 40px ${topMatch.brandColor}20`,
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {/* Logo circle */}
                    <div
                      className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black"
                      style={{
                        backgroundColor: `${topMatch.brandColor}20`,
                        color: topMatch.brandColor,
                        border: `2px solid ${topMatch.brandColor}40`,
                      }}
                    >
                      {topMatch.name.charAt(0)}
                    </div>
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-[11px] uppercase tracking-[3px] text-white/30 font-bold mb-1"
                  >
                    Your #1 Match
                  </motion.p>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="text-3xl sm:text-4xl font-bold text-white mb-2"
                  >
                    {topMatch.name}
                  </motion.h2>

                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65 }}
                    className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-[2px] rounded-full"
                    style={{
                      backgroundColor: `${topMatch.brandColor}20`,
                      color: topMatch.brandColor,
                      border: `1px solid ${topMatch.brandColor}30`,
                    }}
                  >
                    {topMatch.industry}
                  </motion.span>
                </div>

                {/* Large count-up score */}
                <div className="text-center mb-4">
                  <p className="text-[11px] uppercase tracking-[3px] text-white/30 mb-2 font-bold">
                    Culture Alignment
                  </p>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <span
                      className={`text-[72px] sm:text-[88px] font-black leading-none bg-gradient-to-r ${scoreGradient} bg-clip-text text-transparent`}
                      style={{ fontFamily: 'var(--font-bebas)', letterSpacing: '2px' }}
                    >
                      {displayScore}%
                    </span>
                  </motion.div>
                </div>

                {/* Temperature Badge with pulsing dot */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex justify-center mb-6"
                >
                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold"
                    style={{
                      backgroundColor: `${temperatureColor}15`,
                      color: temperatureColor,
                      border: `1px solid ${temperatureColor}30`,
                    }}
                  >
                    <motion.span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: temperatureColor }}
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {temperatureLabel}
                  </span>
                </motion.div>

                {/* Culture tags with staggered scale-in */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.85 }}
                  className="flex flex-wrap justify-center gap-2 mb-8"
                >
                  {topMatch.cultureTags.map((tag, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.08 }}
                      className="px-3 py-1.5 text-[12px] font-medium rounded-full bg-white/[0.06] text-white/60 ring-1 ring-white/[0.08]"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>

                {/* ── SVG Radar Chart — Match Breakdown ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0, duration: 0.6 }}
                  className="flex justify-center mb-8"
                >
                  <div className="relative">
                    <svg width="240" height="240" viewBox="0 0 240 240">
                      {/* Background grid rings */}
                      {[0.25, 0.5, 0.75, 1].map((ring) => (
                        <polygon
                          key={ring}
                          points={radarAxes
                            .map((_, i) => {
                              const p = radarPoint(i, ring);
                              return `${p.x},${p.y}`;
                            })
                            .join(' ')}
                          fill="none"
                          stroke="rgba(255,255,255,0.06)"
                          strokeWidth="1"
                        />
                      ))}
                      {/* Axis lines */}
                      {radarAxes.map((_, i) => {
                        const p = radarPoint(i, 1);
                        return (
                          <line
                            key={i}
                            x1={radarCx}
                            y1={radarCy}
                            x2={p.x}
                            y2={p.y}
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="1"
                          />
                        );
                      })}
                      {/* Filled area — animated draw */}
                      <motion.path
                        d={radarPathD}
                        fill={`${topMatch.brandColor}20`}
                        stroke={topMatch.brandColor}
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ delay: 1.2, duration: 1.2, ease: 'easeOut' }}
                      />
                      {/* Data points — scale in with stagger */}
                      {radarPathPoints.map((p, i) => (
                        <motion.circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill={topMatch.brandColor}
                          stroke={topMatch.brandColor}
                          strokeWidth="2"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            delay: 1.4 + i * 0.1,
                            type: 'spring',
                            stiffness: 400,
                            damping: 15,
                          }}
                        />
                      ))}
                      {/* Axis labels */}
                      {radarAxes.map((axis, i) => {
                        const labelP = radarPoint(i, 1.22);
                        return (
                          <text
                            key={i}
                            x={labelP.x}
                            y={labelP.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="rgba(255,255,255,0.45)"
                            fontSize="10"
                            fontWeight="600"
                          >
                            {axis.label}
                          </text>
                        );
                      })}
                    </svg>
                    <p className="text-center text-[10px] uppercase tracking-[2px] text-white/25 font-bold mt-1">
                      Match Breakdown
                    </p>
                  </div>
                </motion.div>

                {/* Why You Match */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="bg-white/[0.03] rounded-xl p-5 ring-1 ring-white/[0.06]"
                >
                  <h3 className="text-[12px] uppercase tracking-[2px] font-bold text-white/40 mb-3">
                    Why You Match
                  </h3>
                  <div className="space-y-2">
                    {topMatch.whyMatch.map((reason, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.4 + i * 0.1 }}
                        className="flex items-start gap-2"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: topMatch.brandColor }}
                        />
                        <span className="text-[13px] text-white/60">{reason}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ══ COMPETING CANDIDATES ══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6 }}
            className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-8 mb-8"
          >
            <h3 className="text-[12px] uppercase tracking-[2px] font-bold text-white/40 mb-1">
              Your Competition
            </h3>
            <p className="text-[14px] text-white/60 mb-6">
              You&apos;re up against{' '}
              <span className="text-white font-semibold">{totalCandidates} candidates</span>{' '}
              for roles at {topMatch.name}
            </p>

            {/* Rank callout */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, type: 'spring' }}
              className="flex items-center gap-4 p-4 rounded-xl mb-6"
              style={{ backgroundColor: `${temperatureColor}10`, border: `1px solid ${temperatureColor}20` }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
                style={{ backgroundColor: `${temperatureColor}20`, color: temperatureColor }}
              >
                #{userRank}
              </div>
              <div>
                <p className="text-white font-semibold text-[15px]">
                  You rank #{userRank} of {totalCandidates} candidates
                </p>
                <p className="text-white/40 text-[12px]">
                  Your score: {topMatch.score}% | Average: {avgCompetitorScore}%
                </p>
              </div>
            </motion.div>

            {/* Competitor score bars */}
            <div className="space-y-2 mb-6">
              {/* User's bar */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                  You
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${topMatch.score}%` }}
                      transition={{ delay: 1.9, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </div>
                <span className="text-[13px] font-bold text-white tabular-nums w-10 text-right">
                  {topMatch.score}%
                </span>
              </div>

              {competitors.map((comp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.0 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white/80 flex-shrink-0"
                    style={{ backgroundColor: comp.avatar }}
                  >
                    {comp.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: comp.avatar }}
                        initial={{ width: 0 }}
                        animate={{ width: `${comp.score}%` }}
                        transition={{ delay: 2.1 + i * 0.08, duration: 0.6 }}
                      />
                    </div>
                  </div>
                  <span className="text-[12px] text-white/40 tabular-nums w-10 text-right">
                    {comp.score}%
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Stand out tip */}
            <div className="p-3 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <p className="text-[12px] text-amber-400/80">
                <span className="font-bold">Stand out tip:</span> Update your profile with leadership
                experience to boost your match score by up to 8%
              </p>
            </div>
          </motion.div>

          {/* ══ ALL RESULTS GRID — rank badges (#1 gold, #2 silver, #3 bronze) ══ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2 }}
            className="mb-8"
          >
            <h3
              className="text-[28px] sm:text-[36px] text-white mb-6 tracking-[1px]"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              All Matches
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.slice(0, showAllMatches ? undefined : 8).map((match, mi) => {
                const rank = mi + 1;
                const badge = getRankBadge(rank);
                const mTemp = getTemperature(match.score);

                return (
                  <motion.div
                    key={mi}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: 2.3 + mi * 0.05,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="relative p-4 rounded-xl bg-white/[0.03] ring-1 ring-white/10 hover:ring-white/[0.18] transition-all group"
                  >
                    {/* Rank badge — top-right */}
                    <div
                      className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ring-1 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {rank}
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{
                          backgroundColor: `${match.brandColor}20`,
                          color: match.brandColor,
                          border: `1px solid ${match.brandColor}30`,
                        }}
                      >
                        {match.name.charAt(0)}
                      </div>
                      <div className="min-w-0 pr-8">
                        <p className="text-[14px] font-semibold text-white truncate">
                          {match.name}
                        </p>
                        <p className="text-[11px] text-white/30">{match.industry}</p>
                      </div>
                    </div>

                    {/* Score + temperature badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[24px] font-black"
                        style={{
                          color: mTemp.color,
                          fontFamily: 'var(--font-bebas)',
                          letterSpacing: '1px',
                        }}
                      >
                        {match.score}%
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor: `${mTemp.color}12`,
                          color: mTemp.color,
                          border: `1px solid ${mTemp.color}25`,
                        }}
                      >
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: mTemp.color }}
                          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        {mTemp.label}
                      </span>
                    </div>

                    {/* Score bar */}
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: match.brandColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${match.score}%` }}
                        transition={{
                          delay: 2.5 + mi * 0.05,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {!showAllMatches && results.length > 8 && (
              <button
                onClick={() => setShowAllMatches(true)}
                className="w-full py-3 mt-4 text-[13px] text-white/40 hover:text-white/60 transition-colors font-medium cursor-pointer ring-1 ring-white/[0.06] rounded-xl hover:ring-white/[0.12]"
              >
                Show all {results.length} matches
              </button>
            )}
          </motion.div>

          {/* ── Action Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.6 }}
            className="space-y-3"
          >
            {/* Primary gradient CTA */}
            <button
              onClick={() => router.push('/jobs')}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-[15px] rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-shadow cursor-pointer"
            >
              Apply to Top Match
            </button>

            {/* View All Matched Jobs */}
            <button
              onClick={() => router.push('/jobs')}
              className="w-full py-3.5 bg-white/[0.05] ring-1 ring-white/[0.1] text-white/70 hover:text-white font-medium text-[14px] rounded-xl transition-colors cursor-pointer"
            >
              View All Matched Jobs
            </button>

            {/* Share Results — opens viral share modal */}
            <button
              onClick={() => setShowShareModal(true)}
              className="w-full py-3.5 bg-white/[0.03] ring-1 ring-white/[0.06] text-white/50 hover:text-white/70 font-medium text-[14px] rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share Results
            </button>

            {/* Retake Quiz */}
            <button
              onClick={handleRetake}
              className="w-full py-3 text-white/30 hover:text-white/50 text-[13px] transition-colors cursor-pointer"
            >
              Retake Quiz
            </button>

            {/* Sign up prompt for unauthenticated */}
            {!isAuthenticated && (
              <div className="mt-4 p-4 rounded-xl bg-white/[0.03] ring-1 ring-white/10 text-center">
                <p className="text-[13px] text-white/40 mb-3">
                  Sign up to save your results and get notified when new matches appear.
                </p>
                <button
                  onClick={() => router.push('/auth?mode=signup&role=candidate')}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-[13px] rounded-lg cursor-pointer"
                >
                  Create Free Account
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

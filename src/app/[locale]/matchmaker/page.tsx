'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { QuizQuestion, CompanyMatch, ProcessingStage } from './types';
import MatchmakerLanding from './components/MatchmakerLanding';
import MatchmakerQuiz from './components/MatchmakerQuiz';
import MatchmakerProcessing from './components/MatchmakerProcessing';
import MatchmakerResults from './components/MatchmakerResults';

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
    icon: '\u{1F305}',
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
    icon: '\u{1F525}',
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
    icon: '\u{1F3E2}',
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
    icon: '\u{1F3C6}',
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
    icon: '\u{1F464}',
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
    icon: '\u{1F389}',
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
    icon: '\u{1F624}',
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
    icon: '\u{1F4F0}',
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
    icon: '\u{1F4B0}',
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
    icon: '\u{1F52E}',
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

function generateCompetitors(topScore: number, topCompanyNames: string[]) {
  const profiles = [
    {
      name: 'Alex M.', headline: 'Senior Full-Stack Engineer', location: 'San Francisco, US',
      experience: 7, skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL'],
      strengths: ['Strong system design background', 'Open-source contributor', 'Led a team of 5'],
      weaknesses: ['Limited remote experience', 'No startup background'],
      workStyle: [{ label: 'Team', value: 85 }, { label: 'Autonomy', value: 60 }, { label: 'Impact', value: 75 }, { label: 'Balance', value: 45 }],
    },
    {
      name: 'Jordan K.', headline: 'Product Manager | ex-Meta', location: 'London, UK',
      experience: 5, skills: ['Product Strategy', 'Data Analysis', 'Figma', 'SQL', 'A/B Testing'],
      strengths: ['FAANG experience', 'Data-driven decision maker', 'Cross-functional leadership'],
      weaknesses: ['Less technical depth', 'Prefers larger orgs'],
      workStyle: [{ label: 'Team', value: 90 }, { label: 'Autonomy', value: 50 }, { label: 'Impact', value: 80 }, { label: 'Balance', value: 70 }],
    },
    {
      name: 'Taylor R.', headline: 'ML Engineer & Researcher', location: 'Berlin, DE',
      experience: 4, skills: ['Python', 'PyTorch', 'MLOps', 'Kubernetes', 'Data Pipelines'],
      strengths: ['Published ML research', 'Strong mathematics foundation', 'Multilingual (3 languages)'],
      weaknesses: ['Fewer leadership roles', 'Niche specialization'],
      workStyle: [{ label: 'Team', value: 55 }, { label: 'Autonomy', value: 90 }, { label: 'Impact', value: 85 }, { label: 'Balance', value: 60 }],
    },
    {
      name: 'Sam P.', headline: 'UX Designer & Design Systems Lead', location: 'Toronto, CA',
      experience: 6, skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'CSS'],
      strengths: ['Built design system from scratch', 'Strong portfolio', 'Accessibility expert'],
      weaknesses: ['Limited backend knowledge', 'Smaller company experience'],
      workStyle: [{ label: 'Team', value: 80 }, { label: 'Autonomy', value: 70 }, { label: 'Impact', value: 65 }, { label: 'Balance', value: 85 }],
    },
    {
      name: 'Casey L.', headline: 'DevOps & Platform Engineer', location: 'Sydney, AU',
      experience: 8, skills: ['Terraform', 'AWS', 'Docker', 'CI/CD', 'Go', 'Monitoring'],
      strengths: ['Deep infrastructure expertise', '99.99% uptime track record', 'Incident commander experience'],
      weaknesses: ['Prefers backend roles only', 'Less product-facing experience'],
      workStyle: [{ label: 'Team', value: 65 }, { label: 'Autonomy', value: 80 }, { label: 'Impact', value: 70 }, { label: 'Balance', value: 50 }],
    },
  ];

  return profiles.map((profile, i) => {
    const score = Math.max(45, topScore - 3 - Math.floor(Math.random() * 25) - i * 4);
    const threat = score >= topScore - 5 ? 'high' as const : score >= topScore - 15 ? 'medium' as const : 'low' as const;
    return {
      ...profile,
      score,
      avatar: `hsl(${(i * 72 + 200) % 360}, 60%, 50%)`,
      matchReasons: [
        `${score}% culture alignment with top companies`,
        `${profile.experience} years of relevant experience`,
        profile.strengths[0],
      ],
      topCompanies: topCompanyNames.slice(0, 3),
      threatLevel: threat,
    };
  }).sort((a, b) => b.score - a.score);
}

// ── Build user radar profile from answers ──────────────────────

function buildUserRadarProfile(answers: number[]): Record<string, number> {
  const profile: Record<string, number> = {};
  answers.forEach((optIdx, qIdx) => {
    const question = QUIZ_QUESTIONS[qIdx];
    if (!question) return;
    const weights = question.tagWeights[optIdx];
    if (!weights) return;
    Object.entries(weights).forEach(([tag, weight]) => {
      profile[tag] = (profile[tag] || 0) + weight;
    });
  });
  return profile;
}

// ── Processing Stage Definitions ───────────────────────────────

const PROCESSING_STAGES: ProcessingStage[] = [
  { icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'Analyzing your work DNA...', sublabel: 'Mapping your work values and preferences' },
  { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Cross-referencing companies...', sublabel: 'Scanning 16 company culture profiles' },
  { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Calculating culture scores...', sublabel: 'Running compatibility algorithms' },
  { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'Revealing your matches...', sublabel: 'Ranking your top matches' },
];

// ── Component ──────────────────────────────────────────────────

export default function MatchmakerPage() {
  const supabase = createClient();

  // Phases: 'landing' | 'quiz' | 'processing' | 'results'
  const [phase, setPhase] = useState<'landing' | 'quiz' | 'processing' | 'results'>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [direction, setDirection] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [processingStage, setProcessingStage] = useState(0);
  const [showResultsFlash, setShowResultsFlash] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [realJobs, setRealJobs] = useState<{
    id: string; title: string; company: string; industry: string;
    work_mode: string; country: string; city?: string; job_type: string;
    salary_min?: number; salary_max?: number; salary_currency?: string;
    visa_sponsorship: boolean; skills_required: string[]; match_tags: string[];
    matchScore: number; matchReasons: string[];
  }[]>([]);
  const [realJobsLoading, setRealJobsLoading] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsAuthenticated(true);
    }).catch(() => { /* auth check non-critical */ });
  }, []);

  const results = useMemo(() => {
    if (answers.length < QUIZ_QUESTIONS.length) return null;
    return calculateMatches(answers);
  }, [answers]);

  const competitors = useMemo(() => {
    if (!results) return [];
    return generateCompetitors(results[0]?.score || 75, results.slice(0, 5).map((r) => r.name));
  }, [results]);

  const userRank = useMemo(() => {
    if (!results || !competitors.length) return 1;
    const topScore = results[0]?.score || 75;
    const higher = competitors.filter((c) => c.score > topScore).length;
    return higher + 1;
  }, [results, competitors]);

  const userRadarProfile = useMemo(() => {
    return buildUserRadarProfile(answers);
  }, [answers]);

  // ── Processing phase animation ──────────────────────────────

  useEffect(() => {
    if (phase !== 'processing' || !results) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setProcessingStage(0), 0));
    timers.push(setTimeout(() => setProcessingStage(1), 800));
    timers.push(setTimeout(() => setProcessingStage(2), 1700));
    timers.push(setTimeout(() => setProcessingStage(3), 2600));
    timers.push(
      setTimeout(() => {
        setShowResultsFlash(true);
        timers.push(
          setTimeout(() => {
            setShowResultsFlash(false);
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
          }, 400)
        );
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

  // ── Fetch real jobs and score against quiz profile ──────────

  useEffect(() => {
    if (phase !== 'results') return;

    async function fetchAndScoreJobs() {
      setRealJobsLoading(true);
      try {
        // Build user culture profile from quiz answers
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

        // Expanded culture-to-job semantic mapping with synonyms and related terms
        const cultureToJobMap: Record<string, { work_modes?: string[]; traits: string[]; weight: number }> = {
          remote: { work_modes: ['remote'], traits: ['remote', 'distributed', 'flexible', 'work from home', 'wfh', 'async', 'global team', 'anywhere'], weight: 3 },
          team: { traits: ['collaboration', 'teamwork', 'team', 'agile', 'scrum', 'cross-functional', 'pair programming', 'squad', 'tribe'], weight: 2 },
          autonomy: { traits: ['autonomous', 'independent', 'self-starter', 'ownership', 'empowerment', 'self-directed', 'initiative'], weight: 2 },
          ship: { traits: ['fast-paced', 'startup', 'agile', 'delivery', 'ship', 'iterate', 'mvp', 'rapid', 'velocity', 'sprint'], weight: 2 },
          impact: { traits: ['impact', 'scale', 'growth', 'millions', 'global', 'transformative', 'meaningful', 'change'], weight: 3 },
          mission: { traits: ['mission', 'purpose', 'social', 'impact', 'healthcare', 'education', 'sustainability', 'non-profit', 'climate', 'diversity'], weight: 3 },
          data: { traits: ['data', 'analytics', 'machine learning', 'ai', 'data-driven', 'metrics', 'a/b test', 'experiment', 'quantitative', 'statistical'], weight: 2 },
          balance: { traits: ['work-life', 'balance', 'flexible', 'wellness', 'unlimited pto', 'mental health', 'sustainable pace', '4-day', 'no crunch'], weight: 2 },
          quality: { traits: ['quality', 'craft', 'engineering excellence', 'architecture', 'code review', 'testing', 'best practices', 'clean code', 'technical debt'], weight: 2 },
          creative: { traits: ['creative', 'design', 'innovation', 'product', 'user experience', 'prototype', 'experiment', 'ideation', 'brainstorm'], weight: 2 },
          pressure: { traits: ['fast-paced', 'high-growth', 'startup', 'fintech', 'intense', 'demanding', 'competitive', 'ambitious'], weight: 1 },
          solve: { traits: ['problem-solving', 'engineering', 'technical', 'architecture', 'cloud', 'distributed systems', 'algorithms', 'complex', 'research'], weight: 2 },
          salary: { traits: ['competitive', 'compensation', 'senior', 'top of market', 'premium', 'well-paid', 'above market'], weight: 1 },
          equity: { traits: ['equity', 'startup', 'early-stage', 'options', 'stock', 'vesting', 'shares', 'ownership stake'], weight: 2 },
          lead: { traits: ['leadership', 'management', 'lead', 'director', 'head', 'vp', 'principal', 'staff', 'manager'], weight: 2 },
          mentor: { traits: ['mentorship', 'coaching', 'growth', 'learning', 'development', 'training', 'onboarding', 'career path'], weight: 2 },
          ic: { traits: ['individual contributor', 'specialist', 'expert', 'senior', 'staff engineer', 'principal', 'ic track', 'deep expertise'], weight: 2 },
          flow: { traits: ['deep work', 'focused', 'engineering', 'research', 'concentration', 'uninterrupted', 'maker schedule'], weight: 2 },
          founded: { traits: ['startup', 'founder', 'entrepreneurial', 'early-stage', 'pre-seed', 'seed', 'series a', 'bootstrapped', 'co-founder'], weight: 2 },
          office: { work_modes: ['onsite', 'hybrid'], traits: ['office', 'in-person', 'on-site', 'campus', 'headquarters'], weight: 2 },
        };

        // Determine user's preferred work modes with nuance
        const preferredWorkModes: string[] = [];
        const remoteScore = userProfile.remote || 0;
        const officeScore = userProfile.office || 0;
        if (remoteScore >= 3) preferredWorkModes.push('remote');
        if (officeScore >= 3) preferredWorkModes.push('onsite');
        if (remoteScore > 0 && officeScore > 0) preferredWorkModes.push('hybrid');
        if (preferredWorkModes.length === 0) preferredWorkModes.push('remote', 'hybrid', 'onsite');

        // Get top user traits sorted by strength
        const topUserTraits = Object.entries(userProfile)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 12);
        const userTopTagSet = new Set(topUserTraits.map(([tag]) => tag));

        // Fetch active jobs
        const { data: jobs } = await supabase
          .from('jobs')
          .select('*, recruiter:recruiters(company_name)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!jobs || jobs.length === 0) {
          setRealJobs([]);
          setRealJobsLoading(false);
          return;
        }

        // Multi-dimensional scoring
        const scored = jobs.map((job: Record<string, unknown>) => {
          const reasons: string[] = [];
          const jobTags = ((job.match_tags as string[]) || []).map((t: string) => t.toLowerCase());
          const jobSkills = ((job.skills_required as string[]) || []).map((t: string) => t.toLowerCase());
          const jobDesc = ((job.description as string) || '').toLowerCase();
          const jobTitle = ((job.title as string) || '').toLowerCase();
          const jobIndustry = ((job.industry as string) || '').toLowerCase();
          const allJobText = [jobTitle, jobDesc, jobIndustry, ...jobTags, ...jobSkills].join(' ');

          // 1. CULTURE FIT (40% of total) — quiz tags vs job text + match_tags
          let cultureScore = 0;
          let cultureMax = 0;
          for (const [tag, userWeight] of topUserTraits) {
            const mapping = cultureToJobMap[tag];
            if (!mapping) continue;
            const traitWeight = mapping.weight * userWeight;
            cultureMax += traitWeight;

            // Direct tag overlap with job match_tags (strongest signal)
            if (jobTags.includes(tag)) {
              cultureScore += traitWeight;
              continue;
            }

            // Semantic trait matching against job text
            const matchedTraits = mapping.traits.filter(t => allJobText.includes(t));
            if (matchedTraits.length > 0) {
              cultureScore += traitWeight * Math.min(matchedTraits.length / mapping.traits.length * 2, 1);
            }
          }
          const culturePct = cultureMax > 0 ? (cultureScore / cultureMax) * 100 : 50;

          // 2. WORK MODE FIT (20% of total)
          let workModePct = 50;
          const jobWorkMode = job.work_mode as string;
          if (preferredWorkModes.includes(jobWorkMode)) {
            workModePct = 90;
            if (jobWorkMode === 'remote' && remoteScore >= 3) {
              reasons.push('Remote-first — matches your style');
              workModePct = 95;
            } else if (jobWorkMode === 'onsite' && officeScore >= 3) {
              reasons.push('On-site culture you prefer');
              workModePct = 95;
            } else if (jobWorkMode === 'hybrid') {
              reasons.push('Hybrid flexibility');
            }
          } else {
            workModePct = 30;
          }

          // 3. TAG OVERLAP (25% of total) — direct match_tags alignment
          const jobTagSet = new Set(jobTags);
          let tagOverlap = 0;
          for (const tag of userTopTagSet) {
            if (jobTagSet.has(tag)) tagOverlap++;
            // Also check partial matches (e.g., "team" in "teamwork")
            for (const jt of jobTags) {
              if (jt.includes(tag) || tag.includes(jt)) { tagOverlap += 0.5; break; }
            }
          }
          const tagPct = Math.min((tagOverlap / Math.max(userTopTagSet.size, 1)) * 100, 100);

          // 4. INDUSTRY/ROLE ALIGNMENT (15% of total) — from quiz trait mapping
          let industryPct = 50;
          const traitLabels: Record<string, string> = {
            team: 'Collaborative team environment',
            autonomy: 'Values ownership and autonomy',
            ship: 'Fast-paced, ship-it culture',
            impact: 'High-impact role',
            mission: 'Mission-driven organization',
            data: 'Data-driven decision making',
            balance: 'Supports work-life balance',
            quality: 'Values engineering craft',
            creative: 'Creative and innovative role',
            solve: 'Complex problem-solving focus',
            lead: 'Leadership growth opportunity',
            mentor: 'Strong mentorship culture',
            pressure: 'High-growth environment',
            flow: 'Deep work friendly',
            equity: 'Equity-forward compensation',
            founded: 'Entrepreneurial environment',
          };

          // Find top matching traits for reasons
          const traitMatches: { tag: string; strength: number }[] = [];
          for (const [tag, userWeight] of topUserTraits) {
            const mapping = cultureToJobMap[tag];
            if (!mapping) continue;
            const matched = mapping.traits.filter(t => allJobText.includes(t));
            if (matched.length > 0 || jobTags.includes(tag)) {
              traitMatches.push({ tag, strength: userWeight * matched.length });
            }
          }
          traitMatches.sort((a, b) => b.strength - a.strength);
          for (const tm of traitMatches.slice(0, 3)) {
            if (traitLabels[tm.tag] && !reasons.includes(traitLabels[tm.tag])) {
              reasons.push(traitLabels[tm.tag]);
            }
          }

          // Industry alignment bonus
          if (traitMatches.length >= 3) industryPct = 80;
          else if (traitMatches.length >= 1) industryPct = 65;

          // Weighted composite score
          const compositeRaw = culturePct * 0.4 + workModePct * 0.2 + tagPct * 0.25 + industryPct * 0.15;

          // Normalize to 40-95 range with better distribution
          const rawPct = compositeRaw;
          const normalized = Math.round(40 + (rawPct / 100) * 55);
          const clamped = Math.min(95, Math.max(40, normalized));

          if (reasons.length < 2) {
            reasons.push(`${(job.work_mode as string || 'hybrid').charAt(0).toUpperCase() + (job.work_mode as string || 'hybrid').slice(1)} position in ${(job.country as string || '').toUpperCase()}`);
          }

          const recruiterData = job.recruiter as Record<string, unknown> | null;

          return {
            id: job.id as string,
            title: job.title as string,
            company: (recruiterData?.company_name as string) || 'Company',
            industry: (job.industry as string) || '',
            work_mode: job.work_mode as string,
            country: job.country as string,
            city: job.city as string | undefined,
            job_type: job.job_type as string,
            salary_min: job.salary_min as number | undefined,
            salary_max: job.salary_max as number | undefined,
            salary_currency: (job.salary_currency as string) || 'USD',
            visa_sponsorship: job.visa_sponsorship as boolean,
            skills_required: (job.skills_required as string[]) || [],
            match_tags: (job.match_tags as string[]) || [],
            matchScore: clamped,
            matchReasons: reasons.slice(0, 3),
          };
        });

        // Sort by match score and take top 6
        scored.sort((a: { matchScore: number }, b: { matchScore: number }) => b.matchScore - a.matchScore);
        const clientScoredJobs = scored.slice(0, 6);
        setRealJobs(clientScoredJobs);

        // For authenticated users, also try LLM-powered matching via API
        // This provides more nuanced scoring than client-side tag matching
        if (isAuthenticated) {
          try {
            const res = await fetch('/api/candidate/matched-jobs');
            if (res.ok) {
              const data = await res.json();
              if (data.matches && data.matches.length > 0) {
                // Merge LLM results — LLM scores are more accurate
                const llmJobs = data.matches.map((m: Record<string, unknown>) => {
                  const mJob = m.job as Record<string, unknown>;
                  const recruiterData = mJob?.recruiter as Record<string, unknown> | null;
                  return {
                    id: (mJob?.id as string) || '',
                    title: (mJob?.title as string) || '',
                    company: (recruiterData?.company_name as string) || 'Company',
                    industry: (mJob?.industry as string) || '',
                    work_mode: (mJob?.work_mode as string) || 'hybrid',
                    country: (mJob?.country as string) || '',
                    city: mJob?.city as string | undefined,
                    job_type: (mJob?.job_type as string) || 'full-time',
                    salary_min: mJob?.salary_min as number | undefined,
                    salary_max: mJob?.salary_max as number | undefined,
                    salary_currency: ((mJob?.salary_currency as string) || 'USD'),
                    visa_sponsorship: (mJob?.visa_sponsorship as boolean) || false,
                    skills_required: (mJob?.skills_required as string[]) || [],
                    match_tags: (mJob?.match_tags as string[]) || [],
                    matchScore: Math.min(95, Math.max(40, (m.score as number) || 50)),
                    matchReasons: [(m.why as string) || 'AI-matched', (m.tip as string) || ''].filter(Boolean),
                  };
                });
                setRealJobs(llmJobs.slice(0, 6));
              }
            }
          } catch {
            // LLM matching is optional enhancement — client-side results still showing
          }
        }
      } catch (err) {
        console.error('Failed to fetch real jobs:', err);
      }
      setRealJobsLoading(false);
    }

    fetchAndScoreJobs();
  }, [phase, answers, isAuthenticated]);

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
    setRealJobs([]);
  }, []);

  // ── Render Phases ──────────────────────────────────────────

  if (phase === 'landing') {
    return (
      <MatchmakerLanding
        onStart={() => {
          setPhase('quiz');
          setStep(0);
        }}
      />
    );
  }

  if (phase === 'quiz') {
    return (
      <MatchmakerQuiz
        questions={QUIZ_QUESTIONS}
        step={step}
        direction={direction}
        selectedOption={selectedOption}
        onAnswer={handleAnswer}
        onBack={handleBack}
      />
    );
  }

  if (phase === 'processing') {
    return (
      <MatchmakerProcessing
        processingStage={processingStage}
        stages={PROCESSING_STAGES}
        topColor={results?.[0]?.brandColor || '#a855f7'}
        showResultsFlash={showResultsFlash}
      />
    );
  }

  // Results phase
  if (!results || results.length === 0) return null;

  return (
    <MatchmakerResults
      results={results}
      answers={answers}
      competitors={competitors}
      displayScore={displayScore}
      showConfetti={showConfetti}
      savedToProfile={savedToProfile}
      onSave={() => {}}
      onRetake={handleRetake}
      onShare={() => setShowShareModal(true)}
      showShareModal={showShareModal}
      setShowShareModal={setShowShareModal}
      shareCopied={shareCopied}
      setShareCopied={setShareCopied}
      resultsRef={resultsRef}
      showAllMatches={showAllMatches}
      setShowAllMatches={setShowAllMatches}
      realJobs={realJobs}
      realJobsLoading={realJobsLoading}
      isAuthenticated={isAuthenticated}
      userRank={userRank}
      userRadarProfile={userRadarProfile}
    />
  );
}

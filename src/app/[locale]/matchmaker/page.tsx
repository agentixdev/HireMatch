'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';

interface QuizQuestion {
  id: number;
  question: string;
  icon: string;
  category: string;
  color: string;
  options: { label: string; tags: Record<string, number> }[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'What work environment do you thrive in?',
    icon: '🏢',
    category: 'Culture',
    color: 'from-purple-500/20 to-purple-600/10',
    options: [
      { label: 'Fast-paced startup with flat hierarchy', tags: { startup: 3, innovation: 2, autonomy: 2 } },
      { label: 'Structured corporate with clear growth paths', tags: { corporate: 3, stability: 2, growth: 2 } },
      { label: 'Remote-first with async communication', tags: { remote: 3, flexibility: 2, autonomy: 2 } },
      { label: 'Collaborative team in a hybrid setup', tags: { teamwork: 3, hybrid: 2, collaboration: 2 } },
    ],
  },
  {
    id: 2,
    question: 'What matters most in your next role?',
    icon: '🎯',
    category: 'Values',
    color: 'from-blue-500/20 to-blue-600/10',
    options: [
      { label: 'Compensation and financial growth', tags: { compensation: 3, finance: 2 } },
      { label: 'Learning and skill development', tags: { learning: 3, growth: 2, mentorship: 2 } },
      { label: 'Work-life balance and flexibility', tags: { balance: 3, flexibility: 2, remote: 1 } },
      { label: 'Impact and meaningful work', tags: { impact: 3, purpose: 2, innovation: 1 } },
    ],
  },
  {
    id: 3,
    question: 'How do you prefer to solve problems?',
    icon: '🧩',
    category: 'Work Style',
    color: 'from-green-500/20 to-green-600/10',
    options: [
      { label: 'Data-driven analysis and research', tags: { analytical: 3, data: 2, research: 1 } },
      { label: 'Creative brainstorming and experimentation', tags: { creative: 3, innovation: 2, experimentation: 1 } },
      { label: 'Systematic processes and documentation', tags: { systematic: 3, process: 2, documentation: 1 } },
      { label: 'Collaborative discussion and consensus', tags: { collaboration: 3, teamwork: 2, communication: 1 } },
    ],
  },
  {
    id: 4,
    question: 'What type of team size do you prefer?',
    icon: '👥',
    category: 'Team',
    color: 'from-amber-500/20 to-amber-600/10',
    options: [
      { label: 'Small team (2-5 people)', tags: { startup: 2, autonomy: 2, ownership: 2 } },
      { label: 'Medium team (6-15 people)', tags: { teamwork: 2, collaboration: 2, hybrid: 1 } },
      { label: 'Large department (16-50 people)', tags: { corporate: 2, process: 2, specialization: 1 } },
      { label: 'Enterprise scale (50+ in org)', tags: { corporate: 3, stability: 2, structure: 1 } },
    ],
  },
  {
    id: 5,
    question: 'What industry excites you most?',
    icon: '🚀',
    category: 'Industry',
    color: 'from-red-500/20 to-red-600/10',
    options: [
      { label: 'Technology & Software', tags: { tech: 3, innovation: 2, software: 2 } },
      { label: 'Finance & Fintech', tags: { finance: 3, fintech: 2, data: 1 } },
      { label: 'Healthcare & Biotech', tags: { healthcare: 3, impact: 2, research: 1 } },
      { label: 'Education & Social Impact', tags: { education: 3, impact: 3, purpose: 2 } },
    ],
  },
  {
    id: 6,
    question: 'How do you handle deadlines?',
    icon: '⏰',
    category: 'Work Style',
    color: 'from-cyan-500/20 to-cyan-600/10',
    options: [
      { label: 'I thrive under pressure and tight timelines', tags: { fast_paced: 3, startup: 1, ownership: 1 } },
      { label: 'I prefer steady, planned work with buffer time', tags: { systematic: 2, stability: 2, process: 1 } },
      { label: 'I like sprints with recovery periods', tags: { agile: 3, balance: 1, teamwork: 1 } },
      { label: 'I focus on quality over speed', tags: { quality: 3, research: 2, documentation: 1 } },
    ],
  },
  {
    id: 7,
    question: 'What\'s your ideal management style?',
    icon: '🎭',
    category: 'Leadership',
    color: 'from-indigo-500/20 to-indigo-600/10',
    options: [
      { label: 'Hands-off — trust me to deliver', tags: { autonomy: 3, ownership: 2, remote: 1 } },
      { label: 'Regular check-ins with clear direction', tags: { structure: 2, mentorship: 2, growth: 1 } },
      { label: 'Collaborative — decide together', tags: { collaboration: 3, teamwork: 2, flat: 1 } },
      { label: 'Mentorship-focused with coaching', tags: { mentorship: 3, growth: 3, learning: 2 } },
    ],
  },
  {
    id: 8,
    question: 'Where would you like to work?',
    icon: '🌍',
    category: 'Location',
    color: 'from-teal-500/20 to-teal-600/10',
    options: [
      { label: 'Fully remote — anywhere in the world', tags: { remote: 3, flexibility: 2, global: 2 } },
      { label: 'Hybrid — mix of office and home', tags: { hybrid: 3, balance: 1, local: 1 } },
      { label: 'On-site — I like being in the office', tags: { onsite: 3, teamwork: 1, local: 2 } },
      { label: 'Willing to relocate for the right role', tags: { relocation: 3, global: 2, growth: 1 } },
    ],
  },
];

export default function MatchmakerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setIsAuthenticated(true);
    });
  }, []);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = { ...answers, [currentQuestion]: optionIndex };
    setAnswers(newAnswers);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setShowResults(true);
    }
  };

  const computeTags = () => {
    const tagScores: Record<string, number> = {};
    Object.entries(answers).forEach(([qIdx, optIdx]) => {
      const question = QUIZ_QUESTIONS[parseInt(qIdx)];
      const option = question.options[optIdx];
      Object.entries(option.tags).forEach(([tag, weight]) => {
        tagScores[tag] = (tagScores[tag] || 0) + weight;
      });
    });
    return Object.entries(tagScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const progress = ((currentQuestion + (showResults ? 1 : 0)) / QUIZ_QUESTIONS.length) * 100;

  if (showResults) {
    const topTags = computeTags();

    return (
      <>
        <Header />
        <main className="flex-1 bg-transparent">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center mb-8">
              <h1
                className="text-3xl font-bold text-white"
                style={{ fontFamily: 'var(--font-bebas)' }}
              >
                Your Work Profile
              </h1>
              <p className="text-white/50 mt-2">
                Based on your answers, here are your top work preferences
              </p>
            </div>

            <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
              <h3 className="font-semibold text-white mb-4">Your Top Traits</h3>
              <div className="space-y-3">
                {topTags.map(([tag, score], i) => (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white capitalize">
                          {tag.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-blue-400">{score} pts</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${(score / topTags[0][1]) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-white/50">
                      Your preferences have been saved. View matched jobs based on your profile.
                    </p>
                    <button
                      onClick={() => router.push('/jobs')}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20"
                    >
                      View Matched Jobs
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-white/50">
                      Sign up to save your results and get matched with jobs that fit your profile.
                    </p>
                    <button
                      onClick={() => router.push('/auth?mode=signup&role=candidate')}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20"
                    >
                      Sign Up to Save Results
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setAnswers({});
                setCurrentQuestion(0);
                setShowResults(false);
              }}
              className="mt-4 w-full py-2.5 text-white/40 hover:text-white/60 text-sm transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        </main>
      </>
    );
  }

  const question = QUIZ_QUESTIONS[currentQuestion];

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">
                Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
              </span>
              <span className="text-xs text-white/40">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Category + Icon */}
          <div className="text-center mb-6">
            <div
              className={`w-16 h-16 mx-auto bg-gradient-to-br ${question.color} rounded-xl flex items-center justify-center mb-4`}
            >
              <span className="text-3xl">{question.icon}</span>
            </div>
            <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">
              {question.category}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-2xl font-bold text-white text-center mb-8">{question.question}</h2>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`w-full text-left px-6 py-4 rounded-xl transition-all ${
                  answers[currentQuestion] === i
                    ? 'bg-blue-600/20 ring-2 ring-blue-500 text-white'
                    : 'bg-[#0F172A] ring-1 ring-white/10 text-white/70 hover:ring-white/20 hover:bg-[#0F172A]/80'
                }`}
              >
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          {currentQuestion > 0 && (
            <button
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="mt-6 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Previous question
            </button>
          )}
        </div>
      </main>
    </>
  );
}

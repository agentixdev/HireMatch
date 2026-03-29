'use client';

import { motion } from 'framer-motion';
import Header from '@/components/Header';

interface MatchmakerLandingProps {
  onStart: () => void;
}

export default function MatchmakerLanding({ onStart }: MatchmakerLandingProps) {
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
            onClick={onStart}
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

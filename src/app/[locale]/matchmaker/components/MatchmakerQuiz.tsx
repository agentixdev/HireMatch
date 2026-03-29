'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import type { QuizQuestion } from '../types';

interface MatchmakerQuizProps {
  questions: QuizQuestion[];
  step: number;
  direction: number;
  selectedOption: number | null;
  onAnswer: (index: number) => void;
  onBack: () => void;
}

const optionLetters = ['A', 'B', 'C', 'D'];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
};

export default function MatchmakerQuiz({
  questions,
  step,
  direction,
  selectedOption,
  onAnswer,
  onBack,
}: MatchmakerQuizProps) {
  const question = questions[step];

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
            animate={{ opacity: step / questions.length }}
            style={{
              background: `linear-gradient(90deg, ${question.colorHex}00, ${question.colorHex}40, ${question.colorHex}00)`,
            }}
          />
        </div>

        <div className="relative px-4 pt-4 pb-20 max-w-2xl mx-auto">
          {/* Segmented Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-white/25 tabular-nums">
                {step + 1} / {questions.length}
              </span>
            </div>
            <div className="flex gap-1.5 relative">
              {questions.map((q, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                  {i <= step && (
                    <div
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        backgroundColor: i < step ? q.colorHex : question.colorHex,
                        width: '100%',
                        animation:
                          i === step ? 'barGrow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                        boxShadow: i < step ? '0 0 8px ' + q.colorHex + '40' : undefined,
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

          {/* Quiz Card */}
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
                    <motion.span
                      className="text-[11px] font-black uppercase tracking-[3px] inline-block"
                      style={{ color: question.colorHex }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      {question.topic}
                    </motion.span>
                  </div>

                  {/* Question */}
                  <div className="mb-6 sm:mb-8 mt-4">
                    <motion.h2
                      className="text-2xl sm:text-3xl font-bold text-white leading-[1.15] whitespace-pre-line"
                      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      {question.q}
                    </motion.h2>
                  </div>

                  {/* Options - CNN-style */}
                  <div className="space-y-3">
                    {question.opts.map((opt, i) => {
                      const isSelected = selectedOption === i;
                      const isDimmed = selectedOption !== null && selectedOption !== i;

                      return (
                        <motion.button
                          key={i}
                          onClick={() => onAnswer(i)}
                          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
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
                                transform: isSelected ? 'scale(1.15) rotate(360deg)' : 'scale(1)',
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
                      whileHover={{ x: -3 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onBack}
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

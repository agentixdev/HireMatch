'use client';

import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { springSnappy, springBouncy } from '@/lib/wow';
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
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0, filter: 'blur(6px)' }),
  center: { x: 0, opacity: 1, filter: 'blur(0px)' },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0, filter: 'blur(6px)' }),
};

// Derive the dominant personality insight from a tagWeights object
function getInsightLabel(tagWeights: Record<string, number>): string {
  const insightMap: Record<string, string> = {
    autonomy: 'You value autonomy',
    independence: 'Independent thinker',
    leadership: 'Natural leader',
    teamwork: 'Team player detected',
    collaboration: 'Built for collaboration',
    creativity: 'Creative spirit',
    innovation: 'Innovation-driven',
    stability: 'You crave stability',
    structure: 'Structure-oriented',
    flexibility: 'Adaptable mindset',
    remote: 'Remote-first mindset',
    onsite: 'You love the office',
    hybrid: 'Balanced work style',
    growth: 'Growth-focused',
    learning: 'Lifelong learner',
    impact: 'Impact-driven',
    compensation: 'ROI thinker',
    mission: 'Mission-aligned',
    startup: 'Startup energy',
    enterprise: 'Enterprise-minded',
    speed: 'Move-fast mentality',
    process: 'Process lover',
    data: 'Data-driven',
    people: 'People-first',
    technical: 'Deep-tech focus',
    mentorship: 'Mentor mindset',
    recognition: 'Recognition matters',
  };

  let topTag = '';
  let topWeight = -Infinity;
  for (const [tag, weight] of Object.entries(tagWeights)) {
    if (weight > topWeight) {
      topWeight = weight;
      topTag = tag;
    }
  }

  return insightMap[topTag] ?? 'Insight unlocked';
}

// Flip number digit component
function FlipDigit({ value }: { value: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ y: -20, opacity: 0, rotateX: -90 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        exit={{ y: 20, opacity: 0, rotateX: 90 }}
        transition={springSnappy}
        className="inline-block tabular-nums"
        style={{ display: 'inline-block', perspective: 400 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

// Streak counter badge
function StreakBadge({ count }: { count: number }) {
  if (count < 2) return null;
  const label = count >= 5 ? `🔥🔥 ${count} in a row!` : `🔥 ${count} in a row`;
  return (
    <AnimatePresence>
      <motion.div
        key={count}
        initial={{ scale: 0.5, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: -10 }}
        transition={springBouncy}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-[1.5px] select-none"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 100%)',
          border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24',
        }}
      >
        {label}
      </motion.div>
    </AnimatePresence>
  );
}

// Personality insight chip
function InsightChip({ text, colorHex }: { text: string; colorHex: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -8 }}
      transition={springBouncy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[1.5px] select-none"
      style={{
        background: colorHex + '18',
        border: `1px solid ${colorHex}35`,
        color: colorHex,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: colorHex }}
      />
      {text}
    </motion.div>
  );
}

// Progress segment with pulse + particle
function ProgressSegment({
  index,
  step,
  question,
  segmentQuestion,
  isJustFilled,
}: {
  index: number;
  step: number;
  question: QuizQuestion;
  segmentQuestion: QuizQuestion;
  isJustFilled: boolean;
}) {
  const isFilled = index < step;
  const isCurrent = index === step;
  const isEmpty = index > step;

  return (
    <div className="relative flex-1 h-1.5 rounded-full overflow-visible bg-white/[0.06]">
      {!isEmpty && (
        <div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            backgroundColor: isFilled ? segmentQuestion.colorHex : question.colorHex,
            width: '100%',
            animation: isCurrent ? 'barGrow 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
            boxShadow: isFilled
              ? `0 0 8px ${segmentQuestion.colorHex}50`
              : isCurrent
              ? `0 0 12px ${question.colorHex}60`
              : undefined,
          }}
        >
          {isCurrent && (
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
          {isJustFilled && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0.8, scaleX: 1 }}
              animate={{ opacity: 0, scaleX: 1.5 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ backgroundColor: segmentQuestion.colorHex }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function MatchmakerQuiz({
  questions,
  step,
  direction,
  selectedOption,
  onAnswer,
  onBack,
}: MatchmakerQuizProps) {
  const question = questions[step];

  // Streak tracking
  const [streak, setStreak] = useState(0);
  const lastAnswerTime = useRef<number | null>(null);
  const QUICK_ANSWER_MS = 4000; // answer within 4 seconds = streak

  // Insight chip
  const [insight, setInsight] = useState<string | null>(null);

  // Track which segment was just filled for pulse
  const [justFilledSegment, setJustFilledSegment] = useState<number | null>(null);

  // Previous step to detect advancement
  const prevStep = useRef(step);

  useEffect(() => {
    if (step > prevStep.current) {
      setJustFilledSegment(step - 1);
      const t = setTimeout(() => setJustFilledSegment(null), 600);
      prevStep.current = step;
      return () => clearTimeout(t);
    }
    prevStep.current = step;
  }, [step]);

  // Handle answer selection for streak + insight
  const handleAnswer = (index: number) => {
    const now = performance.now();

    // Streak logic
    if (lastAnswerTime.current !== null) {
      const elapsed = now - lastAnswerTime.current;
      if (elapsed <= QUICK_ANSWER_MS) {
        setStreak((s) => s + 1);
      } else {
        setStreak(1);
      }
    } else {
      setStreak(1);
    }
    lastAnswerTime.current = now;

    // Insight from dominant tag of chosen option
    const weights = question.tagWeights[index];
    if (weights) {
      setInsight(getInsightLabel(weights));
    }

    onAnswer(index);
  };

  // Clear insight when step changes
  useEffect(() => {
    const t = setTimeout(() => setInsight(null), 1600);
    return () => clearTimeout(t);
  }, [step]);

  // Reset streak when question changes without quick answer (handled via lastAnswerTime)
  // Also clear insight immediately on new question arrival
  useEffect(() => {
    setInsight(null);
  }, [step]);

  const stepStr = String(step + 1);
  const totalStr = String(questions.length);

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
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[120px]"
            style={{ backgroundColor: question.colorHex + '14' }}
          />
          <motion.div
            key={`glow2-${step}`}
            className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: question.colorHex + '09' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Progress heat line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            animate={{ opacity: step / questions.length }}
            style={{
              background: `linear-gradient(90deg, ${question.colorHex}00, ${question.colorHex}50, ${question.colorHex}00)`,
            }}
          />
        </div>

        <div className="relative px-4 pt-4 pb-20 max-w-2xl mx-auto">
          {/* Header row: step counter + streak badge */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* Morphing step counter */}
              <span className="text-[13px] font-mono text-white/30 tabular-nums flex items-center">
                <FlipDigit value={stepStr} />
                <span className="mx-0.5 text-white/15">/</span>
                <span className="text-white/15">{totalStr}</span>
              </span>
            </div>

            {/* Streak badge */}
            <StreakBadge count={streak} />
          </div>

          {/* Enhanced Segmented Progress Bar */}
          <div className="mb-5">
            <div className="flex gap-1.5 relative">
              {questions.map((q, i) => (
                <ProgressSegment
                  key={i}
                  index={i}
                  step={step}
                  question={question}
                  segmentQuestion={q}
                  isJustFilled={justFilledSegment === i}
                />
              ))}
            </div>
          </div>

          {/* Quiz Card */}
          <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6 sm:p-8 md:p-10">
            <div className="relative overflow-visible" style={{ minHeight: 420 }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ ...springSnappy, duration: 0.38 }}
                  className="w-full"
                >
                  {/* Topic label + insight chip row */}
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <motion.span
                      className="text-[11px] font-black uppercase tracking-[3px] inline-block"
                      style={{ color: question.colorHex }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={springSnappy}
                    >
                      {question.topic}
                    </motion.span>

                    {/* Personality insight chip - shown briefly after selection */}
                    <AnimatePresence>
                      {insight && (
                        <InsightChip key={insight} text={insight} colorHex={question.colorHex} />
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Question */}
                  <div className="mb-6 sm:mb-8 mt-4">
                    <motion.h2
                      className="text-2xl sm:text-3xl font-bold text-white leading-[1.15] whitespace-pre-line"
                      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={springBouncy}
                    >
                      {question.q}
                    </motion.h2>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {question.opts.map((opt, i) => {
                      const isSelected = selectedOption === i;
                      const isDimmed = selectedOption !== null && selectedOption !== i;

                      return (
                        <OptionCard
                          key={i}
                          index={i}
                          opt={opt}
                          isSelected={isSelected}
                          isDimmed={isDimmed}
                          disabled={selectedOption !== null}
                          colorHex={question.colorHex}
                          onAnswer={handleAnswer}
                        />
                      );
                    })}
                  </div>

                  {/* Back button — enhanced */}
                  {step > 0 && selectedOption === null && (
                    <motion.button
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...springSnappy, delay: 0.25 }}
                      whileHover={{ x: -5, scale: 1.04 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={onBack}
                      className="mt-8 flex items-center gap-2 cursor-pointer group"
                      style={{ transition: 'none' }}
                    >
                      <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center border"
                        style={{
                          borderColor: 'rgba(255,255,255,0.12)',
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        }}
                        whileHover={{
                          backgroundColor: question.colorHex + '18',
                          borderColor: question.colorHex + '50',
                        }}
                        transition={springSnappy}
                      >
                        <svg
                          className="h-3.5 w-3.5 text-white/40 group-hover:text-white/80 transition-colors"
                          aria-hidden="true"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                      </motion.div>
                      <span className="text-[11px] text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-[2px] font-bold">
                        Back
                      </span>
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
          @keyframes segPulse {
            0% { box-shadow: 0 0 0px var(--seg-color); }
            50% { box-shadow: 0 0 10px var(--seg-color); }
            100% { box-shadow: 0 0 0px var(--seg-color); }
          }
        `}</style>
      </div>
    </>
  );
}

// Extracted option card to allow hover glow in question colorHex
function OptionCard({
  index,
  opt,
  isSelected,
  isDimmed,
  disabled,
  colorHex,
  onAnswer,
}: {
  index: number;
  opt: string;
  isSelected: boolean;
  isDimmed: boolean;
  disabled: boolean;
  colorHex: string;
  onAnswer: (i: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      key={index}
      onClick={() => onAnswer(index)}
      initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
      animate={{
        opacity: isDimmed ? 0.15 : 1,
        y: 0,
        filter: 'blur(0px)',
        scale: isSelected ? 1.02 : isDimmed ? 0.98 : 1,
      }}
      transition={index === 0 ? springBouncy : { ...springBouncy, delay: index * 0.07 }}
      whileHover={!disabled ? { x: 4 } : {}}
      whileTap={!disabled ? { scale: 0.975 } : {}}
      disabled={disabled}
      onHoverStart={() => !disabled && setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="w-full text-left flex items-center gap-0 rounded-xl overflow-hidden cursor-pointer disabled:cursor-default group relative"
      style={{
        boxShadow:
          hovered && !disabled
            ? `0 0 0 1.5px ${colorHex}40, 0 0 24px ${colorHex}18`
            : isSelected
            ? `0 0 0 1.5px ${colorHex}60, 0 0 32px ${colorHex}25`
            : undefined,
        transition: 'box-shadow 0.2s ease, opacity 0.25s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Left accent bar */}
      <motion.div
        className="self-stretch rounded-l flex-shrink-0"
        animate={{
          width: isSelected ? 6 : hovered ? 5 : 4,
          opacity: isSelected ? 1 : hovered ? 0.7 : 0.4,
        }}
        transition={springSnappy}
        style={{ backgroundColor: colorHex }}
      />

      {/* Fill bar animation on select */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-r"
          style={{ backgroundColor: colorHex + '18' }}
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Hover glow fill */}
      {hovered && !disabled && !isSelected && (
        <motion.div
          className="absolute inset-0 rounded-r pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ backgroundColor: colorHex + '08' }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Pulse ring burst on select */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          initial={{ boxShadow: `0 0 0 0px ${colorHex}60` }}
          animate={{ boxShadow: '0 0 0 20px transparent' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="relative flex items-center gap-3 w-full py-4 px-5 sm:px-6">
        {/* Letter badge */}
        <motion.div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-bold"
          animate={{
            backgroundColor: isSelected ? colorHex : hovered ? colorHex + '22' : 'rgba(255,255,255,0.06)',
            color: isSelected ? '#000' : hovered ? colorHex : 'rgba(255,255,255,0.35)',
            scale: isSelected ? 1.15 : 1,
            rotate: isSelected ? 360 : 0,
          }}
          transition={springSnappy}
          style={{
            borderWidth: 1,
            borderColor: isSelected ? colorHex : hovered ? colorHex + '50' : 'rgba(255,255,255,0.08)',
          }}
        >
          {isSelected ? (
            <motion.svg
              className="w-4 h-4"
              aria-hidden="true"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            optionLetters[index]
          )}
        </motion.div>

        {/* Option text */}
        <motion.span
          className="text-[14px] sm:text-[16px] font-semibold"
          animate={{
            color: isSelected ? '#fff' : hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)',
          }}
          transition={springSnappy}
        >
          {opt}
        </motion.span>

        {/* Selection success dot */}
        {isSelected && (
          <motion.div
            className="ml-auto flex-shrink-0"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBouncy}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${colorHex}30` }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colorHex }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}

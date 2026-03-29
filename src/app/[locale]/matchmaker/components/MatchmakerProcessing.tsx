'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import type { ProcessingStage } from '../types';

interface MatchmakerProcessingProps {
  processingStage: number;
  stages: ProcessingStage[];
  topColor: string;
  showResultsFlash: boolean;
}

export default function MatchmakerProcessing({
  processingStage,
  stages,
  topColor,
  showResultsFlash,
}: MatchmakerProcessingProps) {
  const stageColors = ['rgba(59,130,246,0.08)', 'rgba(99,102,241,0.10)', 'rgba(168,85,247,0.12)', 'rgba(34,197,94,0.10)'];
  const progressPercent = Math.round(((processingStage + 1) / stages.length) * 100);

  return (
    <>
      <Header />
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
        {/* Temperature-shifting background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundColor: stageColors[processingStage] || stageColors[0],
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
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
          {/* Data stream lines */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={`stream-${i}`}
              className="absolute w-px"
              style={{
                left: `${8 + i * 8}%`,
                top: '-20%',
                height: '30%',
                background: `linear-gradient(180deg, transparent, ${topColor}30, transparent)`,
              }}
              animate={{
                y: ['-20vh', '120vh'],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 2 + (i % 3) * 0.5,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'linear',
              }}
            />
          ))}
        </div>

        <motion.div
          className="relative text-center px-4 max-w-md"
          animate={showResultsFlash ? { scale: 1.02 } : { scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Results flash ring pulse */}
          <AnimatePresence>
            {showResultsFlash && (
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={{ boxShadow: `0 0 0 0px ${topColor}60` }}
                animate={{ boxShadow: `0 0 0 40px ${topColor}00` }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>

          {/* Spinning dual-ring loader */}
          <motion.div
            className="mx-auto w-20 h-20 rounded-full mb-8 relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            {/* Breathing glow ring */}
            <motion.div
              className="absolute -inset-3 rounded-full"
              style={{ border: `1px solid ${topColor}20` }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.6, 0.3],
                borderColor: [`${topColor}20`, `${topColor}50`, `${topColor}20`],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
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

          {/* Stages with connector lines and sublabels */}
          <div className="space-y-0">
            {stages.map((stage, i) => (
              <div key={i}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: processingStage >= i ? 1 : 0.15,
                    x: processingStage >= i ? 0 : -20,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex flex-col items-center flex-shrink-0">
                    <motion.div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ring-1 ${
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
                          transition={{ type: 'spring', stiffness: 600, damping: 12 }}
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
                    {/* Connector line between stages */}
                    {i < stages.length - 1 && (
                      <div
                        className={`w-px h-6 border-l border-dashed ${
                          processingStage > i ? 'border-green-500/30' : 'border-white/10'
                        }`}
                      />
                    )}
                  </div>
                  <div className="pt-1 text-left">
                    <span
                      className={`text-sm font-medium block ${
                        processingStage > i
                          ? 'text-green-400/70'
                          : processingStage === i
                            ? 'text-white/80'
                            : 'text-white/20'
                      }`}
                      style={processingStage === i ? { textShadow: `0 0 20px ${topColor}60` } : undefined}
                    >
                      {stage.label}
                    </span>
                    <motion.span
                      className={`text-xs block mt-0.5 ${
                        processingStage > i
                          ? 'text-green-400/40'
                          : processingStage === i
                            ? 'text-white/40'
                            : 'text-white/10'
                      }`}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{
                        opacity: processingStage >= i ? 1 : 0,
                        y: processingStage >= i ? 0 : -4,
                      }}
                      transition={{ delay: 0.15, duration: 0.3 }}
                    >
                      {stage.sublabel}
                    </motion.span>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <motion.div className="mt-8 h-1 rounded-full bg-white/[0.06] overflow-hidden relative">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: topColor }}
              initial={{ width: '0%' }}
              animate={{
                width: `${((processingStage + 1) / stages.length) * 100}%`,
              }}
              transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            />
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>

          {/* Progress percentage */}
          <AnimatePresence mode="wait">
            <motion.p
              className="mt-2 text-xs font-mono text-white/40"
              key={progressPercent}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
            >
              {progressPercent}%
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}

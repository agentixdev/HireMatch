'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured error report to console (Vercel captures these)
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Client error boundary caught an error',
        timestamp: new Date().toISOString(),
        context: {
          errorMessage: error.message,
          digest: error.digest,
          stack: error.stack,
        },
      }),
    );
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: '#0d0f1a',
        animation: 'fadeInUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239, 68, 68, 0.15)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white mb-3">
          Something went wrong
        </h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          We hit an unexpected error. This has been logged and our team will look into it.
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:brightness-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

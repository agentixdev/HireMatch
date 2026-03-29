'use client';

import ErrorBoundary from '@/components/ErrorBoundary';

export default function MatchmakerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120]">
          <div className="text-center px-6 py-10 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] max-w-lg">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Matchmaker encountered an error</h2>
            <p className="text-white/60 text-sm mb-6">
              Something went wrong while running the quiz. Please refresh and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

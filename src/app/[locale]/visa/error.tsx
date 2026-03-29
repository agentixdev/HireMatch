'use client';

import { useEffect } from 'react';

export default function VisaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Visa error:', error); }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A]">
      <div className="text-center px-4 max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Visa information couldn&apos;t be loaded</h2>
        <p className="text-white/50 text-sm mb-6">We had trouble loading the visa compliance data. Please try again.</p>
        <button onClick={reset} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors">
          Try Again
        </button>
      </div>
    </div>
  );
}

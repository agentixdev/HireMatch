'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function VisaPaywall({
  isLoggedIn,
  lockedCount,
  locale,
}: {
  isLoggedIn: boolean;
  lockedCount: number;
  locale: string;
}) {
  return (
    <div className="relative mt-8">
      {/* Gradient fade overlay */}
      <div className="absolute -top-20 left-0 right-0 h-20 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none z-10" />

      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 ring-1 ring-indigo-500/20 rounded-2xl p-8 sm:p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 ring-1 ring-indigo-500/30 mb-6">
          <Icon icon="solar:lock-keyhole-bold" className="w-8 h-8 text-indigo-400" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-3">
          Unlock All Visa Data
        </h3>
        <p className="text-white/50 max-w-lg mx-auto mb-2">
          {lockedCount} more {lockedCount === 1 ? 'country' : 'countries'} available
          with a Pro plan. Get full access to visa types, requirements, processing
          times, and costs across all 29 countries.
        </p>
        <p className="text-white/30 text-sm mb-8">
          Data scraped from official government sources and updated regularly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isLoggedIn ? (
            <Link
              href={`/${locale}/dashboard/recruiter/billing`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
            >
              <Icon icon="solar:crown-bold" className="w-5 h-5" />
              Upgrade to Pro — $99/mo
            </Link>
          ) : (
            <>
              <Link
                href={`/${locale}/auth?tab=signup&role=recruiter`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
              >
                <Icon icon="solar:user-plus-bold" className="w-5 h-5" />
                Sign Up as Recruiter
              </Link>
              <Link
                href={`/${locale}/auth?tab=login`}
                className="inline-flex items-center gap-2 px-5 py-3 ring-1 ring-white/20 hover:ring-white/40 text-white/70 hover:text-white rounded-xl transition-all"
              >
                Already have an account? Log in
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
          {[
            { icon: 'solar:globe-bold', text: '29 countries covered' },
            { icon: 'solar:refresh-bold', text: 'Updated regularly' },
            { icon: 'solar:shield-check-bold', text: 'Official sources' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2 text-sm text-white/40">
              <Icon icon={item.icon} className="w-4 h-4 text-indigo-400/60 flex-shrink-0" />
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

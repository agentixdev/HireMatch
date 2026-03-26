'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Header() {
  const t = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-xl text-gray-900">{t('appName')}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/jobs" className="text-gray-600 hover:text-gray-900 transition-colors">
              {t('jobs')}
            </Link>
            <Link href="/candidates" className="text-gray-600 hover:text-gray-900 transition-colors">
              {t('candidates')}
            </Link>
            <Link href="/matchmaker" className="text-gray-600 hover:text-gray-900 transition-colors">
              {t('matchmaker')}
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
              {t('pricing')}
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth?mode=signin"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/auth?mode=signup"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {t('signUp')}
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-600"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/jobs" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              {t('jobs')}
            </Link>
            <Link href="/candidates" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              {t('candidates')}
            </Link>
            <Link href="/matchmaker" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              {t('matchmaker')}
            </Link>
            <Link href="/pricing" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
              {t('pricing')}
            </Link>
            <div className="border-t pt-2 mt-2 space-y-2">
              <Link href="/auth?mode=signin" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                {t('signIn')}
              </Link>
              <Link
                href="/auth?mode=signup"
                className="block px-3 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-center"
              >
                {t('signUp')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

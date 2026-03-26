'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Icon } from '@iconify/react';

export default function Header() {
  const t = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: '/jobs', label: t('jobs'), iconBold: 'solar:suitcase-bold', iconLinear: 'solar:suitcase-linear' },
    { href: '/candidates', label: t('candidates'), iconBold: 'solar:users-group-rounded-bold', iconLinear: 'solar:users-group-rounded-linear' },
    { href: '/matchmaker', label: t('matchmaker'), iconBold: 'solar:heart-pulse-bold', iconLinear: 'solar:heart-pulse-linear' },
    { href: '/pricing', label: t('pricing'), iconBold: 'solar:tag-price-bold', iconLinear: 'solar:tag-price-linear' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0d0f1a]/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg text-white">{t('appName')}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm"
              >
                <Icon icon={item.iconLinear} className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/auth?mode=signin"
              className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/auth?mode=signup"
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              {t('signUp')}
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
            aria-label="Toggle menu"
          >
            <Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-white/[0.06] pt-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
                onClick={() => setMenuOpen(false)}
              >
                <Icon icon={item.iconLinear} className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] pt-3 mt-3 space-y-2">
              <Link href="/auth?mode=signin" className="block px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                {t('signIn')}
              </Link>
              <Link
                href="/auth?mode=signup"
                className="block px-3 py-2.5 text-white text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-medium"
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

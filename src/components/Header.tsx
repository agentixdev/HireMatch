'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState, useMemo, useCallback } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

interface NavItem {
  href: string;
  label: string;
  iconBold: string;
  iconLinear: string;
}

const NavLink = React.memo(function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className="group relative flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all text-sm"
    >
      <Icon icon={item.iconLinear} className="w-4 h-4" />
      {item.label}
      <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-200" />
    </Link>
  );
});

const MobileNavLink = React.memo(function MobileNavLink({
  item,
  index,
  onClose,
}: {
  item: NavItem;
  index: number;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Link
        href={item.href}
        className="flex items-center gap-3 px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
        onClick={onClose}
      >
        <Icon icon={item.iconLinear} className="w-5 h-5" />
        {item.label}
      </Link>
    </motion.div>
  );
});

export default function Header() {
  const t = useTranslations('common');
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = useMemo<NavItem[]>(() => [
    { href: '/jobs', label: t('jobs'), iconBold: 'solar:suitcase-bold', iconLinear: 'solar:suitcase-linear' },
    { href: '/talent', label: t('talent'), iconBold: 'solar:users-group-rounded-bold', iconLinear: 'solar:users-group-rounded-linear' },
    { href: '/companies', label: t('companies'), iconBold: 'solar:buildings-bold', iconLinear: 'solar:buildings-linear' },
    { href: '/matchmaker', label: t('matchmaker'), iconBold: 'solar:heart-pulse-bold', iconLinear: 'solar:heart-pulse-linear' },
    { href: '/pricing', label: t('pricing'), iconBold: 'solar:tag-price-bold', iconLinear: 'solar:tag-price-linear' },
    { href: '/visa', label: 'Visas', iconBold: 'solar:passport-bold', iconLinear: 'solar:passport-linear' },
    { href: '/developers', label: 'API', iconBold: 'solar:code-square-bold', iconLinear: 'solar:code-square-linear' },
  ], [t]);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

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
              <NavLink key={item.href} item={item} />
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
            onClick={toggleMenu}
            className="md:hidden p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg"
            aria-label="Toggle menu"
          >
            <Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pb-4 space-y-1 border-t border-white/[0.06] pt-3">
                {navItems.map((item, i) => (
                  <MobileNavLink key={item.href} item={item} index={i} onClose={closeMenu} />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

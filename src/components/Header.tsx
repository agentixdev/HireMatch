'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import NotificationBell from './NotificationBell';

/* ── Language config ── */
const LOCALE_LABELS: Record<string, { flag: string; name: string }> = {
  en: { flag: '🇺🇸', name: 'English' },
  fr: { flag: '🇫🇷', name: 'Français' },
  es: { flag: '🇪🇸', name: 'Español' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  it: { flag: '🇮🇹', name: 'Italiano' },
  pt: { flag: '🇵🇹', name: 'Português' },
  nl: { flag: '🇳🇱', name: 'Nederlands' },
  sv: { flag: '🇸🇪', name: 'Svenska' },
  da: { flag: '🇩🇰', name: 'Dansk' },
  no: { flag: '🇳🇴', name: 'Norsk' },
  fi: { flag: '🇫🇮', name: 'Suomi' },
  pl: { flag: '🇵🇱', name: 'Polski' },
  cs: { flag: '🇨🇿', name: 'Čeština' },
  ro: { flag: '🇷🇴', name: 'Română' },
  hi: { flag: '🇮🇳', name: 'हिन्दी' },
  ja: { flag: '🇯🇵', name: '日本語' },
  ko: { flag: '🇰🇷', name: '한국어' },
  zh: { flag: '🇨🇳', name: '中文' },
  vi: { flag: '🇻🇳', name: 'Tiếng Việt' },
  tl: { flag: '🇵🇭', name: 'Tagalog' },
};

interface NavItem {
  href: string;
  label: string;
  iconBold: string;
  iconLinear: string;
}

type UserRole = 'candidate' | 'recruiter' | null;

const NavLink = React.memo(function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
        isActive ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon icon={item.iconLinear} className="w-4 h-4" />
      {item.label}
      {isActive && (
        <motion.span
          layoutId="active-nav"
          className="absolute bottom-0 left-3 right-3 h-[2px] bg-blue-500 rounded-full"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
    </Link>
  );
});

const MobileNavLink = React.memo(function MobileNavLink({
  item, index, isActive, onClose,
}: {
  item: NavItem; index: number; isActive: boolean; onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
          isActive ? 'text-blue-400 bg-blue-500/10' : 'text-white/70 hover:text-white hover:bg-white/5'
        }`}
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
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const langRef = useRef<HTMLDivElement>(null);

  const currentLocale = LOCALE_LABELS[locale] || LOCALE_LABELS.en;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ id: u.id, email: u.email ?? undefined });
        supabase.from('profiles').select('role').eq('user_id', u.id).maybeSingle().then(({ data }) => {
          setUserRole((data?.role as UserRole) || 'candidate');
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    if (langOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [langOpen]);

  const switchLocale = useCallback((newLocale: string) => {
    const segments = pathname?.split('/') || [];
    if (segments.length > 1 && Object.keys(LOCALE_LABELS).includes(segments[1])) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    router.push(segments.join('/') || `/${newLocale}`);
    setLangOpen(false);
    setMenuOpen(false);
  }, [pathname, router]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    router.push('/');
  }, [router]);

  const isAuthPage = pathname?.includes('/auth');
  const dashboardPath = userRole === 'recruiter' ? '/dashboard/recruiter' : '/dashboard/candidate';

  const isActivePath = useCallback((href: string) => {
    if (!pathname) return false;
    const cleanPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
    return cleanPath === href || cleanPath.startsWith(href + '/');
  }, [pathname]);

  const navItems = useMemo<NavItem[]>(() => [
    { href: '/jobs', label: t('jobs'), iconBold: 'solar:suitcase-bold', iconLinear: 'solar:suitcase-linear' },
    { href: '/companies', label: t('companies'), iconBold: 'solar:buildings-bold', iconLinear: 'solar:buildings-linear' },
    { href: '/matchmaker', label: t('matchmaker'), iconBold: 'solar:heart-pulse-bold', iconLinear: 'solar:heart-pulse-linear' },
    { href: '/pricing', label: t('pricing'), iconBold: 'solar:tag-price-bold', iconLinear: 'solar:tag-price-linear' },
    { href: '/visa', label: 'Visas', iconBold: 'solar:passport-bold', iconLinear: 'solar:passport-linear' },
  ], [t]);

  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <header className="sticky top-0 z-50 bg-[#0d0f1a]/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-bold text-lg text-white">{t('appName')}</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} isActive={isActivePath(item.href)} />
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((p) => !p)}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                aria-label="Change language"
              >
                <span className="text-base">{currentLocale.flag}</span>
                <span className="text-xs">{locale.toUpperCase()}</span>
                <Icon icon="solar:alt-arrow-down-linear" className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="absolute right-0 top-full mt-1 z-50 w-64 max-h-80 overflow-y-auto bg-[#151929] ring-1 ring-white/10 rounded-xl shadow-xl shadow-black/40"
                  >
                    <div className="p-1.5 grid grid-cols-2 gap-0.5">
                      {Object.entries(LOCALE_LABELS).map(([code, { flag, name }]) => (
                        <button
                          key={code}
                          onClick={() => switchLocale(code)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                            code === locale
                              ? 'bg-blue-600/20 text-blue-300 font-medium'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <span className="text-sm">{flag}</span>
                          <span className="truncate">{name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NotificationBell />

            {user ? (
              <div className="relative group">
                <button
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                  onClick={() => router.push(dashboardPath)}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white/10">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden lg:inline max-w-[100px] truncate text-xs">{user.email}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#151929] ring-1 ring-white/10 rounded-xl shadow-xl shadow-black/40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-1.5 space-y-0.5">
                    <Link href={dashboardPath} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5">
                      <Icon icon="solar:chart-square-linear" className="w-4 h-4" />
                      {t('dashboard')}
                    </Link>
                    <Link href={`${dashboardPath}/profile`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5">
                      <Icon icon="solar:user-circle-linear" className="w-4 h-4" />
                      Profile
                    </Link>
                    <div className="border-t border-white/[0.06] my-1" />
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/5 cursor-pointer"
                    >
                      <Icon icon="solar:logout-2-linear" className="w-4 h-4" />
                      {t('signOut')}
                    </button>
                  </div>
                </div>
              </div>
            ) : !isAuthPage ? (
              <>
                <Link href="/auth?mode=signin" className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  {t('signIn')}
                </Link>
                <Link href="/auth?mode=signup" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
                  {t('signUp')}
                </Link>
              </>
            ) : null}
          </div>

          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => { setLangOpen(!langOpen); setMenuOpen(false); }}
              className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
              aria-label="Change language"
            >
              <span className="text-base">{currentLocale.flag}</span>
            </button>
            <button onClick={toggleMenu} className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer" aria-label="Toggle menu">
              <Icon icon={menuOpen ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} className="w-6 h-6" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {langOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden overflow-hidden"
            >
              <div className="pb-3 pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-1">
                {Object.entries(LOCALE_LABELS).map(([code, { flag, name }]) => (
                  <button
                    key={code}
                    onClick={() => switchLocale(code)}
                    className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-xs cursor-pointer ${
                      code === locale ? 'bg-blue-600/20 text-blue-300' : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{flag}</span>
                    <span className="truncate">{name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <MobileNavLink key={item.href} item={item} index={i} isActive={isActivePath(item.href)} onClose={closeMenu} />
                ))}
                <div className="border-t border-white/[0.06] pt-3 mt-3 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <NotificationBell />
                    <span className="text-sm text-white/70">Notifications</span>
                  </div>
                  {user ? (
                    <>
                      <Link href={dashboardPath} onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                        <Icon icon="solar:chart-square-linear" className="w-5 h-5" />
                        {t('dashboard')}
                      </Link>
                      <button
                        onClick={() => { handleSignOut(); closeMenu(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 rounded-lg cursor-pointer"
                      >
                        <Icon icon="solar:logout-2-linear" className="w-5 h-5" />
                        {t('signOut')}
                      </button>
                    </>
                  ) : !isAuthPage ? (
                    <>
                      <Link href="/auth?mode=signin" onClick={closeMenu} className="block px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg">
                        {t('signIn')}
                      </Link>
                      <Link href="/auth?mode=signup" onClick={closeMenu} className="block px-3 py-2.5 text-white text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-medium">
                        {t('signUp')}
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { createClient } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  role: 'candidate' | 'recruiter';
  userName?: string;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  iconActive: string;
}

const candidateNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/candidate', icon: 'solar:home-2-linear', iconActive: 'solar:home-2-bold' },
  { label: 'My Profile', href: '/dashboard/candidate/profile', icon: 'solar:user-linear', iconActive: 'solar:user-bold' },
  { label: 'AI Coach', href: '/dashboard/candidate/ai-coach', icon: 'solar:magic-stick-3-linear', iconActive: 'solar:magic-stick-3-bold' },
  { label: 'Applications', href: '/dashboard/candidate/applications', icon: 'solar:document-text-linear', iconActive: 'solar:document-text-bold' },
  { label: 'Matchmaker', href: '/matchmaker', icon: 'solar:heart-pulse-linear', iconActive: 'solar:heart-pulse-bold' },
  { label: 'Settings', href: '/dashboard/candidate/settings', icon: 'solar:settings-linear', iconActive: 'solar:settings-bold' },
];

const recruiterNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/recruiter', icon: 'solar:home-2-linear', iconActive: 'solar:home-2-bold' },
  { label: 'Post Job', href: '/dashboard/recruiter/post-job', icon: 'solar:add-circle-linear', iconActive: 'solar:add-circle-bold' },
  { label: 'Applications', href: '/dashboard/recruiter/applications', icon: 'solar:widget-5-linear', iconActive: 'solar:widget-5-bold' },
  { label: 'Search', href: '/dashboard/recruiter/search', icon: 'solar:magnifer-linear', iconActive: 'solar:magnifer-bold' },
  { label: 'Company', href: '/dashboard/recruiter/profile', icon: 'solar:buildings-2-linear', iconActive: 'solar:buildings-2-bold' },
  { label: 'Billing', href: '/dashboard/recruiter/billing', icon: 'solar:card-linear', iconActive: 'solar:card-bold' },
  { label: 'Settings', href: '/dashboard/recruiter/settings', icon: 'solar:settings-linear', iconActive: 'solar:settings-bold' },
];

export default function DashboardLayout({ role, userName, children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = role === 'candidate' ? candidateNav : recruiterNav;
  const mobileNavItems = navItems.slice(0, 5);

  const isActive = (href: string) => {
    const cleanPath = pathname.replace(/^\/[a-z]{2}(?=\/)/, '');
    const cleanHref = href;
    if (cleanHref === `/dashboard/${role}`) {
      return cleanPath === cleanHref;
    }
    return cleanPath.startsWith(cleanHref);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth?mode=signin');
  };

  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : role === 'candidate' ? 'C' : 'R';

  return (
    <div className="flex min-h-screen bg-[#0d0f1a]">
      {/* ---- Desktop Sidebar ---- */}
      <motion.aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-screen bg-[#0a0c16] border-r border-white/[0.06] z-40"
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo + Collapse Toggle */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-white/[0.06]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Link href="/" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="text-white font-bold text-sm">H</span>
                  </div>
                  <span className="font-bold text-lg text-white">HireMatch</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => setCollapsed(!collapsed)}
            className={`p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors ${
              collapsed ? 'mx-auto' : ''
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.div
              animate={{ rotate: collapsed ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <Icon icon="solar:alt-arrow-left-linear" className="w-5 h-5" />
            </motion.div>
          </motion.button>
        </div>

        {/* User Info */}
        <div className={`px-3 py-4 border-b border-white/[0.06] ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <motion.div
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              whileHover={{ scale: 1.1, boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {initials}
            </motion.div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  className="min-w-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="text-sm font-medium text-white truncate">{userName || 'User'}</p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${
                    role === 'recruiter'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {role === 'recruiter' ? 'Recruiter' : 'Candidate'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="block"
                title={collapsed ? item.label : undefined}
              >
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium relative ${
                    active
                      ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  whileHover={{ x: collapsed ? 0 : 3, scale: active ? 1 : 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {active && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    />
                  )}
                  <Icon
                    icon={active ? item.iconActive : item.icon}
                    className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-400' : ''}`}
                  />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="px-2 py-3 border-t border-white/[0.06]">
          <motion.button
            onClick={handleSignOut}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/5 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            whileHover={{ x: collapsed ? 0 : 3 }}
            whileTap={{ scale: 0.97 }}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <Icon icon="solar:logout-2-linear" className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* ---- Main Content ---- */}
      <motion.div
        className="flex-1 flex flex-col min-h-screen"
        animate={{ marginLeft: collapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ marginLeft: 0 }} // mobile default
      >
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 bg-[#0a0c16]/95 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">H</span>
              </div>
              <span className="font-bold text-white">HireMatch</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 text-white/40 hover:text-red-400 transition-colors"
              aria-label="Sign out"
            >
              <Icon icon="solar:logout-2-linear" className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-transparent pb-20 md:pb-0">
          {children}
        </main>
      </motion.div>

      {/* ---- Mobile Bottom Tab Bar ---- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0c16]/95 backdrop-blur-md border-t border-white/[0.06]">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all min-w-0 ${
                  active
                    ? 'text-blue-400'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <Icon
                  icon={active ? item.iconActive : item.icon}
                  className="w-5 h-5"
                />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
                {active && (
                  <motion.div
                    className="absolute bottom-1 w-4 h-0.5 bg-blue-400 rounded-full"
                    layoutId="mobileActiveTab"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

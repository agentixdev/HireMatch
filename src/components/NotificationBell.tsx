'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  match_found: 'solar:heart-pulse-bold',
  application_update: 'solar:document-text-bold',
  job_recommendation: 'solar:suitcase-bold',
  system: 'solar:bell-bold',
};

const NOTIFICATION_COLORS: Record<string, string> = {
  match_found: 'text-purple-400',
  application_update: 'text-blue-400',
  job_recommendation: 'text-emerald-400',
  system: 'text-amber-400',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Silently fail — user might not be logged in
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const markAllRead = async () => {
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-all"
        aria-label="Notifications"
      >
        <Icon icon="solar:bell-linear" className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full mt-2 w-[380px] max-h-[480px] bg-[#0F172A] ring-1 ring-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto max-h-[380px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Icon icon="solar:bell-off-linear" className="w-10 h-10 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.button
                    key={notification.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] ${
                      !notification.is_read ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 flex-shrink-0 ${NOTIFICATION_COLORS[notification.type] || 'text-white/50'}`}>
                      <Icon
                        icon={NOTIFICATION_ICONS[notification.type] || 'solar:bell-bold'}
                        className="w-5 h-5"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${notification.is_read ? 'text-white/60' : 'text-white'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-white/40 line-clamp-2 mt-0.5">
                        {notification.body}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.is_read && (
                      <div className="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-white/[0.06] px-4 py-2.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    router.push('/dashboard/candidate/applications');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

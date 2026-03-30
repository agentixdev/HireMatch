'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';

interface NotificationPrefs {
  email_matches: boolean;
  email_applications: boolean;
  email_recommendations: boolean;
  email_digest: 'realtime' | 'daily' | 'weekly' | 'never';
  in_app_enabled: boolean;
}

const DIGEST_OPTIONS = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
] as const;

export default function CandidateSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_matches: true,
    email_applications: true,
    email_recommendations: true,
    email_digest: 'daily',
    in_app_enabled: true,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setEmail(user.email || '');
      const { data } = await supabase.from('candidates').select('full_name').eq('user_id', user.id).single();
      setUserName(data?.full_name || '');

      // Fetch notification preferences
      try {
        const res = await fetch('/api/notifications/preferences');
        if (res.ok) {
          const prefsData = await res.json();
          setPrefs(prefsData);
        }
      } catch {
        // Use defaults
      }

      setLoading(false);
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth?mode=signin');
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    alert('Password reset email sent!');
  };

  const updatePref = useCallback((key: keyof NotificationPrefs, value: boolean | string) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setPrefsSaved(false);
  }, []);

  const savePrefs = async () => {
    setPrefsSaving(true);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch {
      // ignore
    }
    setPrefsSaving(false);
  };

  if (loading) return <DashboardLayout role="candidate"><div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout role="candidate" userName={userName}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">Email</label>
                <p className="text-white/80">{email}</p>
              </div>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 text-sm text-blue-400 ring-1 ring-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                Reset Password
              </button>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
            <div className="space-y-3">
              {/* Email toggles */}
              <label className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white/70">New job matches</span>
                  <p className="text-xs text-white/40 mt-0.5">Get notified when AI finds matching jobs</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_matches}
                  onChange={(e) => updatePref('email_matches', e.target.checked)}
                  className="w-4 h-4 text-blue-400 rounded border-white/10"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white/70">Application status updates</span>
                  <p className="text-xs text-white/40 mt-0.5">When your applications are reviewed or updated</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_applications}
                  onChange={(e) => updatePref('email_applications', e.target.checked)}
                  className="w-4 h-4 text-blue-400 rounded border-white/10"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white/70">Job recommendations</span>
                  <p className="text-xs text-white/40 mt-0.5">Curated job suggestions based on your profile</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email_recommendations}
                  onChange={(e) => updatePref('email_recommendations', e.target.checked)}
                  className="w-4 h-4 text-blue-400 rounded border-white/10"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg cursor-pointer">
                <div>
                  <span className="text-sm text-white/70">In-app notifications</span>
                  <p className="text-xs text-white/40 mt-0.5">Show notification bell and alerts in the app</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.in_app_enabled}
                  onChange={(e) => updatePref('in_app_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-400 rounded border-white/10"
                />
              </label>

              {/* Email digest frequency */}
              <div className="p-3 bg-white/[0.02] rounded-lg">
                <label className="block text-sm text-white/70 mb-2">Email digest frequency</label>
                <select
                  value={prefs.email_digest}
                  onChange={(e) => updatePref('email_digest', e.target.value)}
                  className="w-full bg-white/[0.05] ring-1 ring-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:ring-blue-500/50"
                >
                  {DIGEST_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0F172A]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save button */}
              <button
                onClick={savePrefs}
                disabled={prefsSaving}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50"
              >
                {prefsSaving ? 'Saving...' : prefsSaved ? 'Saved!' : 'Save Notification Preferences'}
              </button>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0F172A] ring-1 ring-red-500/10 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
            <div className="flex gap-3">
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                Sign Out
              </button>
              <button
                onClick={() => setDeleting(true)}
                className="px-4 py-2 text-sm text-red-400 ring-1 ring-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Delete Account
              </button>
            </div>
            {deleting && (
              <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-sm text-red-400">
                Contact support at help@hirematch.io to delete your account and all associated data.
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

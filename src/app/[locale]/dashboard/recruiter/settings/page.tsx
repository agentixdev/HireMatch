'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion } from 'framer-motion';

export default function RecruiterSettings() {
  const router = useRouter();
  const supabase = createClient();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setEmail(user.email || '');
      const { data } = await supabase.from('recruiters').select('company_name').eq('user_id', user.id).single();
      setCompanyName(data?.company_name || '');
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

  if (loading) return <DashboardLayout role="recruiter"><div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout role="recruiter" userName={companyName}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1 uppercase tracking-wider">Email</label>
                <p className="text-white/80">{email}</p>
              </div>
              <button onClick={handlePasswordReset}
                className="px-4 py-2 text-sm text-blue-400 ring-1 ring-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors">
                Reset Password
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Notifications</h2>
            <div className="space-y-3">
              {['New applications', 'Candidate matches', 'Interview reminders', 'Billing alerts'].map((label) => (
                <label key={label} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                  <span className="text-sm text-white/70">{label}</span>
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-400 rounded border-white/10" />
                </label>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[#0F172A] ring-1 ring-red-500/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
            <button onClick={handleSignOut}
              className="px-4 py-2 text-sm text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors">
              Sign Out
            </button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

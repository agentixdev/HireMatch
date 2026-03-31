'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hirematch.com';

export default function ReferralsPage() {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ referred: 0, hired: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralLink = code ? `${SITE_URL}?ref=${code}` : '';

  const fetchReferralData = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      if (res.status === 401) {
        setError('Please sign in to access your referral dashboard.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setStats(data.stats || { referred: 0, hired: 0 });
      } else {
        // Generate code
        const postRes = await fetch('/api/referrals', { method: 'POST' });
        const postData = await postRes.json();
        if (postData.code) {
          setCode(postData.code);
        }
      }
    } catch {
      setError('Failed to load referral data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const copyToClipboard = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = encodeURIComponent(referralLink);
  const shareText = encodeURIComponent(
    'Check out HireMatch — AI-powered recruitment across 29+ countries. Find your perfect career match or hire top global talent!'
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0d0f1a]">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Refer a Friend, Earn Rewards
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Share HireMatch with your network and earn rewards for every person who joins.
              Help others find their dream job or top talent — and get rewarded for it.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
              <p className="text-white/60 text-lg">{error}</p>
              <a
                href="/auth?mode=signin"
                className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
              {/* Referral Link Card */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-8">
                <h2 className="text-xl font-semibold text-white mb-2">Your Referral Link</h2>
                <p className="text-white/50 text-sm mb-4">
                  Share this link with friends and colleagues. When they sign up, they will be tracked as your referral.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 font-mono text-sm text-white/80 truncate">
                    {referralLink}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/20 transition-all whitespace-nowrap"
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                {/* Share Buttons */}
                <div className="mt-6">
                  <p className="text-white/50 text-sm mb-3">Share via</p>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#0A66C2]/20 border border-[#0A66C2]/30 text-[#0A66C2] rounded-lg hover:bg-[#0A66C2]/30 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] text-white/80 rounded-lg hover:bg-white/[0.1] transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      X (Twitter)
                    </a>
                    <a
                      href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] rounded-lg hover:bg-[#25D366]/30 transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent('Join HireMatch — AI-Powered Recruitment')}&body=${shareText}%0A%0A${shareUrl}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] border border-white/[0.1] text-white/80 rounded-lg hover:bg-white/[0.1] transition-colors text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </a>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-white mb-1">{stats.referred}</p>
                  <p className="text-white/50 text-sm">People Referred</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold text-white mb-1">{stats.hired}</p>
                  <p className="text-white/50 text-sm">Successful Hires</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-center">
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-1">
                    ${stats.hired * 50}
                  </p>
                  <p className="text-white/50 text-sm">Rewards Earned</p>
                </div>
              </div>

              {/* How It Works */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 sm:p-8 mb-8">
                <h2 className="text-xl font-semibold text-white mb-6">How It Works</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center">
                      <span className="text-blue-400 font-bold text-lg">1</span>
                    </div>
                    <h3 className="text-white font-medium mb-1">Share Your Link</h3>
                    <p className="text-white/40 text-sm">
                      Send your unique referral link to friends, colleagues, or your professional network.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
                      <span className="text-indigo-400 font-bold text-lg">2</span>
                    </div>
                    <h3 className="text-white font-medium mb-1">They Sign Up</h3>
                    <p className="text-white/40 text-sm">
                      When someone clicks your link and creates a HireMatch account, they are tracked as your referral.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                      <span className="text-purple-400 font-bold text-lg">3</span>
                    </div>
                    <h3 className="text-white font-medium mb-1">Earn Rewards</h3>
                    <p className="text-white/40 text-sm">
                      Earn $50 in platform credits for every referred user who lands a job or makes a successful hire.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rewards Info */}
              <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-white mb-4">Referral Rewards Program</h2>
                <div className="space-y-4 text-white/60 text-sm leading-relaxed">
                  <p>
                    Our referral program rewards you for helping grow the HireMatch community. Every time someone you
                    refer signs up and achieves a successful outcome (lands a job as a candidate or makes a hire as a
                    recruiter), you earn <strong className="text-white">$50 in platform credits</strong>.
                  </p>
                  <div>
                    <h3 className="text-white font-medium mb-2">Reward Tiers</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">&#x2022;</span>
                        <span><strong className="text-white/80">5 referrals:</strong> Bronze status — $50 per successful referral</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">&#x2022;</span>
                        <span><strong className="text-white/80">15 referrals:</strong> Silver status — $75 per successful referral</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">&#x2022;</span>
                        <span><strong className="text-white/80">30+ referrals:</strong> Gold status — $100 per successful referral + priority support</span>
                      </li>
                    </ul>
                  </div>
                  <p>
                    Credits can be applied toward recruiter subscription plans or cashed out once you reach a $200 minimum
                    balance. There is no cap on referrals — the more people you bring to HireMatch, the more you earn.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

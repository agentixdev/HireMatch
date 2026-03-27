'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

type BillingTier = 'free' | 'pro' | 'enterprise' | 'agency';

interface UsageData {
  tier: BillingTier;
  activeJobs: number;
  totalJobs: number;
  jobLimit: number | null;
  monthlyViewsUsed: number;
  viewLimit: number | null;
  billingPeriodEnd: string | null;
}

const TIERS: { key: BillingTier; name: string; price: number; features: string[]; highlight?: boolean }[] = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    features: [
      '3 active job postings',
      '10 candidate views / month',
      'Basic search filters',
      'Email support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 99,
    highlight: true,
    features: [
      'Unlimited job postings',
      'Unlimited candidate views',
      'Advanced AI matching',
      'Priority support',
      'Custom branding',
      'Analytics dashboard',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 499,
    features: [
      'Everything in Pro',
      'API access',
      'ATS integrations',
      'Up to 10 team seats',
      'Dedicated account manager',
      'Custom reporting',
      'SSO / SAML',
    ],
  },
  {
    key: 'agency',
    name: 'Agency',
    price: 999,
    features: [
      'Everything in Enterprise',
      'Multi-client management',
      'Unlimited team seats',
      'White-label options',
      'Bulk job posting',
      'Revenue analytics',
      'Priority API rate limits',
    ],
  },
];

export default function BillingPage() {
  const t = useTranslations('recruiter');
  const router = useRouter();
  const supabase = createClient();

  const [recruiterName, setRecruiterName] = useState('');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check for Stripe redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription activated! Your plan has been upgraded.' });
    } else if (params.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Checkout canceled. No changes were made.' });
    }
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?mode=signin'); return; }

      const { data: rec } = await supabase
        .from('recruiters')
        .select('company_name')
        .eq('user_id', user.id)
        .single();

      if (!rec) { router.push('/dashboard/recruiter/onboarding'); return; }
      setRecruiterName(rec.company_name || '');

      const res = await fetch('/api/billing/usage');
      if (res.ok) {
        setUsage(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpgrade(tier: BillingTier) {
    setActionLoading(tier);
    setMessage(null);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create checkout session' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManageBilling() {
    setActionLoading('portal');
    setMessage(null);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to open billing portal' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="recruiter" userName={recruiterName}>
        <div className="flex-1 flex items-center justify-center">Loading...</div>
      </DashboardLayout>
    );
  }

  const currentTier = usage?.tier || 'free';
  const tierIndex = TIERS.findIndex(t => t.key === currentTier);

  return (
    <DashboardLayout role="recruiter" userName={recruiterName}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
            <p className="text-white/50 mt-1">Manage your subscription and usage</p>
          </div>
          {currentTier !== 'free' && (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading === 'portal'}
              className="px-4 py-2 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50"
            >
              {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
        </div>

        {/* Status message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
              : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Current Usage */}
        {usage && (
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Current Usage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-white/50 mb-1">Current Plan</div>
                <div className="text-xl font-bold text-white capitalize">{currentTier}</div>
                {usage.billingPeriodEnd && (
                  <div className="text-xs text-white/40 mt-1">
                    Renews {new Date(usage.billingPeriodEnd).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-white/50 mb-1">Active Jobs</div>
                <div className="text-xl font-bold text-white">
                  {usage.activeJobs}
                  {usage.jobLimit !== null && (
                    <span className="text-white/40 text-sm font-normal"> / {usage.jobLimit}</span>
                  )}
                </div>
                {usage.jobLimit !== null && (
                  <div className="mt-2 w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usage.activeJobs >= usage.jobLimit ? 'bg-red-500' :
                        usage.activeJobs >= usage.jobLimit * 0.8 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (usage.activeJobs / usage.jobLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-white/50 mb-1">Candidate Views</div>
                <div className="text-xl font-bold text-white">
                  {usage.monthlyViewsUsed}
                  {usage.viewLimit !== null && (
                    <span className="text-white/40 text-sm font-normal"> / {usage.viewLimit}</span>
                  )}
                </div>
                {usage.viewLimit !== null && (
                  <div className="mt-2 w-full bg-white/5 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        usage.monthlyViewsUsed >= usage.viewLimit ? 'bg-red-500' :
                        usage.monthlyViewsUsed >= usage.viewLimit * 0.8 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (usage.monthlyViewsUsed / usage.viewLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier, idx) => {
            const isCurrent = tier.key === currentTier;
            const isDowngrade = idx < tierIndex;
            const isUpgrade = idx > tierIndex;

            return (
              <div
                key={tier.key}
                className={`relative bg-[#0F172A] rounded-xl p-6 flex flex-col ${
                  tier.highlight && !isCurrent
                    ? 'ring-2 ring-blue-500'
                    : isCurrent
                    ? 'ring-2 ring-green-500'
                    : 'ring-1 ring-white/10'
                }`}
              >
                {tier.highlight && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                    Current Plan
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">${tier.price}</span>
                    {tier.price > 0 && <span className="text-white/50 text-sm">/month</span>}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                      <svg className="w-4 h-4 mt-0.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-medium text-green-400 bg-green-500/10 rounded-lg cursor-default"
                  >
                    Current Plan
                  </button>
                ) : tier.key === 'free' ? (
                  isDowngrade && currentTier !== 'free' ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={actionLoading === 'portal'}
                      className="w-full py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50"
                    >
                      Downgrade
                    </button>
                  ) : null
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(tier.key)}
                    disabled={actionLoading === tier.key}
                    className={`w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                      tier.highlight
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        : 'bg-white/10 hover:bg-white/15'
                    }`}
                  >
                    {actionLoading === tier.key ? 'Redirecting...' : `Upgrade to ${tier.name}`}
                  </button>
                ) : (
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading === 'portal'}
                    className="w-full py-2.5 text-sm font-medium text-white/60 ring-1 ring-white/10 rounded-lg hover:bg-white/5 disabled:opacity-50"
                  >
                    Change Plan
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ / Help */}
        <div className="mt-12 bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-white">Can I change plans at any time?</h3>
              <p className="text-sm text-white/50 mt-1">
                Yes. Upgrades take effect immediately. Downgrades apply at the end of your current billing period.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">What happens when I hit my limits?</h3>
              <p className="text-sm text-white/50 mt-1">
                On the Free plan, you won&apos;t be able to post new jobs or view more candidates once you reach your limits.
                Upgrade to remove all limits.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">How do I cancel?</h3>
              <p className="text-sm text-white/50 mt-1">
                Click &quot;Manage Billing&quot; to access the Stripe customer portal where you can cancel, update payment methods,
                or download invoices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

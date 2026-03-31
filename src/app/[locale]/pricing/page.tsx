'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CountUp } from '@/components/AnimatedSection';

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } },
};

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Get started with basic recruitment tools',
    features: [
      '3 active job posts',
      'Basic candidate search',
      'Application management',
      'Email notifications',
      'Community support',
    ],
    cta: 'Start Free',
    href: '/auth?mode=signup&role=recruiter',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/month',
    desc: 'Everything you need to scale hiring',
    features: [
      'Unlimited job posts',
      'AI candidate matching',
      'Advanced filters & search',
      'Visa compliance data',
      'ATS webhook integration',
      'Priority support',
      'Team collaboration (3 seats)',
      'Analytics dashboard',
    ],
    cta: 'Start Pro Trial',
    href: '/auth?mode=signup&role=recruiter&plan=pro',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$499',
    period: '/month',
    desc: 'For large teams hiring at scale',
    features: [
      'Everything in Pro',
      'Unlimited team seats',
      'Custom branding',
      'Dedicated account manager',
      'SSO & advanced security',
      'API access',
      'Bulk import/export',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    href: '/auth?mode=signup&role=recruiter&plan=enterprise',
    highlight: false,
  },
  {
    name: 'Agency',
    price: '$999',
    period: '/month',
    desc: 'Multi-client recruitment management',
    features: [
      'Everything in Enterprise',
      'Multi-client workspaces',
      'White-label options',
      'Candidate pool sharing',
      'Revenue tracking',
      'Client portal access',
      'Bulk operations',
      'Priority API rate limits',
      'Dedicated infrastructure',
    ],
    cta: 'Contact Sales',
    href: '/auth?mode=signup&role=recruiter&plan=agency',
    highlight: false,
  },
];

export default function PricingPage() {
  const t = useTranslations();

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <h1
              className="text-4xl sm:text-5xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Simple, Transparent Pricing
            </h1>
            <p className="mt-4 text-lg text-white/50">
              Candidates always free. Recruiters pay only when they need to scale.
            </p>
          </div>

          {/* Candidate callout */}
          <div className="mt-10 max-w-2xl mx-auto bg-gradient-to-r from-green-600/10 to-emerald-600/10 ring-1 ring-green-500/20 rounded-xl p-5 text-center">
            <p className="text-green-400 font-semibold">
              Job seekers — HireMatch is 100% free for you
            </p>
            <p className="text-sm text-white/50 mt-1">
              Upload your CV, take the matchmaker quiz, apply to unlimited jobs. No hidden fees, ever.
            </p>
            <Link
              href="/auth?mode=signup&role=candidate"
              className="inline-block mt-4 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              Sign Up as Candidate
            </Link>
          </div>

          {/* Plans Grid */}
          <motion.div
            className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
          >
            {PLANS.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeUp}
                className={`relative bg-[#0F172A] rounded-xl p-6 flex flex-col ${
                  plan.highlight
                    ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/10'
                    : 'ring-1 ring-white/10'
                }`}
              >
                {plan.highlight && (
                  <motion.div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Most Popular
                  </motion.div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-white">
                      {'$'}<CountUp target={parseInt(plan.price.replace(/\D/g, '') || '0')} />
                    </span>
                    <span className="text-sm text-white/40 ml-1">{plan.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-white/50">{plan.desc}</p>
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                      <svg className="w-4 h-4 mt-0.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-6 block text-center py-3 rounded-lg font-medium text-sm transition-all ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
                      : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10 hover:ring-white/20'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* FAQ */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2
              className="text-3xl font-bold text-white text-center"
              style={{ fontFamily: 'var(--font-bebas)' }}
            >
              Frequently Asked Questions
            </h2>
            <FaqAccordion />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

const FAQ_ITEMS = [
  {
    q: 'Is it really free for candidates?',
    a: 'Yes, 100%. Job seekers can create profiles, upload CVs, take quizzes, and apply to unlimited jobs without ever paying.',
  },
  {
    q: 'Can I try Pro before committing?',
    a: 'Yes — Pro comes with a 14-day free trial. No credit card required to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards via Stripe. Enterprise and Agency plans also support invoicing.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Absolutely. Changes take effect on your next billing cycle. Downgrading preserves your data.',
  },
  {
    q: 'What happens to my job posts if I downgrade?',
    a: 'Active job posts beyond your plan limit are paused (not deleted). Re-activate them anytime by upgrading.',
  },
  {
    q: 'Do you offer discounts for nonprofits?',
    a: 'Yes. Verified nonprofits get 50% off any paid plan. Contact us for details.',
  },
];

function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-10 space-y-4">
      {FAQ_ITEMS.map((faq, i) => (
        <motion.div
          key={faq.q}
          className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ ...springTransition, delay: i * 0.05 }}
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <h3 className="font-semibold text-white text-sm">{faq.q}</h3>
            <motion.span
              animate={{ rotate: openIndex === i ? 45 : 0 }}
              transition={springTransition}
              className="text-white/40 text-lg ml-4 shrink-0"
            >
              +
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {openIndex === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="overflow-hidden"
              >
                <p className="px-5 pb-5 text-sm text-white/50">{faq.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

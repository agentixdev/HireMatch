import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Privacy Policy | HireMatch',
  description: 'How HireMatch collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
          <div className="prose prose-invert prose-sm max-w-none text-white/70 space-y-6">
            <p className="text-white/50 text-sm">Last updated: March 28, 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
              <p>When you create an account we collect your name, email address, and role (candidate or recruiter). Candidates may upload CVs and complete a matchmaker quiz; recruiters provide company details and job descriptions. We also collect usage data such as pages visited and features used.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">2. How We Use Your Data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>To match candidates with relevant job opportunities using AI.</li>
                <li>To display visa and work-permit requirements for your target countries.</li>
                <li>To process recruiter subscriptions and billing via Stripe.</li>
                <li>To send transactional emails (welcome, password reset) via Resend.</li>
                <li>To improve our platform through aggregated, anonymized analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">3. Data Sharing</h2>
              <p>We do not sell your personal data. We share data only with:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Supabase</strong> — authentication and database hosting.</li>
                <li><strong>Google Gemini</strong> — AI-powered CV parsing and matching (data processed, not stored).</li>
                <li><strong>Stripe</strong> — payment processing for recruiter subscriptions.</li>
                <li><strong>Resend</strong> — transactional email delivery.</li>
                <li><strong>Vercel</strong> — application hosting.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">4. Data Retention</h2>
              <p>We retain your account data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">5. Your Rights</h2>
              <p>You have the right to access, correct, or delete your personal data. EU/EEA users have additional rights under GDPR, including data portability and the right to object to processing.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">6. Cookies</h2>
              <p>We use essential cookies for authentication and session management. We do not use advertising or tracking cookies.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">7. Contact</h2>
              <p>For privacy-related questions, contact us at <a href="mailto:privacy@hirematch.com" className="text-blue-400 hover:text-blue-300">privacy@hirematch.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

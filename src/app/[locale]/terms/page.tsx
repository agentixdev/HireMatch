import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'Terms of Service | HireMatch',
  description: 'Terms and conditions for using the HireMatch recruitment platform.',
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
          <div className="prose prose-invert prose-sm max-w-none text-white/70 space-y-6">
            <p className="text-white/50 text-sm">Last updated: March 28, 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
              <p>By accessing or using HireMatch you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">2. Accounts</h2>
              <p>You must provide accurate information when creating an account. You are responsible for all activity under your account and for keeping your credentials secure.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">3. Candidate Use</h2>
              <p>Candidates may create profiles, upload CVs, take the matchmaker quiz, and apply for jobs at no cost. You agree that information you submit is truthful and that you will not impersonate another person.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">4. Recruiter Use & Billing</h2>
              <p>Recruiters may post jobs and search candidates. Free accounts are limited to 3 job posts and 10 candidate profile views. Paid plans (Pro, Enterprise, Agency) are billed monthly via Stripe. Subscriptions renew automatically and can be cancelled at any time; no refunds are issued for partial billing periods.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">5. Prohibited Conduct</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Scraping or automated data collection without written permission.</li>
                <li>Posting fraudulent, discriminatory, or misleading job listings.</li>
                <li>Attempting to circumvent billing or usage limits.</li>
                <li>Uploading malicious content or exploiting security vulnerabilities.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">6. AI-Generated Content</h2>
              <p>HireMatch uses AI (Google Gemini) for CV parsing, job description analysis, and match scoring. AI outputs are provided as recommendations and may contain errors. You should verify AI-generated information before making hiring or career decisions.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">7. Visa Information Disclaimer</h2>
              <p>Visa and work-permit data displayed on HireMatch is scraped from public sources and updated regularly, but may not reflect the latest regulations. Always consult official government sources or an immigration attorney before making decisions.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">8. Limitation of Liability</h2>
              <p>HireMatch is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to hiring decisions, visa application outcomes, or data loss.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">9. Termination</h2>
              <p>We may suspend or terminate accounts that violate these terms. You may delete your account at any time.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">10. Contact</h2>
              <p>For questions about these terms, contact us at <a href="mailto:legal@hirematch.com" className="text-blue-400 hover:text-blue-300">legal@hirematch.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

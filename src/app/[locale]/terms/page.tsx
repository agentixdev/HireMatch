import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service | HireMatch',
  description:
    'Read the Terms of Service for HireMatch, the AI-powered recruitment platform. Covers user accounts, subscriptions, data usage, and legal terms.',
};

export default function TermsOfServicePage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/50 mb-12">Last updated: March 31, 2026</p>

        <div className="space-y-10 text-white/80 leading-relaxed">
          {/* 1. Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the HireMatch platform (&quot;Service&quot;), operated by
              HireMatch (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) at hirematch.com, you
              agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to
              all of these Terms, you must not use the Service.
            </p>
            <p className="mt-3">
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or a prominent notice on the platform. Your continued use of the
              Service after modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* 2. Description of Service */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              HireMatch is an AI-powered recruitment platform that connects job seekers
              (&quot;Candidates&quot;) with employers and recruiters (&quot;Recruiters&quot;). Our
              Service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <span className="text-white font-medium">AI CV Parsing:</span> Automated extraction
                and analysis of resume data using artificial intelligence.
              </li>
              <li>
                <span className="text-white font-medium">Matchmaker Quiz:</span> A guided
                questionnaire that captures career preferences and work style to improve job
                matching.
              </li>
              <li>
                <span className="text-white font-medium">Job Matching:</span> AI-powered algorithms
                that score and rank candidate-job compatibility.
              </li>
              <li>
                <span className="text-white font-medium">Visa Compliance:</span> Work visa and
                permit information across 29 countries to assist with international hiring.
              </li>
              <li>
                <span className="text-white font-medium">Recruiter Tools:</span> Job posting
                management, candidate search, ATS webhook integrations, and team collaboration
                features.
              </li>
            </ul>
          </section>

          {/* 3. User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              3. User Accounts and Registration
            </h2>
            <p>To use certain features of the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain and promptly update your account information to keep it accurate.</li>
              <li>
                Keep your password secure and confidential. You are responsible for all activity
                under your account.
              </li>
              <li>
                Notify us immediately at{' '}
                <a href="mailto:support@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  support@hirematch.com
                </a>{' '}
                if you suspect unauthorized access to your account.
              </li>
              <li>Not create multiple accounts or share your account credentials with others.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms or
              remain inactive for an extended period.
            </p>
          </section>

          {/* 4. Candidate Obligations */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Candidate Obligations</h2>
            <p>As a Candidate, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Provide truthful and accurate information in your CV, profile, and matchmaker quiz
                responses.
              </li>
              <li>
                Not misrepresent your qualifications, work history, skills, or visa/work
                authorization status.
              </li>
              <li>
                Understand that match scores and AI-generated analyses are informational tools, not
                guarantees of employment.
              </li>
              <li>
                Not use the platform to harass, spam, or send unsolicited communications to
                recruiters.
              </li>
              <li>
                Accept that your profile information may be shared with Recruiters when you apply for
                positions or are matched with job opportunities.
              </li>
            </ul>
            <p className="mt-3">
              The Service is always free for Candidates. We do not charge job seekers for any
              features.
            </p>
          </section>

          {/* 5. Recruiter Obligations */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Recruiter Obligations</h2>
            <p>As a Recruiter, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Post only legitimate job opportunities for real, existing positions within your
                organization.
              </li>
              <li>
                Not post discriminatory, misleading, fraudulent, or illegal job listings.
              </li>
              <li>
                Handle candidate data responsibly and in compliance with applicable data protection
                laws, including GDPR where applicable.
              </li>
              <li>
                Not use candidate information obtained through HireMatch for any purpose other than
                evaluating candidates for employment.
              </li>
              <li>
                Not scrape, export in bulk, or redistribute candidate data outside the platform
                without authorization.
              </li>
              <li>
                Comply with all applicable employment and labor laws in the jurisdictions where you
                operate.
              </li>
            </ul>
          </section>

          {/* 6. Subscription Plans and Billing */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              6. Subscription Plans and Billing
            </h2>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">6.1 Subscription Tiers</h3>
            <p className="mb-3">
              HireMatch offers the following subscription plans for Recruiters:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-3 pr-4 text-white font-semibold">Plan</th>
                    <th className="py-3 pr-4 text-white font-semibold">Price</th>
                    <th className="py-3 text-white font-semibold">Includes</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  <tr className="border-b border-white/10">
                    <td className="py-3 pr-4 text-white">Free</td>
                    <td className="py-3 pr-4">$0/month</td>
                    <td className="py-3">3 active job postings, 10 candidate profile views</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 pr-4 text-white">Pro</td>
                    <td className="py-3 pr-4">$99/month</td>
                    <td className="py-3">
                      Unlimited job postings, unlimited candidate views, AI matching, visa data
                      access
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 pr-4 text-white">Enterprise</td>
                    <td className="py-3 pr-4">$499/month</td>
                    <td className="py-3">
                      Everything in Pro, plus ATS integrations, priority support, team
                      collaboration, advanced analytics
                    </td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-3 pr-4 text-white">Agency</td>
                    <td className="py-3 pr-4">$999/month</td>
                    <td className="py-3">
                      Everything in Enterprise, plus multi-client management, white-label options,
                      dedicated account manager, custom API access
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">6.2 Billing Terms</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                All paid subscriptions are billed monthly through Stripe. Your subscription renews
                automatically unless cancelled.
              </li>
              <li>
                Prices are listed in US Dollars (USD) and are exclusive of applicable taxes.
              </li>
              <li>
                You may upgrade or downgrade your plan at any time. Changes take effect at the start
                of the next billing cycle.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; advance notice. Existing
                subscribers will be notified before any price changes apply to their accounts.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">
              6.3 Cancellation and Refunds
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                You may cancel your subscription at any time from your account settings. Cancellation
                takes effect at the end of the current billing period.
              </li>
              <li>
                No refunds are provided for partial billing periods. You will continue to have access
                to paid features until the end of your current billing cycle.
              </li>
              <li>
                If you believe you were incorrectly charged, contact{' '}
                <a href="mailto:billing@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  billing@hirematch.com
                </a>{' '}
                within 30 days of the charge.
              </li>
            </ul>
          </section>

          {/* 7. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
            <p>
              The HireMatch platform, including its design, code, algorithms, branding, logos, text,
              graphics, and documentation, is the exclusive property of HireMatch and is protected by
              intellectual property laws.
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <span className="text-white font-medium">Your Content:</span> You retain ownership
                of all content you upload, including CVs, job descriptions, and profile information.
                By uploading content, you grant HireMatch a non-exclusive, worldwide license to use,
                process, and display your content solely for the purpose of providing the Service.
              </li>
              <li>
                <span className="text-white font-medium">Our Content:</span> You may not copy,
                modify, distribute, sell, or lease any part of our Service or included software, nor
                may you reverse-engineer or attempt to extract the source code.
              </li>
              <li>
                <span className="text-white font-medium">Feedback:</span> Any suggestions, ideas, or
                feedback you provide about the Service may be used by us without obligation or
                compensation to you.
              </li>
            </ul>
          </section>

          {/* 8. AI-Generated Content Disclaimer */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              8. AI-Generated Content Disclaimer
            </h2>
            <p>
              HireMatch uses artificial intelligence (powered by Google Gemini) to parse CVs, analyze
              job descriptions, and generate match scores. You acknowledge and agree that:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                AI-generated analyses, match scores, and recommendations are provided as informational
                tools only and should not be the sole basis for hiring or career decisions.
              </li>
              <li>
                AI outputs may contain inaccuracies, and we do not guarantee the completeness,
                accuracy, or reliability of AI-generated content.
              </li>
              <li>
                Recruiters are responsible for independently verifying candidate qualifications
                before making hiring decisions.
              </li>
              <li>
                Candidates should review AI-parsed information from their CVs for accuracy and
                correct any errors in their profiles.
              </li>
              <li>
                HireMatch is not responsible for employment decisions made based on AI-generated
                content or match scores.
              </li>
            </ul>
          </section>

          {/* 9. Prohibited Conduct */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Use the Service for any unlawful purpose or in violation of any applicable local,
                national, or international law.
              </li>
              <li>
                Attempt to gain unauthorized access to the Service, other user accounts, or our
                systems and networks.
              </li>
              <li>
                Use automated scripts, bots, or scrapers to access the Service without our written
                permission.
              </li>
              <li>
                Upload malicious code, viruses, or any content designed to disrupt the Service.
              </li>
              <li>
                Impersonate another person or entity, or misrepresent your affiliation with any
                person or entity.
              </li>
              <li>
                Circumvent, disable, or interfere with security-related features of the Service.
              </li>
              <li>
                Use the Service to discriminate against candidates based on race, gender, age,
                religion, disability, sexual orientation, or any other protected characteristic.
              </li>
              <li>
                Engage in any activity that interferes with or disrupts the Service or the servers
                and networks connected to the Service.
              </li>
            </ul>
          </section>

          {/* 10. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, HIREMATCH AND ITS OFFICERS,
              DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Any indirect, incidental, special, consequential, or punitive damages, including but
                not limited to loss of profits, data, business opportunities, or goodwill.
              </li>
              <li>
                Any damages arising from your use of or inability to use the Service.
              </li>
              <li>
                Any damages resulting from unauthorized access to or alteration of your data.
              </li>
              <li>
                Any damages arising from the conduct of any third party on the Service, including
                other users, recruiters, or candidates.
              </li>
              <li>
                Employment decisions made based on information, match scores, or recommendations
                provided through the Service.
              </li>
            </ul>
            <p className="mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU HAVE PAID US IN THE
              TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED US
              DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
            <p className="mt-3">
              THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS
              WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT.
            </p>
          </section>

          {/* 11. Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless HireMatch, its affiliates, officers,
              directors, employees, and agents from and against any claims, liabilities, damages,
              losses, and expenses (including reasonable attorneys&apos; fees) arising out of or in
              any way connected with: (a) your access to or use of the Service; (b) your violation of
              these Terms; (c) your violation of any third-party rights; or (d) your content uploaded
              to the Service.
            </p>
          </section>

          {/* 12. Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">By You:</span> You may terminate your
                account at any time by deleting it from your account settings or by contacting
                support. Active subscriptions will continue until the end of the current billing
                period.
              </li>
              <li>
                <span className="text-white font-medium">By Us:</span> We may suspend or terminate
                your account immediately, without prior notice, if you violate these Terms, engage in
                fraudulent activity, or if required by law. We may also terminate accounts that have
                been inactive for more than 12 months.
              </li>
              <li>
                <span className="text-white font-medium">Effect of Termination:</span> Upon
                termination, your right to use the Service ceases immediately. We will delete your
                personal data in accordance with our Privacy Policy, except where retention is
                required by law.
              </li>
            </ul>
          </section>

          {/* 13. Dispute Resolution */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Dispute Resolution</h2>
            <p>
              Any disputes arising from or relating to these Terms or the Service shall first be
              attempted to be resolved through good-faith negotiation. If negotiation fails, disputes
              shall be resolved through binding arbitration in accordance with the rules of the
              American Arbitration Association, except that either party may seek injunctive or other
              equitable relief in any court of competent jurisdiction.
            </p>
            <p className="mt-3">
              <span className="text-white font-medium">Class Action Waiver:</span> You agree to
              resolve disputes with us on an individual basis and waive your right to participate in a
              class action, class arbitration, or representative proceeding.
            </p>
          </section>

          {/* 14. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State
              of Delaware, United States, without regard to its conflict of law provisions. For users
              in the European Economic Area, nothing in these Terms affects your rights under
              mandatory consumer protection laws in your country of residence.
            </p>
          </section>

          {/* 15. Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. General Provisions</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Entire Agreement:</span> These Terms,
                together with our Privacy Policy, constitute the entire agreement between you and
                HireMatch regarding the Service.
              </li>
              <li>
                <span className="text-white font-medium">Severability:</span> If any provision of
                these Terms is found to be unenforceable, the remaining provisions shall remain in
                full force and effect.
              </li>
              <li>
                <span className="text-white font-medium">Waiver:</span> Our failure to enforce any
                right or provision of these Terms shall not be deemed a waiver of such right or
                provision.
              </li>
              <li>
                <span className="text-white font-medium">Assignment:</span> You may not assign or
                transfer your rights under these Terms without our prior written consent. We may
                assign our rights without restriction.
              </li>
              <li>
                <span className="text-white font-medium">Force Majeure:</span> We shall not be
                liable for any failure or delay in performance due to circumstances beyond our
                reasonable control, including natural disasters, acts of government, or internet
                outages.
              </li>
            </ul>
          </section>

          {/* 16. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul className="list-none pl-0 mt-4 space-y-1">
              <li>
                <span className="text-white font-medium">General Inquiries:</span>{' '}
                <a href="mailto:support@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  support@hirematch.com
                </a>
              </li>
              <li>
                <span className="text-white font-medium">Billing Questions:</span>{' '}
                <a href="mailto:billing@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  billing@hirematch.com
                </a>
              </li>
              <li>
                <span className="text-white font-medium">Privacy Concerns:</span>{' '}
                <a href="mailto:privacy@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  privacy@hirematch.com
                </a>
              </li>
              <li>
                <span className="text-white font-medium">Website:</span>{' '}
                <a href="https://www.hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                  www.hirematch.com
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

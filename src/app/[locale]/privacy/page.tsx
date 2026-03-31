import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy | HireMatch',
  description:
    'Learn how HireMatch collects, uses, and protects your personal data. Our privacy policy covers data processing, GDPR rights, cookies, and third-party services.',
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/50 mb-12">Last updated: March 31, 2026</p>

        <div className="space-y-10 text-white/80 leading-relaxed">
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              HireMatch (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website{' '}
              <span className="text-white">hirematch.com</span> and the HireMatch recruitment
              platform (collectively, the &quot;Service&quot;). This Privacy Policy explains how we
              collect, use, disclose, and safeguard your personal data when you use our Service.
            </p>
            <p className="mt-3">
              By accessing or using HireMatch, you agree to the collection and use of information in
              accordance with this policy. If you do not agree with our practices, please do not use
              the Service.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Account Information:</span> Name, email
                address, password, and profile details when you create an account.
              </li>
              <li>
                <span className="text-white font-medium">Candidate Data:</span> CVs/resumes, work
                history, education, skills, certifications, language proficiency, salary
                expectations, and visa/work authorization status.
              </li>
              <li>
                <span className="text-white font-medium">Matchmaker Quiz Responses:</span> Answers
                to our matchmaker quiz including career preferences, work style, location
                preferences, and professional goals.
              </li>
              <li>
                <span className="text-white font-medium">Recruiter Data:</span> Company name,
                company size, industry, job descriptions, hiring requirements, and billing
                information.
              </li>
              <li>
                <span className="text-white font-medium">Billing Information:</span> Payment card
                details, billing address, and transaction history (processed securely through
                Stripe).
              </li>
              <li>
                <span className="text-white font-medium">Communications:</span> Messages, support
                requests, and feedback you send to us.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Usage Data:</span> Pages visited, features
                used, search queries, interaction patterns, and timestamps.
              </li>
              <li>
                <span className="text-white font-medium">Device Information:</span> Browser type,
                operating system, device identifiers, screen resolution, and language settings.
              </li>
              <li>
                <span className="text-white font-medium">Log Data:</span> IP addresses, access
                times, referring URLs, and server logs.
              </li>
              <li>
                <span className="text-white font-medium">Cookies and Similar Technologies:</span>{' '}
                Session cookies, authentication tokens, and analytics identifiers. See Section 7 for
                details.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">
              2.3 Information from Third Parties
            </h3>
            <p>
              We may receive information from authentication providers when you sign in using
              third-party services (e.g., Google OAuth), including your name, email, and profile
              picture.
            </p>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Job Matching:</span> Processing your CV,
                quiz responses, and preferences through our AI matching algorithms to connect
                candidates with suitable job opportunities.
              </li>
              <li>
                <span className="text-white font-medium">AI Processing:</span> Using Google Gemini
                to parse CVs, analyze job descriptions, and generate match scores. Your data is
                processed in real-time and not stored by the AI provider beyond the request.
              </li>
              <li>
                <span className="text-white font-medium">Visa Compliance:</span> Checking work
                authorization requirements across 29 countries to ensure accurate visa-related
                guidance.
              </li>
              <li>
                <span className="text-white font-medium">Account Management:</span> Creating and
                managing your account, authenticating your identity, and providing customer support.
              </li>
              <li>
                <span className="text-white font-medium">Billing and Payments:</span> Processing
                recruiter subscription payments, managing billing cycles, and sending invoices.
              </li>
              <li>
                <span className="text-white font-medium">Communications:</span> Sending
                transactional emails (welcome messages, password resets, notifications) and, with
                your consent, marketing communications.
              </li>
              <li>
                <span className="text-white font-medium">Analytics and Improvement:</span> Analyzing
                usage patterns to improve our Service, fix bugs, and develop new features.
              </li>
              <li>
                <span className="text-white font-medium">Legal Compliance:</span> Fulfilling our
                legal obligations, resolving disputes, and enforcing our terms.
              </li>
            </ul>
          </section>

          {/* 4. Data Sharing and Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p className="mb-3">
              We do not sell your personal data. We share information only in the following
              circumstances:
            </p>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">4.1 Service Providers</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Supabase:</span> Authentication, database
                storage, and file storage (CVs). Data is stored in Supabase-managed infrastructure.
              </li>
              <li>
                <span className="text-white font-medium">Stripe:</span> Payment processing for
                recruiter subscriptions. Stripe receives billing information necessary to process
                transactions and is a PCI DSS Level 1 certified provider.
              </li>
              <li>
                <span className="text-white font-medium">Google Gemini:</span> AI-powered CV
                parsing, job description analysis, and match scoring. Data is sent for processing
                and is not retained by Google beyond the API request.
              </li>
              <li>
                <span className="text-white font-medium">Resend:</span> Transactional email
                delivery (welcome emails, password resets, notifications).
              </li>
              <li>
                <span className="text-white font-medium">Vercel:</span> Website hosting,
                server-side rendering, and edge functions.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">
              4.2 Recruiters and Employers
            </h3>
            <p>
              When you apply for a job or are matched with a position, we share relevant portions of
              your candidate profile (including your CV, skills, experience, and match score) with
              the recruiting organization. You can control what information is visible in your
              profile settings.
            </p>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">4.3 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law, court order, or government
              request, or if we believe disclosure is necessary to protect our rights, prevent fraud,
              or ensure the safety of our users.
            </p>

            <h3 className="text-lg font-medium text-white mt-6 mb-2">4.4 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your personal data may be
              transferred. We will notify you before your data is transferred and becomes subject to
              a different privacy policy.
            </p>
          </section>

          {/* 5. GDPR Rights (EEA Users) */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              5. Your Rights Under GDPR (EEA Users)
            </h2>
            <p className="mb-3">
              If you are located in the European Economic Area (EEA), you have the following rights
              under the General Data Protection Regulation (GDPR):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Right of Access:</span> You can request a
                copy of all personal data we hold about you.
              </li>
              <li>
                <span className="text-white font-medium">Right to Rectification:</span> You can
                request correction of inaccurate or incomplete personal data.
              </li>
              <li>
                <span className="text-white font-medium">Right to Erasure:</span> You can request
                deletion of your personal data (&quot;right to be forgotten&quot;), subject to
                certain legal exceptions.
              </li>
              <li>
                <span className="text-white font-medium">Right to Restrict Processing:</span> You
                can request that we limit the processing of your personal data in certain
                circumstances.
              </li>
              <li>
                <span className="text-white font-medium">Right to Data Portability:</span> You can
                request your data in a structured, commonly used, machine-readable format and have it
                transferred to another controller.
              </li>
              <li>
                <span className="text-white font-medium">Right to Object:</span> You can object to
                the processing of your personal data for direct marketing or where processing is
                based on legitimate interests.
              </li>
              <li>
                <span className="text-white font-medium">Right to Withdraw Consent:</span> Where
                processing is based on consent, you can withdraw your consent at any time without
                affecting the lawfulness of prior processing.
              </li>
              <li>
                <span className="text-white font-medium">Right to Lodge a Complaint:</span> You have
                the right to file a complaint with your local data protection supervisory authority.
              </li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@hirematch.com" className="text-purple-400 hover:text-purple-300 underline">
                privacy@hirematch.com
              </a>
              . We will respond within 30 days.
            </p>
            <p className="mt-3">
              <span className="text-white font-medium">Legal Basis for Processing:</span> We process
              your data based on (a) your consent, (b) the necessity to perform a contract with you,
              (c) our legitimate business interests, or (d) compliance with legal obligations.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Active Accounts:</span> We retain your
                personal data for as long as your account is active and as needed to provide the
                Service.
              </li>
              <li>
                <span className="text-white font-medium">Deleted Accounts:</span> When you delete
                your account, we remove your personal data within 30 days. Certain data may be
                retained for up to 90 days in backups.
              </li>
              <li>
                <span className="text-white font-medium">Billing Records:</span> Transaction and
                invoice data is retained for 7 years as required by tax and financial regulations.
              </li>
              <li>
                <span className="text-white font-medium">Anonymized Data:</span> We may retain
                anonymized, aggregated data indefinitely for analytics and service improvement
                purposes.
              </li>
              <li>
                <span className="text-white font-medium">Legal Holds:</span> Data subject to legal
                proceedings or regulatory requirements may be retained beyond normal retention
                periods.
              </li>
            </ul>
          </section>

          {/* 7. Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              7. Cookies and Tracking Technologies
            </h2>
            <p className="mb-3">We use the following types of cookies:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Essential Cookies:</span> Required for
                authentication, session management, and security. These cannot be disabled.
              </li>
              <li>
                <span className="text-white font-medium">Functional Cookies:</span> Remember your
                preferences such as language, locale, and display settings.
              </li>
              <li>
                <span className="text-white font-medium">Analytics Cookies:</span> Help us
                understand how users interact with our Service to improve performance and usability.
              </li>
            </ul>
            <p className="mt-4">
              You can manage cookie preferences through your browser settings. Disabling essential
              cookies may prevent you from using certain features of the Service.
            </p>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              8. International Data Transfers
            </h2>
            <p>
              HireMatch operates across 29 countries. Your data may be transferred to and processed
              in countries outside your country of residence, including the United States. When we
              transfer data internationally, we ensure appropriate safeguards are in place, including
              Standard Contractual Clauses (SCCs) approved by the European Commission, adequacy
              decisions, or other lawful transfer mechanisms.
            </p>
          </section>

          {/* 9. Security */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Security Measures</h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (TLS/SSL) and at rest for all stored data.</li>
              <li>Secure authentication with hashed passwords and optional multi-factor authentication.</li>
              <li>Role-based access controls limiting data access to authorized personnel only.</li>
              <li>Regular security audits and vulnerability assessments.</li>
              <li>PCI DSS compliant payment processing through Stripe.</li>
              <li>Automated backup and disaster recovery procedures.</li>
            </ul>
            <p className="mt-4">
              While we take reasonable measures to protect your data, no method of transmission over
              the Internet or method of electronic storage is 100% secure. We cannot guarantee
              absolute security.
            </p>
          </section>

          {/* 10. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              10. Children&apos;s Privacy
            </h2>
            <p>
              HireMatch is not intended for individuals under the age of 16. We do not knowingly
              collect personal data from children. If we become aware that a child under 16 has
              provided us with personal data, we will take steps to delete such information promptly.
            </p>
          </section>

          {/* 11. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">
              11. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the updated policy on this page and updating the &quot;Last
              updated&quot; date. For significant changes, we may also send you an email
              notification. Your continued use of the Service after changes are posted constitutes
              acceptance of the revised policy.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, your personal data, or wish to
              exercise your rights, please contact us:
            </p>
            <ul className="list-none pl-0 mt-4 space-y-1">
              <li>
                <span className="text-white font-medium">Email:</span>{' '}
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
            <p className="mt-4">
              For GDPR-related inquiries from EEA users, we aim to respond within 30 days of
              receiving your request.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

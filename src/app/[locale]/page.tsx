import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import {
  AnimatedSection,
  StaggerSection,
  StaggerItem,
  CountryPill,
  FeatureCard,
  TestimonialCard,
} from '@/components/AnimatedSection';

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero — full wow-factor with gradient mesh, particles, shimmer, pulse rings */}
        <HeroSection
          title={t('hero.title')}
          subtitle={t('hero.subtitle', { countryCount: '29' })}
          candidateCta={t('hero.candidateCta')}
          recruiterCta={t('hero.recruiterCta')}
        />

        {/* How It Works */}
        <section className="py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-white text-center" style={{ fontFamily: 'var(--font-bebas)' }}>How It Works</h2>
            </AnimatedSection>
            <StaggerSection className="mt-14 grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Upload Your CV',
                  desc: 'Our AI parses your resume in seconds, extracting skills, experience, and qualifications into a rich profile.',
                  colorHex: '#3b82f6',
                },
                {
                  step: '2',
                  title: 'Take the Matchmaker Quiz',
                  desc: 'Answer quick questions about your work style, values, and preferences to power our matching algorithm.',
                  colorHex: '#a855f7',
                },
                {
                  step: '3',
                  title: 'Get Matched',
                  desc: 'AI scores you against thousands of jobs. See your match percentage, visa requirements, and apply with one click.',
                  colorHex: '#22c55e',
                },
              ].map((item) => (
                <StaggerItem key={item.step}>
                  <FeatureCard colorHex={item.colorHex} className="p-6 text-center h-full">
                    <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center" style={{ background: `${item.colorHex}22` }}>
                      <span className="text-2xl font-bold" style={{ color: item.colorHex }}>{item.step}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm text-white/50">{item.desc}</p>
                  </FeatureCard>
                </StaggerItem>
              ))}
            </StaggerSection>
          </div>
        </section>

        {/* For Recruiters */}
        <section className="py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>For Recruiters</h2>
              <p className="mt-4 text-lg text-white/50">
                Post jobs, let AI rank candidates, manage your pipeline, and hire across 29 countries
                with built-in visa compliance.
              </p>
            </AnimatedSection>
            <StaggerSection className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'AI Candidate Ranking', desc: 'Candidates auto-ranked by match score against your JD', colorHex: '#3b82f6' },
                { title: 'Visa Compliance', desc: 'Auto-tagged sponsorship requirements per country', colorHex: '#22c55e' },
                { title: 'Pipeline Management', desc: 'Kanban board from applied to hired', colorHex: '#a855f7' },
                { title: 'ATS Webhooks', desc: 'Integrate with your existing tools via webhooks', colorHex: '#6366f1' },
              ].map((feature) => (
                <StaggerItem key={feature.title}>
                  <FeatureCard colorHex={feature.colorHex} className="p-5 h-full">
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="mt-2 text-xs text-white/50">{feature.desc}</p>
                  </FeatureCard>
                </StaggerItem>
              ))}
            </StaggerSection>
            <AnimatedSection className="mt-10 text-center" delay={0.3}>
              <Link
                href="/auth?mode=signup&role=recruiter"
                className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
              >
                Start Hiring — Free
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center">
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>What People Say</h2>
              <p className="mt-3 text-white/50">Join thousands of professionals finding their perfect match</p>
            </AnimatedSection>
            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { quote: "The matchmaker quiz nailed it — my top match was a company I'd never heard of, and I start there next month.", name: "Sarah K.", role: "Frontend Engineer", location: "Berlin, DE" },
                { quote: "As a recruiter, the visa compliance feature alone saves me hours per candidate. I know instantly who needs sponsorship.", name: "James R.", role: "Tech Recruiter", location: "London, UK" },
                { quote: "I was skeptical about another job platform, but the AI coach rewrote my resume and I got 3x more callbacks.", name: "Priya M.", role: "Data Scientist", location: "Toronto, CA" },
              ].map((testimonial) => (
                <TestimonialCard
                  key={testimonial.name}
                  quote={testimonial.quote}
                  name={testimonial.name}
                  role={testimonial.role}
                  location={testimonial.location}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Countries */}
        <section className="py-12 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>Hire Globally</h2>
              <p className="mt-4 text-lg text-white/50">
                29 countries with real-time visa requirements and work permit data.
              </p>
            </AnimatedSection>
            <StaggerSection className="mt-10 flex flex-wrap justify-center gap-2">
              {[
                '🇺🇸 USA', '🇨🇦 Canada', '🇬🇧 UK', '🇨🇭 Switzerland', '🇩🇪 Germany',
                '🇫🇷 France', '🇪🇸 Spain', '🇮🇹 Italy', '🇳🇱 Netherlands', '🇧🇪 Belgium',
                '🇦🇹 Austria', '🇵🇹 Portugal', '🇮🇪 Ireland', '🇸🇪 Sweden', '🇩🇰 Denmark',
                '🇳🇴 Norway', '🇫🇮 Finland', '🇵🇱 Poland', '🇨🇿 Czech Republic', '🇷🇴 Romania',
                '🇮🇳 India', '🇲🇽 Mexico', '🇧🇷 Brazil', '🇦🇷 Argentina', '🇨🇳 China',
                '🇯🇵 Japan', '🇰🇷 South Korea', '🇻🇳 Vietnam', '🇵🇭 Philippines',
              ].map((country, i) => (
                <CountryPill key={country} index={i}>
                  {country}
                </CountryPill>
              ))}
            </StaggerSection>
          </div>
        </section>

        <Footer />
      </main>
    </>
  );
}

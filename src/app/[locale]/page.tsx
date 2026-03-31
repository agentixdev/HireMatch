import { useTranslations } from 'next-intl';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';
import {
  AnimatedSection,
  StaggerSection,
  StaggerItem,
  FeatureCard,
} from '@/components/AnimatedSection';
import {
  TwoSidedValue,
  PricingSection,
  FinalCTA,
} from '@/components/LandingSections';

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
        <section className="py-12 sm:py-20 bg-white dark:bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 ring-1 ring-purple-500/20 text-purple-400 text-xs font-semibold tracking-wider uppercase mb-4">
                How It Works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-bebas)' }}>
                Three Steps to Your Perfect Match
              </h2>
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
                    <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-3 text-sm text-slate-500 dark:text-white/50">{item.desc}</p>
                  </FeatureCard>
                </StaggerItem>
              ))}
            </StaggerSection>
          </div>
        </section>

        {/* Two-Sided Value — Candidates vs Recruiters */}
        <TwoSidedValue />

        {/* Pricing Tiers — SaaS monetization */}
        <PricingSection />

        {/* Final CTA */}
        <FinalCTA />

        <Footer />
      </main>
    </>
  );
}

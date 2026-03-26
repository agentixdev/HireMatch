import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  AnimatedSection,
  StaggerSection,
  StaggerItem,
  HeroAnimated,
  HeroItem,
  CountUp,
  CountryPill,
} from '@/components/AnimatedSection';

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
            <HeroAnimated className="text-center max-w-4xl mx-auto">
              <HeroItem>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight" style={{ fontFamily: 'var(--font-bebas)' }}>
                  {t('hero.title')}
                </h1>
              </HeroItem>
              <HeroItem>
                <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto">
                  {t('hero.subtitle', { countryCount: '29' })}
                </p>
              </HeroItem>
              <HeroItem>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/auth?mode=signup&role=candidate"
                    className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                  >
                    {t('hero.candidateCta')}
                  </Link>
                  <Link
                    href="/auth?mode=signup&role=recruiter"
                    className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white/80 bg-white/5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/10 rounded-xl transition-all"
                  >
                    {t('hero.recruiterCta')}
                  </Link>
                </div>
              </HeroItem>
            </HeroAnimated>

            {/* Stats */}
            <StaggerSection className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { label: t('hero.statsJobs'), target: 10000, suffix: '+' },
                { label: t('hero.statsCandidates'), target: 50000, suffix: '+' },
                { label: t('hero.statsCountries'), target: 29, suffix: '' },
                { label: t('hero.statsMatches'), target: 100000, suffix: '+' },
              ].map((stat) => (
                <StaggerItem key={stat.label}>
                  <div className="text-center bg-white/[0.04] ring-1 ring-white/[0.06] rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-400">
                      <CountUp target={stat.target} suffix={stat.suffix} />
                    </div>
                    <div className="mt-1 text-xs text-white/50">{stat.label}</div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerSection>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center" style={{ fontFamily: 'var(--font-bebas)' }}>How It Works</h2>
            <StaggerSection className="mt-14 grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Upload Your CV',
                  desc: 'Our AI parses your resume in seconds, extracting skills, experience, and qualifications into a rich profile.',
                  icon: 'solar:document-add-bold',
                  color: 'from-blue-500/20 to-blue-600/10',
                },
                {
                  step: '2',
                  title: 'Take the Matchmaker Quiz',
                  desc: 'Answer quick questions about your work style, values, and preferences to power our matching algorithm.',
                  icon: 'solar:heart-pulse-bold',
                  color: 'from-purple-500/20 to-purple-600/10',
                },
                {
                  step: '3',
                  title: 'Get Matched',
                  desc: 'AI scores you against thousands of jobs. See your match percentage, visa requirements, and apply with one click.',
                  icon: 'solar:star-shine-bold',
                  color: 'from-green-500/20 to-green-600/10',
                },
              ].map((item) => (
                <StaggerItem key={item.step}>
                  <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-6 text-center hover:ring-white/20 transition-all">
                    <div className={`w-14 h-14 mx-auto bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center`}>
                      <span className="text-2xl text-white/80">{item.step}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-sm text-white/50">{item.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerSection>
          </div>
        </section>

        {/* For Recruiters */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>For Recruiters</h2>
              <p className="mt-4 text-lg text-white/50">
                Post jobs, let AI rank candidates, manage your pipeline, and hire across 29 countries
                with built-in visa compliance.
              </p>
            </div>
            <StaggerSection className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'AI Candidate Ranking', desc: 'Candidates auto-ranked by match score against your JD', icon: 'solar:ranking-bold' },
                { title: 'Visa Compliance', desc: 'Auto-tagged sponsorship requirements per country', icon: 'solar:passport-bold' },
                { title: 'Pipeline Management', desc: 'Kanban board from applied to hired', icon: 'solar:widget-5-bold' },
                { title: 'ATS Webhooks', desc: 'Integrate with your existing tools via webhooks', icon: 'solar:programming-bold' },
              ].map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 hover:ring-white/20 transition-all">
                    <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                    <p className="mt-2 text-xs text-white/50">{feature.desc}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerSection>
            <div className="mt-10 text-center">
              <Link
                href="/auth?mode=signup&role=recruiter"
                className="px-8 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
              >
                Start Hiring — Free
              </Link>
            </div>
          </div>
        </section>

        {/* Top Candidates Preview */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-white text-center" style={{ fontFamily: 'var(--font-bebas)' }}>Top Candidates</h2>
            <p className="mt-3 text-center text-white/50">Featured job seekers ready to be hired</p>
            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'Your Profile Here', role: 'Upload your CV to get featured', skills: ['Sign up', 'Upload CV', 'Get Matched'] },
                { name: 'AI-Parsed Profiles', role: 'Instantly structured from any resume', skills: ['Skills', 'Experience', 'Education'] },
                { name: 'Match Scores', role: 'See how well you fit each role', skills: ['85% Match', 'Culture Fit', 'Visa Ready'] },
                { name: '29 Countries', role: 'Work permits & visa data included', skills: ['H-1B', 'Blue Card', 'Skilled Worker'] },
              ].map((card) => (
                <div key={card.name} className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl overflow-hidden hover:ring-white/20 hover:scale-[1.02] transition-all">
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-600/20 to-indigo-600/10 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white/30">
                      {card.name.charAt(0)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm">{card.name}</h3>
                    <p className="text-xs text-white/50 mt-1">{card.role}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {card.skills.map((skill) => (
                        <span key={skill} className="px-2 py-0.5 bg-white/5 ring-1 ring-white/10 text-white/60 text-[10px] rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Countries */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-bebas)' }}>Hire Globally</h2>
            <p className="mt-4 text-lg text-white/50">
              29 countries with real-time visa requirements and work permit data.
            </p>
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

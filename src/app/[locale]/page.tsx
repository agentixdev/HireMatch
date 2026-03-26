import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Header from '@/components/Header';

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
                {t('hero.title')}
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                {t('hero.subtitle', { countryCount: '29' })}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth?mode=signup&role=candidate"
                  className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 transition-all hover:shadow-xl"
                >
                  {t('hero.candidateCta')}
                </Link>
                <Link
                  href="/auth?mode=signup&role=recruiter"
                  className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border-2 border-gray-200 transition-all"
                >
                  {t('hero.recruiterCta')}
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {[
                { label: t('hero.statsJobs'), value: '10,000+' },
                { label: t('hero.statsCandidates'), value: '50,000+' },
                { label: t('hero.statsCountries'), value: '29' },
                { label: t('hero.statsMatches'), value: '100,000+' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                  <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 text-center">How It Works</h2>
            <div className="mt-16 grid md:grid-cols-3 gap-12">
              {[
                {
                  step: '1',
                  title: 'Upload Your CV',
                  desc: 'Our AI parses your resume in seconds, extracting skills, experience, and qualifications into a rich profile.',
                  icon: '📄',
                },
                {
                  step: '2',
                  title: 'Take the Matchmaker Quiz',
                  desc: 'Answer quick questions about your work style, values, and preferences to power our matching algorithm.',
                  icon: '🎯',
                },
                {
                  step: '3',
                  title: 'Get Matched',
                  desc: 'AI scores you against thousands of jobs. See your match percentage, visa requirements, and apply with one click.',
                  icon: '✨',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-3 text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* For Recruiters */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900">For Recruiters</h2>
              <p className="mt-4 text-lg text-gray-600">
                Post jobs, let AI rank candidates, manage your pipeline, and hire across 29 countries
                with built-in visa compliance.
              </p>
            </div>
            <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: 'AI Candidate Ranking', desc: 'Candidates auto-ranked by match score against your JD' },
                { title: 'Visa Compliance', desc: 'Auto-tagged sponsorship requirements per country' },
                { title: 'Pipeline Management', desc: 'Kanban board from applied to hired' },
                { title: 'ATS Webhooks', desc: 'Integrate with your existing tools via webhooks' },
              ].map((feature) => (
                <div key={feature.title} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/auth?mode=signup&role=recruiter"
                className="px-8 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Start Hiring — Free
              </Link>
            </div>
          </div>
        </section>

        {/* Countries */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Hire Globally</h2>
            <p className="mt-4 text-lg text-gray-600">
              29 countries with real-time visa requirements and work permit data.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              {[
                '🇺🇸 USA', '🇨🇦 Canada', '🇬🇧 UK', '🇨🇭 Switzerland', '🇩🇪 Germany',
                '🇫🇷 France', '🇪🇸 Spain', '🇮🇹 Italy', '🇳🇱 Netherlands', '🇧🇪 Belgium',
                '🇦🇹 Austria', '🇵🇹 Portugal', '🇮🇪 Ireland', '🇸🇪 Sweden', '🇩🇰 Denmark',
                '🇳🇴 Norway', '🇫🇮 Finland', '🇵🇱 Poland', '🇨🇿 Czech Republic', '🇷🇴 Romania',
                '🇮🇳 India', '🇲🇽 Mexico', '🇧🇷 Brazil', '🇦🇷 Argentina', '🇨🇳 China',
                '🇯🇵 Japan', '🇰🇷 South Korea', '🇻🇳 Vietnam', '🇵🇭 Philippines',
              ].map((country) => (
                <span
                  key={country}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700"
                >
                  {country}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <span className="font-bold text-white">HireMatch</span>
              </div>
              <p className="text-sm">
                &copy; {new Date().getFullYear()} HireMatch. AI-powered recruitment platform.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

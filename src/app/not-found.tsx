import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-lg">H</span>
        </div>
        <span className="font-bold text-xl text-white">HireMatch</span>
      </div>

      {/* Content */}
      <h1
        className="text-5xl sm:text-6xl font-bold text-white tracking-tight text-center"
        style={{ fontFamily: 'var(--font-bebas)' }}
      >
        Page Not Found
      </h1>
      <p className="mt-4 text-lg text-white/50 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
        <Link
          href="/jobs"
          className="px-8 py-3 text-white font-medium bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
        >
          Browse Jobs
        </Link>
        <Link
          href="/"
          className="px-8 py-3 text-white/70 font-medium bg-white/5 ring-1 ring-white/10 hover:ring-white/20 hover:bg-white/10 rounded-lg transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

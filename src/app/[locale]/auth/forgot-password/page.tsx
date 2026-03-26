'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Header from '@/components/Header';

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth/reset-password',
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center bg-transparent py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Forgot Password
            </h1>
            <p className="text-sm text-white/50 text-center mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {success ? (
              <div className="p-4 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-center">
                <p className="text-green-400 font-medium text-sm">
                  Check your email for a password reset link.
                </p>
                <Link
                  href="/auth?mode=signin"
                  className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}

            {!success && (
              <div className="mt-6 text-center">
                <Link
                  href="/auth?mode=signin"
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

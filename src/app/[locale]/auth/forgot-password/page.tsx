'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'code' | 'reset' | 'done'>('email');
  const [requiresCode, setRequiresCode] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'request' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setRequiresCode(!!data.requiresCode);
        if (data.requiresCode) {
          setStep('code');
        } else {
          setStep('reset');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, action: 'verify' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
      } else {
        setStep('reset');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newPassword,
          action: 'reset',
          ...(requiresCode ? { code } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Password reset failed');
      } else {
        setStep('done');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  const stepDescriptions: Record<string, string> = {
    email: 'Enter your email to reset your password.',
    code: 'Enter the 6-digit code sent to your email.',
    reset: 'Enter your new password.',
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center bg-transparent py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              {step === 'done' ? 'Password Updated' : 'Reset Password'}
            </h1>

            {step !== 'done' && (
              <p className="text-sm text-white/50 text-center mb-6">
                {stepDescriptions[step]}
              </p>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </button>
              </form>
            )}

            {step === 'code' && (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div className="p-3 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-lg text-blue-400 text-sm text-center mb-2">
                  Code sent to <strong>{email}</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Reset Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl tracking-[0.3em] font-mono placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); setCode(''); }}
                  className="w-full py-2 text-sm text-white/50 hover:text-white/70"
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="p-3 bg-blue-500/10 ring-1 ring-blue-500/20 rounded-lg text-blue-400 text-sm text-center mb-2">
                  Resetting password for <strong>{email}</strong>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-indigo-500/50 focus:bg-white/[0.08] outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(''); }}
                  className="w-full py-2 text-sm text-white/50 hover:text-white/70"
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === 'done' && (
              <div className="p-4 bg-green-500/10 ring-1 ring-green-500/20 rounded-lg text-center">
                <p className="text-green-400 font-medium text-sm">
                  Your password has been updated successfully.
                </p>
                <Link
                  href="/auth?mode=signin"
                  className="mt-4 inline-block px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg"
                >
                  Sign In
                </Link>
              </div>
            )}

            {step !== 'done' && (
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

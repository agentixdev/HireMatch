'use client';

import { useState } from 'react';
import Header from '@/components/Header';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For now, open mailto — can be replaced with an API endpoint later
    const subject = encodeURIComponent(`HireMatch Contact: ${name}`);
    const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`);
    window.location.href = `mailto:support@hirematch.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-transparent">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-3">Contact Us</h1>
          <p className="text-white/50 mb-8">
            Have a question, feedback, or need help? Reach out and we&apos;ll get back to you.
          </p>

          {submitted ? (
            <div className="p-6 bg-green-500/10 ring-1 ring-green-500/20 rounded-xl text-center">
              <p className="text-green-400 font-medium">Your email client should open shortly.</p>
              <p className="text-white/40 text-sm mt-2">
                You can also email us directly at{' '}
                <a href="mailto:support@hirematch.com" className="text-blue-400 hover:text-blue-300">
                  support@hirematch.com
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 focus:bg-white/[0.08] outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 focus:bg-white/[0.08] outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500/50 focus:bg-white/[0.08] outline-none transition-all resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-colors hover:from-blue-500 hover:to-indigo-500"
              >
                Send Message
              </button>
            </form>
          )}

          <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-white mb-1">Email</h3>
              <a href="mailto:support@hirematch.com" className="text-blue-400 hover:text-blue-300">
                support@hirematch.com
              </a>
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Response Time</h3>
              <p className="text-white/50">Usually within 24 hours</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

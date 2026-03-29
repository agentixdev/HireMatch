'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface VisaRule {
  id: string;
  country_code: string;
  visa_type: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  processing_time: string | null;
  cost: string | null;
  validity: string | null;
  source_url: string | null;
  last_scraped_at: string;
  created_at: string;
  updated_at: string;
}

export default function VisaCountrySection({
  flag,
  name,
  rules,
  locked = false,
  index = 0,
}: {
  flag: string;
  name: string;
  rules: VisaRule[];
  locked?: boolean;
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Intersection observer for staggered reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Measure content for spring animation
  useEffect(() => {
    if (open && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [open, rules]);

  return (
    <div
      ref={sectionRef}
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${
        locked
          ? 'opacity-50 ring-1 ring-white/5'
          : open
            ? 'ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/5'
            : 'ring-1 ring-white/10 hover:ring-white/20'
      }`}
      style={{
        background: open && !locked
          ? 'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,27,75,0.3) 100%)'
          : '#0F172A',
        opacity: visible ? undefined : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${Math.min(index * 60, 400)}ms`,
      }}
    >
      {/* Country header */}
      <button
        onClick={() => !locked && setOpen(!open)}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left group ${locked ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className="text-3xl transition-transform duration-300"
          style={{ transform: open ? 'scale(1.15)' : 'scale(1)' }}
        >
          {flag}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            {name}
            {!locked && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                open ? 'bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/20' : 'bg-white/5 text-white/30'
              }`}>
                {rules.length} {rules.length === 1 ? 'type' : 'types'}
              </span>
            )}
          </h2>
          {locked && (
            <p className="text-sm text-white/30">
              {rules.length} visa {rules.length === 1 ? 'type' : 'types'}
            </p>
          )}
        </div>
        {locked ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-yellow-500/60 font-medium">Pro</span>
            <Icon icon="solar:lock-keyhole-bold" className="w-5 h-5 text-yellow-500/50" />
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            open ? 'bg-indigo-500/20 rotate-180' : 'bg-white/5 group-hover:bg-white/10'
          }`}>
            <Icon
              icon="solar:alt-arrow-down-linear"
              className={`w-4 h-4 transition-colors ${open ? 'text-indigo-400' : 'text-white/40'}`}
            />
          </div>
        )}
      </button>

      {/* Visa cards — spring expand */}
      <div
        className="overflow-hidden transition-all"
        style={{
          maxHeight: open && !locked ? contentHeight + 40 : 0,
          opacity: open && !locked ? 1 : 0,
          transition: 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
      >
        <div ref={contentRef} className="px-6 pb-6 space-y-3">
          {rules.map((rule, ruleIdx) => (
            <div
              key={rule.id}
              className="bg-white/[0.03] hover:bg-white/[0.06] ring-1 ring-white/5 hover:ring-white/10 rounded-xl p-5 transition-all duration-200"
              style={{
                animation: open ? `blurReveal 0.4s ease-out ${ruleIdx * 80}ms both` : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1.5">
                    {rule.title}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full ring-1 ring-blue-500/20">
                    {rule.visa_type}
                  </span>
                </div>
                {rule.requirements && (rule.requirements as Record<string, boolean>).sponsorship_required === true && (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded-full ring-1 ring-amber-500/20">
                    <Icon icon="solar:buildings-bold" className="w-3 h-3" />
                    Sponsor Required
                  </span>
                )}
              </div>

              {rule.description && (
                <p className="text-sm text-white/50 mb-4 leading-relaxed">{rule.description}</p>
              )}

              {/* Info grid with micro-icons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rule.processing_time && (
                  <div className="flex items-center gap-2.5 text-sm bg-blue-500/5 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">Processing</p>
                      <p className="text-white/80 font-medium text-xs">{rule.processing_time}</p>
                    </div>
                  </div>
                )}
                {rule.cost && (
                  <div className="flex items-center gap-2.5 text-sm bg-emerald-500/5 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:wallet-bold" className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">Cost</p>
                      <p className="text-white/80 font-medium text-xs">{rule.cost}</p>
                    </div>
                  </div>
                )}
                {rule.validity && (
                  <div className="flex items-center gap-2.5 text-sm bg-purple-500/5 rounded-lg px-3 py-2">
                    <div className="w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon icon="solar:calendar-bold" className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider">Validity</p>
                      <p className="text-white/80 font-medium text-xs">{rule.validity}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Source + last scraped */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-white/25">
                <span className="flex items-center gap-1.5">
                  <Icon icon="solar:refresh-linear" className="w-3 h-3" />
                  {new Date(rule.last_scraped_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                {rule.source_url && (
                  <a
                    href={rule.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400/60 hover:text-blue-400 transition-colors flex items-center gap-1"
                  >
                    <Icon icon="solar:link-round-linear" className="w-3 h-3" />
                    Source
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

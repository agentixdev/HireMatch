'use client';

import { useState } from 'react';
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
}: {
  flag: string;
  name: string;
  rules: VisaRule[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#0F172A] ring-1 ring-white/10 rounded-2xl overflow-hidden hover:ring-white/20 transition-all">
      {/* Country header (toggle) */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left"
      >
        <span className="text-3xl">{flag}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white">{name}</h2>
          <p className="text-sm text-white/40">
            {rules.length} visa {rules.length === 1 ? 'type' : 'types'}
          </p>
        </div>
        <Icon
          icon="solar:alt-arrow-down-linear"
          className={`w-5 h-5 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Visa cards */}
      {open && (
        <div className="px-6 pb-6 space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white/5 ring-1 ring-white/5 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">
                    {rule.title}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full ring-1 ring-blue-500/20">
                    {rule.visa_type}
                  </span>
                </div>
              </div>

              {rule.description && (
                <p className="text-sm text-white/50 mb-4">{rule.description}</p>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rule.processing_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon icon="solar:clock-circle-linear" className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <div>
                      <p className="text-white/30 text-xs">Processing Time</p>
                      <p className="text-white/70">{rule.processing_time}</p>
                    </div>
                  </div>
                )}
                {rule.cost && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon icon="solar:wallet-linear" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-white/30 text-xs">Cost</p>
                      <p className="text-white/70">{rule.cost}</p>
                    </div>
                  </div>
                )}
                {rule.validity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon icon="solar:calendar-linear" className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-white/30 text-xs">Validity</p>
                      <p className="text-white/70">{rule.validity}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Source + last scraped */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-white/25">
                <span>
                  Updated:{' '}
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
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { Application, ApplicationStatus, Job, StatusChange } from '@/types';

// ---- Column definitions with temperature gradient ----
const COLUMNS: {
  status: ApplicationStatus;
  label: string;
  color: string;        // tailwind text color
  bgGradient: string;   // subtle column background
  ringColor: string;
  icon: string;
}[] = [
  {
    status: 'applied',
    label: 'Applied',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/[0.06] to-blue-600/[0.02]',
    ringColor: 'ring-blue-500/20',
    icon: 'solar:inbox-in-bold',
  },
  {
    status: 'reviewed',
    label: 'Reviewed',
    color: 'text-sky-400',
    bgGradient: 'from-sky-500/[0.06] to-sky-600/[0.02]',
    ringColor: 'ring-sky-500/20',
    icon: 'solar:eye-bold',
  },
  {
    status: 'shortlisted',
    label: 'Shortlisted',
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500/[0.06] to-cyan-600/[0.02]',
    ringColor: 'ring-cyan-500/20',
    icon: 'solar:star-bold',
  },
  {
    status: 'interview_scheduled',
    label: 'Interview Scheduled',
    color: 'text-teal-400',
    bgGradient: 'from-teal-500/[0.06] to-teal-600/[0.02]',
    ringColor: 'ring-teal-500/20',
    icon: 'solar:calendar-bold',
  },
  {
    status: 'interview_completed',
    label: 'Interview Done',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/[0.06] to-emerald-600/[0.02]',
    ringColor: 'ring-emerald-500/20',
    icon: 'solar:chat-round-check-bold',
  },
  {
    status: 'offer_extended',
    label: 'Offer Extended',
    color: 'text-lime-400',
    bgGradient: 'from-lime-500/[0.06] to-lime-600/[0.02]',
    ringColor: 'ring-lime-500/20',
    icon: 'solar:letter-bold',
  },
  {
    status: 'offer_accepted',
    label: 'Offer Accepted',
    color: 'text-green-400',
    bgGradient: 'from-green-500/[0.06] to-green-600/[0.02]',
    ringColor: 'ring-green-500/20',
    icon: 'solar:check-circle-bold',
  },
  {
    status: 'hired',
    label: 'Hired',
    color: 'text-green-300',
    bgGradient: 'from-green-400/[0.08] to-green-500/[0.03]',
    ringColor: 'ring-green-400/25',
    icon: 'solar:medal-ribbons-star-bold',
  },
  {
    status: 'rejected',
    label: 'Rejected',
    color: 'text-red-400',
    bgGradient: 'from-red-500/[0.08] to-red-600/[0.03]',
    ringColor: 'ring-red-500/25',
    icon: 'solar:close-circle-bold',
  },
];

// ---- Enriched application with joined data ----
interface EnrichedApplication extends Application {
  candidate_name: string;
  candidate_photo?: string;
  candidate_headline?: string;
  job_title: string;
}

// ---- Sparkle animation component ----
function SparkleOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400"
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.2, 0],
                x: Math.cos((i * Math.PI * 2) / 8) * 32,
                y: Math.sin((i * Math.PI * 2) / 8) * 32,
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.4, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Icon icon="solar:star-bold" className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Checkmark micro-feedback ----
function CheckmarkFeedback({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-green-500/10 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: [0, 1.3, 1], rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon icon="solar:check-circle-bold" className="w-10 h-10 text-green-400" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Application Card ----
function ApplicationCard({
  app,
  onStatusChange,
  currentColumn,
}: {
  app: EnrichedApplication;
  onStatusChange: (appId: string, newStatus: ApplicationStatus) => void;
  currentColumn: ApplicationStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sparkle, setSparkle] = useState(false);
  const [checkmark, setCheckmark] = useState(false);
  const sparkleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkmarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (sparkleTimerRef.current) clearTimeout(sparkleTimerRef.current);
      if (checkmarkTimerRef.current) clearTimeout(checkmarkTimerRef.current);
    };
  }, []);

  const initials = app.candidate_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const colIdx = COLUMNS.findIndex((c) => c.status === currentColumn);

  // Possible next/prev statuses (excluding current)
  const moveOptions = COLUMNS.filter((c) => c.status !== currentColumn && c.status !== 'rejected');
  const rejectOption = COLUMNS.find((c) => c.status === 'rejected')!;

  function handleStatusChange(newStatus: ApplicationStatus) {
    // Clear any existing timers before starting new ones
    if (sparkleTimerRef.current) clearTimeout(sparkleTimerRef.current);
    if (checkmarkTimerRef.current) clearTimeout(checkmarkTimerRef.current);

    setSparkle(true);
    sparkleTimerRef.current = setTimeout(() => {
      setSparkle(false);
      setCheckmark(true);
      checkmarkTimerRef.current = setTimeout(() => {
        setCheckmark(false);
        onStatusChange(app.id, newStatus);
      }, 400);
    }, 500);
  }

  const scoreColor =
    (app.match_score ?? 0) >= 80
      ? 'text-green-400 bg-green-500/10'
      : (app.match_score ?? 0) >= 60
        ? 'text-yellow-400 bg-yellow-500/10'
        : 'text-white/50 bg-white/5';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="relative bg-[#0F172A] ring-1 ring-white/10 rounded-xl overflow-hidden cursor-pointer hover:ring-white/20 transition-all group"
      onClick={() => setExpanded(!expanded)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <SparkleOverlay show={sparkle} />
      <CheckmarkFeedback show={checkmark} />

      {/* Compact view */}
      <div className="p-3.5">
        <div className="flex items-center gap-3">
          {app.candidate_photo ? (
            <img
              src={app.candidate_photo}
              alt={app.candidate_name}
              className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{app.candidate_name}</p>
            <p className="text-xs text-white/40 truncate">{app.job_title}</p>
          </div>
          {app.match_score != null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor}`}>
              {app.match_score}%
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[10px] text-white/30">
            {new Date(app.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <motion.div
            initial={false}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Icon icon="solar:alt-arrow-down-linear" className="w-3.5 h-3.5 text-white/30" />
          </motion.div>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.06] space-y-3">
              {/* Headline */}
              {app.candidate_headline && (
                <p className="text-xs text-white/50 italic">{app.candidate_headline}</p>
              )}

              {/* Match breakdown */}
              {app.match_score != null && (
                <div>
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                    Match Score
                  </p>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${app.match_score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  {app.match_explanation && (
                    <p className="text-[10px] text-white/30 mt-1">{app.match_explanation}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              {app.notes && (
                <div>
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">
                    Notes
                  </p>
                  <p className="text-xs text-white/50">{app.notes}</p>
                </div>
              )}

              {/* Timeline */}
              {app.status_history && app.status_history.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">
                    Timeline
                  </p>
                  <div className="space-y-1">
                    {app.status_history.slice(-4).map((sh, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-white/40">
                          {new Date(sh.changed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="text-white/60 capitalize">
                          {sh.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status change buttons */}
              <div>
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
                  Move to
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* Show forward options first (next statuses) */}
                  {moveOptions
                    .filter((c) => {
                      const idx = COLUMNS.findIndex((col) => col.status === c.status);
                      return idx > colIdx && idx <= colIdx + 3;
                    })
                    .map((col) => (
                      <motion.button
                        key={col.status}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStatusChange(col.status)}
                        className={`px-2 py-1 text-[10px] font-medium rounded-md ring-1 ${col.ringColor} ${col.color} bg-white/[0.03] hover:bg-white/[0.06] transition-colors`}
                      >
                        {col.label}
                      </motion.button>
                    ))}
                  {/* Reject button */}
                  {currentColumn !== 'rejected' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleStatusChange('rejected')}
                      className="px-2 py-1 text-[10px] font-medium rounded-md ring-1 ring-red-500/25 text-red-400 bg-white/[0.03] hover:bg-red-500/10 transition-colors"
                    >
                      Reject
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---- Main Page ----
export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [applications, setApplications] = useState<EnrichedApplication[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [recruiterId, setRecruiterId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  const loadApplications = useCallback(
    async (recId: string) => {
      let query = supabase
        .from('applications')
        .select(
          `
          *,
          candidates:candidate_id ( full_name, photo_url, headline ),
          jobs:job_id ( title )
        `
        )
        .eq('recruiter_id', recId)
        .order('created_at', { ascending: false });

      if (filterJobId !== 'all') {
        query = query.eq('job_id', filterJobId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading applications:', error);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched: EnrichedApplication[] = (data || []).map((row: any) => ({
        id: row.id,
        candidate_id: row.candidate_id,
        job_id: row.job_id,
        recruiter_id: row.recruiter_id,
        status: row.status,
        cover_letter: row.cover_letter,
        match_score: row.match_score,
        match_explanation: row.match_explanation,
        notes: row.notes,
        status_history: row.status_history || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        candidate_name: row.candidates?.full_name || 'Unknown',
        candidate_photo: row.candidates?.photo_url,
        candidate_headline: row.candidates?.headline,
        job_title: row.jobs?.title || 'Unknown Job',
      }));

      setApplications(enriched);
    },
    [filterJobId, supabase]
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.push('/auth?mode=signin');
        return;
      }
      setUserId(user.id);

      const { data: rec } = await supabase
        .from('recruiters')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

      if (!rec) {
        router.push('/dashboard/recruiter/onboarding');
        return;
      }

      setRecruiterId(rec.id);

      // Load jobs and applications in parallel (both depend on rec.id)
      const [jobResult] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('recruiter_id', rec.id)
          .eq('is_active', true)
          .order('title'),
        loadApplications(rec.id),
      ]);

      if (cancelled) return;

      setJobs((jobResult.data || []) as unknown as Job[]);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when job filter changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (recruiterId) {
      loadApplications(recruiterId);
    }
  }, [filterJobId, recruiterId, loadApplications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleStatusChange(appId: string, newStatus: ApplicationStatus) {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    const newHistoryEntry: StatusChange = {
      status: newStatus,
      changed_at: new Date().toISOString(),
      changed_by: userId,
    };

    const updatedHistory = [...(app.status_history || []), newHistoryEntry];

    const { error } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        status_history: updatedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appId);

    if (error) {
      console.error('Failed to update status:', error);
      return;
    }

    // Optimistically update local state
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, status: newStatus, status_history: updatedHistory }
          : a
      )
    );
  }

  const filteredByColumn = (status: ApplicationStatus) =>
    applications.filter((a) => a.status === status);

  const totalCount = applications.length;

  if (loading) {
    return (
      <DashboardLayout role="recruiter">
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          >
            <Icon icon="solar:refresh-bold" className="w-8 h-8 text-white/30" />
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="recruiter">
      <div className="min-h-screen">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Application Pipeline</h1>
              <p className="text-sm text-white/40 mt-0.5">
                {totalCount} application{totalCount !== 1 ? 's' : ''} across all stages
              </p>
            </div>

            {/* Job filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-white/50">Filter by job:</label>
              <select
                value={filterJobId}
                onChange={(e) => setFilterJobId(e.target.value)}
                className="bg-[#0F172A] ring-1 ring-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-blue-500/50 min-w-[200px]"
              >
                <option value="all">All Jobs</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/dashboard/recruiter')}
                className="px-3 py-2 text-sm text-white/50 ring-1 ring-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Kanban board */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4" style={{ minWidth: `${COLUMNS.length * 280}px` }}>
              {COLUMNS.map((col) => {
                const colApps = filteredByColumn(col.status);
                return (
                  <motion.div
                    key={col.status}
                    layout
                    className={`flex-1 min-w-[260px] max-w-[320px] rounded-xl bg-gradient-to-b ${col.bgGradient} ring-1 ${col.ringColor} flex flex-col`}
                  >
                    {/* Column header */}
                    <div className="px-3.5 py-3 flex items-center justify-between border-b border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <Icon icon={col.icon} className={`w-4 h-4 ${col.color}`} />
                        <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                      </div>
                      <motion.span
                        key={colApps.length}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} bg-white/[0.06]`}
                      >
                        {colApps.length}
                      </motion.span>
                    </div>

                    {/* Cards */}
                    <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-220px)]">
                      <AnimatePresence mode="popLayout">
                        {colApps.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-8 text-center"
                          >
                            <Icon
                              icon="solar:inbox-linear"
                              className="w-8 h-8 text-white/10 mx-auto mb-2"
                            />
                            <p className="text-xs text-white/20">No applications</p>
                          </motion.div>
                        ) : (
                          colApps.map((app) => (
                            <ApplicationCard
                              key={app.id}
                              app={app}
                              onStatusChange={handleStatusChange}
                              currentColumn={col.status}
                            />
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

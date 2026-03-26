'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function ApplyButton({ jobId, recruiterId }: { jobId: string; recruiterId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cand } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (cand) {
        setCandidateId(cand.id);

        const { data: app } = await supabase
          .from('applications')
          .select('id')
          .eq('candidate_id', cand.id)
          .eq('job_id', jobId)
          .single();

        if (app) setApplied(true);
      }
    }
    check();
  }, [jobId]);

  const handleApply = async () => {
    if (!candidateId) {
      router.push('/auth?mode=signin');
      return;
    }

    setApplying(true);

    const { error } = await supabase
      .from('applications')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        recruiter_id: recruiterId,
        status: 'applied',
        status_history: [{ status: 'applied', changed_at: new Date().toISOString(), changed_by: candidateId }],
      });

    if (!error) {
      setApplied(true);

      // Increment application count on job (best-effort)
      await supabase.rpc('increment_applications', { job_id: jobId }).then(() => {}, () => {});
    }
    setApplying(false);
  };

  if (applied) {
    return (
      <button disabled className="px-6 py-3 bg-green-500/20 text-green-400 font-medium rounded-lg">
        Applied
      </button>
    );
  }

  return (
    <button
      onClick={handleApply}
      disabled={applying}
      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {applying ? 'Applying...' : candidateId ? 'Apply Now' : 'Sign In to Apply'}
    </button>
  );
}

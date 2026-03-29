'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase';

// ---- Types ----

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_config_id: string;
  event: string;
  response_status: number;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { value: 'application.created', label: 'Application Created', icon: 'solar:document-add-linear' },
  { value: 'application.status_changed', label: 'Status Changed', icon: 'solar:refresh-circle-linear' },
  { value: 'candidate.matched', label: 'Candidate Matched', icon: 'solar:users-group-rounded-linear' },
  { value: 'job.created', label: 'Job Created', icon: 'solar:case-round-linear' },
  { value: 'job.closed', label: 'Job Closed', icon: 'solar:close-circle-linear' },
  { value: 'match.found', label: 'Match Found', icon: 'solar:heart-pulse-linear' },
] as const;

// ---- Component ----

export default function WebhooksPage() {
  const supabase = createClient();

  const [userName, setUserName] = useState('');
  const [configs, setConfigs] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<WebhookConfig | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Secret display (shown once after creation)
  const [revealedSecret, setRevealedSecret] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; status: number } | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- Fetch data ----
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/recruiter/webhooks');
      if (!res.ok) throw new Error('Failed to load webhooks');
      const data = await res.json();
      setConfigs(data.configs || []);
      setDeliveries(data.deliveries || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserName(user.user_metadata?.full_name || user.email || '');
    });
  }, [fetchData, supabase.auth]);

  // ---- Handlers ----

  const openAddModal = () => {
    setFormUrl('');
    setFormEvents([]);
    setFormError('');
    setRevealedSecret('');
    setEditingConfig(null);
    setShowAddModal(true);
  };

  const openEditModal = (config: WebhookConfig) => {
    setFormUrl(config.url);
    setFormEvents([...config.events]);
    setFormError('');
    setRevealedSecret('');
    setEditingConfig(config);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingConfig(null);
    setRevealedSecret('');
  };

  const toggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleSave = async () => {
    setFormError('');
    if (!formUrl.trim()) { setFormError('URL is required'); return; }
    if (formEvents.length === 0) { setFormError('Select at least one event'); return; }

    setFormSaving(true);
    try {
      if (editingConfig) {
        // PATCH
        const res = await fetch(`/api/recruiter/webhooks/${editingConfig.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formUrl, events: formEvents }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update');
        }
        await fetchData();
        closeModal();
      } else {
        // POST
        const res = await fetch('/api/recruiter/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formUrl, events: formEvents }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to create');
        setRevealedSecret(d.secret);
        await fetchData();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleActive = async (config: WebhookConfig) => {
    try {
      const res = await fetch(`/api/recruiter/webhooks/${config.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !config.is_active }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      await fetchData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recruiter/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setDeletingId(null);
      await fetchData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/recruiter/webhooks/${id}`, { method: 'POST' });
      const d = await res.json();
      setTestResult({ id, ok: d.delivered, status: d.response_status });
      await fetchData(); // refresh deliveries
    } catch {
      setTestResult({ id, ok: false, status: 0 });
    } finally {
      setTestingId(null);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(revealedSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const getDeliveriesForConfig = (configId: string) =>
    deliveries.filter((d) => d.webhook_config_id === configId).slice(0, 10);

  // ---- Render ----

  return (
    <DashboardLayout role="recruiter" userName={userName}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-white">Webhooks</h1>
            <p className="text-sm text-white/50 mt-1">
              Receive real-time notifications when events happen in HireMatch.
            </p>
          </div>
          <motion.button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Icon icon="solar:add-circle-bold" className="w-5 h-5" />
            Add Webhook
          </motion.button>
        </motion.div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Icon icon="solar:refresh-circle-linear" className="w-8 h-8 text-white/30 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && configs.length === 0 && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
              <Icon icon="solar:plug-circle-linear" className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No webhooks configured</h3>
            <p className="text-sm text-white/40 max-w-sm mx-auto">
              Set up webhooks to receive real-time notifications about applications, matches, and job events.
            </p>
            <motion.button
              onClick={openAddModal}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-white text-sm font-medium transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
              Create your first webhook
            </motion.button>
          </motion.div>
        )}

        {/* Webhook list */}
        {!loading && configs.length > 0 && (
          <div className="space-y-4">
            {configs.map((config, index) => (
              <motion.div
                key={config.id}
                className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: index * 0.05 }}
              >
                {/* Config header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          config.is_active ? 'bg-emerald-400 shadow-lg shadow-emerald-400/30' : 'bg-white/20'
                        }`} />
                        <code className="text-sm text-white font-mono truncate block">{config.url}</code>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {config.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Toggle active */}
                      <motion.button
                        onClick={() => handleToggleActive(config)}
                        className={`p-2 rounded-lg transition-colors ${
                          config.is_active
                            ? 'text-emerald-400 hover:bg-emerald-400/10'
                            : 'text-white/30 hover:bg-white/5'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={config.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Icon
                          icon={config.is_active ? 'solar:power-bold' : 'solar:power-linear'}
                          className="w-5 h-5"
                        />
                      </motion.button>

                      {/* Test */}
                      <motion.button
                        onClick={() => handleTest(config.id)}
                        disabled={testingId === config.id}
                        className="p-2 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Send test event"
                      >
                        <Icon
                          icon={testingId === config.id ? 'solar:refresh-circle-linear' : 'solar:play-circle-linear'}
                          className={`w-5 h-5 ${testingId === config.id ? 'animate-spin' : ''}`}
                        />
                      </motion.button>

                      {/* Edit */}
                      <motion.button
                        onClick={() => openEditModal(config)}
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Edit"
                      >
                        <Icon icon="solar:pen-2-linear" className="w-5 h-5" />
                      </motion.button>

                      {/* Delete */}
                      <motion.button
                        onClick={() => setDeletingId(config.id)}
                        className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete"
                      >
                        <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Test result toast */}
                  <AnimatePresence>
                    {testResult && testResult.id === config.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className={`text-sm px-3 py-2 rounded-lg ${
                          testResult.ok
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                        }`}
                      >
                        {testResult.ok
                          ? `Test delivered successfully (HTTP ${testResult.status})`
                          : `Test failed${testResult.status ? ` (HTTP ${testResult.status})` : ' (connection error)'}`}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Delete confirmation */}
                  <AnimatePresence>
                    {deletingId === config.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-red-500/10 ring-1 ring-red-500/20"
                      >
                        <span className="text-sm text-red-400">Delete this webhook?</span>
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1 text-xs rounded-md bg-white/5 text-white/60 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Recent deliveries */}
                {(() => {
                  const configDeliveries = getDeliveriesForConfig(config.id);
                  if (configDeliveries.length === 0) return null;
                  return (
                    <div className="border-t border-white/[0.06] px-5 py-3">
                      <p className="text-[11px] font-medium text-white/30 uppercase tracking-wider mb-2">
                        Recent Deliveries
                      </p>
                      <div className="space-y-1">
                        {configDeliveries.map((d) => (
                          <div key={d.id} className="flex items-center gap-3 text-xs">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              d.response_status >= 200 && d.response_status < 300
                                ? 'bg-emerald-400'
                                : d.response_status > 0
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            }`} />
                            <span className="text-white/60 font-mono">{d.event}</span>
                            <span className={`font-mono ${
                              d.response_status >= 200 && d.response_status < 300
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}>
                              {d.response_status || 'ERR'}
                            </span>
                            <span className="text-white/25 ml-auto">
                              {new Date(d.created_at).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </div>
        )}

        {/* ---- Add/Edit Modal ---- */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Backdrop */}
              <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeModal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />

              {/* Modal content */}
              <motion.div
                className="relative w-full max-w-lg rounded-2xl bg-[#0f1225] ring-1 ring-white/10 shadow-2xl overflow-hidden"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                  <h2 className="text-lg font-semibold text-white">
                    {revealedSecret ? 'Webhook Created' : editingConfig ? 'Edit Webhook' : 'Add Webhook'}
                  </h2>
                  <motion.button
                    onClick={closeModal}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Secret reveal screen */}
                {revealedSecret ? (
                  <div className="p-6">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 mb-4">
                      <Icon icon="solar:shield-warning-bold" className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-400 mb-1">Save your signing secret</p>
                        <p className="text-xs text-amber-400/70">
                          This secret will only be shown once. Use it to verify webhook signatures.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <code className="block w-full p-3 pr-12 rounded-xl bg-black/30 ring-1 ring-white/10 text-xs text-emerald-400 font-mono break-all">
                        {revealedSecret}
                      </code>
                      <motion.button
                        onClick={copySecret}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Icon
                          icon={secretCopied ? 'solar:check-circle-bold' : 'solar:copy-linear'}
                          className={`w-4 h-4 ${secretCopied ? 'text-emerald-400' : ''}`}
                        />
                      </motion.button>
                    </div>

                    <motion.button
                      onClick={closeModal}
                      className="mt-6 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Done
                    </motion.button>
                  </div>
                ) : (
                  /* Form */
                  <div className="p-6 space-y-5">
                    {/* URL */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-2">
                        Endpoint URL
                      </label>
                      <input
                        type="url"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="https://your-app.com/api/webhooks"
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>

                    {/* Events */}
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-3">
                        Events to subscribe
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {WEBHOOK_EVENTS.map((evt) => {
                          const selected = formEvents.includes(evt.value);
                          return (
                            <motion.button
                              key={evt.value}
                              type="button"
                              onClick={() => toggleEvent(evt.value)}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all ${
                                selected
                                  ? 'bg-blue-600/15 ring-1 ring-blue-500/30 text-blue-400'
                                  : 'bg-white/[0.03] ring-1 ring-white/[0.06] text-white/50 hover:text-white hover:ring-white/15'
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Icon icon={evt.icon} className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{evt.label}</span>
                              {selected && (
                                <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Error */}
                    {formError && (
                      <p className="text-sm text-red-400">{formError}</p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={closeModal}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/60 text-sm font-medium hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        onClick={handleSave}
                        disabled={formSaving}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {formSaving ? (
                          <Icon icon="solar:refresh-circle-linear" className="w-5 h-5 animate-spin mx-auto" />
                        ) : editingConfig ? (
                          'Save Changes'
                        ) : (
                          'Create Webhook'
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

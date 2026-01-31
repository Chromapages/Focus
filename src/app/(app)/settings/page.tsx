'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { authFetch } from '@/lib/apiClient';

type Status = {
  connected: boolean;
  writeBackEnabled: boolean;
  connectedAt?: number | null;
};

export default function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await authFetch('/api/integrations/googleCalendar/status');
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Failed to load');
    setStatus({
      connected: Boolean(json.connected),
      writeBackEnabled: Boolean(json.writeBackEnabled),
      connectedAt: json.connectedAt ?? null,
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e?.message ?? 'Failed to load'));
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch('/api/integrations/googleCalendar/connect');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to start OAuth');
      window.location.href = String(json.url);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to connect');
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch('/api/integrations/googleCalendar/disconnect', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to disconnect');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to disconnect');
    } finally {
      setBusy(false);
    }
  }

  async function setWriteBackEnabled(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch('/api/integrations/googleCalendar/writeback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to update');
      setStatus((s) => (s ? { ...s, writeBackEnabled: Boolean(json.writeBackEnabled) } : s));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Integrations and preferences.</p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <p className="mt-1 text-sm text-zinc-400">Connect to read upcoming events and (optionally) write back due dates.</p>

        <div className="mt-4 space-y-3">
          <div className="text-sm">
            Status:{' '}
            {status == null ? (
              <span className="text-zinc-400">Loading…</span>
            ) : status.connected ? (
              <span className="text-emerald-300">Connected</span>
            ) : (
              <span className="text-zinc-400">Not connected</span>
            )}
            {status?.connectedAt ? (
              <span className="ml-2 text-xs text-zinc-500">({new Date(status.connectedAt).toLocaleString()})</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {status?.connected ? (
              <Button variant="danger" onClick={disconnect} disabled={busy}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" onClick={connect} disabled={busy}>
                {busy ? 'Connecting…' : 'Connect'}
              </Button>
            )}
            <Button onClick={() => load().catch((e) => setError(e?.message ?? 'Failed to load'))} disabled={busy}>
              Refresh
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Write back due dates</div>
                <div className="mt-1 text-xs text-zinc-500">Create all-day Google Calendar events for action item due dates.</div>
              </div>
              <button
                className={`h-7 w-12 rounded-full border transition ${
                  status?.writeBackEnabled ? 'border-emerald-500/40 bg-emerald-500/20' : 'border-zinc-700 bg-zinc-900'
                }`}
                onClick={() => setWriteBackEnabled(!status?.writeBackEnabled)}
                disabled={!status?.connected || busy}
                title={!status?.connected ? 'Connect Google Calendar first' : undefined}
              >
                <span
                  className={`block h-6 w-6 translate-x-0 rounded-full bg-white transition ${
                    status?.writeBackEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">AI</h2>
        <p className="mt-1 text-sm text-zinc-400">Meeting transcript processing uses Gemini via server-side API routes.</p>
        <p className="mt-2 text-xs text-zinc-500">Configure GEMINI_API_KEY in your server environment.</p>
      </div>
    </section>
  );
}

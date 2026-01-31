'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';

type EventItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink?: string;
};

function fmt(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CalendarPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const statusRes = await authFetch('/api/integrations/googleCalendar/status');
      const statusJson = await statusRes.json();
      if (!statusRes.ok) throw new Error(statusJson?.error ?? 'Failed to load status');
      setConnected(Boolean(statusJson.connected));

      if (!statusJson.connected) {
        setEvents([]);
        return;
      }

      const res = await authFetch('/api/calendar/events?days=7');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load events');
      setEvents(Array.isArray(json.events) ? json.events : []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    }
  }

  useEffect(() => {
    void load();
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

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-zinc-400">Upcoming events (next 7 days) from Google Calendar.</p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {connected === false ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm text-zinc-200">Google Calendar not connected.</div>
          <div className="mt-3">
            <Button variant="primary" onClick={connect} disabled={busy}>
              {busy ? 'Connecting…' : 'Connect Google Calendar'}
            </Button>
          </div>
        </div>
      ) : null}

      {connected ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming</h2>
            <button className="text-xs text-zinc-400 hover:text-zinc-200" onClick={load}>
              Refresh
            </button>
          </div>

          {events.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No events found.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {events.map((e) => (
                <li key={e.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {fmt(e.start)} → {fmt(e.end)}
                  </div>
                  {e.htmlLink ? (
                    <a className="mt-2 inline-block text-xs text-zinc-300 underline" href={e.htmlLink}>
                      Open in Google Calendar
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

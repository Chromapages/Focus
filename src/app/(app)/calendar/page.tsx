'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/apiClient';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  RefreshCcw, 
  Clock, 
  MapPin,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTimeRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${s.toLocaleTimeString([], timeOpts)} – ${e.toLocaleTimeString([], timeOpts)}`;
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="accent" className="mb-2">Time Management</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-2 text-foreground/50 max-w-md">
             Your upcoming schedule synchronized from Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="secondary" size="sm" onClick={load} icon={<RefreshCcw size={14} />}>
             Sync Now
           </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-500">
           {error}
        </div>
      )}

      {!connected && connected !== null && (
        <Card variant="glass" className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center text-accent mb-6 shadow-inner">
             <CalendarIcon size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Connect your calendar</h2>
          <p className="max-w-xs text-foreground/50 mb-8 mx-auto">
             Sync your Google Calendar events to keep your productivity OS in sync with your life.
          </p>
          <Button variant="primary" size="lg" onClick={connect} disabled={busy} loading={busy}>
            Connect Google Calendar
          </Button>
        </Card>
      )}

      {connected && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/30">UPCOMING AGENDA • {events.length}</h2>
          </div>

          {events.length === 0 ? (
            <Card variant="glass" className="py-20 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
               <Inbox size={40} className="mb-4 text-foreground/20" />
               <p className="text-sm font-medium">Clear schedule</p>
               <p className="text-xs text-foreground/40 mt-1">No upcoming events for the next 7 days.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((e) => (
                <Card 
                  key={e.id} 
                  variant="interactive" 
                  className="p-5 flex items-center gap-6"
                  asChild
                >
                  <div className="w-full flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-surface-secondary border border-border-subtle group-hover:border-accent/40 transition-colors">
                       <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                          {new Date(e.start).toLocaleDateString('en-US', { month: 'short' })}
                       </span>
                       <span className="text-xl font-bold text-foreground">
                          {new Date(e.start).getDate()}
                       </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold truncate group-hover:text-accent transition-colors">{e.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                           <Clock size={12} />
                           {getTimeRange(e.start, e.end)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-foreground/40">
                           <MapPin size={12} />
                           {new Date(e.start).toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>

                    {e.htmlLink && (
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0" asChild>
                        <a href={e.htmlLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={16} />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

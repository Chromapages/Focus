'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { authFetch } from '@/lib/apiClient';

type ActionItem = {
  title: string;
  dueDateISO?: string | null;
  priority?: 'low' | 'med' | 'high' | null;
};

type MeetingExtract = {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  followUps: string[];
};

export default function NewMeetingPage() {
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meeting, setMeeting] = useState<MeetingExtract | null>(null);

  const [writeBackEnabled, setWriteBackEnabled] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const canProcess = transcript.trim().length > 0 && !processing;

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/integrations/googleCalendar/status');
        const json = await res.json();
        if (res.ok) {
          setCalendarConnected(Boolean(json.connected));
          setWriteBackEnabled(Boolean(json.writeBackEnabled));
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  async function onPickFile(file: File) {
    setError(null);
    const text = await file.text();
    setTranscript(text);
  }

  async function processTranscript() {
    setProcessing(true);
    setError(null);
    try {
      const res = await authFetch('/api/meetings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Processing failed');
      setMeeting(json.meeting as MeetingExtract);
    } catch (e: any) {
      setError(e?.message ?? 'Processing failed');
    } finally {
      setProcessing(false);
    }
  }

  async function finalize() {
    if (!meeting) return;
    setFinalizing(true);
    setError(null);
    try {
      const res = await authFetch('/api/meetings/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting, writeBack: calendarConnected && writeBackEnabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Finalize failed');

      // Reset for another run.
      setTranscript('');
      setMeeting(null);
      alert('Saved: note + tasks created.');
    } catch (e: any) {
      setError(e?.message ?? 'Finalize failed');
    } finally {
      setFinalizing(false);
    }
  }

  const actionCount = meeting?.actionItems?.length ?? 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New meeting</h1>
        <p className="mt-1 text-sm text-zinc-400">Paste a transcript, extract structured notes + tasks, then confirm.</p>
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!meeting ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Transcript</h2>
            <label className="text-xs text-zinc-400">
              <input
                type="file"
                accept="text/plain,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onPickFile(f);
                }}
              />
              <span className="cursor-pointer underline">Upload .txt</span>
            </label>
          </div>

          <Textarea
            rows={12}
            placeholder="Paste transcript here…"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">Tip: include speaker names if you have them.</div>
            <Button variant="primary" onClick={processTranscript} disabled={!canProcess}>
              {processing ? 'Processing…' : 'Process'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Review</h2>
              <Button variant="ghost" onClick={() => setMeeting(null)} disabled={finalizing}>
                Back
              </Button>
            </div>

            <div>
              <div className="text-xs text-zinc-400">Summary</div>
              <Textarea
                rows={4}
                value={meeting.summary}
                onChange={(e) => setMeeting({ ...meeting, summary: e.target.value })}
              />
            </div>

            <div>
              <div className="text-xs text-zinc-400">Decisions (one per line)</div>
              <Textarea
                rows={4}
                value={meeting.decisions.join('\n')}
                onChange={(e) =>
                  setMeeting({
                    ...meeting,
                    decisions: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <div className="text-xs text-zinc-400">Follow ups (one per line)</div>
              <Textarea
                rows={3}
                value={meeting.followUps.join('\n')}
                onChange={(e) =>
                  setMeeting({
                    ...meeting,
                    followUps: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-400">Action items ({actionCount})</div>
                <Button
                  size="sm"
                  onClick={() =>
                    setMeeting({
                      ...meeting,
                      actionItems: [...meeting.actionItems, { title: '', dueDateISO: null, priority: null }],
                    })
                  }
                >
                  Add
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {meeting.actionItems.length === 0 ? (
                  <div className="text-sm text-zinc-500">No action items.</div>
                ) : (
                  meeting.actionItems.map((a, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
                      <Input
                        placeholder="Action item title…"
                        value={a.title}
                        onChange={(e) => {
                          const next = meeting.actionItems.slice();
                          next[idx] = { ...a, title: e.target.value };
                          setMeeting({ ...meeting, actionItems: next });
                        }}
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
                          type="date"
                          value={(a.dueDateISO ?? '').slice(0, 10)}
                          onChange={(e) => {
                            const next = meeting.actionItems.slice();
                            next[idx] = { ...a, dueDateISO: e.target.value || null };
                            setMeeting({ ...meeting, actionItems: next });
                          }}
                        />
                        <select
                          className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
                          value={a.priority ?? ''}
                          onChange={(e) => {
                            const v = e.target.value as any;
                            const next = meeting.actionItems.slice();
                            next[idx] = { ...a, priority: v ? v : null };
                            setMeeting({ ...meeting, actionItems: next });
                          }}
                        >
                          <option value="">Priority</option>
                          <option value="low">Low</option>
                          <option value="med">Med</option>
                          <option value="high">High</option>
                        </select>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const next = meeting.actionItems.slice();
                            next.splice(idx, 1);
                            setMeeting({ ...meeting, actionItems: next });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Write back to Google Calendar</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Create all-day events for action item due dates. (Toggle in Settings.)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={calendarConnected && writeBackEnabled}
                  onChange={(e) => setWriteBackEnabled(e.target.checked)}
                  disabled={!calendarConnected}
                />
              </label>
              {!calendarConnected ? (
                <div className="mt-2 text-xs text-zinc-500">
                  Not connected. <Link className="underline" href="/settings">Connect Google Calendar</Link> to enable.
                </div>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onClick={finalize} disabled={finalizing}>
                {finalizing ? 'Saving…' : 'Confirm + create note & tasks'}
              </Button>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            After saving, find the note in <Link className="underline" href="/notes">Notes</Link> and tasks in{' '}
            <Link className="underline" href="/tasks">Tasks</Link>.
          </div>
        </div>
      )}
    </section>
  );
}

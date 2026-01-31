'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDb } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type TaskDoc = {
  title: string;
  createdAt: number;
  dueAt?: number;
  status: 'open' | 'done' | 'waiting';
  priority?: 'low' | 'med' | 'high';
};

function bucket(dueAt?: number) {
  if (!dueAt) return 'No due date';
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (dueAt < now) return 'Overdue';
  if (dueAt < now + day) return 'Due <24h';
  if (dueAt < now + 7 * day) return 'Due this week';
  return 'Later';
}

export function AttentionSummary() {
  const [uid, setUid] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);

  const db = useMemo(() => getDb(), []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snap) => {
      const next: TaskDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        if (data.status === 'done') return;
        next.push({
          title: String(data.title ?? ''),
          createdAt: Number(data.createdAt ?? 0),
          dueAt: data.dueAt == null ? undefined : Number(data.dueAt),
          status: (data.status as TaskDoc['status']) ?? 'open',
          priority: (data.priority as TaskDoc['priority']) ?? undefined,
        });
      });
      setTasks(next);
    });
  }, [db, uid]);

  const counts = tasks.reduce(
    (acc, t) => {
      const b = bucket(t.dueAt);
      acc[b] = (acc[b] || 0) + 1;
      if (t.status === 'waiting') acc['Waiting on'] = (acc['Waiting on'] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const rows = ['Overdue', 'Due <24h', 'Due this week', 'Waiting on', 'No due date'].map((k) => ({
    k,
    v: counts[k] || 0,
  }));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <h2 className="text-lg font-semibold">Attention</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {rows.map((r) => (
          <div key={r.k} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="text-xs text-zinc-400">{r.k}</div>
            <div className="mt-1 text-2xl font-semibold">{r.v}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">Counts are computed from your open tasks (triage + planning coming next).</p>
    </div>
  );
}

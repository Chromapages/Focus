'use client';

import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDb } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { AttentionSummary } from '@/components/today/AttentionSummary';
import { InboxList } from '@/components/today/InboxList';
import { QuickCapture } from '@/components/capture/QuickCapture';

export default function TodayPage() {
  const db = useMemo(() => getDb(), []);
  const [seedText, setSeedText] = useState('');
  const [seeding, setSeeding] = useState(false);

  async function seedExampleTask() {
    setSeeding(true);
    try {
      const auth = getFirebaseAuth();
      const uid = await new Promise<string>((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          if (!u) reject(new Error('Not signed in'));
          else resolve(u.uid);
        });
      });

      const title = (seedText || 'Example task: Review weekly plan').trim();
      await addDoc(collection(db, 'users', uid, 'tasks'), {
        title,
        createdAt: Date.now(),
        status: 'open',
        priority: 'med',
        createdAtServer: serverTimestamp(),
      });
      setSeedText('');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Today</h1>
          <p className="mt-1 text-sm text-zinc-400">Attention + Inbox capture loop.</p>
        </div>
        <a className="text-sm text-zinc-300 hover:text-white" href="/sign-out">
          Sign out
        </a>
      </div>

      <AttentionSummary />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">Quick actions</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-sm outline-none"
            placeholder="Create a test task (optional)…"
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
          />
          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 disabled:opacity-50"
            onClick={seedExampleTask}
            disabled={seeding}
          >
            {seeding ? 'Adding…' : 'Add task'}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">This is temporary; capture-to-inbox is the real flow.</p>
      </div>

      <InboxList />

      <QuickCapture />
    </section>
  );
}

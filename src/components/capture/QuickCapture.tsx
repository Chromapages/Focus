'use client';

import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDb } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type Props = {
  onCreated?: () => void;
};

function nowMs() {
  return Date.now();
}

export function QuickCapture({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'task' | 'note' | 'snippet'>('task');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const db = useMemo(() => getDb(), []);

  async function create() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const auth = getFirebaseAuth();
      const uid = await new Promise<string>((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, (u) => {
          unsub();
          if (!u) reject(new Error('Not signed in'));
          else resolve(u.uid);
        });
      });

      await addDoc(collection(db, 'users', uid, 'inbox'), {
        kind,
        text: text.trim(),
        createdAt: nowMs(),
        createdAtServer: serverTimestamp(),
      });

      setText('');
      setOpen(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className="fixed bottom-20 right-4 z-50 rounded-full bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-lg md:bottom-6"
        onClick={() => setOpen(true)}
      >
        + Capture
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4">
          <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quick Capture</h2>
              <button className="text-sm text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {(['task', 'note', 'snippet'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={
                    'rounded-lg px-3 py-2 text-sm ' +
                    (kind === k ? 'bg-zinc-800 text-white' : 'border border-zinc-800 text-zinc-300')
                  }
                >
                  {k}
                </button>
              ))}
            </div>

            <textarea
              className="mt-4 h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-sm outline-none"
              placeholder={kind === 'task' ? 'New task…' : kind === 'note' ? 'New note…' : 'Snippet…'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="mt-4 flex gap-2">
              <button
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 disabled:opacity-50"
                onClick={create}
                disabled={saving || !text.trim()}
              >
                {saving ? 'Saving…' : 'Save to Inbox'}
              </button>
              <button
                className="rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-100"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Everything lands in Inbox first. From Today, you’ll triage it into Tasks/Notes/Copy.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

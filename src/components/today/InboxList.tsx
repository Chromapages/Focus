'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDb } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import type { InboxItem } from '@/lib/types';

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

export function InboxList() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const db = useMemo(() => getDb(), []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'inbox'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
      const next: InboxItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data.archivedAt) return;
        next.push({
          id: d.id,
          kind: data.kind,
          text: data.text,
          createdAt: data.createdAt,
          archivedAt: data.archivedAt,
        });
      });
      setItems(next);
    });
  }, [db, uid]);

  async function archive(id: string) {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'inbox', id), { archivedAt: Date.now() });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inbox</h2>
        <span className="text-xs text-zinc-400">{items.length} item(s)</span>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">Inbox is clear.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-zinc-400">{it.kind}</div>
                  <div className="mt-1 text-sm text-zinc-100">{it.text}</div>
                  <div className="mt-1 text-xs text-zinc-500">{new Date(it.createdAt).toLocaleString()}</div>
                </div>
                <button
                  className={cx(
                    'rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium',
                    'text-zinc-100 hover:bg-zinc-900'
                  )}
                  onClick={() => archive(it.id)}
                >
                  Archive
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Next: convert to task/note/snippet + add due date (triage actions coming next).
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '@/lib/firestore';
import type { InboxItem, InboxKind } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { useUid } from '@/lib/useUid';

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

export function InboxList() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const uid = useUid();

  const db = useMemo(() => getDb(), []);

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
          convertedTo: data.convertedTo,
          convertedAt: data.convertedAt,
        });
      });
      setItems(next);
    });
  }, [db, uid]);

  async function archive(id: string) {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'inbox', id), { archivedAt: Date.now() });
  }

  async function convert(item: InboxItem, to: InboxKind) {
    if (!uid) return;

    const batch = writeBatch(db);

    if (to === 'task') {
      const ref = doc(collection(db, 'users', uid, 'tasks'));
      batch.set(ref, {
        title: item.text.trim(),
        createdAt: Date.now(),
        status: 'open',
        createdAtServer: serverTimestamp(),
        source: { inboxId: item.id },
      });
    }

    if (to === 'note') {
      const ref = doc(collection(db, 'users', uid, 'notes'));
      batch.set(ref, {
        title: item.text.trim().slice(0, 60),
        body: item.text.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdAtServer: serverTimestamp(),
        source: { inboxId: item.id },
      });
    }

    if (to === 'snippet') {
      const ref = doc(collection(db, 'users', uid, 'snippets'));
      batch.set(ref, {
        title: item.text.trim().slice(0, 60),
        body: item.text.trim(),
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
        source: { inboxId: item.id },
      });
    }

    batch.update(doc(db, 'users', uid, 'inbox', item.id), {
      archivedAt: Date.now(),
      convertedTo: to,
      convertedAt: Date.now(),
    });

    await batch.commit();
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
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-zinc-400">{it.kind}</div>
                  <div className="mt-1 break-words text-sm text-zinc-100">{it.text}</div>
                  <div className="mt-1 text-xs text-zinc-500">{new Date(it.createdAt).toLocaleString()}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => archive(it.id)}>
                  Archive
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={() => convert(it, 'task')}>
                  Convert → Task
                </Button>
                <Button size="sm" onClick={() => convert(it, 'note')}>
                  Convert → Note
                </Button>
                <Button size="sm" onClick={() => convert(it, 'snippet')}>
                  Convert → Snippet
                </Button>
              </div>

              <div className={cx('mt-2 text-xs text-zinc-500', it.kind === 'task' && 'hidden')}>
                Tip: set due dates + “Waiting” on the Tasks page.
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

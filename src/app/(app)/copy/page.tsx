'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from '@/lib/firestore';
import { useUid } from '@/lib/useUid';
import type { Snippet } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export default function CopyBoardPage() {
  const db = useMemo(() => getDb(), []);
  const uid = useUid();

  const [snips, setSnips] = useState<Snippet[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'snippets'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const next: Snippet[] = [];
      snap.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        next.push({
          id: d.id,
          title: data.title == null ? undefined : String(data.title),
          body: String(data.body ?? ''),
          createdAt: Number(data.createdAt ?? 0),
        });
      });
      setSnips(next);
    });
  }, [db, uid]);

  async function addSnippet() {
    if (!uid) return;
    const body = newBody.trim();
    if (!body) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'users', uid, 'snippets'), {
        title: newTitle.trim() || body.slice(0, 60),
        body,
        createdAt: Date.now(),
        createdAtServer: serverTimestamp(),
      });
      setNewTitle('');
      setNewBody('');
    } finally {
      setAdding(false);
    }
  }

  async function save(id: string) {
    if (!uid) return;
    const body = draftBody.trim();
    if (!body) return;
    await updateDoc(doc(db, 'users', uid, 'snippets', id), {
      title: draftTitle.trim() || body.slice(0, 60),
      body,
      updatedAt: Date.now(),
    });
    setEditingId(null);
    setDraftTitle('');
    setDraftBody('');
  }

  async function remove(id: string) {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'snippets', id));
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Copy Board</h1>
        <p className="mt-1 text-sm text-zinc-400">Snippets you can paste fast (from Inbox or created here).</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">New snippet</h2>
        <div className="mt-3 space-y-2">
          <Input placeholder="Title (optional)…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Textarea rows={4} placeholder="Paste or write…" value={newBody} onChange={(e) => setNewBody(e.target.value)} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={addSnippet} disabled={adding}>
              {adding ? 'Adding…' : 'Add snippet'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your snippets</h2>
          <span className="text-xs text-zinc-400">{snips.length} snippet(s)</span>
        </div>

        {snips.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No snippets yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {snips.map((s) => (
              <li key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                {editingId === s.id ? (
                  <div className="space-y-2">
                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                    <Textarea rows={6} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => save(s.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setDraftTitle('');
                          setDraftBody('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100">{s.title || 'Untitled'}</div>
                      <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-200">{s.body}</pre>
                      <div className="mt-2 text-xs text-zinc-500">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="primary" onClick={() => copy(s.body)}>
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(s.id);
                          setDraftTitle(s.title ?? '');
                          setDraftBody(s.body ?? '');
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(s.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

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
import type { Note } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export default function NotesPage() {
  const db = useMemo(() => getDb(), []);
  const uid = useUid();

  const [notes, setNotes] = useState<Note[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'notes'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const next: Note[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        next.push({
          id: d.id,
          title: data.title,
          body: data.body,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setNotes(next);
    });
  }, [db, uid]);

  async function addNote() {
    if (!uid) return;
    const body = newBody.trim();
    if (!body) return;

    setAdding(true);
    try {
      await addDoc(collection(db, 'users', uid, 'notes'), {
        title: newTitle.trim() || body.slice(0, 60),
        body,
        createdAt: Date.now(),
        updatedAt: Date.now(),
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
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!body) return;

    await updateDoc(doc(db, 'users', uid, 'notes', id), {
      title: title || body.slice(0, 60),
      body,
      updatedAt: Date.now(),
    });
    setEditingId(null);
    setDraftTitle('');
    setDraftBody('');
  }

  async function remove(id: string) {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'notes', id));
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notes</h1>
        <p className="mt-1 text-sm text-zinc-400">Basic notes CRUD. (Meeting notes/backlinks coming later.)</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">New note</h2>
        <div className="mt-3 space-y-2">
          <Input placeholder="Title (optional)…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Textarea
            placeholder="Write…"
            rows={5}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button variant="primary" onClick={addNote} disabled={adding}>
              {adding ? 'Adding…' : 'Add note'}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your notes</h2>
          <span className="text-xs text-zinc-400">{notes.length} note(s)</span>
        </div>

        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                {editingId === n.id ? (
                  <div className="space-y-2">
                    <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                    <Textarea rows={7} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" onClick={() => save(n.id)}>
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
                      <div className="text-sm font-medium text-zinc-100">{n.title || 'Untitled'}</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{n.body}</div>
                      <div className="mt-2 text-xs text-zinc-500">
                        {new Date(n.updatedAt ?? n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(n.id);
                          setDraftTitle(n.title ?? '');
                          setDraftBody(n.body ?? '');
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(n.id)}>
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

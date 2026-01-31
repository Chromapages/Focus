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
import type { Task, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { dateInputValueToMs, msToDateInputValue } from '@/lib/dates';

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

type Filter = 'open' | 'waiting' | 'done' | 'all';

export default function TasksPage() {
  const db = useMemo(() => getDb(), []);
  const uid = useUid();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('open');

  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const next: Task[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        next.push({
          id: d.id,
          title: data.title,
          createdAt: data.createdAt,
          dueAt: data.dueAt,
          status: data.status,
          priority: data.priority,
        });
      });
      setTasks(next);
    });
  }, [db, uid]);

  const visible = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));

  async function addTask() {
    if (!uid) return;
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'users', uid, 'tasks'), {
        title,
        createdAt: Date.now(),
        status: 'open',
        createdAtServer: serverTimestamp(),
      });
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  }

  async function setStatus(id: string, status: TaskStatus) {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'tasks', id), {
      status,
      updatedAt: Date.now(),
    });
  }

  async function setDueAt(id: string, dueAt?: number) {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid, 'tasks', id), {
      dueAt: dueAt ?? null,
      updatedAt: Date.now(),
    });
  }

  async function saveTitle(id: string) {
    if (!uid) return;
    const next = draftTitle.trim();
    if (!next) return;
    await updateDoc(doc(db, 'users', uid, 'tasks', id), { title: next, updatedAt: Date.now() });
    setEditingId(null);
    setDraftTitle('');
  }

  async function remove(id: string) {
    if (!uid) return;
    await deleteDoc(doc(db, 'users', uid, 'tasks', id));
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-400">List + create + edit + complete. Add due dates and mark “Waiting”.</p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="New task…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
            }}
          />
          <Button variant="primary" onClick={addTask} disabled={adding}>
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['open', 'Open'],
            ['waiting', 'Waiting'],
            ['done', 'Done'],
            ['all', 'All'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            className={cx(
              'rounded-xl border px-3 py-2 text-xs',
              filter === k
                ? 'border-zinc-500 bg-zinc-900 text-white'
                : 'border-zinc-800 bg-zinc-950/20 text-zinc-300 hover:bg-zinc-900'
            )}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{filter === 'all' ? 'All tasks' : `${filter} tasks`}</h2>
          <span className="text-xs text-zinc-400">{visible.length} item(s)</span>
        </div>

        {visible.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">Nothing here.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visible.map((t) => (
              <li key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {editingId === t.id ? (
                      <div className="flex gap-2">
                        <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
                        <Button size="sm" variant="primary" onClick={() => saveTitle(t.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setDraftTitle('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={cx('text-sm', t.status === 'done' && 'line-through text-zinc-400')}>
                            {t.title}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {t.status.toUpperCase()}
                            {t.dueAt ? ` • due ${new Date(t.dueAt).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(t.id);
                            setDraftTitle(t.title);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="text-xs text-zinc-400">Due date</label>
                      <input
                        className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm"
                        type="date"
                        value={msToDateInputValue(t.dueAt)}
                        onChange={(e) => setDueAt(t.id, dateInputValueToMs(e.target.value))}
                      />
                      {t.dueAt ? (
                        <Button size="sm" variant="ghost" onClick={() => setDueAt(t.id, undefined)}>
                          Clear
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {t.status !== 'done' ? (
                      <Button size="sm" variant="primary" onClick={() => setStatus(t.id, 'done')}>
                        Done
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(t.id, 'open')}>
                        Reopen
                      </Button>
                    )}

                    {t.status !== 'waiting' ? (
                      <Button size="sm" onClick={() => setStatus(t.id, 'waiting')}>
                        Waiting
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(t.id, 'open')}>
                        Unwait
                      </Button>
                    )}

                    <Button size="sm" variant="danger" onClick={() => remove(t.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

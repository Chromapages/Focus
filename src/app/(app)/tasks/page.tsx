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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { dateInputValueToMs, msToDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Trash2,
  Edit3,
  X,
  ChevronRight
} from 'lucide-react';

type FilterType = 'open' | 'waiting' | 'done' | 'all';

export default function TasksPage() {
  const db = useMemo(() => getDb(), []);
  const uid = useUid();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>('open');

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
        const data = d.data() as Record<string, unknown>;
        next.push({
          id: d.id,
          title: String(data.title ?? ''),
          createdAt: Number(data.createdAt ?? 0),
          dueAt: data.dueAt == null ? undefined : Number(data.dueAt),
          status: (data.status as TaskStatus) ?? 'open',
          priority: (data.priority as Task['priority']) ?? undefined,
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="accent" className="mb-2">Task Management</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
          <p className="mt-2 text-foreground/50 max-w-md">
            Organize, prioritize, and complete your mission-critical tasks.
          </p>
        </div>
      </div>

      <Card variant="glass" className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            icon={<Plus size={18} />}
            className="bg-background/40"
          />
          <Button onClick={addTask} disabled={adding || !newTitle.trim()} loading={adding} className="md:w-32">
            Add Task
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-6">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(
            [
              ['open', 'Open', CheckCircle2],
              ['waiting', 'Waiting', Clock],
              ['done', 'Done', CheckCircle2],
              ['all', 'All Tasks', Filter],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                filter === k
                  ? 'bg-accent/10 border-accent/20 text-accent'
                  : 'bg-surface-secondary border-border-subtle text-foreground/40 hover:text-foreground hover:border-border-moderate'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/30">
              {filter === 'all' ? 'All' : filter} • {visible.length}
            </h2>
          </div>

          {visible.length === 0 ? (
            <Card variant="glass" className="py-12 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
              <CheckCircle2 size={40} className="mb-4 text-foreground/20" />
              <p className="text-sm font-medium">No tasks found</p>
              <p className="text-xs text-foreground/40 mt-1">Try changing the filter or add a new task.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visible.map((t) => (
                <Card 
                  key={t.id} 
                  variant="interactive" 
                  className={cn(
                    'p-4 group/task relative overflow-hidden',
                    t.status === 'done' && 'opacity-60 bg-surface-primary'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Toggle */}
                    <button
                      onClick={() => setStatus(t.id, t.status === 'done' ? 'open' : 'done')}
                      className={cn(
                        'mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                        t.status === 'done' 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-border-moderate group-hover/task:border-accent hover:bg-accent/10'
                      )}
                    >
                      {t.status === 'done' && <CheckCircle2 size={14} fill="currentColor" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === t.id ? (
                        <div className="flex flex-col gap-3">
                          <Input 
                            value={draftTitle} 
                            onChange={(e) => setDraftTitle(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && saveTitle(t.id)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                             <Button size="sm" onClick={() => saveTitle(t.id)}>Save</Button>
                             <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className={cn(
                            'text-base font-medium transition-all',
                            t.status === 'done' && 'line-through text-foreground/40'
                          )}>
                            {t.title}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <Badge variant={t.status === 'waiting' ? 'warning' : 'default'} className="lowercase">
                              {t.status}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-xs text-foreground/30">
                              <CalendarIcon size={12} />
                              <input
                                type="date"
                                className="bg-transparent border-none outline-none text-foreground/50 hover:text-accent transition-colors"
                                value={msToDateInputValue(t.dueAt)}
                                onChange={(e) => setDueAt(t.id, dateInputValueToMs(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setEditingId(t.id);
                          setDraftTitle(t.title);
                        }}
                      >
                        <Edit3 size={14} />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                        onClick={() => remove(t.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

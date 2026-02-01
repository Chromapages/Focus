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
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  Edit3, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Type
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
        const data = d.data() as Record<string, unknown>;
        next.push({
          id: d.id,
          title: data.title == null ? undefined : String(data.title),
          body: String(data.body ?? ''),
          createdAt: Number(data.createdAt ?? 0),
          updatedAt: data.updatedAt == null ? undefined : Number(data.updatedAt),
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="accent" className="mb-2">Second Brain</Badge>
          <h1 className="text-4xl font-bold tracking-tight">Notes</h1>
          <p className="mt-2 text-foreground/50 max-w-md">
            Capture knowledge, draft ideas, and organize your digital library.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Sidebar */}
        <div className="lg:col-span-12">
          <Card variant="glass" className="overflow-hidden">
            <div className="p-1 px-4 border-b border-border-subtle bg-white/[0.02] flex items-center justify-between">
               <span className="text-[10px] font-bold text-foreground/20 uppercase tracking-widest">Editor</span>
               <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/20" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
               </div>
            </div>
            <div className="p-6 space-y-4">
              <Input 
                placeholder="Note Title (optional)" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
                className="bg-transparent border-none text-xl font-bold px-0 focus-visible:ring-0 focus-visible:border-none"
              />
              <Textarea
                placeholder="Start writing..."
                rows={6}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="bg-transparent border-none px-0 focus-visible:ring-0 focus-visible:border-none text-base leading-relaxed"
              />
              <div className="flex justify-end pt-4 border-t border-border-subtle">
                <Button variant="primary" onClick={addNote} disabled={adding || !newBody.trim()} loading={adding} icon={<Plus size={18} />}>
                  Save Note
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Notes Feed */}
        <div className="lg:col-span-12 space-y-4">
          <div className="flex items-center justify-between px-2">
             <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/30">LATEST NOTES • {notes.length}</h2>
          </div>

          {notes.length === 0 ? (
            <Card variant="glass" className="py-20 flex flex-col items-center justify-center text-center opacity-50 border-dashed">
               <FileText size={40} className="mb-4 text-foreground/20" />
               <p className="text-sm font-medium">Your library is empty</p>
               <p className="text-xs text-foreground/40 mt-1">Start writing your first note above.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((n) => (
                <Card 
                  key={n.id} 
                  variant="interactive" 
                  className="p-5 flex flex-col h-full group/note"
                  onClick={() => {
                    if (editingId !== n.id) {
                      setEditingId(n.id);
                      setDraftTitle(n.title ?? '');
                      setDraftBody(n.body ?? '');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                      <FileText size={16} />
                    </div>
                    <div className="opacity-0 group-hover/note:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(n.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground mb-2 line-clamp-1">{n.title || 'Untitled'}</h3>
                  <p className="text-sm text-foreground/50 line-clamp-4 flex-1 mb-4 leading-relaxed">
                    {n.body}
                  </p>

                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-border-subtle/50 text-[10px] text-foreground/30 font-bold uppercase tracking-widest">
                    <Clock size={10} />
                    {new Date(n.updatedAt ?? n.createdAt).toLocaleDateString()}
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

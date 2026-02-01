'use client';

import { useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDb } from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { AttentionSummary } from '@/components/today/AttentionSummary';
import { InboxList } from '@/components/today/InboxList';
import { QuickCapture } from '@/components/capture/QuickCapture';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Zap, LogOut, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

export default function TodayPage() {
  const db = useMemo(() => getDb(), []);
  const [seedText, setSeedText] = useState('');
  const [seeding, setSeeding] = useState(false);

  async function seedExampleTask() {
    if (!seedText.trim()) return;
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

      const title = seedText.trim();
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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 md:pb-8">
      {/* M3 Top App Bar (simulated in page layout for now) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 py-2 md:static md:bg-transparent md:p-0">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Today</h1>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="sm" asChild>
             <Link href="/sign-out" className="gap-2">
               <LogOut size={18} /> <span className="hidden md:inline">Sign out</span>
             </Link>
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (Desktop: 8 cols) */}
        <div className="md:col-span-8 space-y-6">
          {/* Attention Card - Elevation 2 */}
          <Card elevation={2} className="p-0 overflow-hidden border-none">
            <div className="h-1 bg-primary w-full" />
            <div className="p-6">
               <AttentionSummary />
            </div>
          </Card>

          {/* Inbox List - Elevation 1 items */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h2 className="text-sm font-semibold text-foreground/70 uppercase tracking-widest">Inbox</h2>
             </div>
             <InboxList />
          </div>
        </div>

        {/* Right Column (Desktop: 4 cols) */}
        <div className="md:col-span-4 space-y-6">
          {/* Quick Actions Card - Elevation 1 */}
          <Card elevation={1} className="p-6 space-y-4">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary-on-container">
                   <Zap size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Quick Capture</h2>
             </div>
             
             <Input 
                placeholder="Add a task..." 
                value={seedText}
                onChange={(e) => setSeedText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && seedExampleTask()}
             />
             <Button 
                onClick={seedExampleTask} 
                className="w-full" 
                loading={seeding}
                disabled={!seedText.trim() || seeding}
             >
                Add to Inbox
             </Button>
          </Card>
        </div>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <div className="md:hidden">
        <Button 
           variant="fab" 
           onClick={() => document.getElementById('quick-capture-trigger')?.click()}
           aria-label="Create new task"
        >
           <Plus size={24} />
        </Button>
      </div>

      {/* Integrated Quick Capture (global handler) */}
      <div id="quick-capture-trigger">
        <QuickCapture />
      </div>
    </div>
  );
}

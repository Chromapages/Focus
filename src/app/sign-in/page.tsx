'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chrome, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/today');
    });
  }, [router]);

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace('/today');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[600px] bg-accent/5 rounded-full blur-[120px] -z-10" />
      
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-flex items-center gap-2 text-foreground/40 hover:text-foreground mb-8 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
        
        <Card variant="glass" className="p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Lock size={120} />
          </div>

          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-6">
              <span className="text-white font-bold text-2xl italic">F</span>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h1>
            <p className="text-sm text-foreground/60 mb-8">
              Sign in to your private productivity OS.
            </p>

            {error && (
              <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-500 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              className="w-full h-12 text-sm font-semibold rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors"
              onClick={signInGoogle}
              disabled={busy}
              loading={busy}
              icon={<Chrome size={18} />}
            >
              Continue with Google
            </Button>

            <p className="mt-8 text-[10px] text-foreground/30 text-center uppercase tracking-widest leading-relaxed">
              ENCRYPTED SESSION • PRIVATE DATA • LOCAL FIRST
            </p>
          </div>
        </Card>

        <p className="mt-8 text-center text-xs text-foreground/40">
          Tip: In Firebase Console → Auth → Settings, ensure localhost is in authorized domains.
        </p>
      </div>
    </main>
  );
}

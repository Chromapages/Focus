'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

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
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-300">Continue with Google.</p>
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        <button
          className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-zinc-900 disabled:opacity-50"
          onClick={signInGoogle}
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>
        <p className="mt-6 text-xs text-zinc-500">
          Tip: In Firebase Console → Auth → Settings, add localhost as an authorized domain.
        </p>
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (u) => {
      setSignedIn(Boolean(u));
      setReady(true);
    });
  }, []);

  if (!ready) {
    return <p className="text-sm text-zinc-300">Loading…</p>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-zinc-300">Use Google to access Focus.</p>
          <div className="mt-4">
            <Link className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900" href="/sign-in">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

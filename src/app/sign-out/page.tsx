'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        await signOut(getFirebaseAuth());
      } finally {
        router.replace('/');
      }
    })();
  }, [router]);

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-lg p-8">
        <p className="text-sm text-zinc-300">Signing out…</p>
      </div>
    </main>
  );
}

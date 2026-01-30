import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-semibold">Focus</h1>
        <p className="mt-2 text-zinc-300">Single-user productivity OS (ChromaPages).</p>
        <div className="mt-6 flex gap-3">
          <Link className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900" href="/today">
            Open App
          </Link>
          <Link className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium" href="/settings">
            Settings
          </Link>
        </div>
        <p className="mt-6 text-xs text-zinc-500">Next: Firebase Google sign-in, Google Calendar sync, AI meeting pipeline.</p>
      </div>
    </main>
  );
}

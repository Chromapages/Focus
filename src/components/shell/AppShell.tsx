'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/today', label: 'Today' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/notes', label: 'Notes' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/more', label: 'More' },
];

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === 'k';
      const hasMod = e.metaKey || e.ctrlKey;
      if (hasMod && isK) {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 border-r border-zinc-800 bg-zinc-950/40 p-4 md:block">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Focus</div>
            <button
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
              onClick={() => setCommandOpen(true)}
              title="Command bar (⌘/Ctrl+K)"
            >
              ⌘K
            </button>
          </div>
          <nav className="mt-4 space-y-1">
            {[
              { href: '/today', label: 'Today' },
              { href: '/planner', label: 'Planner' },
              { href: '/tasks', label: 'Tasks' },
              { href: '/notes', label: 'Notes' },
              { href: '/calendar', label: 'Calendar' },
              { href: '/copy', label: 'Copy Board' },
              { href: '/vault', label: 'Vault' },
              { href: '/settings', label: 'Settings' },
            ].map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className={cx(
                  'block rounded-lg px-3 py-2 text-sm',
                  pathname === i.href ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                )}
              >
                {i.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="w-full flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
      </div>

      {/* Command bar stub */}
      {commandOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-20"
          onMouseDown={() => setCommandOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Command bar</div>
              <button
                className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
                onClick={() => setCommandOpen(false)}
              >
                Esc
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Stub: wire up global navigation + actions next (e.g. “New task”, “Capture”, “Go to…”).
            </p>
            <div className="mt-3 text-xs text-zinc-500">Tip: press ⌘/Ctrl+K again to close.</div>
          </div>
        </div>
      ) : null}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl">
          {NAV.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cx(
                'flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs',
                pathname === i.href ? 'text-white' : 'text-zinc-400'
              )}
            >
              <span className="h-1 w-8 rounded-full" />
              {i.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

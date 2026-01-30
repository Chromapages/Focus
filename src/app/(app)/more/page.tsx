import Link from 'next/link';

const LINKS = [
  { href: '/planner', label: 'Weekly Planner' },
  { href: '/copy', label: 'Copy Board' },
  { href: '/vault', label: 'Vault' },
  { href: '/settings', label: 'Settings' },
];

export default function MorePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">More</h1>
      <div className="grid gap-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-zinc-100 hover:bg-zinc-900"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

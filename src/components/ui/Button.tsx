'use client';

import type { ButtonHTMLAttributes } from 'react';

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'secondary', size = 'md', className, ...props }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-xl border px-4 font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = size === 'sm' ? 'py-2 text-xs' : 'py-3 text-sm';
  const variants =
    variant === 'primary'
      ? 'border-white bg-white text-zinc-900'
      : variant === 'danger'
        ? 'border-red-800/60 bg-red-950/40 text-red-100 hover:bg-red-950/60'
        : variant === 'ghost'
          ? 'border-transparent bg-transparent text-zinc-200 hover:bg-zinc-900'
          : 'border-zinc-700 bg-zinc-950/20 text-zinc-100 hover:bg-zinc-900';

  return <button className={cx(base, sizes, variants, className)} {...props} />;
}

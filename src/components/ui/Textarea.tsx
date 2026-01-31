'use client';

import type { TextareaHTMLAttributes } from 'react';

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(' ');
}

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cx(
        'w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3 text-sm text-zinc-100 outline-none',
        'placeholder:text-zinc-500 focus:border-zinc-600',
        className
      )}
      {...props}
    />
  );
}

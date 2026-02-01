import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

export const Badge = ({ className, variant = 'default', size = 'sm', ...props }: BadgeProps) => {
  const variants = {
    default: 'bg-white/10 text-white/70',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    info: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    accent: 'bg-accent/10 text-accent border border-accent/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full leading-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

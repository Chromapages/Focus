import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, label, ...props }, ref) => {
    return (
      <div className="relative w-full group">
        {label && (
          <label className="block text-xs font-medium text-foreground/70 mb-1.5 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'flex h-12 w-full rounded-lg border border-outline bg-surface px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-foreground/40',
              icon && 'pl-10',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

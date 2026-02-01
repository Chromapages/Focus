import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'filled';
  elevation?: 1 | 2 | 3 | 4 | 5;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', elevation = 1, interactive, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl transition-all duration-300 relative overflow-hidden',
          // Base styles based on variant
          variant === 'default' && 'bg-surface-container',
          variant === 'outlined' && 'bg-surface border border-outline-variant',
          variant === 'filled' && 'bg-surface-variant',
          
          // Elevation classes mapping to globals.css utilities
          elevation === 1 && 'elevation-1',
          elevation === 2 && 'elevation-2',
          elevation === 3 && 'elevation-3',
          elevation === 4 && 'elevation-4',
          elevation === 5 && 'elevation-5',
          
          // Interactive state (hover elevation lift)
          interactive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99] active:shadow-md',
          
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

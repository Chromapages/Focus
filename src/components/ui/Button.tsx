import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'fab';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-primary-on hover:bg-opacity-90 active:bg-opacity-100 elevation-2 hover:elevation-4',
      secondary: 'bg-primary-container text-primary-on-container hover:bg-opacity-80 elevation-0 hover:elevation-1',
      outline: 'border border-outline text-primary hover:bg-primary/5 hover:border-primary',
      ghost: 'text-primary hover:bg-primary/10',
      danger: 'bg-red-100 text-red-700 hover:bg-red-200',
      fab: 'bg-primary-container text-primary-on-container rounded-2xl elevation-3 hover:elevation-4 active:elevation-2',
    };

    const sizes = {
      sm: 'h-10 px-4 text-xs min-w-[64px]', // Keeping compact but accessible
      md: 'h-12 px-6 text-sm font-medium min-w-[80px]', // Standard M3 48px height
      lg: 'h-14 px-8 text-base min-w-[100px]',
      icon: 'h-12 w-12 rounded-full p-0 flex items-center justify-center', // Circular icon button
    };

    // FAB specific overrides
    const isFab = variant === 'fab';
    const fabClasses = isFab ? 'h-14 w-14 rounded-2xl fixed bottom-6 right-6 z-50 flex items-center justify-center' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:elevation-0 active:scale-[0.98]',
          variants[variant],
          !isFab && sizes[size],
          fabClasses,
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!loading && icon && <span className={cn("flex items-center justify-center", children ? "mr-1" : "")}>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

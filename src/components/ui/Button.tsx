import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'emerald';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-slate-900 text-white hover:bg-slate-800',
      emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200',
      secondary: 'bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50',
      danger: 'bg-white text-slate-500 border-2 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-xl px-6 py-3 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variants[variant],
          className
        )}
        {...props}
      >
        {loading && <Spinner className="w-5 h-5 ml-2" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

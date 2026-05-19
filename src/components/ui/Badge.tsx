import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'emerald';
}

export function Badge({ children, className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };

  return (
    <span 
      className={cn("px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center", variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

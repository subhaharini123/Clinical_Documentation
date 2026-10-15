import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'teal' | 'red' | 'amber' | 'emerald' | 'slate' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({ className, variant = 'default', size = 'sm', children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200',
    red: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    slate: 'bg-slate-200 text-slate-700',
    outline: 'border border-slate-300 text-slate-700 bg-transparent',
  };

  const sizes: Record<string, string> = {
    sm: 'text-xs px-2.5 py-0.5 gap-1',
    md: 'text-xs px-3 py-1 gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}

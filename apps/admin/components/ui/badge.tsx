import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5 rounded-full tracking-wide';

  const variants = {
    default: 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/50',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
    info: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    outline: 'border border-zinc-700 text-zinc-400',
  };

  return (
    <span className={twMerge(clsx(base, variants[variant], className))} {...props}>
      {children}
    </span>
  );
}

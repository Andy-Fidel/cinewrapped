import { clsx } from 'clsx';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary:
        'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-[0.98]',
      secondary:
        'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 active:scale-[0.98]',
      outline: 'border border-zinc-800 hover:bg-zinc-800/80 text-zinc-300 hover:text-white',
      danger:
        'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 active:scale-[0.98]',
      ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={twMerge(clsx(base, variants[variant], sizes[size], className))}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

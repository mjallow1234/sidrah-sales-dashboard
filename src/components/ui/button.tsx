import { cn } from '@/lib/utils/cn';
import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-3xl px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sidrah-500 disabled:pointer-events-none disabled:opacity-50';

  const variantStyles = {
    primary: 'bg-sidrah-500 text-white hover:bg-sidrah-600',
    secondary: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  };

  return <button className={cn(baseStyles, variantStyles[variant], className)} {...props} />;
}

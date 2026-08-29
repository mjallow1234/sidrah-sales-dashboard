import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  description: ReactNode;
  onClick?: () => void;
  isClickable?: boolean;
}

export function StatsCard({ label, value, description, onClick, isClickable }: StatsCardProps) {
  const classes = [
    'rounded-3xl',
    'border',
    'border-slate-200',
    'bg-white',
    'p-5',
    'shadow-soft',
    'transition',
    'duration-200',
    'ease-out',
  ];

  if (isClickable) {
    classes.push('cursor-pointer', 'hover:border-sidrah-300', 'hover:bg-sidrah-50');
  }

  return (
    <div
      className={classes.join(' ')}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick?.(); } } : undefined}
    >
      <p className="text-sm font-medium uppercase tracking-[0.22em] text-sidrah-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <div className="mt-2 text-sm text-slate-600">{description}</div>
    </div>
  );
}

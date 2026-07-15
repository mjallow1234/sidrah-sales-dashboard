import type { DashboardStats } from '@/lib/types';

interface StatsCardProps {
  label: string;
  value: string | number;
  description: string;
}

export function StatsCard({ label, value, description }: StatsCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-sm font-medium uppercase tracking-[0.22em] text-sidrah-500">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

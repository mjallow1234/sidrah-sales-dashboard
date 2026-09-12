import Link from 'next/link';

export function FactoryTabs({ active }: { active: 'production' | 'movements' }) {
  return <nav aria-label="Factory sections" className="flex w-full gap-2 rounded-2xl bg-slate-100 p-1 sm:w-fit">
    <Link href="/factory/production" className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold sm:flex-none ${active === 'production' ? 'bg-white text-sidrah-700 shadow-sm' : 'text-slate-600'}`}>Production</Link>
    <Link href="/factory/movements" className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold sm:flex-none ${active === 'movements' ? 'bg-white text-sidrah-700 shadow-sm' : 'text-slate-600'}`}>Movements</Link>
  </nav>;
}

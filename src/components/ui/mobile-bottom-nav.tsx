import Link from 'next/link';

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3 shadow-soft sm:hidden">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-center text-sm font-semibold text-sidrah-700">
          Dashboard
        </Link>
        <Link href="/vendors" className="text-center text-sm font-semibold text-slate-700">
          Vendors
        </Link>
        <Link href="/visits" className="text-center text-sm font-semibold text-slate-700">
          Visits
        </Link>
      </div>
    </nav>
  );
}

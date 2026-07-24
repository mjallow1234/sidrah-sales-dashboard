import Link from 'next/link';
import { canViewLink } from '@/lib/authorization';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'Visits', href: '/visits' },
];

export function MobileBottomNav({ userRole }: { userRole?: string }) {
  const visibleLinks = navItems.filter((item) => {
    if (userRole) {
      return canViewLink(userRole, item.href);
    }
    return true;
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white px-4 py-3 shadow-soft sm:hidden">
      <div className="flex items-center justify-between">
        {visibleLinks.map((item) => (
          <Link key={item.href} href={item.href} className="text-center text-sm font-semibold text-slate-700">
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

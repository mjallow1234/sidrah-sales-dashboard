import Link from 'next/link';
import { canViewLink } from '@/lib/authorization';
import { useEffectivePermissionQuery } from '@/lib/hooks/userQueries';

const navItems = [
  { label: 'Factory', href: '/factory' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'Deliveries', href: '/deliveries' },
  { label: 'Visits', href: '/visits' },
  { label: 'Outlets', href: '/outlets' },
  { label: 'Accountability', href: '/accountability' },
];

export function MobileBottomNav({ userRole }: { userRole?: string }) {
  const vendorsPermission = useEffectivePermissionQuery('vendors.view', !!userRole);
  const deliveriesPermission = useEffectivePermissionQuery('deliveries.view', !!userRole);
  const factoryPermission = useEffectivePermissionQuery('factory.view', !!userRole);
  const outletsPermission = useEffectivePermissionQuery('outlets.view', !!userRole);
  const accountabilityPermission = useEffectivePermissionQuery('accountability.view', !!userRole);
  const visibleLinks = navItems.filter((item) => {
    if (userRole) {
      return canViewLink(userRole, item.href) &&
        (item.href.startsWith('/vendors') ? vendorsPermission.data !== false : true) &&
        (item.href.startsWith('/deliveries') ? deliveriesPermission.data !== false : true) &&
        (item.href.startsWith('/factory') ? factoryPermission.data !== false : true) &&
        (item.href.startsWith('/outlets') ? outletsPermission.data !== false : true) &&
        (item.href.startsWith('/accountability') ? accountabilityPermission.data !== false : true);
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

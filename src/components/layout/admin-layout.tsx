'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Box,
  CalendarCheck,
  Home,
  LogOut,
  Menu,
  PlusCircle,
  PlusSquare,
  Truck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav';
import { canViewLink } from '@/lib/authorization';

const navSections = [
  {
    title: 'Dashboard',
    links: [
      { label: 'Overview', href: '/dashboard', icon: Home },
    ],
  },
  {
    title: 'Vendors',
    links: [
      { label: 'Vendor list', href: '/vendors', icon: Truck },
      { label: 'New vendor', href: '/vendors/new', icon: PlusCircle },
    ],
  },
  {
    title: 'Sales Reps',
    links: [
      { label: 'Sales reps', href: '/salesreps', icon: Users },
      { label: 'New sales rep', href: '/salesreps/new', icon: UserPlus },
    ],
  },
  {
    title: 'Users',
    links: [
      { label: 'Users', href: '/users', icon: UserPlus },
      { label: 'New user', href: '/users/new', icon: PlusCircle },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'Products', href: '/products', icon: Box },
      { label: 'New product', href: '/products/new', icon: PlusSquare },
    ],
  },
  {
    title: 'Visits',
    links: [
      { label: 'Visits', href: '/visits', icon: CalendarCheck },
    ],
  },
  {
    title: 'Reports',
    links: [
      { label: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
];

function linkClasses(active: boolean) {
  return [
    'group flex items-center gap-3 rounded-3xl px-3 py-3 text-sm font-medium transition',
    active
      ? 'bg-sidrah-500 text-white shadow-soft shadow-sidrah-200'
      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');
}

function sectionTitleClasses() {
  return 'mt-8 mb-3 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500';
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const showAdminShell = pathname !== '/' && pathname !== '/login';

  useEffect(() => {
    if (!showAdminShell) {
      return;
    }

    fetch('/api/auth')
      .then((response) => response.json())
      .then((data) => {
        if (data?.valid) {
          setUserName(data.userId ?? null);
          setUserRole(data.role ?? null);
        }
      })
      .catch(() => {
        setUserName(null);
        setUserRole(null);
      });
  }, [showAdminShell]);

  const activePath = useMemo(() => pathname ?? '', [pathname]);

  const visibleNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          links: section.links.filter((item) => canViewLink(userRole ?? undefined, item.href)),
        }))
        .filter((section) => section.links.length > 0),
    [userRole],
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!showAdminShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-page text-slate-900">
      <aside className="hidden shrink-0 w-72 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:sticky lg:top-0 lg:h-screen lg:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sidrah-500 text-white shadow-soft">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sidrah-500">SIDRAH SALAAM</p>
            <p className="text-lg font-semibold text-slate-900">Sales Platform</p>
          </div>
        </div>

        <nav className="space-y-1">
          {visibleNavSections.map((section) => (
            <div key={section.title}>
              <p className={sectionTitleClasses()}>{section.title}</p>
              <div className="space-y-1">
                {section.links.map((item) => {
                  const isActive =
                    item.href === activePath ||
                    (item.href === '/vendors' && activePath.startsWith('/vendors') && activePath !== '/vendors/new') ||
                    (item.href === '/salesreps' && activePath.startsWith('/salesreps') && activePath !== '/salesreps/new') ||
                    (item.href === '/users' && activePath.startsWith('/users') && activePath !== '/users/new') ||
                    (item.href === '/products' && activePath.startsWith('/products') && activePath !== '/products/new');

                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} className={linkClasses(isActive)}>
                      <Icon className={isActive ? 'h-4 w-4' : 'h-4 w-4 text-slate-500'} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Quick access</p>
          <p className="mt-2 text-slate-600">Use the sidebar to move between dashboard sections and create records.</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-soft"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sidrah-500">SIDRAH SALAAM</p>
              <p className="text-base font-semibold text-slate-900">Sales Platform</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          <div className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-4 lg:flex">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sidrah-500">SIDRAH SALAAM Sales Platform</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Admin dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              {userName ? (
                <span className="rounded-3xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  {userName} {userRole ? `(${userRole})` : ''}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>

        <MobileBottomNav userRole={userRole ?? undefined} />
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex bg-slate-900/40 lg:hidden">
          <div className="w-full max-w-xs border-r border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-sidrah-500">Menu</p>
                <p className="text-base font-semibold text-slate-900">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-soft"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {visibleNavSections.map((section) => (
                <div key={section.title}>
                  <p className={sectionTitleClasses()}>{section.title}</p>
                  <div className="space-y-1">
                    {section.links.map((item) => {
                      const isActive =
                        item.href === activePath ||
                        (item.href === '/vendors' && activePath.startsWith('/vendors') && activePath !== '/vendors/new') ||
                        (item.href === '/salesreps' && activePath.startsWith('/salesreps') && activePath !== '/salesreps/new') ||
                        (item.href === '/products' && activePath.startsWith('/products') && activePath !== '/products/new');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={linkClasses(isActive)}
                          onClick={() => setDrawerOpen(false)}
                        >
                          <Icon className={isActive ? 'h-4 w-4' : 'h-4 w-4 text-slate-500'} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <button
            type="button"
            className="flex-1 bg-transparent"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          />
        </div>
      ) : null}
    </div>
  );
}

import { cookies } from 'next/headers';
import { DashboardFiltersProvider } from '@/components/dashboard/dashboard-filters-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { verifySession } from '@/lib/session';

export default async function DashboardPage() {
  const cookiesStore = await cookies();
  const token = cookiesStore.get('sidrah_session')?.value;
  const session = token ? await verifySession(token) : { valid: false };
  const initialRole = session.valid ? session.role : undefined;

  return (
    <DashboardFiltersProvider>
      <DashboardShell initialRole={initialRole} />
    </DashboardFiltersProvider>
  );
}

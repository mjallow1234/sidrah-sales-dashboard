import { DashboardFiltersProvider } from '@/components/dashboard/dashboard-filters-provider';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default function DashboardPage() {
  return (
    <DashboardFiltersProvider>
      <DashboardShell />
    </DashboardFiltersProvider>
  );
}

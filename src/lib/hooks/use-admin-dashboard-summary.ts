'use client';

import { useQuery } from '@tanstack/react-query';
import { getAdminDashboardSummary } from '@/lib/api/adminDashboard';
import type { AdminDashboardFilters, AdminDashboardSummary } from '@/lib/types/admin-dashboard';

export function useAdminDashboardSummaryQuery(filters: AdminDashboardFilters, enabled = true) {
  return useQuery<AdminDashboardSummary>({
    queryKey: ['adminDashboardSummary', filters],
    queryFn: () => getAdminDashboardSummary(filters),
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

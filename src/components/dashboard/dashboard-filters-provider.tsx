'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DashboardFilters } from '@/lib/types';

const DEFAULT_FILTERS = () => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 30);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    salesRepId: '',
    vendorId: '',
    productId: '',
    market: '',
  } as DashboardFilters;
};

interface DashboardFiltersContextValue {
  filters: DashboardFilters;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
}

const DashboardFiltersContext = createContext<DashboardFiltersContextValue | undefined>(undefined);

export function DashboardFiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<DashboardFilters>(DEFAULT_FILTERS);

  const setFilters = (next: Partial<DashboardFilters>) => {
    setFiltersState((current) => ({
      ...current,
      ...next,
    }));
  };

  const resetFilters = () => {
    setFiltersState(DEFAULT_FILTERS());
  };

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      resetFilters,
    }),
    [filters]
  );

  return <DashboardFiltersContext.Provider value={value}>{children}</DashboardFiltersContext.Provider>;
}

export function useDashboardFilters() {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within DashboardFiltersProvider');
  }
  return context;
}

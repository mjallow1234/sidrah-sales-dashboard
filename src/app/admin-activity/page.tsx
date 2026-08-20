'use client';

import { useMemo, useState } from 'react';
import { useAdminActivityQuery } from '@/lib/hooks/queries';
import { useVendorsQuery, useProductsQuery } from '@/lib/hooks/queries';
import { useAppUsersQuery } from '@/lib/hooks/userQueries';
import { ActivityTable } from '@/components/admin-activity/activity-table';
import { ActivityDetailModal } from '@/components/admin-activity/activity-detail-modal';
import { Button } from '@/components/ui/button';

export default function AdminActivityPage() {
  const { data: activities = [], isLoading, isError } = useAdminActivityQuery();
  const { data: vendors = [] } = useVendorsQuery();
  const { data: products = [] } = useProductsQuery();
  const { data: appUsers = [] } = useAppUsersQuery();

  const [selectedActivity, setSelectedActivity] = useState<null | import('@/lib/types').AdminActivityRecord>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    actionType: '',
    adminId: '',
    vendorId: '',
    productId: '',
    search: '',
  });

  const filtered = useMemo(() => {
    return activities.filter((activity) => {
      if (filters.actionType && activity.action_type !== filters.actionType) return false;
      if (filters.adminId && activity.admin_id !== filters.adminId) return false;
      if (filters.vendorId && activity.vendor_id !== filters.vendorId && activity.source_vendor_id !== filters.vendorId && activity.destination_vendor_id !== filters.vendorId) return false;
      if (filters.productId && activity.product_id !== filters.productId) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        return [activity.operation_id, activity.admin_name, activity.product_name, activity.source_vendor_name, activity.destination_vendor_name, activity.vendor_name].some((value) => value?.toLowerCase().includes(term));
      }
      return true;
    });
  }, [activities, filters]);

  if (isLoading) {
    return <div className="p-6 text-slate-600">Loading admin activity…</div>;
  }

  if (isError) {
    return <div className="p-6 text-rose-700">Unable to load admin activity.</div>;
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Admin history</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Activity & stock movement history</h1>
          <p className="mt-2 text-sm text-slate-600">Review all completed administrative stock transfers, retrievals, and visit reversals.</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm text-slate-700">
              Start date
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>
            <label className="block text-sm text-slate-700">
              End date
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Action type
              <select
                value={filters.actionType}
                onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="">All</option>
                <option value="transfer">Transfer</option>
                <option value="retrieval">Retrieval</option>
                <option value="reversal">Reversal</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 mt-4">
            <label className="block text-sm text-slate-700">
              Admin
              <select
                value={filters.adminId}
                onChange={(event) => setFilters((current) => ({ ...current, adminId: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="">All admins</option>
                {appUsers.map((user) => (
                  <option key={user.user_id} value={user.user_id}>{user.name || user.username}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Vendor
              <select
                value={filters.vendorId}
                onChange={(event) => setFilters((current) => ({ ...current, vendorId: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="">All vendors</option>
                {vendors.map((vendor) => (
                  <option key={vendor.vendor_id} value={vendor.vendor_id}>{vendor.vendor_name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Product
              <select
                value={filters.productId}
                onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.product_id} value={product.product_id}>{product.product_name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm text-slate-700 mt-4">
            Search
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search operation, admin, product, vendor"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

          <div className="mt-4 flex gap-3">
            <Button type="button" onClick={() => setSelectedActivity(null)} className="rounded-3xl">Reset selection</Button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <ActivityTable activities={filtered} onSelect={setSelectedActivity} />
        </section>
      </div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </main>
  );
}

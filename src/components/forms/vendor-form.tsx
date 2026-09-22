'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import { useCreateVendorMutation, useSalesRepsQuery, useUpdateVendorMutation } from '@/lib/hooks/queries';
import { useAcquiredByAgentsQuery, useVendorStatusesQuery, useVendorTypesQuery } from '@/lib/hooks/vendorManagementQueries';
import type { SalesRep, Vendor } from '@/lib/types';

const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().min(1, 'Phone is required'),
  location: z.string().min(1, 'Location is required'),
  sales_rep_id: z.string().optional(),
  acquired_by: z.string().optional(),
  vendor_type_id: z.string().optional(),
  status: z.string().min(1, 'Vendor status is required'),
});

interface VendorFormProps {
  initialValues?: Partial<Vendor>;
  vendorId?: string;
  onSuccess?: () => void;
}

export function VendorForm({ initialValues, vendorId, onSuccess }: VendorFormProps) {
  const [formState, setFormState] = useState({
    vendor_name: initialValues?.vendor_name ?? '',
    phone: initialValues?.phone ?? '',
    location: initialValues?.location ?? '',
    sales_rep_id: initialValues?.sales_rep_id ?? '',
    acquired_by: initialValues?.acquired_by ?? '',
    vendor_type_id: initialValues?.vendor_type_id ?? '',
    status: initialValues?.status ?? 'active',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const canAssignVendor = userRole === 'supervisor' || userRole === 'admin' || userRole === 'super_admin';
  const salesRepsQuery = useSalesRepsQuery(canAssignVendor);
  const acquiredByAgentsQuery = useAcquiredByAgentsQuery(true);
  const vendorTypesQuery = useVendorTypesQuery(true);
  const vendorStatusesQuery = useVendorStatusesQuery(true);
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();

  const salesReps: SalesRep[] = Array.isArray(salesRepsQuery.data)
    ? salesRepsQuery.data
    : Array.isArray((salesRepsQuery.data as any)?.items)
    ? (salesRepsQuery.data as any).items
    : [];
  const acquiringAgents = acquiredByAgentsQuery.data ?? [];
  const vendorTypes = vendorTypesQuery.data ?? [];
  const vendorStatuses = vendorStatusesQuery.data ?? [];
  const acquiringOptions = useMemo(() => {
    if (!initialValues?.acquired_by || !initialValues.acquired_by_name || acquiringAgents.some((agent) => agent.acquired_by_id === initialValues.acquired_by)) {
      return acquiringAgents;
    }
    return [{ acquired_by_id: initialValues.acquired_by, name: `${initialValues.acquired_by_name} (inactive)`, is_active: false }, ...acquiringAgents];
  }, [acquiringAgents, initialValues?.acquired_by, initialValues?.acquired_by_name]);

  const showSalesRepSelect = canAssignVendor;

  function handleChange(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotification(null);

    const validation = vendorSchema.safeParse(formState);
    if (!validation.success) {
      setNotification({ type: 'error', message: validation.error.errors.map((item) => item.message).join(', ') });
      return;
    }

    try {
      if (vendorId) {
        await updateMutation.mutateAsync({ id: vendorId, payload: formState });
        setNotification({ type: 'success', message: 'Vendor updated successfully' });
      } else {
        const creationPayload: {
          vendor_name: string;
          phone: string;
          location: string;
          status: string;
          sales_rep_id?: string;
          acquired_by?: string;
          vendor_type_id?: string;
        } = {
          vendor_name: formState.vendor_name,
          phone: formState.phone,
          location: formState.location,
          status: formState.status,
        };

        if (canAssignVendor && formState.sales_rep_id) {
          creationPayload.sales_rep_id = formState.sales_rep_id;
        }
        if (formState.acquired_by) {
          creationPayload.acquired_by = formState.acquired_by;
        }
        if (formState.vendor_type_id) creationPayload.vendor_type_id = formState.vendor_type_id;

        await createMutation.mutateAsync(creationPayload);
        setNotification({ type: 'success', message: 'Vendor created successfully' });
        setFormState({ vendor_name: '', phone: '', location: '', sales_rep_id: '', acquired_by: '', vendor_type_id: '', status: 'active' });
      }
      onSuccess?.();
    } catch (error) {
      setNotification({ type: 'error', message: (error as Error).message || 'Unable to save vendor.' });
    }
  }

  useEffect(() => {
    let active = true;

    async function loadSessionRole() {
      try {
        const response = await fetch('/api/auth');
        const data = await response.json();
        if (active && data?.valid) {
          setUserRole(data.role ?? null);
        }
      } catch {
        if (active) {
          setUserRole(null);
        }
      }
    }

    loadSessionRole();

    return () => {
      active = false;
    };
  }, []);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notification ? <NotificationBanner type={notification.type} message={notification.message} /> : null}
      <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="block text-sm text-slate-700">
          Vendor name
          <input
            type="text"
            value={formState.vendor_name}
            onChange={(event) => handleChange('vendor_name', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Phone
          <input
            type="text"
            value={formState.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Location
          <input
            type="text"
            value={formState.location}
            onChange={(event) => handleChange('location', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Vendor Type
          <select value={formState.vendor_type_id} onChange={(event) => handleChange('vendor_type_id', event.target.value)} className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none">
            <option value="">Not specified</option>
            {vendorTypes.map((type) => <option key={type.vendor_type_id} value={type.vendor_type_id}>{type.name}</option>)}
          </select>
        </label>
        {showSalesRepSelect ? (
          <label className="block text-sm text-slate-700">
            Sales rep
            <select
              value={formState.sales_rep_id}
              onChange={(event) => handleChange('sales_rep_id', event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value="">Unassigned</option>
              {salesReps.length > 0 ? (
                salesReps.map((rep) => (
                  <option key={rep.sales_rep_id} value={rep.sales_rep_id}>
                    {rep.name}
                  </option>
                ))
              ) : null}
            </select>
          </label>
        ) : null}
        <label className="block text-sm text-slate-700">
          Acquired By
          <select
            value={formState.acquired_by}
            onChange={(event) => handleChange('acquired_by', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            <option value="">Not specified</option>
            {acquiringOptions.map((agent) => (
              <option key={agent.acquired_by_id} value={agent.acquired_by_id} disabled={!agent.is_active}>{agent.name}</option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">Independent of the sales representative and the user recording this vendor.</span>
        </label>
        <label className="block text-sm text-slate-700">
          Status
          <select
            value={formState.status}
            onChange={(event) => handleChange('status', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            {vendorStatuses.map((status) => <option key={status.status_id} value={status.status_id}>{status.name}</option>)}
          </select>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending || salesRepsQuery.isLoading}>
        {vendorId ? (updateMutation.isPending ? 'Updating…' : 'Update Vendor') : (createMutation.isPending ? 'Creating…' : 'Create Vendor')}
      </Button>
    </form>
  );
}

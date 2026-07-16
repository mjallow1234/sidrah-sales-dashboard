'use client';

import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import { useCreateVendorMutation, useSalesRepsQuery, useUpdateVendorMutation } from '@/lib/hooks/queries';
import type { Vendor } from '@/lib/types';

const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().min(1, 'Phone is required'),
  location: z.string().min(1, 'Location is required'),
  sales_rep_id: z.string().min(1, 'Sales rep is required'),
  status: z.enum(['active', 'inactive']),
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
    status: initialValues?.status ?? 'active',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const salesRepsQuery = useSalesRepsQuery();
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();

  useEffect(() => {
    if (salesRepsQuery.data?.length && !formState.sales_rep_id) {
      setFormState((current) => ({ ...current, sales_rep_id: salesRepsQuery.data[0].sales_rep_id }));
    }
  }, [salesRepsQuery.data, formState.sales_rep_id]);

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
        await createMutation.mutateAsync(formState);
        setNotification({ type: 'success', message: 'Vendor created successfully' });
        setFormState({ vendor_name: '', phone: '', location: '', sales_rep_id: salesRepsQuery.data?.[0]?.sales_rep_id ?? '', status: 'active' });
      }
      onSuccess?.();
    } catch (error) {
      setNotification({ type: 'error', message: (error as Error).message || 'Unable to save vendor.' });
    }
  }

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
          Sales rep
          <select
            value={formState.sales_rep_id}
            onChange={(event) => handleChange('sales_rep_id', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            {(salesRepsQuery.data ?? []).map((rep) => (
              <option key={rep.sales_rep_id} value={rep.sales_rep_id}>
                {rep.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          Status
          <select
            value={formState.status}
            onChange={(event) => handleChange('status', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending || salesRepsQuery.isLoading}>
        {vendorId ? (updateMutation.isPending ? 'Updating…' : 'Update Vendor') : (createMutation.isPending ? 'Creating…' : 'Create Vendor')}
      </Button>
    </form>
  );
}

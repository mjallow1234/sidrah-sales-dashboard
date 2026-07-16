'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import { useCreateSalesRepMutation, useUpdateSalesRepMutation } from '@/lib/hooks/queries';

const salesRepSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  status: z.enum(['active', 'inactive']),
});

interface SalesRepFormProps {
  initialValues?: Partial<{ full_name: string; phone: string; status: string }>;
  salesRepId?: string;
  onSuccess?: () => void;
}

export function SalesRepForm({ initialValues, salesRepId, onSuccess }: SalesRepFormProps) {
  const [formState, setFormState] = useState({
    full_name: initialValues?.full_name ?? '',
    phone: initialValues?.phone ?? '',
    status: (initialValues?.status as 'active' | 'inactive') ?? 'active',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const createMutation = useCreateSalesRepMutation();
  const updateMutation = useUpdateSalesRepMutation();

  function handleChange(field: keyof typeof formState, value: string) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotification(null);

    const validation = salesRepSchema.safeParse(formState);
    if (!validation.success) {
      setNotification({ type: 'error', message: validation.error.errors.map((item) => item.message).join(', ') });
      return;
    }

    try {
      if (salesRepId) {
        await updateMutation.mutateAsync({ id: salesRepId, payload: formState });
        setNotification({ type: 'success', message: 'Sales rep updated successfully' });
      } else {
        await createMutation.mutateAsync(formState);
        setNotification({ type: 'success', message: 'Sales rep created successfully' });
        setFormState({ full_name: '', phone: '', status: 'active' });
      }
      onSuccess?.();
    } catch (error) {
      setNotification({ type: 'error', message: (error as Error).message || 'Unable to save sales rep.' });
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notification ? <NotificationBanner type={notification.type} message={notification.message} /> : null}
      <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="block text-sm text-slate-700">
          Full name
          <input
            type="text"
            value={formState.full_name}
            onChange={(event) => handleChange('full_name', event.target.value)}
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

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
        {salesRepId ? (updateMutation.isPending ? 'Updating…' : 'Update Sales Rep') : (createMutation.isPending ? 'Creating…' : 'Create Sales Rep')}
      </Button>
    </form>
  );
}

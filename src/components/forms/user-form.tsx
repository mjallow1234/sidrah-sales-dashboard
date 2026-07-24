'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import { useCreateAppUserMutation, useUpdateAppUserMutation } from '@/lib/hooks/userQueries';
import type { AppUser } from '@/lib/types';

const userSchema = z.object({
  email: z.string().email('Email is required'),
  phone: z.string().min(1, 'Phone is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['super_admin', 'admin', 'supervisor', 'agent']),
  status: z.enum(['active', 'inactive', 'suspended']),
  password: z.string().min(1, 'Password is required').optional(),
});

interface UserFormProps {
  initialValues?: Partial<AppUser>;
  userId?: string;
  onSuccess?: () => void;
}

export function UserForm({ initialValues, userId, onSuccess }: UserFormProps) {
  const [formState, setFormState] = useState({
    email: initialValues?.email ?? '',
    phone: initialValues?.phone ? String(initialValues.phone) : '',
    name: initialValues?.name ?? '',
    role: (initialValues?.role as AppUser['role']) ?? 'agent',
    status: (initialValues?.status as AppUser['status']) ?? 'active',
    password: '',
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const createMutation = useCreateAppUserMutation();
  const updateMutation = useUpdateAppUserMutation();

  const validate = () => {
    const validation = userSchema.safeParse(formState);
    if (!validation.success) {
      setNotification({ type: 'error', message: validation.error.errors.map((item) => item.message).join(', ') });
      return false;
    }

    if (!userId && !formState.password) {
      setNotification({ type: 'error', message: 'Password is required for new users.' });
      return false;
    }

    return true;
  };

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotification(null);

    if (!validate()) {
      return;
    }

    try {
      const payload = {
        email: formState.email,
        phone: formState.phone,
        name: formState.name,
        role: formState.role,
        status: formState.status,
        password: formState.password || undefined,
      };

      if (userId) {
        await updateMutation.mutateAsync({ id: userId, payload });
        setNotification({ type: 'success', message: 'User updated successfully' });
      } else {
        await createMutation.mutateAsync(payload);
        setNotification({ type: 'success', message: 'User created successfully' });
        setFormState({ email: '', phone: '', name: '', role: 'agent', status: 'active', password: '' });
      }
      onSuccess?.();
    } catch (error) {
      setNotification({ type: 'error', message: (error as Error).message || 'Unable to save user.' });
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notification ? <NotificationBanner type={notification.type} message={notification.message} /> : null}
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="block text-sm text-slate-700">
          Email
          <input
            type="email"
            value={formState.email}
            onChange={(event) => handleChange('email', event.target.value)}
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
          Full name
          <input
            type="text"
            value={formState.name}
            onChange={(event) => handleChange('name', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>

        <label className="block text-sm text-slate-700">
          Role
          <select
            value={formState.role}
            onChange={(event) => handleChange('role', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="agent">Agent</option>
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
            <option value="suspended">Suspended</option>
          </select>
        </label>

        <label className="block text-sm text-slate-700">
          Password
          <input
            type="password"
            value={formState.password}
            onChange={(event) => handleChange('password', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            placeholder={userId ? 'Leave blank to keep existing password' : 'Create a password'}
          />
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
        {userId ? (updateMutation.isPending ? 'Updating…' : 'Update User') : (createMutation.isPending ? 'Creating…' : 'Create User')}
      </Button>
    </form>
  );
}

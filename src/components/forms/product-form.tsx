'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { NotificationBanner } from '@/components/ui/notification';
import { useCreateProductMutation, useUpdateProductMutation } from '@/lib/hooks/queries';

const categoryOptions = ['Groundnut Products', 'Groundnut Ingredients'] as const;

const productSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  category: z.enum(categoryOptions),
  unit: z.string().min(1, 'Unit is required'),
  default_unit_price: z.number().min(0, 'Price must be at least 0'),
  currency: z.string().min(1, 'Currency is required'),
  active: z.boolean(),
});

interface ProductFormProps {
  initialValues?: Partial<{ product_name: string; category: string; unit: string; default_unit_price: number; currency: string; active: boolean }>;
  productId?: string;
  onSuccess?: () => void;
}

export function ProductForm({ initialValues, productId, onSuccess }: ProductFormProps) {
  const [formState, setFormState] = useState({
    product_name: initialValues?.product_name ?? '',
    category: (initialValues?.category as typeof categoryOptions[number]) ?? categoryOptions[0],
    unit: initialValues?.unit ?? '',
    default_unit_price: initialValues?.default_unit_price ?? 0,
    currency: initialValues?.currency ?? 'GMD',
    active: initialValues?.active ?? true,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  function handleChange(field: keyof typeof formState, value: string | number | boolean) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotification(null);

    const validation = productSchema.safeParse(formState);
    if (!validation.success) {
      setNotification({ type: 'error', message: validation.error.errors.map((item) => item.message).join(', ') });
      return;
    }

    try {
      if (productId) {
        await updateMutation.mutateAsync({ id: productId, payload: formState });
        setNotification({ type: 'success', message: 'Product updated successfully' });
      } else {
        await createMutation.mutateAsync(formState);
        setNotification({ type: 'success', message: 'Product created successfully' });
        setFormState({ product_name: '', category: categoryOptions[0], unit: '', default_unit_price: 0, currency: 'GMD', active: true });
      }
      onSuccess?.();
    } catch (error) {
      setNotification({ type: 'error', message: (error as Error).message || 'Unable to save product.' });
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {notification ? <NotificationBanner type={notification.type} message={notification.message} /> : null}
      <div className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <label className="block text-sm text-slate-700">
          Product name
          <input
            type="text"
            value={formState.product_name}
            onChange={(event) => handleChange('product_name', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Category
          <select
            value={formState.category}
            onChange={(event) => handleChange('category', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          Unit
          <input
            type="text"
            value={formState.unit}
            onChange={(event) => handleChange('unit', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Default unit price
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.default_unit_price}
            onChange={(event) => handleChange('default_unit_price', Number(event.target.value))}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm text-slate-700">
          Currency
          <input
            type="text"
            value={formState.currency}
            onChange={(event) => handleChange('currency', event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={formState.active}
            onChange={(event) => handleChange('active', event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-sidrah-500 focus:ring-sidrah-500"
          />
          Active
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
        {productId ? (updateMutation.isPending ? 'Updating…' : 'Update Product') : (createMutation.isPending ? 'Creating…' : 'Create Product')}
      </Button>
    </form>
  );
}

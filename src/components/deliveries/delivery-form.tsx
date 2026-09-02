'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCreateDeliveryMutation, useProductsQuery, useVendorsQuery } from '@/lib/hooks/queries';
import type { DeliveryItem } from '@/lib/types';

interface DeliveryLineItem {
  product_id: string;
  quantity: number;
}

const initialItem: DeliveryLineItem = { product_id: '', quantity: 1 };

export function DeliveryForm() {
  const { data: vendors = [], isLoading: vendorsLoading, isError: vendorsError } = useVendorsQuery();
  const { data: products = [], isLoading: productsLoading, isError: productsError } = useProductsQuery();

  const [vendorId, setVendorId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DeliveryLineItem[]>([{ ...initialItem }]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createMutation = useCreateDeliveryMutation();

  const selectedVendor = useMemo(() => vendors.find((vendor) => vendor.vendor_id === vendorId), [vendors, vendorId]);

  useEffect(() => {
    if (selectedVendor) {
      setCustomerPhone(selectedVendor.phone);
      setDeliveryAddress(selectedVendor.location);
    }
  }, [selectedVendor]);

  const canSubmit = useMemo(() => {
    return (
      vendorId.trim() !== '' &&
      customerPhone.trim() !== '' &&
      deliveryAddress.trim() !== '' &&
      items.every((item) => item.product_id.trim() !== '' && item.quantity > 0)
    );
  }, [vendorId, customerPhone, deliveryAddress, items]);

  const handleAddItem = () => {
    setItems((current) => [...current, { ...initialItem }]);
  };

  const handleItemChange = (index: number, field: keyof DeliveryLineItem, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: field === 'quantity' ? Number(value) : value } : item))
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!canSubmit || !selectedVendor) {
      setErrorMessage('Please complete all required delivery details.');
      return;
    }

    const payloadItems: DeliveryItem[] = items.map((item) => {
      const product = products.find((productOption) => productOption.product_id === item.product_id);
      return {
        product_id: item.product_id,
        product_name: product?.product_name ?? '',
        sku: product?.sku,
        quantity: item.quantity,
      };
    });

    try {
      await createMutation.mutateAsync({
        customer_name: selectedVendor.vendor_name,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        items: payloadItems,
        notes: notes || undefined,
      });
      setSuccessMessage('Delivery request created successfully.');
      setVendorId('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setNotes('');
      setItems([{ ...initialItem }]);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create delivery request.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">New delivery request</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Create a delivery request</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-700">
          Vendor
          <select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            disabled={vendorsLoading}
          >
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.vendor_id} value={vendor.vendor_id}>
                {vendor.vendor_name} ({vendor.vendor_id})
              </option>
            ))}
          </select>
          {vendorsError ? <p className="mt-1 text-xs text-rose-600">Unable to load vendors.</p> : null}
        </label>

        <label className="block text-sm text-slate-700">
          Phone
          <input
            type="text"
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          />
        </label>
      </div>

      <label className="block text-sm text-slate-700">
        Delivery address
        <input
          type="text"
          value={deliveryAddress}
          onChange={(event) => setDeliveryAddress(event.target.value)}
          className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
        />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Delivery items</p>
          <Button type="button" variant="secondary" onClick={handleAddItem}>
            Add item
          </Button>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm text-slate-700">
                  Product
                  <select
                    value={item.product_id}
                    onChange={(event) => handleItemChange(index, 'product_id', event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none"
                    disabled={productsLoading}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-slate-700">
                  Quantity
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 outline-none"
                  />
                </label>
                <div className="flex items-end">
                  <Button type="button" variant="secondary" onClick={() => handleRemoveItem(index)} disabled={items.length === 1}>
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {productsError ? <p className="text-xs text-rose-600">Unable to load products.</p> : null}
      </div>

      <label className="block text-sm text-slate-700">
        Notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
          placeholder="Optional notes"
        />
      </label>

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-slate-700">{successMessage}</p> : null}

      <Button type="submit" className="w-full" disabled={!canSubmit || createMutation.isPending}>
        {createMutation.isPending ? 'Creating…' : 'Create Delivery'}
      </Button>
    </form>
  );
}

'use client';

import { VendorForm } from '@/components/forms/vendor-form';

export function NewVendorClient() {
  return <VendorForm onSuccess={() => window.history.back()} />;
}

'use client';

import { Suspense } from 'react';
import { SupplyForm } from '@/components/forms/supply-form';

export default function SupplyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-600">Loading supply form…</div>}>
      <SupplyForm />
    </Suspense>
  );
}

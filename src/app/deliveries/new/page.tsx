import { DeliveryForm } from '@/components/deliveries/delivery-form';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function NewDeliveryPage() {
  if (!(await getPagePermission('deliveries.create'))) notFound();
  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <DeliveryForm />
      </div>
    </main>
  );
}

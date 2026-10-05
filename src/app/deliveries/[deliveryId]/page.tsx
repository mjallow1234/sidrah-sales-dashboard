import { DeliveryDetails } from '@/components/deliveries/delivery-details';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function DeliveryPage({ params }: { params: Promise<{ deliveryId: string }> }) {
  if (!(await getPagePermission('deliveries.view'))) notFound();
  const resolvedParams = await params;
  const deliveryId = resolvedParams.deliveryId;

  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <DeliveryDetails deliveryId={deliveryId} />
      </div>
    </main>
  );
}

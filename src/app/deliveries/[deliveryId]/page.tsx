import { DeliveryDetails } from '@/components/deliveries/delivery-details';

export default async function DeliveryPage({ params }: { params: Promise<{ deliveryId: string }> }) {
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

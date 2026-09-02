import { DeliveryList } from '@/components/deliveries/delivery-list';

export default function DeliveriesPage() {
  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <DeliveryList />
      </div>
    </main>
  );
}

import { VendorDetailsShell } from '@/components/vendors/vendor-details-shell';

export default async function VendorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorDetailsShell vendorId={id} />;
}

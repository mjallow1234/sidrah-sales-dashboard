import { VendorEditShell } from '@/components/vendors/vendor-edit-shell';

export default async function VendorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VendorEditShell vendorId={id} />;
}

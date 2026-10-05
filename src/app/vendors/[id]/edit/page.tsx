import { VendorEditShell } from '@/components/vendors/vendor-edit-shell';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function VendorEditPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getPagePermission('vendors.edit'))) notFound();
  const { id } = await params;
  return <VendorEditShell vendorId={id} />;
}

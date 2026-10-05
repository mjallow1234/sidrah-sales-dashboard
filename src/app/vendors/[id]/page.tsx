import { VendorDetailsShell } from '@/components/vendors/vendor-details-shell';
import { notFound } from 'next/navigation';
import { getPagePermission } from '@/lib/server/pagePermissionEvaluator';

export default async function VendorDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getPagePermission('vendors.view'))) notFound();
  const { id } = await params;
  return <VendorDetailsShell vendorId={id} />;
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthQuery } from '@/lib/hooks/queries';
import { useSubmitVendorLocationMutation, useVendorLocationQuery } from '@/lib/hooks/vendorLocationQueries';
import { isAdminOrSupervisorRole, isAgentRole } from '@/lib/authorization';

export function VendorLocationPanel({ vendorId }: { vendorId: string }) {
  const auth = useAuthQuery();
  const role = auth.data?.role;
  const canUse = isAgentRole(role) || isAdminOrSupervisorRole(role);
  const location = useVendorLocationQuery(vendorId, canUse);
  const submit = useSubmitVendorLocationMutation();
  const [message, setMessage] = useState<string | null>(null);

  if (!canUse) return null;
  const current = location.data;
  const hasLocation = current?.latitude !== null && current?.latitude !== undefined && current?.longitude !== null && current?.longitude !== undefined;
  const capture = () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage('This device/browser does not provide location services.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => submit.mutate({ vendorId, latitude: position.coords.latitude, longitude: position.coords.longitude }, {
        onSuccess: (result) => setMessage(result.type === 'requested' ? 'Location update request submitted for administrator approval.' : 'Current location saved.'),
        onError: (error) => setMessage(error.message),
      }),
      (error) => setMessage(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. Please allow location access and try again.' : 'Unable to read the device location.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Current location</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Vendor GPS location</h2>
        <p className="mt-1 text-sm text-slate-600">Use the device location to capture where this vendor is currently located.</p>
      </div>
      <Button type="button" onClick={capture} disabled={submit.isPending || location.isLoading}>{submit.isPending ? 'Saving…' : hasLocation && isAgentRole(role) ? 'Request location update' : 'Add Current Location'}</Button>
    </div>
    {location.isError ? <p className="mt-4 text-sm text-rose-600">Unable to load vendor location.</p> : null}
    {hasLocation ? <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-900">Saved coordinates</p><p className="mt-1">{current?.latitude?.toFixed(7)}, {current?.longitude?.toFixed(7)}</p><p className="mt-1 text-xs text-slate-500">Updated {current?.captured_at ? new Date(current.captured_at).toLocaleString() : 'unknown'}{current?.captured_by_name ? ` by ${current.captured_by_name}` : ''}</p></div> : <p className="mt-4 text-sm text-slate-600">No GPS location has been saved yet.</p>}
    {current?.pending_request ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-semibold">Location update pending approval</p><p className="mt-1">Proposed: {current.pending_request.proposed_latitude.toFixed(7)}, {current.pending_request.proposed_longitude.toFixed(7)}</p></div> : null}
    {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
  </section>;
}

'use client';

function destination(latitude: number, longitude: number): string {
  return `${latitude},${longitude}`;
}

export function DeliveryNavigationActions({ latitude, longitude, compact = false }: { latitude?: number | null; longitude?: number | null; compact?: boolean }) {
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);
  if (!valid) return <p className={compact ? 'text-xs text-slate-500' : 'rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600'}>Vendor location unavailable.</p>;
  const target = destination(Number(latitude), Number(longitude));
  const google = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
  const apple = `https://maps.apple.com/?daddr=${encodeURIComponent(target)}`;
  const waze = `https://waze.com/ul?ll=${encodeURIComponent(target)}&navigate=yes`;
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'rounded-2xl border border-sidrah-100 bg-sidrah-50/50 p-4'}>
      {!compact ? <p className="text-sm font-semibold text-slate-900">Saved vendor GPS location</p> : null}
      <div className={compact ? 'flex flex-wrap gap-2' : 'mt-3 flex flex-wrap gap-2'}>
        <a href={google} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-2xl bg-sidrah-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sidrah-700">{compact ? 'Directions' : 'Get Directions'}</a>
        {!compact ? <><a href={apple} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Apple Maps</a><a href={waze} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Waze</a></> : null}
      </div>
    </div>
  );
}

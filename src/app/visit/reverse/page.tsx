'use client';

import { type FormEvent, useState } from 'react';
import { useReverseVisitMutation } from '@/lib/hooks/queries';
import { Button } from '@/components/ui/button';

export default function VisitReversePage() {
  const { mutate, isPending, isSuccess, isError, error, data } = useReverseVisitMutation();
  const [visitId, setVisitId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!visitId.trim()) {
      setMessage('Visit ID is required.');
      return;
    }
    if (!reason.trim()) {
      setMessage('Reversal reason is required.');
      return;
    }

    mutate({ visit_id: visitId.trim(), reason: reason.trim() }, {
      onSuccess: () => {
        setMessage('Visit reversal completed successfully.');
      },
      onError: (error) => {
        setMessage(error.message);
      },
    });
  }

  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.22em] text-sidrah-500">Reverse visit</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Reverse an existing visit</h1>
        <p className="mt-2 text-sm text-slate-600">Provide the visit ID and the reason for reversal. This will rollback stock and balance updates.</p>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-700">
            Visit ID
            <input
              type="text"
              value={visitId}
              onChange={(event) => setVisitId(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Reversal reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              rows={4}
            />
          </label>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
          {isError ? <p className="text-sm text-rose-600">{error?.message}</p> : null}
          {isSuccess ? <p className="text-sm text-slate-700">Reversal successful.</p> : null}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Reversing…' : 'Reverse visit'}
          </Button>
        </form>
      </div>
    </main>
  );
}

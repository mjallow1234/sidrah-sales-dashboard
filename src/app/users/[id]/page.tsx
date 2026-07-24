'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAppUserQuery } from '@/lib/hooks/userQueries';
import { UserForm } from '@/components/forms/user-form';
import { Fab } from '@/components/ui/fab';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Array.isArray(params?.id) ? params?.id[0] : params?.id ?? '';
  const { data, isLoading, isError } = useAppUserQuery(userId);

  if (!userId) {
    return (
      <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-soft">
            <p className="text-sm uppercase tracking-[0.24em] text-rose-500">Missing user</p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">No user selected</h1>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Edit user</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Edit AppUser details</h1>
        </section>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-500">Loading user…</div>
        ) : isError ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">Unable to load user.</div>
        ) : (
          <UserForm
            userId={userId}
            initialValues={data}
            onSuccess={() => router.push('/users')}
          />
        )}
      </div>
      <Fab href="/users" label="Back to users" />
    </main>
  );
}

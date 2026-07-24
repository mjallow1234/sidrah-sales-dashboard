'use client';

import { useRouter } from 'next/navigation';
import { UserForm } from '@/components/forms/user-form';
import { Fab } from '@/components/ui/fab';

export default function NewUserPage() {
  const router = useRouter();

  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Add AppUser</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create a new system user</h1>
        </section>
        <UserForm onSuccess={() => router.push('/users')} />
      </div>
      <Fab href="/users" label="Back to users" />
    </main>
  );
}

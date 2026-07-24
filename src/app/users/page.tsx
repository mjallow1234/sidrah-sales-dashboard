'use client';

import { UserList } from '@/components/users/user-list';
import { Fab } from '@/components/ui/fab';

export default function UsersPage() {
  return (
    <main className="px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">User management</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Manage AppUsers</h1>
          <p className="mt-2 text-sm text-slate-600">View and edit system users, assign roles, and manage access.</p>
        </section>
        <UserList />
      </div>
      <Fab href="/users/new" label="Add User" />
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useAppUsersQuery } from '@/lib/hooks/userQueries';
import type { AppUser } from '@/lib/types';

export function UserList() {
  const { data, isLoading, isError } = useAppUsersQuery();
  const users: AppUser[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-500">Loading users…</div>
      ) : isError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load users. Try again later.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <Link
              key={user.user_id}
              href={`/users/${encodeURIComponent(user.user_id)}`}
              className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-soft transition hover:border-sidrah-500"
            >
              <p className="text-lg font-semibold text-slate-900">{user.name || user.email}</p>
              <p className="mt-2 text-sm text-slate-600">{user.email}</p>
              <p className="mt-2 text-sm text-slate-500">Phone: {String(user.phone || '')}</p>
              <p className="mt-2 text-sm text-slate-500">Role: {user.role}</p>
              <p className="mt-1 text-sm text-slate-500">Status: {user.status}</p>
              {user.sales_rep_id ? <p className="mt-1 text-sm text-slate-500">Sales rep: {user.sales_rep_id}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

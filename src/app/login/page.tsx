'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (login(phone, password)) {
      router.push('/dashboard');
      return;
    }

    setError('Invalid credentials. Use ahmad / Jallow@123');
  };

  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 shadow-soft">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-sidrah-500">Agent Access</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Login to SIDRAH Sales</h1>
          <p className="mt-3 text-slate-600">Use your phone number and password to begin recording visit activity.</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Phone Number</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              placeholder="7401457"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sidrah-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-sidrah-500"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full">
            Login
          </Button>

          <p className="text-center text-sm text-slate-500">
            Demo credentials: <strong>ahmad</strong> / <strong>Jallow@123</strong>
          </p>
        </form>

        <div className="mt-6 flex justify-center gap-3 text-sm text-slate-600">
          <Link href="/dashboard" className="font-semibold text-sidrah-600 hover:text-sidrah-700">
            Continue to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

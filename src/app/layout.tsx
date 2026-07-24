import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { AdminLayout } from '@/components/layout/admin-layout';

export const metadata: Metadata = {
  title: 'SIDRAH SALAAM Sales App',
  description: 'Mobile-first vendor management for SIDRAH SALAAM sales agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-page text-slate-900 antialiased">
        <Providers>
          <AdminLayout>{children}</AdminLayout>
        </Providers>
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';

interface FabProps {
  href: string;
  label: string;
}

export function Fab({ href, label }: FabProps) {
  return (
    <Link
      href={href}
      className="fixed bottom-6 right-6 z-30 inline-flex items-center justify-center rounded-full bg-sidrah-500 px-5 py-4 text-sm font-semibold text-white shadow-2xl shadow-sidrah-500/20 transition hover:bg-sidrah-600"
    >
      {label}
    </Link>
  );
}

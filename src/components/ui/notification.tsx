'use client';

interface NotificationBannerProps {
  type: 'success' | 'error';
  message: string;
}

export function NotificationBanner({ type, message }: NotificationBannerProps) {
  const styles =
    type === 'success'
      ? 'border-sidrah-100 bg-sidrah-50 text-sidrah-900'
      : 'border-rose-100 bg-rose-50 text-rose-900';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-3xl border p-4 text-sm shadow-soft ${styles}`}
    >
      {message}
    </div>
  );
}

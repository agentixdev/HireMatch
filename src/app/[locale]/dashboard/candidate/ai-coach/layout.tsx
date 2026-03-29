'use client';

import ErrorBoundary from '@/components/ErrorBoundary';

export default function AICoachLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

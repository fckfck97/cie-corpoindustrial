'use client';

/**
 * Protected Route Layout
 * Wraps all protected pages with auth check and redirect logic
 */

import { useAuth } from '@/hooks/useAuth';
import { SessionLoader } from '@/components/SessionLoader';
import { redirect, usePathname, useSearchParams } from 'next/navigation';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Show loading skeleton while restoring session
  if (isLoading) {
    return <SessionLoader />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    const query = searchParams.toString();
    const next = `${pathname}${query ? `?${query}` : ''}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return children;
}

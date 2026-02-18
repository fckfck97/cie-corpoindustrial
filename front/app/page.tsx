'use client';

/**
 * Home Page
 * Redirect to dashboard or login based on auth status
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SessionLoader } from '@/components/SessionLoader';
import { getHomeByRole } from '@/lib/role-home';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push(getHomeByRole(user));
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, router, user]);

  return <SessionLoader />;
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getHomeByRole } from '@/lib/role-home';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    router.replace(getHomeByRole(user));
  }, [router, user]);

  return (
    <DashboardLayout>
      <div className="py-10 text-center text-muted-foreground">Cargando dashboard...</div>
    </DashboardLayout>
  );
}

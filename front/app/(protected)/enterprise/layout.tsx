'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';

interface EnterpriseLayoutProps {
  children: React.ReactNode;
}

export default function EnterpriseLayout({ children }: EnterpriseLayoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';
  const profileCompleted = user?.enterpriseProfileCompleted;

  useEffect(() => {
    if (isEnterprise && profileCompleted === false) {
      router.replace('/profile?complete_profile=1');
    }
  }, [isEnterprise, profileCompleted, router]);

  if (!isEnterprise) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Esta seccion es solo para empresas.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (profileCompleted === false) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Debes completar el perfil de la empresa para continuar.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return <>{children}</>;
}

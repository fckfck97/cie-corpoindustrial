'use client';

import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';

interface EnterpriseLayoutProps {
  children: React.ReactNode;
}

export default function EnterpriseLayout({ children }: EnterpriseLayoutProps) {
  const { user } = useAuth();
  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';

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

  return <>{children}</>;
}

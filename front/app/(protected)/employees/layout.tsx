'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';

interface EmployeesLayoutProps {
  children: React.ReactNode;
}

export default function EmployeesLayout({ children }: EmployeesLayoutProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';
  const profileCompleted = user?.employeeProfileCompleted;

  useEffect(() => {
    if (isEmployee && profileCompleted === false) {
      router.replace('/profile?complete_profile=1');
    }
  }, [isEmployee, profileCompleted, router]);

  if (!isEmployee) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Esta seccion es solo para empleados.
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
            Debes completar tu perfil para continuar.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

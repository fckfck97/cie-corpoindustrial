'use client';

import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';

interface EmployeesLayoutProps {
  children: React.ReactNode;
}

export default function EmployeesLayout({ children }: EmployeesLayoutProps) {
  const { user } = useAuth();
  const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';

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

  return <DashboardLayout>{children}</DashboardLayout>;
}

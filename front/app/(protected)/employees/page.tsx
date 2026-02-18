'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeesRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/employees/dashboard');
  }, [router]);

  return <div className="py-10 text-center text-muted-foreground">Cargando panel de empleado...</div>;
}

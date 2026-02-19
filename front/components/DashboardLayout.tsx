'use client';

/**
 * Dashboard Layout Component
 * Main layout wrapper for protected pages
 */

import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';
  const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';
  const enterpriseBlocked = isEnterprise && user?.enterpriseProfileCompleted === false;
  const employeeBlocked = isEmployee && user?.employeeProfileCompleted === false;
  const profileBlocked = enterpriseBlocked || employeeBlocked;
  const missingLabelsMap: Record<string, string> = {
    email: 'Correo',
    first_name: 'Nombres',
    last_name: 'Apellidos',
    enterprise: 'Nombre de empresa',
    phone: 'Teléfono del representante',
    document_type: 'Tipo documento',
    nuip: 'Número de documento',
    document_type_enterprise: 'Tipo documento empresa',
    nuip_enterprise: 'NIT empresa',
    description: 'Descripción',
    niche: 'Sector Económico',
    address: 'Dirección',
  };
  const missingFieldsRaw = enterpriseBlocked
    ? (user?.enterpriseProfileMissing || [])
    : (user?.employeeProfileMissing || []);
  const missingFields = missingFieldsRaw.map((item) => {
    if (item === 'phone' && employeeBlocked) return 'Teléfono';
    return missingLabelsMap[item] || item;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:block" />

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 pt-12">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navegacion</SheetTitle>
            </SheetHeader>
            <Sidebar className="w-full border-r-0" onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="p-3 sm:p-4 md:p-6">
            {profileBlocked && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Debes completar tus datos en <strong>Mi Perfil</strong> para desbloquear los módulos.
                  </p>
                </div>
                {missingFields.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Campos faltantes:</p>
                    <p>{missingFields.join(', ')}.</p>
                  </div>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>Administra opciones de la plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta vista está lista para conectar configuración avanzada.
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

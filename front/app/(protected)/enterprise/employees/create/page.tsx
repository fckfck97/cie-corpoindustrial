'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type BackendUser = {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  enterprise?: string;
  role: string;
};

type CreateUserResponse = {
  user: BackendUser;
};

const emptyForm = {
  email: '',
  first_name: '',
  last_name: '',
};

export default function CreateEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const emailTrim = form.email.trim();
      const payload: Record<string, string> = {
        email: emailTrim,
        username: emailTrim, // username = email
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: 'employees',
      };

      await apiClient.post<CreateUserResponse>('/employee/list/', payload);
      toast.success('Empleado creado correctamente.');
      router.push('/enterprise/employees');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/enterprise/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Crear Nuevo Empleado</h1>
            <p className="text-sm text-muted-foreground">Añade un miembro a tu equipo.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos del Empleado</CardTitle>
            <CardDescription>Completa la información del nuevo miembro del equipo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={onCreate} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="ejemplo@correo.com"
                />
                <p className="text-[10px] text-muted-foreground">
                  El usuario será el mismo correo. El rol asignado será <code className="bg-muted px-1 py-0.5 rounded">employees</code> y la contraseña se genera automáticamente.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">Nombres</Label>
                  <Input
                    id="first_name"
                    value={form.first_name}
                    onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="Juan Carlos"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Apellidos</Label>
                  <Input
                    id="last_name"
                    value={form.last_name}
                    onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="Pérez López"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/enterprise/employees')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="min-w-[150px]">
                  {submitting ? 'Creando...' : 'Crear Empleado'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

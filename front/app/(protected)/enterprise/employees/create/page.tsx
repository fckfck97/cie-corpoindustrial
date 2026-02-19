'use client';

import { useMemo, useState } from 'react';
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
  phone: '', // guardaremos SOLO dígitos (10)
  document_type: '',
  nuip: '', // solo dígitos
};

const DOC_TYPES = [
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'TI', label: 'TI' },
  { value: 'RC', label: 'RC' },
  { value: 'PE', label: 'PE' },
  { value: 'PT', label: 'PT' },
] as const;

// Helpers
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const normalizePhone = (s: string) => {
  const digits = onlyDigits(s);
  if (digits.startsWith('57') && digits.length === 12) return digits.slice(2);
  return digits.slice(0, 10);
};
const isValidPhone = (digits10: string) => /^3\d{9}$/.test(digits10); // 10 dígitos y empieza por 3
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getFriendlyEmployeeError = (error: any, fallback: string) => {
  const raw = [
    error?.message,
    error?.details?.error,
    error?.details?.detail,
    JSON.stringify(error?.details ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const looksUnique = /unique|constraint|duplicad|duplicate|already exists|integrity/.test(raw);
  const looksEmailOrUser = /email|correo|username|user_useraccount\.username|user_useraccount\.email/.test(raw);
  const looksPhone = /phone|telefono|teléfono|user_useraccount\.phone/.test(raw);
  const looksNuip = /nuip|documento|document_type|user_useraccount\.nuip/.test(raw);
  const looksDefaultEmailExists = /ya existe un\/a user account con este\/a email/.test(raw);
  const looksDefaultUserExists = /ya existe un\/a user account con este\/a username/.test(raw);
  const looksDefaultPhoneExists = /ya existe un\/a user account con este\/a phone/.test(raw);
  const looksDefaultNuipExists = /ya existe un\/a user account con este\/a nuip/.test(raw);

  if ((looksEmailOrUser && looksUnique) || looksDefaultEmailExists || looksDefaultUserExists) {
    return 'Lo siento, este correo no puede ser usado. Ya existe un usuario con ese correo.';
  }
  if ((looksPhone && looksUnique) || raw.includes('número de teléfono ingresado') || looksDefaultPhoneExists) {
    return 'Lo siento, este teléfono no puede ser usado. Ya existe un usuario con ese número.';
  }
  if ((looksNuip && looksUnique) || raw.includes('número de documento ingresado') || looksDefaultNuipExists) {
    return 'El número de documento ingresado pertenece a un usuario ya registrado en el portal.';
  }
  return fallback;
};

export default function CreateEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const canSubmit = useMemo(() => {
    const email = form.email.trim().toLowerCase();
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const phone = normalizePhone(form.phone.trim());
    const doc = form.document_type;
    const nuip = onlyDigits(form.nuip.trim());

    return (
      !!email &&
      isValidEmail(email) &&
      !!first &&
      !!last &&
      !!doc &&
      !!phone &&
      isValidPhone(phone) &&
      !!nuip &&
      /^\d+$/.test(nuip)
    );
  }, [form]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const email = form.email.trim().toLowerCase();
    const first_name = form.first_name.trim();
    const last_name = form.last_name.trim();
    const phone = normalizePhone(form.phone.trim());
    const document_type = form.document_type;
    const nuip = onlyDigits(form.nuip.trim());

    // Validación final (server-friendly)
    if (!email || !isValidEmail(email)) return toast.error('Ingresa un correo válido.');
    if (!first_name) return toast.error('El nombre es obligatorio.');
    if (!last_name) return toast.error('El apellido es obligatorio.');
    if (!document_type) return toast.error('Selecciona el tipo de documento.');
    if (!phone || !isValidPhone(phone)) {
      return toast.error('Teléfono inválido. Debe tener 10 dígitos e iniciar por 3.');
    }
    if (!nuip || !/^\d+$/.test(nuip)) return toast.error('El número de documento debe contener solo números.');

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        email,
        username: email, // username = email
        first_name,
        last_name,
        phone, // SOLO dígitos 10
        document_type,
        nuip,
        role: 'employees',
      };

      await apiClient.post<CreateUserResponse>('/employee/list/', payload);
      toast.success('Empleado creado correctamente.');
      router.push('/enterprise/employees');
    } catch (error: any) {
      toast.error(
        getFriendlyEmployeeError(
          error,
          error?.message || 'No se pudo crear el usuario.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/enterprise/employees')}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Crear Nuevo Empleado</h1>
            <p className="text-sm text-muted-foreground">Añade un miembro a tu equipo con todos los datos requeridos.</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Datos del Empleado</CardTitle>
            <CardDescription>Completa la información del nuevo miembro del equipo.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <form onSubmit={onCreate} className="space-y-6">
              {/* Sección: Identidad */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">Identidad</h2>
                  <span className="text-xs text-muted-foreground">
                    Campos obligatorios <span className="text-red-500">*</span>
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">
                      Nombres <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      value={form.first_name}
                      onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                      placeholder="Juan Carlos"
                      required
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="last_name">
                      Apellidos <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      value={form.last_name}
                      onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                      placeholder="Pérez López"
                      required
                      autoComplete="family-name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="document_type">
                      Tipo de Documento <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="document_type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.document_type}
                      onChange={(e) => setForm((p) => ({ ...p, document_type: e.target.value }))}
                      required
                    >
                      <option value="">Seleccione un tipo de documento</option>
                      {DOC_TYPES.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="nuip">
                      Número de Documento <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nuip"
                      value={form.nuip}
                      onChange={(e) => {
                        const digits = onlyDigits(e.target.value);
                        setForm((p) => ({ ...p, nuip: digits }));
                      }}
                      placeholder="1234567890"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Contacto */}
              <div className="grid gap-4">
                <h2 className="text-sm font-semibold text-muted-foreground">Contacto</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="email">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="ejemplo@correo.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="phone">
                      Teléfono <span className="text-red-500">*</span> <span className="text-xs text-muted-foreground">(10 dígitos, inicia en 3)</span>
                    </Label>

                    {/* Input real: SOLO dígitos */}
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => {
                        const digits = normalizePhone(e.target.value).slice(0, 10);
                        setForm((p) => ({ ...p, phone: digits }));
                      }}
                      placeholder="3001234567"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      required
                    />

                    {!!form.phone && !isValidPhone(form.phone) && (
                      <p className="text-xs text-red-500">
                        Teléfono inválido. Debe empezar por 3 y tener exactamente 10 dígitos.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/enterprise/employees')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>

                <Button type="submit" disabled={submitting || !canSubmit} className="min-w-[170px]">
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

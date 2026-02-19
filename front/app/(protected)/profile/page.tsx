'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/lib/config';
import { getImageUrl } from '@/lib/utils';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, X, Save, User, Building, Phone, Mail, MapPin, Globe, Instagram, Facebook, Image as ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getFrontendRoleLabel } from '@/lib/model-choice-labels';

type EnterpriseProfileApi = {
  enterprise?: {
    user?: {
      id?: string;
      email?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      enterprise?: string;
      role?: string;
      picture?: string;
      banner?: string;
      rut?: string;
      date_joined?: string;
    };
    document_type_enterprise?: string | null;
    nuip_enterprise?: string | null;
    description?: string | null;
    niche?: string | null;
    phone?: string | null;
    address?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    X?: string | null;
  };
};

type EnterpriseForm = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  enterprise: string;
  document_type_enterprise: string;
  nuip_enterprise: string;
  description: string;
  niche: string;
  representative_phone: string;
  address: string;
  facebook: string;
  instagram: string;
  X: string;
};

type EmployeeForm = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  document_type: string;
  nuip: string;
};

const emptyEnterpriseForm: EnterpriseForm = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  enterprise: '',
  document_type_enterprise: '',
  nuip_enterprise: '',
  description: '',
  niche: '',
  representative_phone: '',
  address: '',
  facebook: '',
  instagram: '',
  X: '',
};

const emptyEmployeeForm: EmployeeForm = {
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  document_type: '',
  nuip: '',
};

// Helpers UI/validación
const onlyDigits = (s: string) => s.replace(/\D/g, '');
const normalizePhone = (s: string) => {
  const digits = onlyDigits(s);
  if (digits.startsWith('57') && digits.length === 12) return digits.slice(2);
  return digits.slice(0, 10);
};
const isValidPhone = (s: string) => /^3\d{9}$/.test(s);
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getFriendlyUniqueFieldError = (
  error: any,
  emailWasChanged: boolean,
  phoneWasChanged: boolean,
  fallback: string,
) => {
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

  if (emailWasChanged && looksUnique && looksEmailOrUser) {
    return 'Lo siento, este correo no puede ser usado. Ya existe un usuario con ese correo.';
  }
  if (phoneWasChanged && (looksPhone && looksUnique || raw.includes('número de teléfono ingresado'))) {
    return 'Lo siento, este teléfono no puede ser usado. Ya existe un usuario con ese número.';
  }
  return fallback;
};
const DOC_EMPLOYEE = [
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'TI', label: 'TI' },
  { value: 'RC', label: 'RC' },
  { value: 'PE', label: 'PE' },
  { value: 'PT', label: 'PT' },
] as const;

const DOC_ENTERPRISE = [
  { value: 'NIT', label: 'NIT' },
  { value: 'CC', label: 'CC' },
  { value: 'CE', label: 'CE' },
  { value: 'PAS', label: 'Pasaporte' },
] as const;

function FieldShell({
  label,
  required,
  hint,
  children,
}: {
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-foreground/80">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </Label>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, restoreSession } = useAuth();

  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';
  const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';
  const isAdmin = user?.backendRole === 'Admin' || user?.role === 'admin';

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enterpriseOriginalEmail, setEnterpriseOriginalEmail] = useState('');
  const [employeeOriginalEmail, setEmployeeOriginalEmail] = useState('');
  const [enterpriseOriginalPhone, setEnterpriseOriginalPhone] = useState('');
  const [employeeOriginalPhone, setEmployeeOriginalPhone] = useState('');

  const [canEditByTime, setCanEditByTime] = useState(true);
  const [editableUntil, setEditableUntil] = useState<Date | null>(null);

  const [enterpriseAvatar, setEnterpriseAvatar] = useState<string | undefined>(undefined);
  const [enterpriseBanner, setEnterpriseBanner] = useState<string | undefined>(undefined);
  const [enterpriseRut, setEnterpriseRut] = useState<string | undefined>(undefined);

  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [rutFile, setRutFile] = useState<File | null>(null);

  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(emptyEnterpriseForm);

  const loadEnterpriseProfile = useCallback(async () => {
    if (!user?.id || !isEnterprise) return;

    setLoading(true);
    try {
      const response = await apiClient.get<EnterpriseProfileApi>(`/enterprise/profile/${user.id}/`);
      const enterprise = response?.enterprise;
      const enterpriseUser = enterprise?.user;

      setEnterpriseAvatar(enterpriseUser?.picture);
      setEnterpriseBanner(enterpriseUser?.banner);
      setEnterpriseRut(enterpriseUser?.rut);

      setEnterpriseForm({
        email: enterpriseUser?.email || '',
        username: enterpriseUser?.username || '',
        first_name: enterpriseUser?.first_name || '',
        last_name: enterpriseUser?.last_name || '',
        enterprise: enterpriseUser?.enterprise || '',
        document_type_enterprise: enterprise?.document_type_enterprise || '',
        nuip_enterprise: enterprise?.nuip_enterprise || '',
        description: enterprise?.description || '',
        niche: enterprise?.niche || '',
        representative_phone: enterprise?.phone || '',
        address: enterprise?.address || '',
        facebook: enterprise?.facebook || '',
        instagram: enterprise?.instagram || '',
        X: enterprise?.X || '',
      });
      setEnterpriseOriginalEmail((enterpriseUser?.email || '').trim().toLowerCase());
      setEnterpriseOriginalPhone(normalizePhone(enterprise?.phone || ''));

      const dateJoinedRaw = enterpriseUser?.date_joined;
      if (dateJoinedRaw) {
        const start = new Date(dateJoinedRaw);
        if (!Number.isNaN(start.getTime())) {
          const limit = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
          setEditableUntil(limit);
          setCanEditByTime(Date.now() <= limit.getTime());
        }
      }

      setPictureFile(null);
      setBannerFile(null);
      setRutFile(null);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar el perfil empresarial.');
    } finally {
      setLoading(false);
    }
  }, [isEnterprise, user?.id]);

  useEffect(() => {
    if (user) {
      setEmployeeOriginalEmail((user.email || '').trim().toLowerCase());
      setEmployeeOriginalPhone(normalizePhone(user.phone || ''));
      setEmployeeForm({
        email: user.email || '',
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        phone: user.phone || '',
        document_type: user.documentType || '',
        nuip: user.nuip || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (isEnterprise && user?.id) loadEnterpriseProfile();
  }, [isEnterprise, loadEnterpriseProfile, user?.id]);

  const canEditEnterprise = isEnterprise ? canEditByTime : true;

  const editableUntilText = useMemo(() => {
    if (!editableUntil) return '';
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(editableUntil);
  }, [editableUntil]);

  const handleEdit = () => {
    if (isEnterprise && !canEditEnterprise) {
      toast.error('Tu ventana de edición de 7 días ya expiró.');
      return;
    }
    if (!isEnterprise && !isEmployee && !isAdmin) {
      toast.error('Este perfil no es editable para tu rol.');
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (isEnterprise) {
      loadEnterpriseProfile();
      return;
    }
    if (user) {
      setEmployeeForm({
        email: user.email || '',
        first_name: user.firstName || '',
        last_name: user.lastName || '',
        phone: user.phone || '',
        document_type: user.documentType || '',
        nuip: user.nuip || '',
      });
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    if (isEnterprise) {
      setSaving(true);
      try {
        const email = enterpriseForm.email.trim().toLowerCase();
        const firstName = enterpriseForm.first_name.trim();
        const lastName = enterpriseForm.last_name.trim();
        const enterpriseName = enterpriseForm.enterprise.trim();
        const enterpriseDocType = enterpriseForm.document_type_enterprise.trim();
        const enterpriseNuip = onlyDigits(enterpriseForm.nuip_enterprise.trim());
        const description = enterpriseForm.description.trim();
        const niche = enterpriseForm.niche.trim();
        const address = enterpriseForm.address.trim();
        const normalizedPhone = normalizePhone(enterpriseForm.representative_phone.trim());

        if (!email || !isValidEmail(email)) {
          toast.error('Ingresa un correo válido.');
          return;
        }
        if (!firstName) {
          toast.error('Los nombres del representante son obligatorios.');
          return;
        }
        if (!lastName) {
          toast.error('Los apellidos del representante son obligatorios.');
          return;
        }
        if (!enterpriseName) {
          toast.error('El nombre de la empresa es obligatorio.');
          return;
        }
        if (!enterpriseDocType) {
          toast.error('Selecciona el tipo de documento de la empresa.');
          return;
        }
        if (!enterpriseNuip) {
          toast.error('El número de documento de la empresa es obligatorio.');
          return;
        }
        if (!description) {
          toast.error('La descripción de la empresa es obligatoria.');
          return;
        }
        if (!niche) {
          toast.error('El nicho de la empresa es obligatorio.');
          return;
        }
        if (!address) {
          toast.error('La dirección de la empresa es obligatoria.');
          return;
        }
        if (!normalizedPhone) {
          toast.error('Debes ingresar el teléfono del representante.');
          return;
        }
        if (!isValidPhone(normalizedPhone)) {
          toast.error('El teléfono debe tener 10 dígitos e iniciar por 3.');
          return;
        }

        const body = new FormData();
        body.append('id', user.id);
        body.append('email', email);
        body.append('username', enterpriseForm.username.trim());
        body.append('first_name', firstName);
        body.append('last_name', lastName);
        body.append('enterprise', enterpriseName);
        body.append('document_type_enterprise', enterpriseDocType);
        body.append('nuip_enterprise', enterpriseNuip);
        body.append('description', description);
        body.append('niche', niche);
        body.append('phone', normalizedPhone);
        body.append('address', address);
        body.append('facebook', enterpriseForm.facebook.trim());
        body.append('instagram', enterpriseForm.instagram.trim());
        body.append('X', enterpriseForm.X.trim());
        if (pictureFile) body.append('picture', pictureFile);
        if (bannerFile) body.append('banner', bannerFile);
        if (rutFile) body.append('rut', rutFile);

        await apiClient.put(`/enterprise/profile/edit/${user.id}/`, body);
        toast.success('Perfil empresarial actualizado.');
        setIsEditing(false);

        localStorage.removeItem(config.auth.sessionKey);
        await restoreSession();
        await loadEnterpriseProfile();
      } catch (error: any) {
        const emailWasChanged = enterpriseForm.email.trim().toLowerCase() !== enterpriseOriginalEmail;
        const phoneWasChanged =
          normalizePhone(enterpriseForm.representative_phone.trim()) !== enterpriseOriginalPhone;
        toast.error(
          getFriendlyUniqueFieldError(
            error,
            emailWasChanged,
            phoneWasChanged,
            error?.message || 'No se pudo actualizar el perfil empresarial.',
          ),
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!isEmployee && !isAdmin) return;

    setSaving(true);
    try {
      const email = employeeForm.email.trim().toLowerCase();
      const firstName = employeeForm.first_name.trim();
      const lastName = employeeForm.last_name.trim();
      const documentType = employeeForm.document_type.trim();
      const nuip = onlyDigits(employeeForm.nuip.trim());
      const normalizedPhone = normalizePhone(employeeForm.phone.trim());
      if (!email || !isValidEmail(email)) {
        toast.error('Ingresa un correo válido.');
        return;
      }
      if (!firstName) {
        toast.error('Los nombres son obligatorios.');
        return;
      }
      if (!lastName) {
        toast.error('Los apellidos son obligatorios.');
        return;
      }
      if (isEmployee && !documentType) {
        toast.error('Selecciona el tipo de documento.');
        return;
      }
      if (isEmployee && !nuip) {
        toast.error('El número de documento es obligatorio.');
        return;
      }
      if (isEmployee && (!normalizedPhone || !isValidPhone(normalizedPhone))) {
        toast.error('El teléfono debe tener 10 dígitos e iniciar por 3.');
        return;
      }
      if (isAdmin && normalizedPhone && !isValidPhone(normalizedPhone)) {
        toast.error('El teléfono debe tener 10 dígitos e iniciar por 3.');
        return;
      }

      await apiClient.put(`/employee/edit/${user.id}/`, {
        id: user.id,
        email,
        username: email,
        first_name: firstName,
        last_name: lastName,
        phone: normalizedPhone,
        document_type: documentType,
        nuip,
      });

      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
      localStorage.removeItem(config.auth.sessionKey);
      await restoreSession();
    } catch (error: any) {
      const emailWasChanged = employeeForm.email.trim().toLowerCase() !== employeeOriginalEmail;
      const phoneWasChanged = normalizePhone(employeeForm.phone.trim()) !== employeeOriginalPhone;
      toast.error(
        getFriendlyUniqueFieldError(
          error,
          emailWasChanged,
          phoneWasChanged,
          error?.message || 'No se pudo actualizar el perfil.',
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) =>
    String(name || '')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0]?.toUpperCase())
      .join('')
      .slice(0, 3);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        {/* Header */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl md:text-3xl">Mi Perfil</CardTitle>
                <CardDescription className="text-sm md:text-base">
                  {isEnterprise ? 'Gestiona la información de tu empresa.' : 'Visualiza y actualiza tu información personal.'}
                </CardDescription>

                {isEnterprise && editableUntilText ? (
                  <div
                    className={[
                      'mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border',
                      canEditEnterprise ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200',
                    ].join(' ')}
                  >
                    {canEditEnterprise ? `Edición disponible hasta: ${editableUntilText}` : `Periodo de edición finalizado: ${editableUntilText}`}
                  </div>
                ) : null}
              </div>

              {!isEditing ? (
                <Button
                  onClick={handleEdit}
                  disabled={(isEnterprise && !canEditEnterprise) || (!isEnterprise && !isEmployee && !isAdmin)}
                  className="gap-2"
                  size="lg"
                >
                  <Edit className="h-4 w-4" />
                  Editar Perfil
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={handleCancel} disabled={saving} size="lg">
                    <X className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving || (isEnterprise && !canEditEnterprise)} size="lg">
                    {saving ? (
                      <>
                        <span className="mr-2 animate-spin">⏳</span> Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* =========================
            PERFIL EMPLEADO
           ========================= */}
        {!isEnterprise ? (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left / resumen */}
            <Card className="lg:col-span-4 overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base">Resumen</CardTitle>
                <CardDescription>Información principal de tu cuenta.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-md mb-4">
                    <AvatarImage src={getImageUrl(user?.avatar)} alt={user?.name} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {user?.name ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="text-lg font-semibold">
                    {`${employeeForm.first_name} ${employeeForm.last_name}`.trim() || user?.name || 'Usuario'}
                  </h3>
                  <p className="text-sm text-muted-foreground">{getFrontendRoleLabel(user?.role)}</p>

                  <div className="mt-5 w-full space-y-3 border-t pt-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{user?.username || 'Sin usuario'}</span>
                    </div>
                    {employeeForm.email ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{employeeForm.email}</span>
                      </div>
                    ) : null}
                    {employeeForm.phone ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{employeeForm.phone}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right / formulario */}
            <Card className="lg:col-span-8 overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base">Información personal</CardTitle>
                <CardDescription>Actualiza tus datos de contacto y documento.</CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-8">
                <div className="space-y-4">
                  <SectionTitle icon={<User className="h-5 w-5" />} title="Datos del empleado" subtitle="Estos datos se usan para tu perfil y validación interna." />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldShell label="Nombres" required>
                      <Input
                        value={employeeForm.first_name}
                        onChange={(e) => setEmployeeForm((p) => ({ ...p, first_name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </FieldShell>

                    <FieldShell label="Apellidos" required>
                      <Input
                        value={employeeForm.last_name}
                        onChange={(e) => setEmployeeForm((p) => ({ ...p, last_name: e.target.value }))}
                        disabled={!isEditing}
                      />
                    </FieldShell>

                    <FieldShell label="Correo electrónico" required>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={employeeForm.email}
                          onChange={(e) => setEmployeeForm((p) => ({ ...p, email: e.target.value }))}
                          disabled={!isEditing}
                          className="pl-9"
                        />
                      </div>
                    </FieldShell>

                    <FieldShell label="Teléfono" hint="10 dígitos, inicia en 3">
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={employeeForm.phone}
                          onChange={(e) => {
                            const digits = onlyDigits(e.target.value).slice(0, 10);
                            setEmployeeForm((p) => ({ ...p, phone: digits }));
                          }}
                          disabled={!isEditing}
                          className="pl-9"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="3001234567"
                        />
                      </div>
                    </FieldShell>

                    <FieldShell label="Tipo de documento" required>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={employeeForm.document_type}
                        onChange={(e) => setEmployeeForm((p) => ({ ...p, document_type: e.target.value }))}
                        disabled={!isEditing}
                      >
                        <option value="">Selecciona una opción</option>
                        {DOC_EMPLOYEE.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </FieldShell>

                    <FieldShell label="Número del Documento" hint="Solo números" required>
                      <Input
                        value={employeeForm.nuip}
                        onChange={(e) => setEmployeeForm((p) => ({ ...p, nuip: onlyDigits(e.target.value) }))}
                        disabled={!isEditing}
                        inputMode="numeric"
                      />
                    </FieldShell>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* =========================
              PERFIL EMPRESA
             ========================= */
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left / media + resumen */}
            <div className="lg:col-span-4 space-y-6">
              {/* Logo + resumen */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-base">Identidad</CardTitle>
                  <CardDescription>Logo, sector y datos generales.</CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-5 group">
                      <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                        <AvatarImage src={getImageUrl(enterpriseAvatar)} alt={enterpriseForm.enterprise} className="object-cover" />
                        <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                          {enterpriseForm.enterprise ? getInitials(enterpriseForm.enterprise) : 'E'}
                        </AvatarFallback>
                      </Avatar>

                      {isEditing && canEditEnterprise ? (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center">
                            <Edit className="h-5 w-5 mb-1" />
                            <span className="text-[11px]">Cambiar logo</span>
                          </Label>
                          <Input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </div>
                      ) : null}
                    </div>

                    <h2 className="text-lg font-semibold">{enterpriseForm.enterprise || 'Nombre de empresa'}</h2>
                    <p className="text-sm text-muted-foreground">{enterpriseForm.niche || 'Sector no definido'}</p>

                    <div className="mt-5 w-full space-y-3 border-t pt-4 text-sm">
                      {enterpriseForm.email ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="truncate">{enterpriseForm.email}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <span className="italic">Sin correo</span>
                        </div>
                      )}

                      {enterpriseForm.address ? (
                        <div className="flex items-start gap-2 text-muted-foreground text-left">
                          <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{enterpriseForm.address}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="italic">Sin dirección</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Banner */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-base">Banner</CardTitle>
                  <CardDescription>Imagen horizontal para tu perfil.</CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  <div className="aspect-[3/1] rounded-lg border bg-muted overflow-hidden flex items-center justify-center">
                    {enterpriseBanner ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getImageUrl(enterpriseBanner)}
                        alt="Banner"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <ImageIcon className="h-4 w-4" />
                        <span>Sin banner</span>
                      </div>
                    )}
                  </div>

                  {isEditing && canEditEnterprise ? (
                    <div className="grid gap-2">
                      <Label className="text-foreground/80">Subir nuevo banner</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                      <p className="text-[10px] text-muted-foreground">Recomendado: 1500×500. JPG/PNG/WEBP.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* RUT */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-base">Documentos</CardTitle>
                  <CardDescription>RUT actualizado (PDF o imagen).</CardDescription>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">RUT</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {enterpriseRut ? 'Documento cargado' : 'Sin documento'}
                      </p>
                    </div>
                  </div>

                  {isEditing && canEditEnterprise ? (
                    <div className="grid gap-2">
                      <Label className="text-foreground/80">Subir RUT</Label>
                      <Input type="file" onChange={(e) => setRutFile(e.target.files?.[0] || null)} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Right / forms */}
            <Card className="lg:col-span-8 overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base">Perfil empresarial</CardTitle>
                <CardDescription>Datos del representante de la empresa y redes.</CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-16 text-center text-muted-foreground animate-pulse">Cargando información...</div>
                ) : (
                  <div className="space-y-10">

                    {/* Representante */}
                    <div className="space-y-4">
                      <SectionTitle
                        icon={<User className="h-5 w-5" />}
                        title="Representante de la cuenta"
                        subtitle="Datos del usuario principal que administra la empresa."
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label="Nombres" required>
                          <Input
                            value={enterpriseForm.first_name}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, first_name: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </FieldShell>

                        <FieldShell label="Apellidos" required>
                          <Input
                            value={enterpriseForm.last_name}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, last_name: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </FieldShell>

                        <FieldShell label="Usuario" hint="Normalmente el email" required>
                          <Input
                            value={enterpriseForm.username}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, username: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </FieldShell>

                        <FieldShell label="Teléfono del representante" hint="10 dígitos, inicia en 3" required>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.representative_phone}
                              onChange={(e) =>
                                setEnterpriseForm((p) => ({ ...p, representative_phone: onlyDigits(e.target.value).slice(0, 10) }))
                              }
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              inputMode="numeric"
                              maxLength={10}
                              placeholder="3001234567"
                            />
                          </div>
                        </FieldShell>
                      </div>
                    </div>
                                      <div className="border-t" />
                    {/* Datos de Empresa */}
                    <div className="space-y-4">
                      <SectionTitle
                        icon={<Building className="h-5 w-5" />}
                        title="Datos de la empresa"
                        subtitle="Información legal y descriptiva."
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label="Nombre comercial / Razón social" required>
                          <Input
                            value={enterpriseForm.enterprise}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, enterprise: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </FieldShell>

                        <FieldShell label="Sector Económico" required>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={enterpriseForm.niche}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, niche: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          >
                            <option value="">Seleccione un sector</option>
                            <option value="Industriales">Industriales</option>
                            <option value="Textil">Textil</option>
                            <option value="Transporte">Transporte</option>
                            <option value="Construcción">Construcción</option>
                            <option value="Alimentos">Alimentos</option>
                            <option value="Autopartes">Autopartes</option>
                            <option value="Comercio">Comercio</option>
                            <option value="Salud">Salud</option>
                            <option value="Minería">Minería</option>
                            <option value="Calzado">Calzado</option>
                            <option value="Tecnología">Tecnología</option>
                          </select>
                        </FieldShell>

                        <FieldShell label="Tipo documento" required>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={enterpriseForm.document_type_enterprise}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, document_type_enterprise: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          >
                            <option value="">Selecciona una opción</option>
                            {DOC_ENTERPRISE.map((d) => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </FieldShell>

                        <FieldShell label="Número del documento" hint="Solo números" required>
                          <Input
                            value={enterpriseForm.nuip_enterprise}
                            onChange={(e) =>
                              setEnterpriseForm((p) => ({ ...p, nuip_enterprise: onlyDigits(e.target.value) }))
                            }
                            disabled={!isEditing || !canEditEnterprise}
                            inputMode="numeric"
                          />
                        </FieldShell>

                        <div className="md:col-span-2">
                          <FieldShell label="Descripción" hint="Máx. recomendado 400–600 caracteres">
                            <Textarea
                              value={enterpriseForm.description}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, description: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              rows={4}
                              className="resize-none"
                              placeholder="Describe brevemente a qué se dedica tu empresa..."
                            />
                          </FieldShell>
                        </div>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Contacto y Redes */}
                    <div className="space-y-4">
                      <SectionTitle
                        icon={<Globe className="h-5 w-5" />}
                        title="Contacto y redes"
                        subtitle="Correo de empresa, dirección y redes."
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label="Correo electrónico" required>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.email}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, email: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              placeholder="correo@empresa.com"
                            />
                          </div>
                        </FieldShell>

                        <div className="md:col-span-2">
                          <FieldShell label="Dirección" hint="Opcional">
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                value={enterpriseForm.address}
                                onChange={(e) => setEnterpriseForm((p) => ({ ...p, address: e.target.value }))}
                                disabled={!isEditing || !canEditEnterprise}
                                className="pl-9"
                                placeholder="Ej: Calle 10 # 20-30, Cúcuta"
                              />
                            </div>
                          </FieldShell>
                        </div>

                        <FieldShell label="Facebook" hint="URL o usuario">
                          <div className="relative">
                            <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.facebook}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, facebook: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              placeholder="https://facebook.com/tu-pagina"
                            />
                          </div>
                        </FieldShell>

                        <FieldShell label="Instagram" hint="@usuario o URL">
                          <div className="relative">
                            <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.instagram}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, instagram: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              placeholder="@tuempresa"
                            />
                          </div>
                        </FieldShell>

                        <div className="md:col-span-2">
                          <FieldShell label="X (Twitter)" hint="@usuario o URL">
                            <Input
                              value={enterpriseForm.X}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, X: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              placeholder="@tuempresa"
                            />
                          </FieldShell>
                        </div>
                      </div>
                    </div>

  


                    {/* Notas de edición */}
                    {isEditing && isEnterprise && !canEditEnterprise ? (
                      <div className="rounded-lg border bg-red-50 p-4 text-sm text-red-700">
                        Tu periodo de edición ya finalizó. Si necesitas cambios, contacta a soporte.
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

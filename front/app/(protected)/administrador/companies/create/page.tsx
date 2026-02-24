"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { toast } from "sonner";

const initialUser = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  document_type: "",
  nuip: "",
  enterprise: "",
  picture: null as File | null,
  banner: null as File | null,
};

const initialProfile = {
  document_type_enterprise: "",
  nuip_enterprise: "",
  niche: "",
  address: "",
  description: "",
  facebook: "",
  instagram: "",
  X: "",
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const normalizePhone = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits.slice(0, 10);
};
const isValidPhone = (value: string) => /^3\d{9}$/.test(value);
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getFriendlyCreateError = (error: any, fallback: string) => {
  const raw = [
    error?.message,
    error?.details?.error,
    error?.details?.detail,
    JSON.stringify(error?.details ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const looksUnique = /unique|constraint|duplicad|duplicate|already exists|integrity/.test(raw);
  const looksEmailOrUser = /email|correo|username|user_useraccount\.username|user_useraccount\.email/.test(raw);
  const looksPhone = /phone|telefono|teléfono|user_useraccount\.phone/.test(raw);
  const looksUserNuip = /nuip|documento|document_type|user_useraccount\.nuip/.test(raw);
  const looksEnterpriseNuip = /nuip_enterprise|nit|user_userprofile\.nuip_enterprise/.test(raw);
  const looksDefaultEmailExists = /ya existe un\/a user account con este\/a email/.test(raw);
  const looksDefaultUserExists = /ya existe un\/a user account con este\/a username/.test(raw);
  const looksDefaultPhoneExists = /ya existe un\/a user account con este\/a phone/.test(raw);
  const looksDefaultNuipExists = /ya existe un\/a user account con este\/a nuip/.test(raw);
  const looksDefaultEnterpriseNuipExists = /ya existe un\/a user profile con este\/a nuip_enterprise/.test(raw);

  if ((looksEmailOrUser && looksUnique) || looksDefaultEmailExists || looksDefaultUserExists) {
    return "Lo siento, este correo no puede ser usado. Ya existe un usuario con ese correo.";
  }
  if ((looksPhone && looksUnique) || raw.includes("número de teléfono ingresado") || looksDefaultPhoneExists) {
    return "Lo siento, este teléfono no puede ser usado. Ya existe un usuario con ese número.";
  }
  if ((looksUserNuip && looksUnique) || raw.includes("número de documento ingresado") || looksDefaultNuipExists) {
    return "El número de documento ingresado pertenece a un usuario ya registrado en el portal.";
  }
  if ((looksEnterpriseNuip && looksUnique) || raw.includes("nit/nuip duplicado") || looksDefaultEnterpriseNuipExists) {
    return "El NIT/NUIP de la empresa ya está registrado.";
  }
  return fallback;
};

export default function AdminCreateCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [userForm, setUserForm] = useState(initialUser);
  const [profileForm, setProfileForm] = useState(initialProfile);

  const stepOneValid = useMemo(() => {
    const emailTrim = userForm.email.trim().toLowerCase();
    const firstName = userForm.first_name.trim();
    const lastName = userForm.last_name.trim();
    const enterpriseName = userForm.enterprise.trim();
    const documentType = userForm.document_type.trim();
    const nuip = onlyDigits(userForm.nuip.trim());
    const phone = normalizePhone(userForm.phone.trim());
    return (
      !!emailTrim &&
      isValidEmail(emailTrim) &&
      !!firstName &&
      !!lastName &&
      !!enterpriseName &&
      !!documentType &&
      !!nuip &&
      !!phone &&
      isValidPhone(phone)
    );
  }, [userForm]);

  const stepTwoValid = useMemo(() => {
    const enterpriseDocType = profileForm.document_type_enterprise.trim();
    const enterpriseNuip = onlyDigits(profileForm.nuip_enterprise.trim());
    const niche = profileForm.niche.trim();
    const description = profileForm.description.trim();
    const address = profileForm.address.trim();
    return !!enterpriseDocType && !!enterpriseNuip && !!niche && !!description && !!address;
  }, [profileForm]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      const emailTrim = userForm.email.trim().toLowerCase();
      const firstName = userForm.first_name.trim();
      const lastName = userForm.last_name.trim();
      const enterpriseName = userForm.enterprise.trim();
      const documentType = userForm.document_type.trim();
      const nuip = onlyDigits(userForm.nuip.trim());
      const phone = normalizePhone(userForm.phone.trim());

      if (!emailTrim || !isValidEmail(emailTrim)) {
        toast.error("Ingresa un correo válido.");
        return;
      }
      if (!firstName) {
        toast.error("Los nombres son obligatorios.");
        return;
      }
      if (!lastName) {
        toast.error("Los apellidos son obligatorios.");
        return;
      }
      if (!enterpriseName) {
        toast.error("El nombre de la empresa es obligatorio.");
        return;
      }
      if (!documentType) {
        toast.error("Selecciona el tipo de documento del representante.");
        return;
      }
      if (!nuip) {
        toast.error("El número de documento del representante es obligatorio.");
        return;
      }
      if (!phone || !isValidPhone(phone)) {
        toast.error("Teléfono inválido. Debe tener 10 dígitos e iniciar por 3.");
        return;
      }

      setUserForm((prev) => ({
        ...prev,
        email: emailTrim,
        nuip,
        phone,
      }));
      setStep(2);
      return;
    }

    const enterpriseDocType = profileForm.document_type_enterprise.trim();
    const enterpriseNuip = onlyDigits(profileForm.nuip_enterprise.trim());
    const niche = profileForm.niche.trim();
    const description = profileForm.description.trim();
    const address = profileForm.address.trim();

    if (!enterpriseDocType) {
      toast.error("Selecciona el tipo de documento de la empresa.");
      return;
    }
    if (!enterpriseNuip) {
      toast.error("El NIT/NUIP de la empresa es obligatorio.");
      return;
    }
    if (!niche) {
      toast.error("El nicho de la empresa es obligatorio.");
      return;
    }
    if (!description) {
      toast.error("La descripción de la empresa es obligatoria.");
      return;
    }
    if (!address) {
      toast.error("La dirección de la empresa es obligatoria.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // Datos de usuario
      const emailTrim = userForm.email.trim().toLowerCase();
      const normalizedPhone = normalizePhone(userForm.phone.trim());
      const normalizedNuip = onlyDigits(userForm.nuip.trim());
      formData.append("email", emailTrim);
      // El username será el mismo email
      formData.append("username", emailTrim);
      formData.append("first_name", userForm.first_name.trim());
      formData.append("last_name", userForm.last_name.trim());
      if (normalizedPhone) formData.append("phone", normalizedPhone);
      if (userForm.document_type.trim())
        formData.append("document_type", userForm.document_type.trim());
      if (normalizedNuip) formData.append("nuip", normalizedNuip);
      formData.append(
        "enterprise",
        userForm.enterprise.trim() || emailTrim,
      );

      // Imágenes de usuario
      if (userForm.picture) formData.append("picture", userForm.picture);
      if (userForm.banner) formData.append("banner", userForm.banner);

      // Datos de perfil empresarial
      if (profileForm.document_type_enterprise.trim())
        formData.append(
          "document_type_enterprise",
          profileForm.document_type_enterprise.trim(),
        );
      if (enterpriseNuip)
        formData.append("nuip_enterprise", enterpriseNuip);
      if (profileForm.niche.trim())
        formData.append("niche", profileForm.niche.trim());
      if (profileForm.address.trim())
        formData.append("address", profileForm.address.trim());
      if (profileForm.description.trim())
        formData.append("description", profileForm.description.trim());
      if (profileForm.facebook.trim())
        formData.append("facebook", profileForm.facebook.trim());
      if (profileForm.instagram.trim())
        formData.append("instagram", profileForm.instagram.trim());
      if (profileForm.X.trim()) formData.append("X", profileForm.X.trim());

      await apiClient.post("/employee/list/", formData);
      toast.success("Empresa creada con perfil empresarial.");
      router.push("/administrador/companies");
    } catch (error: any) {
      toast.error(
        getFriendlyCreateError(
          error,
          error?.message || "No se pudo crear la empresa.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/administrador/companies')}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Crear Empresa</h1>
            <p className="text-sm text-muted-foreground">Flujo por pasos para usuario empresa y datos de perfil empresarial.</p>
          </div>
        </div>



        <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Paso {step} de 2
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Datos de acceso del empresario."
              : "Datos del perfil empresarial asociado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            {step === 1 ? (
              <>
                <div className="grid gap-2">
                  <Label>Correo *</Label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, email: e.target.value }))
                    }
                    required
                    placeholder="ejemplo@empresa.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Nombres *</Label>
                  <Input
                    value={userForm.first_name}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, first_name: e.target.value }))
                    }
                    required
                    placeholder="Juan Carlos"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Apellidos *</Label>
                  <Input
                    value={userForm.last_name}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, last_name: e.target.value }))
                    }
                    required
                    placeholder="Pérez López"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nombre Empresa *</Label>
                  <Input
                    value={userForm.enterprise}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, enterprise: e.target.value }))
                    }
                    required
                    placeholder="Nombre de la empresa"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="document-type">Tipo de Documento *</Label>
                  <select
                    id="document-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={userForm.document_type}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, document_type: e.target.value }))
                    }
                    required
                  >
                    <option value="">Seleccione un tipo de documento</option>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PA">Pasaporte</option>
                    <option value="TI">TI</option>
                    <option value="RC">RC</option>
                    <option value="PE">PE</option>
                    <option value="PT">PT</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Numero de Documento *</Label>
                  <Input
                    value={userForm.nuip}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, nuip: onlyDigits(e.target.value) }))
                    }
                    required
                    placeholder="1234567890"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label>Teléfono * <span className="text-xs text-muted-foreground">(10 dígitos, inicia en 3)</span></Label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) =>
                      setUserForm((p) => ({ ...p, phone: normalizePhone(e.target.value).slice(0, 10) }))
                    }
                    required
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="3001234567"
                  />
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <Label>Logo/Foto de Perfil (opcional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setUserForm((p) => ({
                        ...p,
                        picture: e.target.files?.[0] || null,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Si no se proporciona, se usará la imagen por defecto
                  </p>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Banner (opcional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setUserForm((p) => ({
                        ...p,
                        banner: e.target.files?.[0] || null,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Si no se proporciona, se usará la imagen por defecto
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="doc-type">Tipo de Documento Empresa *</Label>
                  <select
                    id="doc-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={profileForm.document_type_enterprise}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        document_type_enterprise: e.target.value,
                      }))
                    }
                    required
                  >
                      <option value="">Seleccione un tipo de documento</option>
                    <option value="NIT">NIT</option>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuip">Numero de Documento *</Label>
                  <Input
                    id="nuip"
                    value={profileForm.nuip_enterprise}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        nuip_enterprise: onlyDigits(e.target.value),
                      }))
                    }
                    placeholder="900123456-7"
                    inputMode="numeric"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="niche">Sector Económico *</Label>
                  <select
                    id="niche"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={profileForm.niche}
                    onChange={(e) => setProfileForm((p) => ({ ...p, niche: e.target.value }))}
                    required
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={profileForm.address}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="Calle 123 #45-67"
                    required
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Input
                    id="description"
                    value={profileForm.description}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Breve descripción de la empresa"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={profileForm.facebook}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        facebook: e.target.value,
                      }))
                    }
                    placeholder="facebook.com/empresa"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={profileForm.instagram}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        instagram: e.target.value,
                      }))
                    }
                    placeholder="@empresa"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="x">X (Twitter)</Label>
                  <Input
                    id="x"
                    value={profileForm.X}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, X: e.target.value }))
                    }
                    placeholder="@empresa"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (step === 1 ? router.push('/administrador/companies') : setStep(1))}
                  disabled={submitting}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={submitting || (step === 1 ? !stepOneValid : !stepTwoValid)}
                  className="min-w-[170px]"
                >
                  {step === 1 ? (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Siguiente
                    </>
                  ) : submitting ? (
                    'Creando...'
                  ) : (
                    'Crear Empresa'
                  )}
                </Button>
              </div>
          </form>
        </CardContent>
      </Card>
      </div>
  );
}

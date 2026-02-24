"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
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

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const normalizePhone = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits.slice(0, 10);
};
const isValidPhone = (value: string) => /^3\d{9}$/.test(value);
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const getFriendlyUniqueFieldError = (
  error: any,
  emailWasChanged: boolean,
  phoneWasChanged: boolean,
  nuipWasChanged: boolean,
  enterpriseNuipWasChanged: boolean,
  fallback: string,
) => {
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

  if (emailWasChanged && ((looksUnique && looksEmailOrUser) || looksDefaultEmailExists || looksDefaultUserExists)) {
    return "Lo siento, este correo no puede ser usado. Ya existe un usuario con ese correo.";
  }
  if (phoneWasChanged && ((looksPhone && looksUnique) || raw.includes("número de teléfono ingresado") || looksDefaultPhoneExists)) {
    return "Lo siento, este teléfono no puede ser usado. Ya existe un usuario con ese número.";
  }
  if (nuipWasChanged && ((looksUserNuip && looksUnique) || raw.includes("número de documento ingresado") || looksDefaultNuipExists)) {
    return "El número de documento ingresado pertenece a un usuario ya registrado en el portal.";
  }
  if (enterpriseNuipWasChanged && ((looksEnterpriseNuip && looksUnique) || raw.includes("nit/nuip duplicado") || looksDefaultEnterpriseNuipExists)) {
    return "El NIT/NUIP de la empresa ya está registrado.";
  }
  return fallback;
};

type UserData = {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  document_type?: string;
  nuip?: string;
  enterprise?: string;
  picture?: string;
  banner?: string;
  is_active?: boolean;
};

type UserDetailResponse = {
  employee?: UserData;
};

type ProfileData = {
  id: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    enterprise?: string;
  };
  document_type_enterprise?: string;
  nuip_enterprise?: string;
  niche?: string;
  address?: string;
  description?: string;
  facebook?: string;
  instagram?: string;
  X?: string;
};
type ProfileDetailResponse = {
  enterprise?: ProfileData;
};

export default function AdminEditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const enterpriseId = params?.id as string;

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalNuip, setOriginalNuip] = useState("");
  const [originalEnterpriseNuip, setOriginalEnterpriseNuip] = useState("");

  const [userForm, setUserForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    document_type: "",
    nuip: "",
    enterprise: "",
    is_active: true,
    picture: null as File | null,
    banner: null as File | null,
  });

  const [profileForm, setProfileForm] = useState({
    document_type_enterprise: "",
    nuip_enterprise: "",
    niche: "",
    address: "",
    description: "",
    facebook: "",
    instagram: "",
    X: "",
  });

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

  useEffect(() => {
    const loadData = async () => {
      if (!enterpriseId) return;
      setLoading(true);
      try {
        const [userResponse, profileResponse] = await Promise.all([
          apiClient.get<UserDetailResponse>(`/employee/${enterpriseId}/`),
          apiClient.get<ProfileDetailResponse>(`/enterprise/profile/${enterpriseId}/`).catch(() => null),
        ]);
        const userData = userResponse?.employee;
        const profileData = profileResponse?.enterprise;

        if (!userData) {
          throw new Error("No se encontró la empresa a editar.");
        }

        setUserForm({
          email: userData.email || "",
          first_name: userData.first_name || "",
          last_name: userData.last_name || "",
          phone: userData.phone || "",
          document_type: userData.document_type || "",
          nuip: userData.nuip || "",
          enterprise: userData.enterprise || "",
          is_active: userData.is_active !== false,
          picture: null,
          banner: null,
        });
        setOriginalEmail((userData.email || "").trim().toLowerCase());
        setOriginalPhone(normalizePhone(userData.phone || ""));
        setOriginalNuip(onlyDigits(userData.nuip || ""));

        if (profileData) {
          setProfileForm({
            document_type_enterprise: profileData.document_type_enterprise || "",
            nuip_enterprise: profileData.nuip_enterprise || "",
            niche: profileData.niche || "",
            address: profileData.address || "",
            description: profileData.description || "",
            facebook: profileData.facebook || "",
            instagram: profileData.instagram || "",
            X: profileData.X || "",
          });
          setOriginalEnterpriseNuip(onlyDigits(profileData.nuip_enterprise || ""));
        }
      } catch (error: any) {
        toast.error(error?.message || "No se pudo cargar la empresa.");
        router.push("/administrador/companies");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [enterpriseId, router]);

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
      toast.error("El sector económico de la empresa es obligatorio.");
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
      // Actualizar datos de usuario
      const userPayload = new FormData();
      userPayload.append("id", enterpriseId);
      const emailTrim = userForm.email.trim().toLowerCase();
      const normalizedPhone = normalizePhone(userForm.phone.trim());
      const normalizedNuip = onlyDigits(userForm.nuip.trim());
      userPayload.append("email", emailTrim);
      userPayload.append("username", emailTrim);
      userPayload.append("first_name", userForm.first_name.trim());
      userPayload.append("last_name", userForm.last_name.trim());
      if (normalizedPhone) userPayload.append("phone", normalizedPhone);
      if (userForm.document_type.trim())
        userPayload.append("document_type", userForm.document_type.trim());
      if (normalizedNuip) userPayload.append("nuip", normalizedNuip);
      userPayload.append("enterprise", userForm.enterprise.trim() || emailTrim);
      userPayload.append("is_active", userForm.is_active ? "true" : "false");

      if (userForm.picture) userPayload.append("picture", userForm.picture);
      if (userForm.banner) userPayload.append("banner", userForm.banner);

      await apiClient.put(`/employee/edit/${enterpriseId}/`, userPayload);

      // Actualizar perfil empresarial
      const profilePayload = new FormData();
      profilePayload.append("id", enterpriseId);
      if (profileForm.document_type_enterprise.trim())
        profilePayload.append("document_type_enterprise", profileForm.document_type_enterprise.trim());
      if (enterpriseNuip)
        profilePayload.append("nuip_enterprise", enterpriseNuip);
      if (profileForm.niche.trim())
        profilePayload.append("niche", profileForm.niche.trim());
      if (profileForm.address.trim())
        profilePayload.append("address", profileForm.address.trim());
      if (profileForm.description.trim())
        profilePayload.append("description", profileForm.description.trim());
      if (profileForm.facebook.trim())
        profilePayload.append("facebook", profileForm.facebook.trim());
      if (profileForm.instagram.trim())
        profilePayload.append("instagram", profileForm.instagram.trim());
      if (profileForm.X.trim()) profilePayload.append("X", profileForm.X.trim());

      await apiClient.put(`/enterprise/profile/edit/${enterpriseId}/`, profilePayload);

      toast.success("Empresa actualizada correctamente.");
      router.push("/administrador/companies");
    } catch (error: any) {
      const emailWasChanged = userForm.email.trim().toLowerCase() !== originalEmail;
      const phoneWasChanged = normalizePhone(userForm.phone.trim()) !== originalPhone;
      const nuipWasChanged = onlyDigits(userForm.nuip.trim()) !== originalNuip;
      const enterpriseNuipWasChanged =
        onlyDigits(profileForm.nuip_enterprise.trim()) !== originalEnterpriseNuip;
      toast.error(
        getFriendlyUniqueFieldError(
          error,
          emailWasChanged,
          phoneWasChanged,
          nuipWasChanged,
          enterpriseNuipWasChanged,
          error?.message || "No se pudo actualizar la empresa.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
        <div className="py-20 text-center text-muted-foreground">Cargando datos...</div>
    );
  }

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
            <h1 className="text-2xl font-bold tracking-tight">Editar Empresa</h1>
            <p className="text-sm text-muted-foreground">Actualiza los datos de la empresa en dos pasos.</p>
          </div>
        </div>

    

        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Paso {step} de 2
            </CardTitle>
            <CardDescription>
              {step === 1 ? "Datos de acceso del empresario." : "Datos del perfil empresarial asociado."}
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
                      onChange={(e) => setUserForm((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="ejemplo@empresa.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Nombres *</Label>
                    <Input
                      value={userForm.first_name}
                      onChange={(e) => setUserForm((p) => ({ ...p, first_name: e.target.value }))}
                      required
                      placeholder="Juan Carlos"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Apellidos *</Label>
                    <Input
                      value={userForm.last_name}
                      onChange={(e) => setUserForm((p) => ({ ...p, last_name: e.target.value }))}
                      required
                      placeholder="Pérez López"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nombre Empresa *</Label>
                    <Input
                      value={userForm.enterprise}
                      onChange={(e) => setUserForm((p) => ({ ...p, enterprise: e.target.value }))}
                      required
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Tipo de Documento *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={userForm.document_type}
                      onChange={(e) => setUserForm((p) => ({ ...p, document_type: e.target.value }))}
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
                      onChange={(e) => setUserForm((p) => ({ ...p, nuip: onlyDigits(e.target.value) }))}
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
                    <div className="flex items-center gap-2">
                      <input
                        id="is_active"
                        type="checkbox"
                        checked={userForm.is_active}
                        onChange={(e) => setUserForm((p) => ({ ...p, is_active: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="is_active">Empresa activa</Label>
                    </div>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
                    <Label>Logo/Foto (opcional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUserForm((p) => ({ ...p, picture: e.target.files?.[0] || null }))}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Banner (opcional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setUserForm((p) => ({ ...p, banner: e.target.files?.[0] || null }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label>Tipo de Documento Empresa *</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={profileForm.document_type_enterprise}
                      onChange={(e) => setProfileForm((p) => ({ ...p, document_type_enterprise: e.target.value }))}
                    >
                      <option value="">Seleccione un tipo de documento</option>
                      <option value="NIT">NIT</option>
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="PAS">Pasaporte</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Número de Documento *</Label>
                    <Input
                      value={profileForm.nuip_enterprise}
                      onChange={(e) => setProfileForm((p) => ({ ...p, nuip_enterprise: onlyDigits(e.target.value) }))}
                      placeholder="900123456"
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sector Económico *</Label>
                    <select
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
                    <Label>Dirección *</Label>
                    <Input
                      value={profileForm.address}
                      onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Calle 123 #45-67"
                      required
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Descripción *</Label>
                    <Input
                      value={profileForm.description}
                      onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Breve descripción de la empresa"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Facebook</Label>
                    <Input
                      value={profileForm.facebook}
                      onChange={(e) => setProfileForm((p) => ({ ...p, facebook: e.target.value }))}
                      placeholder="facebook.com/empresa"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Instagram</Label>
                    <Input
                      value={profileForm.instagram}
                      onChange={(e) => setProfileForm((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="@empresa"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>X (Twitter)</Label>
                    <Input
                      value={profileForm.X}
                      onChange={(e) => setProfileForm((p) => ({ ...p, X: e.target.value }))}
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
                    'Guardando...'
                  ) : (
                    'Guardar Cambios'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}

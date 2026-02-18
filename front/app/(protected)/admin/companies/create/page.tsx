"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  enterprise: "",
  picture: null as File | null,
  banner: null as File | null,
};

const initialProfile = {
  document_type_enterprise: "NIT",
  nuip_enterprise: "",
  niche: "",
  phone: "",
  address: "",
  description: "",
  facebook: "",
  instagram: "",
  X: "",
};

export default function AdminCreateCompanyPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [userForm, setUserForm] = useState(initialUser);
  const [profileForm, setProfileForm] = useState(initialProfile);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // Datos de usuario
      const emailTrim = userForm.email.trim();
      formData.append("email", emailTrim);
      // El username será el mismo email
      formData.append("username", emailTrim);
      formData.append("first_name", userForm.first_name.trim());
      formData.append("last_name", userForm.last_name.trim());
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
      if (profileForm.nuip_enterprise.trim())
        formData.append("nuip_enterprise", profileForm.nuip_enterprise.trim());
      if (profileForm.niche.trim())
        formData.append("niche", profileForm.niche.trim());
      if (profileForm.phone.trim())
        formData.append("phone", profileForm.phone.trim());
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
      router.push("/admin/companies");
    } catch (error: any) {
      toast.error(error?.message || "No se pudo crear la empresa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 shadow-sm">
        <CardContent className="py-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Crear Empresa
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Flujo por pasos para usuario empresa y datos de perfil
              empresarial.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    El `usuario` será el mismo correo. La contraseña se generará automáticamente y el usuario iniciará sesión por OTP.
                  </p>
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
                  <Label htmlFor="doc-type">Tipo de Documento Empresa</Label>
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
                  >
                    <option value="NIT">NIT</option>
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PAS">Pasaporte</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuip">NUIP/NIT</Label>
                  <Input
                    id="nuip"
                    value={profileForm.nuip_enterprise}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        nuip_enterprise: e.target.value,
                      }))
                    }
                    placeholder="900123456-7"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="niche">Nicho</Label>
                  <Input
                    id="niche"
                    value={profileForm.niche}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, niche: e.target.value }))
                    }
                    placeholder="Ej: salud, retail, tecnología"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+57 300 123 4567"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={profileForm.address}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="Calle 123 #45-67"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
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

            <div className="md:col-span-2 flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  step === 1 ? router.push("/admin/companies") : setStep(1)
                }
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />{" "}
                {step === 1 ? "Cancelar" : "Volver"}
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {step === 1 ? (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Siguiente
                  </>
                ) : submitting ? (
                  "Creando..."
                ) : (
                  "Crear Empresa"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MapPin, Send, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Licitation = {
  id: string;
  title: string;
  economic_sector?: string;
  opportunity_type?: string;
  contracting_entity?: string;
  general_scope?: string;
  estimated_value?: string;
  required_company_type?: string;
  description?: string;
  department?: string;
  municipality?: string;
  priority?: string;
  status?: string;
  created?: string;
  start_date?: string;
  end_date?: string;
  already_applied?: boolean;
};

type EnterpriseProfileApi = {
  enterprise?: {
    niche?: string;
    user?: {
      enterprise?: string;
    };
  };
};

export default function EnterpriseLicitationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const licitationId = params.id as string;
  const { user } = useAuth();

  const [licitation, setLicitation] = useState<Licitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enterpriseDefaults, setEnterpriseDefaults] = useState({
    company_name: "",
    company_sector: "",
  });
  const [applyForm, setApplyForm] = useState({
    full_name: user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "",
    email: user?.email || "",
    phone: user?.phone || "",
    company_name: user?.enterprise || "",
    company_sector: "",
    relevant_experience: "",
    interest_type: "",
    message: "",
  });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>(`/api/licitations-list/${licitationId}/`);
      setLicitation(data?.licitation || null);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar detalles de la licitación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (licitationId) loadData();
  }, [licitationId]);

  useEffect(() => {
    const loadEnterpriseDefaults = async () => {
      if (!user?.id) return;
      try {
        const response = await apiClient.get<EnterpriseProfileApi>(`/enterprise/profile/${user.id}/`);
        const enterprise = response?.enterprise;
        setEnterpriseDefaults({
          company_name: enterprise?.user?.enterprise || user.enterprise || "",
          company_sector: enterprise?.niche || "",
        });
      } catch {
        setEnterpriseDefaults({
          company_name: user.enterprise || "",
          company_sector: "",
        });
      }
    };
    loadEnterpriseDefaults();
  }, [user?.id, user?.enterprise]);

  useEffect(() => {
    if (!user) return;
    setApplyForm((prev) => ({
      ...prev,
      full_name: prev.full_name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: prev.email || user.email || "",
      phone: prev.phone || user.phone || "",
      company_name: prev.company_name || enterpriseDefaults.company_name || user.enterprise || "",
      company_sector: prev.company_sector || enterpriseDefaults.company_sector || "",
    }));
  }, [user, enterpriseDefaults.company_name, enterpriseDefaults.company_sector]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.full_name || !applyForm.email) return toast.error("Nombre y correo son obligatorios");
    if (!applyForm.company_name.trim()) return toast.error("El nombre de empresa es obligatorio");
    if (!applyForm.company_sector.trim()) return toast.error("El sector de la empresa es obligatorio");
    if (!applyForm.relevant_experience.trim()) return toast.error("La experiencia relevante es obligatoria");
    if (!applyForm.interest_type.trim()) return toast.error("Debes seleccionar un tipo de interes");

    setSubmitting(true);
    try {
      await apiClient.post("/api/licitations-apply/", {
        licitation: licitationId,
        ...applyForm,
      });
      toast.success("¡Postulación enviada con éxito!");
      if (licitation) setLicitation({ ...licitation, already_applied: true });
      setIsApplyModalOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Error al enviar la postulación");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-10 text-center text-muted-foreground">Cargando detalles...</div>
      </DashboardLayout>
    );
  }

  if (!licitation) {
    return (
      <DashboardLayout>
        <div className="py-10 text-center text-muted-foreground">Licitación no encontrada</div>
      </DashboardLayout>
    );
  }

  const now = new Date();
  const startDate = licitation.start_date ? new Date(licitation.start_date) : null;
  const endDate = licitation.end_date ? new Date(licitation.end_date) : null;
  const notStarted = startDate ? startDate > now : false;
  const closed = endDate ? endDate < now : false;
  const canApply = !licitation.already_applied && !notStarted && !closed;
  const opportunityTypeLabel: Record<string, string> = {
    licitacion_publica: "Licitación pública",
    contratacion_privada: "Contratación privada",
    alianza_empresarial: "Alianza empresarial",
    proyecto_inversion: "Proyecto de inversión",
    proveedor_estrategico: "Proveedor estratégico",
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Radar de proyectos licitaciones</h1>
            <p className="text-sm text-muted-foreground">Revisa los detalles y postúlate</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-3xl font-black mb-2">{licitation.title}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <MapPin className="h-4 w-4" />
                    <span>{licitation.municipality}, {licitation.department}</span>
                  </div>
                  {(licitation.start_date || licitation.end_date) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {licitation.start_date ? `Inicio: ${new Date(licitation.start_date).toLocaleDateString("es-CO")}` : "Sin fecha de inicio"}
                        {" · "}
                        {licitation.end_date ? `Cierre: ${new Date(licitation.end_date).toLocaleDateString("es-CO")}` : "Sin fecha de cierre"}
                      </span>
                    </div>
                  )}
                </div>

                {licitation.description && (
                  <div className="pt-6 border-t">
                    <h3 className="font-bold text-lg mb-4">Acerca de esta licitación</h3>
                    <div className="text-muted-foreground prose prose-sm max-w-none prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: licitation.description }} />
                  </div>
                )}

                <div className="pt-6 border-t">
                  <h3 className="font-bold text-lg mb-4">Datos de la oportunidad</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div><span className="font-semibold">Sector económico:</span> {licitation.economic_sector || "-"}</div>
                    <div><span className="font-semibold">Tipo de oportunidad:</span> {opportunityTypeLabel[licitation.opportunity_type || ""] || "-"}</div>
                    <div><span className="font-semibold">Entidad contratante:</span> {licitation.contracting_entity || "-"}</div>
                    <div><span className="font-semibold">Tipo empresa requerida:</span> {licitation.required_company_type || "-"}</div>
                    <div><span className="font-semibold">Valor estimado:</span> {licitation.estimated_value ? `$${Number(licitation.estimated_value).toLocaleString("es-CO")}` : "-"}</div>
                  </div>
                  {licitation.general_scope && (
                    <div className="mt-3">
                      <p className="font-semibold mb-1">Alcance general del proyecto:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{licitation.general_scope}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card className="sticky top-6">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>Postularme</CardTitle>
                <CardDescription>Estado de postulación</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {licitation.already_applied ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="bg-green-100 text-green-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-green-700">¡Ya estás postulado!</h3>
                    <p className="text-sm text-muted-foreground">Tu postulación fue registrada.</p>
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    {notStarted ? (
                      <div className="bg-blue-100 text-blue-800 p-4 rounded-md text-sm font-semibold">
                        Esta licitación abre postulaciones el {startDate?.toLocaleDateString("es-CO")}.
                      </div>
                    ) : closed ? (
                      <div className="bg-amber-100 text-amber-800 p-4 rounded-md text-sm font-semibold">
                        La convocatoria cerró el {endDate?.toLocaleDateString("es-CO")}. No se aceptan más postulaciones.
                      </div>
                    ) : canApply ? (
                      <Button size="lg" className="w-full gap-2 font-semibold text-md" onClick={() => setIsApplyModalOpen(true)}>
                        APLICAR A ESTE PROYECTO <Send className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="bg-amber-100 text-amber-800 p-4 rounded-md text-sm font-semibold">
                        No es posible postularte en este momento.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Postulación a Licitación</DialogTitle>
              <DialogDescription>
                Comparte un mensaje de interés para la licitación <b>{licitation.title}</b>.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApply} className="space-y-4 py-4">

              <div className="grid gap-2">
                <Label htmlFor="name" className="text-muted-foreground">Tu Nombre</Label>
                <Input id="name" value={applyForm.full_name} disabled className="bg-muted/50" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_name">Nombre de empresa *</Label>
                <Input
                  id="company_name"
                  value={applyForm.company_name}
                  disabled
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company_sector">Sector de empresa *</Label>
                <Input
                  id="company_sector"
                  value={applyForm.company_sector}
                  disabled
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="relevant_experience">Experiencia relevante *</Label>
                <Textarea
                  id="relevant_experience"
                  rows={3}
                  value={applyForm.relevant_experience}
                  onChange={(e) => setApplyForm({ ...applyForm, relevant_experience: e.target.value })}
                  required
                />
              </div>
                            <div className="grid gap-2">
                <Label htmlFor="message">Mensaje / Motivación *</Label>
                <Textarea
                  id="message"
                  placeholder="Indica por qué te interesa esta licitación..."
                  value={applyForm.message}
                  onChange={(e) => setApplyForm({ ...applyForm, message: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="interest_type">Interés *</Label>
                <select
                  id="interest_type"
                  required
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={applyForm.interest_type}
                  onChange={(e) => setApplyForm({ ...applyForm, interest_type: e.target.value })}
                >
                  <option value="" disabled>
                    Selecciona una opción
                  </option>
                  <option value="liderar">Liderar</option>
                  <option value="participar">Participar</option>
                  <option value="proveer">Proveer</option>
                </select>
              </div>
              <DialogFooter className="pt-4 border-t mt-4">
                <Button variant="outline" type="button" onClick={() => setIsApplyModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Confirmar Postulación"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

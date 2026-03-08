"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MapPin,
  Send,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Project = {
  id: string;
  title: string;
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

export default function EnterpriseProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [applyForm, setApplyForm] = useState({
    full_name: user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`
      : "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>(`/api/projects-list/${projectId}/`);
      setProject(data?.project || null);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar detalles del proyecto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.full_name || !applyForm.email) {
      toast.error("Nombre y correo son obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post("/api/projects-apply/", {
        project: projectId,
        ...applyForm,
      });
      toast.success("¡Postulación enviada con éxito!");
      if (project) {
        setProject({ ...project, already_applied: true });
      }
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
        <div className="py-10 text-center text-muted-foreground">
          Cargando detalles...
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="py-10 text-center text-muted-foreground">
          Proyecto no encontrado
        </div>
      </DashboardLayout>
    );
  }

  const now = new Date();
  const startDate = project.start_date ? new Date(project.start_date) : null;
  const endDate = project.end_date ? new Date(project.end_date) : null;
  const notStarted = startDate ? startDate > now : false;
  const closed = endDate ? endDate < now : false;
  const canApply = !project.already_applied && !notStarted && !closed;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Oportunidad de Inversión
            </h1>
            <p className="text-sm text-muted-foreground">
              Revisa los detalles y postúlate para invertir
            </p>
          </div>
        </div>



        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-3xl font-black mb-2">{project.title}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {project.municipality}, {project.department}
                    </span>
                  </div>
                  {(project.start_date || project.end_date) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.start_date
                          ? `Inicio: ${new Date(project.start_date).toLocaleDateString("es-CO")}`
                          : "Sin fecha de inicio"}
                        {" · "}
                        {project.end_date
                          ? `Cierre: ${new Date(project.end_date).toLocaleDateString("es-CO")}`
                          : "Sin fecha de cierre"}
                      </span>
                    </div>
                  )}
                </div>

                {project.description && (
                  <div className="pt-6 border-t">
                    <h3 className="font-bold text-lg mb-4">
                      Acerca de este proyecto
                    </h3>
                    <div
                      className="text-muted-foreground prose prose-sm max-w-none prose-p:leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card className="sticky top-6">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle>Invertir en Proyecto</CardTitle>
                <CardDescription>
                  Estado de postulación e inversión
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {project.already_applied ? (
                  <div className="py-6 text-center space-y-4">
                    <div className="bg-green-100 text-green-700 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold text-green-700">
                      ¡Ya estás postulado!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tu oferta de inversión ha sido registrada. El equipo
                      administrador la revisará pronto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 text-center">
                    {notStarted ? (
                      <div className="bg-blue-100 text-blue-800 p-4 rounded-md text-sm font-semibold">
                        Este proyecto abre postulaciones el{" "}
                        {startDate?.toLocaleDateString("es-CO")}.
                      </div>
                    ) : closed ? (
                      <div className="bg-amber-100 text-amber-800 p-4 rounded-md text-sm font-semibold">
                        La convocatoria cerró el {endDate?.toLocaleDateString("es-CO")}. No se aceptan más postulaciones.
                      </div>
                    ) : canApply ? (
                      <Button
                        size="lg"
                        className="w-full gap-2 font-semibold text-md"
                        onClick={() => setIsApplyModalOpen(true)}
                      >
                        Me interesa postularme <Send className="h-4 w-4" />
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

        {/* Modal de Postulación */}
        <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Postulación de Inversión</DialogTitle>
              <DialogDescription>
                Comparte un mensaje de motivación para el proyecto{" "}
                <b>{project.title}</b>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApply} className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="message">Mensaje / Motivación *</Label>
                <Textarea
                  id="message"
                  placeholder="Indica por qué te interesa invertir en este proyecto..."
                  value={applyForm.message}
                  onChange={(e) =>
                    setApplyForm({
                      ...applyForm,
                      message: e.target.value,
                    })
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="grid gap-2 mb-2">
                <Label htmlFor="name" className="text-muted-foreground">
                  Tu Nombre
                </Label>
                <Input
                  id="name"
                  value={applyForm.full_name}
                  disabled
                  className="bg-muted/50"
                />
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                >
                  Cancelar
                </Button>
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

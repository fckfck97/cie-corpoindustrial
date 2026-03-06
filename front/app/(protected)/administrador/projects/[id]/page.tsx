"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Briefcase,
  Building2,
  MapPin,
  Users,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reportUi } from "@/utils/report-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExportPdfButton } from "@/components/ExportPdfButton";

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
};

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  message?: string;
  created_at: string;
  enterprise_name?: string;
};

type ApplicationsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: Application[];
};

const isoToDate = (value?: string) => (value ? value.slice(0, 10) : "");
const dateToUtcIso = (value: string) => `${value}T00:00:00Z`;
const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayStr = () => {
  return formatLocalDate(new Date());
};
const nextDayStr = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return formatLocalDate(date);
};

export default function AdminProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    department: "",
    municipality: "",
    priority: "Media",
    status: "published",
    start_date: "",
    end_date: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const projData = await apiClient.get<any>(`/api/projects/${projectId}/`);
      setProject(projData?.project || null);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar detalles del proyecto");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setLoadingApplications(true);
    try {
      const params = new URLSearchParams();
      params.set("project", projectId);
      params.set("page", String(currentPage));
      params.set("page_size", "10");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const data = await apiClient.get<ApplicationsResponse>(
        `/api/projects-applications/admin/?${params.toString()}`,
      );
      const rows = data?.results || [];
      const count = Number(data?.count || rows.length || 0);
      setApplications(rows);
      setTotalCount(count);
      setHasNext(Boolean(data?.next));
      setHasPrevious(Boolean(data?.previous));
      setTotalPages(Math.max(1, Math.ceil(count / 10)));
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar postulaciones");
    } finally {
      setLoadingApplications(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadApplications();
  }, [projectId, currentPage, searchTerm]);

  useEffect(() => {
    if (!project) return;
    setEditForm({
      title: project.title || "",
      description: project.description || "",
      department: project.department || "",
      municipality: project.municipality || "",
      priority: project.priority || "Media",
      status: project.status || "published",
      start_date: isoToDate(project.start_date),
      end_date: isoToDate(project.end_date),
    });
  }, [project]);

  const fetchApplicationsForExport = async () => {
    const collected: Application[] = [];
    let page = 1;

    while (page <= 200) {
      const params = new URLSearchParams();
      params.set("project", projectId);
      params.set("page", String(page));
      params.set("page_size", "100");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const data = await apiClient.get<ApplicationsResponse>(
        `/api/projects-applications/admin/?${params.toString()}`,
      );
      const rows = data?.results || [];
      collected.push(...rows);
      if (!data?.next) break;
      page += 1;
    }

    return collected;
  };

  const saveProjectChanges = async () => {
    if (!project) return;
    if (!editForm.start_date || !editForm.end_date) {
      toast.error("Debes seleccionar fecha de inicio y fecha de cierre.");
      return;
    }
    if (editForm.start_date < todayStr()) return toast.error("La fecha de inicio no puede ser anterior a hoy.");
    if (editForm.end_date <= editForm.start_date) return toast.error("La fecha de cierre debe ser posterior a la fecha de inicio.");
    setSavingProject(true);
    try {
      const body = new FormData();
      body.append("id", project.id);
      body.append("title", editForm.title);
      body.append("description", editForm.description);
      body.append("department", editForm.department);
      body.append("municipality", editForm.municipality);
      body.append("priority", editForm.priority);
      body.append("status", editForm.status);
      if (editForm.start_date) body.append("start_date", dateToUtcIso(editForm.start_date));
      if (editForm.end_date) body.append("end_date", dateToUtcIso(editForm.end_date));

      await apiClient.put(`/api/projects/${project.id}/`, body);
      toast.success("Proyecto actualizado.");
      setEditOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar el proyecto.");
    } finally {
      setSavingProject(false);
    }
  };

  const toggleProjectStatus = async () => {
    if (!project) return;
    const nextStatus = project.status === "published" ? "draft" : "published";
    try {
      const body = new FormData();
      body.append("id", project.id);
      body.append("status", nextStatus);
      await apiClient.put(`/api/projects/${project.id}/`, body);
      toast.success(nextStatus === "draft" ? "Proyecto desactivado." : "Proyecto activado.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cambiar el estado.");
    }
  };

  const exportToPDF = () => {
    (async () => {
      const exportRows = await fetchApplicationsForExport();
      if (exportRows.length === 0) {
        toast.error("No hay postulaciones para exportar");
        return;
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Postulaciones - ${project?.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            h2 { color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f4f4f4; color: #333; }
            .totals { margin-top: 20px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Reporte de Postulaciones al Proyecto</h1>
          <h2>Proyecto: ${project?.title}</h2>
          <p><strong>Total postulaciones (filtro aplicado):</strong> ${exportRows.length}</p>
          <p><strong>Búsqueda:</strong> ${searchTerm || "Sin filtro"}</p>
          <p>Fecha de generación: ${new Date().toLocaleDateString("es-ES")}</p>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Representante</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map(
                  (app) => `
                <tr>
                  <td>${app.enterprise_name || "Sin Empresa"}</td>
                  <td>${app.full_name}</td>
                  <td>${app.email}</td>
                  <td>${app.phone || ""}</td>
                  <td>${new Date(app.created_at).toLocaleDateString("es-ES")}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    })().catch(() => toast.error("No se pudo exportar el PDF."));
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Cargando detalles...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Proyecto no encontrado
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Detalle de oportunidad
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestion de la oportunidad y seguimiento de empresarios postulados.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-end md:self-auto">
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" className="gap-2" onClick={toggleProjectStatus}>
            <Power className="h-4 w-4" />
            {project.status === "published" ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold line-clamp-2">
                    {project.title}
                  </h2>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant={project.status === "published" ? "default" : "secondary"}>
                      {project.status === "published" ? "Publicada" : "Borrador"}
                    </Badge>
                    <Badge variant="outline">Prioridad {project.priority || "-"}</Badge>
                  </div>
                </div>

                <div className="space-y-3 text-sm mt-4 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {project.municipality || "-"}, {project.department || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {project.start_date ? new Date(project.start_date).toLocaleDateString("es-CO") : "-"}
                      {" "}a{" "}
                      {project.end_date ? new Date(project.end_date).toLocaleDateString("es-CO") : "-"}
                    </span>
                  </div>

                </div>

                {project.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2">Descripcion</h3>
                    <div
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: project.description,
                      }}
                    />
                  </div>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Postulaciones</span>
                <span className="font-semibold">{totalCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={project.status === "published" ? "default" : "secondary"}>
                  {project.status === "published" ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Empresarios postulados
                </CardTitle>
                <CardDescription>
                  Total: {totalCount} postulaciones
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <ExportPdfButton onClick={exportToPDF} className={reportUi.exportPdfButton} disabled={totalCount === 0} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-1">
                <div className="relative md:col-span-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                    placeholder="Buscar por empresa, nombre o correo..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {loadingApplications ? (
                <div className="py-8 text-center text-muted-foreground">
                  Cargando postulaciones...
                </div>
              ) : applications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aun no hay empresarios postulados a esta oportunidad.
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-125 pr-4">
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <Card key={app.id} className="bg-muted/20 border-border/70">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-base flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-primary" />
                                  <span>
                                    {app.enterprise_name ||
                                      "Empresa Sin Nombre"}
                                  </span>
                                </div>
                                <div className="text-sm font-medium">
                                  {app.full_name}
                                </div>

                                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" /> {app.email}
                                  </div>
                                  {app.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="h-4 w-4" /> {app.phone}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />{" "}
                                    {new Date(
                                      app.created_at,
                                    ).toLocaleDateString("es-ES", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              </div>

                              {app.message && (
                                <div className="flex-1 bg-background p-3 rounded-md text-sm border">
                                  <p className="font-semibold mb-1 text-xs text-muted-foreground">
                                    Mensaje de interés:
                                  </p>
                                  <p className="italic">"{app.message}"</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {totalPages > 1 && (
                    <div className={reportUi.paginationRow}>
                      <p className={reportUi.paginationMeta}>
                        Mostrando página {currentPage} de {totalPages}
                      </p>
                      <div className={reportUi.paginationButtons}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1 || loadingApplications || !hasPrevious}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => (hasNext ? p + 1 : p))
                          }
                          disabled={currentPage === totalPages || loadingApplications || !hasNext}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-170">
          <DialogHeader>
            <DialogTitle>Editar oportunidad</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la oportunidad. Si desactivas, se conserva el historial de postulaciones.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Departamento</Label>
                <Input value={editForm.department} onChange={(e) => setEditForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Municipio</Label>
                <Input value={editForm.municipality} onChange={(e) => setEditForm((p) => ({ ...p, municipality: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <select
                  className="h-10 rounded-md border px-3"
                  value={editForm.priority}
                  onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <select
                  className="h-10 rounded-md border px-3"
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="published">Activo</option>
                  <option value="draft">Desactivado</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Fecha de inicio</Label>
                <Input
                  type="date"
                  min={todayStr()}
                  value={editForm.start_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de cierre</Label>
                <Input
                  type="date"
                  min={editForm.start_date ? nextDayStr(editForm.start_date) : undefined}
                  value={editForm.end_date}
                  onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingProject}>
              Cancelar
            </Button>
            <Button onClick={saveProjectChanges} disabled={savingProject || !editForm.title.trim()}>
              {savingProject ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

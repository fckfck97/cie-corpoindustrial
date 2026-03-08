"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MapPin,
  Users,
  Download,
  Mail,
  Phone,
  Calendar,
  FileText,
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
};

type Application = {
  id: string;
  full_name: string;
  email: string;
  company_name?: string;
  company_sector?: string;
  relevant_experience?: string;
  interest_type?: string;
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
const OPPORTUNITY_TYPE_LABEL: Record<string, string> = {
  licitacion_publica: "Licitacion publica",
  contratacion_privada: "Contratacion privada",
  alianza_empresarial: "Alianza empresarial",
  proyecto_inversion: "Proyecto de inversion",
  proveedor_estrategico: "Proveedor estrategico",
};
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const htmlSafe = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const dateTimeLabel = (value?: string) =>
  value ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function AdminLicitationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const licitationId = params.id as string;

  const [licitation, setLicitation] = useState<Licitation | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [savingLicitation, setSavingLicitation] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    economic_sector: "",
    opportunity_type: "licitacion_publica",
    contracting_entity: "",
    general_scope: "",
    estimated_value: "",
    required_company_type: "",
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
      const data = await apiClient.get<any>(`/api/licitations/${licitationId}/`);
      setLicitation(data?.licitation || null);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar detalles de la licitación");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setLoadingApplications(true);
    try {
      const params = new URLSearchParams();
      params.set("licitation", licitationId);
      params.set("page", String(currentPage));
      params.set("page_size", "10");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (dateStart) params.set("start_date", dateStart);
      if (dateEnd) params.set("end_date", dateEnd);

      const data = await apiClient.get<ApplicationsResponse>(
        `/api/licitations-applications/admin/?${params.toString()}`,
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
    if (licitationId) loadData();
  }, [licitationId]);

  useEffect(() => {
    if (!licitationId) return;
    loadApplications();
  }, [licitationId, currentPage, searchTerm, dateStart, dateEnd]);

  useEffect(() => {
    if (!licitation) return;
    setEditForm({
      title: licitation.title || "",
      economic_sector: licitation.economic_sector || "",
      opportunity_type: licitation.opportunity_type || "licitacion_publica",
      contracting_entity: licitation.contracting_entity || "",
      general_scope: licitation.general_scope || "",
      estimated_value: licitation.estimated_value || "",
      required_company_type: licitation.required_company_type || "",
      description: licitation.description || "",
      department: licitation.department || "",
      municipality: licitation.municipality || "",
      priority: licitation.priority || "Media",
      status: licitation.status || "published",
      start_date: isoToDate(licitation.start_date),
      end_date: isoToDate(licitation.end_date),
    });
  }, [licitation]);

  const fetchApplicationsForExport = async () => {
    const collected: Application[] = [];
    let page = 1;
    while (page <= 200) {
      const params = new URLSearchParams();
      params.set("licitation", licitationId);
      params.set("page", String(page));
      params.set("page_size", "100");
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (dateStart) params.set("start_date", dateStart);
      if (dateEnd) params.set("end_date", dateEnd);
      const data = await apiClient.get<ApplicationsResponse>(`/api/licitations-applications/admin/?${params.toString()}`);
      const rows = data?.results || [];
      collected.push(...rows);
      if (!data?.next) break;
      page += 1;
    }
    return collected;
  };

  const saveLicitationChanges = async () => {
    if (!licitation) return;
    if (!editForm.start_date || !editForm.end_date) return toast.error("Debes seleccionar fecha de inicio y fecha de cierre.");
    if (editForm.start_date < todayStr()) return toast.error("La fecha de inicio no puede ser anterior a hoy.");
    if (editForm.end_date <= editForm.start_date) return toast.error("La fecha de cierre debe ser posterior a la fecha de inicio.");
    setSavingLicitation(true);
    try {
      const body = new FormData();
      body.append("id", licitation.id);
      body.append("title", editForm.title);
      body.append("economic_sector", editForm.economic_sector);
      body.append("opportunity_type", editForm.opportunity_type);
      body.append("contracting_entity", editForm.contracting_entity);
      body.append("general_scope", editForm.general_scope);
      body.append("estimated_value", editForm.estimated_value || "0");
      body.append("required_company_type", editForm.required_company_type);
      body.append("description", editForm.description);
      body.append("department", editForm.department);
      body.append("municipality", editForm.municipality);
      body.append("priority", editForm.priority);
      body.append("status", editForm.status);
      body.append("start_date", dateToUtcIso(editForm.start_date));
      body.append("end_date", dateToUtcIso(editForm.end_date));

      await apiClient.put(`/api/licitations/${licitation.id}/`, body);
      toast.success("Licitación actualizada.");
      setEditOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo actualizar la licitación.");
    } finally {
      setSavingLicitation(false);
    }
  };

  const toggleLicitationStatus = async () => {
    if (!licitation) return;
    const nextStatus = licitation.status === "published" ? "draft" : "published";
    try {
      const body = new FormData();
      body.append("id", licitation.id);
      body.append("status", nextStatus);
      await apiClient.put(`/api/licitations/${licitation.id}/`, body);
      toast.success(nextStatus === "draft" ? "Licitación desactivada." : "Licitación activada.");
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cambiar el estado.");
    }
  };

  const exportToExcel = () => {
    (async () => {
      const exportRows = await fetchApplicationsForExport();
      if (exportRows.length === 0) return toast.error("No hay postulaciones para exportar");

      const metadataRows = [
        ["Reporte", "Postulaciones de Licitacion"],
        ["Licitacion", licitation?.title || "-"],
        ["Sector economico", licitation?.economic_sector || "-"],
        ["Tipo de oportunidad", OPPORTUNITY_TYPE_LABEL[licitation?.opportunity_type || ""] || "-"],
        ["Entidad contratante", licitation?.contracting_entity || "-"],
        ["Tipo de empresa requerida", licitation?.required_company_type || "-"],
        ["Valor estimado", licitation?.estimated_value ? `$${Number(licitation.estimated_value).toLocaleString("es-CO")}` : "-"],
        ["Ubicacion", `${licitation?.municipality || "-"}, ${licitation?.department || "-"}`],
        ["Fecha inicio", dateTimeLabel(licitation?.start_date)],
        ["Fecha cierre", dateTimeLabel(licitation?.end_date)],
        ["Total postulaciones", String(exportRows.length)],
        ["Filtro busqueda", searchTerm || "Sin filtro"],
        ["Fecha generacion", new Date().toLocaleString("es-CO")],
      ];
      const headers = [
        "Empresa postulante",
        "Sector economico empresa",
        "Interes",
        "Representante",
        "Correo",
        "Telefono",
        "Experiencia relevante",
        "Mensaje de interes",
        "Fecha de postulacion",
      ];
      const csvContent = [
        ...metadataRows.map((row) => row.map((cell) => csvCell(cell)).join(",")),
        "",
        headers.join(","),
        ...exportRows.map((app) =>
          [
            csvCell(app.company_name || app.enterprise_name || "Sin empresa"),
            csvCell(app.company_sector || ""),
            csvCell(app.interest_type || ""),
            csvCell(app.full_name),
            csvCell(app.email),
            csvCell(app.phone || ""),
            csvCell(app.relevant_experience || ""),
            csvCell(app.message || ""),
            csvCell(dateTimeLabel(app.created_at)),
          ].join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `postulaciones_licitacion_${licitation?.title || "licitacion"}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    })().catch(() => toast.error("No se pudo exportar el Excel."));
  };

  const exportToPDF = () => {
    (async () => {
      const exportRows = await fetchApplicationsForExport();
      if (exportRows.length === 0) return toast.error("No hay postulaciones para exportar");

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      const generatedAt = new Date().toLocaleString("es-CO");
      const licitationType = OPPORTUNITY_TYPE_LABEL[licitation?.opportunity_type || ""] || "-";
      printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Postulaciones - ${htmlSafe(licitation?.title || "Licitacion")}</title>
          <style>
            @page { size: A4 landscape; margin: 14mm; }
            body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; }
            .header {
              border: 1px solid #dbeafe;
              background: linear-gradient(90deg, #eff6ff, #f8fafc);
              border-radius: 12px;
              padding: 14px 16px;
              margin-bottom: 12px;
            }
            .title { font-size: 20px; font-weight: 800; margin: 0 0 6px 0; }
            .subtitle { margin: 0; font-size: 12px; color: #475569; }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
              margin: 12px 0;
            }
            .meta {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 8px 10px;
              background: #f8fafc;
            }
            .meta .k { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
            .meta .v { font-size: 12px; margin-top: 3px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px;
              text-align: left;
              vertical-align: top;
              font-size: 10px;
              word-wrap: break-word;
              white-space: pre-wrap;
            }
            th { background-color: #eff6ff; font-weight: 700; }
            .small { font-size: 9px; color: #64748b; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">Reporte de Postulaciones a Licitacion</p>
            <p class="subtitle">Generado el ${htmlSafe(generatedAt)} - Total postulaciones: ${exportRows.length}</p>
          </div>

          <div class="meta-grid">
            <div class="meta"><div class="k">Licitacion</div><div class="v">${htmlSafe(licitation?.title || "-")}</div></div>
            <div class="meta"><div class="k">Tipo de oportunidad</div><div class="v">${htmlSafe(licitationType)}</div></div>
            <div class="meta"><div class="k">Sector economico</div><div class="v">${htmlSafe(licitation?.economic_sector || "-")}</div></div>
            <div class="meta"><div class="k">Entidad contratante</div><div class="v">${htmlSafe(licitation?.contracting_entity || "-")}</div></div>
            <div class="meta"><div class="k">Tipo empresa requerida</div><div class="v">${htmlSafe(licitation?.required_company_type || "-")}</div></div>
            <div class="meta"><div class="k">Valor estimado</div><div class="v">${htmlSafe(licitation?.estimated_value ? `$${Number(licitation.estimated_value).toLocaleString("es-CO")}` : "-")}</div></div>
            <div class="meta"><div class="k">Ubicacion</div><div class="v">${htmlSafe(`${licitation?.municipality || "-"}, ${licitation?.department || "-"}`)}</div></div>
            <div class="meta"><div class="k">Inicio</div><div class="v">${htmlSafe(dateTimeLabel(licitation?.start_date))}</div></div>
            <div class="meta"><div class="k">Cierre</div><div class="v">${htmlSafe(dateTimeLabel(licitation?.end_date))}</div></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Empresa</th>
                <th>Sector</th>
                <th>Interés</th>
                <th>Representante</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Experiencia relevante</th>
                <th>Mensaje de interés</th>
                <th>Fecha postulación</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map((app, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${htmlSafe(app.company_name || app.enterprise_name || "Sin empresa")}</td>
                  <td>${htmlSafe(app.company_sector || "")}</td>
                  <td>${htmlSafe(app.interest_type || "")}</td>
                  <td>${htmlSafe(app.full_name)}</td>
                  <td>${htmlSafe(app.email)}</td>
                  <td>${htmlSafe(app.phone || "")}</td>
                  <td>${htmlSafe(app.relevant_experience || "")}</td>
                  <td>${htmlSafe(app.message || "")}</td>
                  <td>${htmlSafe(dateTimeLabel(app.created_at))}</td>
                </tr>
              `)
                .join("")}
            </tbody>
          </table>
          <p class="small">Filtro aplicado: ${htmlSafe(searchTerm || "Sin filtro")}</p>
        </body>
      </html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    })().catch(() => toast.error("No se pudo exportar el PDF."));
  };

  if (loading) return <div className="py-10 text-center text-muted-foreground">Cargando detalles...</div>;
  if (!licitation) return <div className="py-10 text-center text-muted-foreground">Licitación no encontrada</div>;
  const opportunityTypeLabel = OPPORTUNITY_TYPE_LABEL;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Detalles de la Licitación</h1>
          <p className="text-sm text-muted-foreground">Información y lista de empresarios postulados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          <Button variant="outline" className="gap-2" onClick={toggleLicitationStatus}>
            <Power className="h-4 w-4" />
            {licitation.status === "published" ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-xl font-bold line-clamp-2">{licitation.title}</h2>
                <div className="flex gap-2 mt-2">
                  <Badge variant={licitation.status === "published" ? "default" : "secondary"}>
                    {licitation.status === "published" ? "Activo" : "Desactivado"}
                  </Badge>
                  <Badge variant="outline">{licitation.priority}</Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="text-xs text-muted-foreground rounded-md border bg-muted/30 p-3 space-y-1">
                  <div>Sector económico: {licitation.economic_sector || "-"}</div>
                  <div>Tipo oportunidad: {opportunityTypeLabel[licitation.opportunity_type || ""] || "-"}</div>
                  <div>Entidad contratante: {licitation.contracting_entity || "-"}</div>
                  <div>Tipo empresa requerida: {licitation.required_company_type || "-"}</div>
                  <div>Valor estimado: {licitation.estimated_value ? `$${Number(licitation.estimated_value).toLocaleString("es-CO")}` : "-"}</div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{licitation.municipality}, {licitation.department}</span>
                </div>
                <div className="text-xs text-muted-foreground rounded-md border bg-muted/30 p-3">
                  <div>Inicio: {licitation.start_date ? new Date(licitation.start_date).toLocaleDateString("es-CO") : "-"}</div>
                  <div>Cierre: {licitation.end_date ? new Date(licitation.end_date).toLocaleDateString("es-CO") : "-"}</div>
                </div>
              </div>

              {licitation.general_scope && (
                <div className="pt-2 border-t">
                  <h3 className="font-semibold mb-2">Alcance general</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{licitation.general_scope}</p>
                </div>
              )}

              {licitation.description && (
                <div className="pt-2 border-t">
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <div className="text-sm text-muted-foreground prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: licitation.description }} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Empresarios Postulados
                </CardTitle>
                <CardDescription>Total: {totalCount} postulaciones</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className={reportUi.exportExcelButton} onClick={exportToExcel} disabled={totalCount === 0}>
                  <Download className="h-4 w-4" /> Excel
                </Button>
                <Button variant="outline" size="sm" className={reportUi.exportPdfButton} onClick={exportToPDF} disabled={totalCount === 0}>
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
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
                <div className="py-8 text-center text-muted-foreground">Cargando postulaciones...</div>
              ) : applications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aún no hay empresarios postulados a esta licitación.</div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <Card key={app.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-lg">{app.company_name || app.enterprise_name || "Empresa Sin Nombre"}</div>
                                {app.company_sector && <div className="text-sm text-muted-foreground">Sector: {app.company_sector}</div>}
                                {app.interest_type && <div className="text-sm text-muted-foreground">Interés: {app.interest_type}</div>}
                                <div className="text-sm font-medium">{app.full_name}</div>
                                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {app.email}</div>
                                  {app.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {app.phone}</div>}
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(app.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </div>
                              </div>
                              {app.message && (
                                <div className="flex-1 bg-background p-3 rounded-md text-sm border">
                                  <p className="font-semibold mb-1 text-xs text-muted-foreground">Mensaje de interés:</p>
                                  <p className="italic">"{app.message}"</p>
                                </div>
                              )}
                              {app.relevant_experience && (
                                <div className="flex-1 bg-background p-3 rounded-md text-sm border">
                                  <p className="font-semibold mb-1 text-xs text-muted-foreground">Experiencia relevante:</p>
                                  <p className="italic">"{app.relevant_experience}"</p>
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
                      <p className={reportUi.paginationMeta}>Mostrando página {currentPage} de {totalPages}</p>
                      <div className={reportUi.paginationButtons}>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1 || loadingApplications || !hasPrevious}>
                          <ChevronLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => (hasNext ? p + 1 : p))} disabled={currentPage === totalPages || loadingApplications || !hasNext}>
                          Siguiente <ChevronRight className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Editar Licitación</DialogTitle>
            <DialogDescription>Actualiza los datos. Si desactivas, se conserva el historial de postulaciones.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nombre del proyecto</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Sector económico</Label>
                <Input value={editForm.economic_sector} onChange={(e) => setEditForm((p) => ({ ...p, economic_sector: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo oportunidad</Label>
                <select className="h-10 rounded-md border px-3" value={editForm.opportunity_type} onChange={(e) => setEditForm((p) => ({ ...p, opportunity_type: e.target.value }))}>
                  <option value="licitacion_publica">Licitación pública</option>
                  <option value="contratacion_privada">Contratación privada</option>
                  <option value="alianza_empresarial">Alianza empresarial</option>
                  <option value="proyecto_inversion">Proyecto de inversión</option>
                  <option value="proveedor_estrategico">Proveedor estratégico</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Entidad o empresa contratante</Label>
                <Input value={editForm.contracting_entity} onChange={(e) => setEditForm((p) => ({ ...p, contracting_entity: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de empresa requerida</Label>
                <Input value={editForm.required_company_type} onChange={(e) => setEditForm((p) => ({ ...p, required_company_type: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Alcance general del proyecto</Label>
              <Textarea rows={3} value={editForm.general_scope} onChange={(e) => setEditForm((p) => ({ ...p, general_scope: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Valor estimado (COP)</Label>
              <Input type="number" min="0" step="0.01" value={editForm.estimated_value} onChange={(e) => setEditForm((p) => ({ ...p, estimated_value: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Descripción</Label>
              <Textarea rows={4} value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
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
                <select className="h-10 rounded-md border px-3" value={editForm.priority} onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Estado</Label>
                <select className="h-10 rounded-md border px-3" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="published">Activo</option>
                  <option value="draft">Desactivado</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Fecha de inicio</Label>
                <Input type="date" min={todayStr()} value={editForm.start_date} onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fecha de cierre</Label>
                <Input type="date" min={editForm.start_date ? nextDayStr(editForm.start_date) : undefined} value={editForm.end_date} onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingLicitation}>Cancelar</Button>
            <Button onClick={saveLicitationChanges} disabled={savingLicitation || !editForm.title.trim()}>
              {savingLicitation ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

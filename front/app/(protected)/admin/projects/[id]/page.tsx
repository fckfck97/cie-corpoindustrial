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
import {
  ArrowLeft,
  MapPin,
  Users,
  Download,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reportUi } from "@/utils/report-ui";

type Project = {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  department?: string;
  municipality?: string;
  image?: string;
  priority?: string;
  status?: string;
  created?: string;
  invested_amount?: number;
  remaining_amount?: number;
};

type Application = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  message?: string;
  capital_investment?: number;
  created_at: string;
  enterprise_name?: string;
};

export default function AdminProjectDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const [projData, appsData] = await Promise.all([
        apiClient.get<any>(`/api/projects/${projectId}/`),
        apiClient.get<Application[]>(
          `/api/projects-applications/admin/?project=${projectId}`,
        ),
      ]);
      setProject(projData?.project || null);
      setApplications(appsData || []);
    } catch (error: any) {
      toast.error(error?.message || "Error al cargar detalles del proyecto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  const exportToExcel = () => {
    if (applications.length === 0) {
      toast.error("No hay postulaciones para exportar");
      return;
    }

    const headers = [
      "Empresa",
      "Representante",
      "Correo",
      "Teléfono",
      "Monto a Invertir",
      "Mensaje",
      "Fecha de Postulación",
    ];

    const csvContent = [
      headers.join(","),
      ...applications.map((app) =>
        [
          `"${(app.enterprise_name || "Sin Empresa").replace(/"/g, '""')}"`,
          `"${app.full_name.replace(/"/g, '""')}"`,
          `"${app.email}"`,
          `"${app.phone || ""}"`,
          app.capital_investment || 0,
          `"${(app.message || "").replace(/"/g, '""')}"`,
          `"${new Date(app.created_at).toLocaleDateString("es-ES")}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `postulaciones_${project?.title || "proyecto"}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel descargado correctamente");
  };

  const exportToPDF = () => {
    if (applications.length === 0) {
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
          <p><strong>Meta:</strong> $${Number(project?.amount || 0).toLocaleString()}</p>
          <p><strong>Total Invertido:</strong> $${Number(project?.invested_amount || 0).toLocaleString()}</p>
          <p><strong>Faltante:</strong> $${Number(project?.remaining_amount || 0).toLocaleString()}</p>
          <p>Fecha de generación: ${new Date().toLocaleDateString("es-ES")}</p>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Representante</th>
                <th>Correo</th>
                <th>Teléfono</th>
                <th>Monto a Invertir</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${applications
                .map(
                  (app) => `
                <tr>
                  <td>${app.enterprise_name || "Sin Empresa"}</td>
                  <td>${app.full_name}</td>
                  <td>${app.email}</td>
                  <td>${app.phone || ""}</td>
                  <td>$${Number(app.capital_investment || 0).toLocaleString()}</td>
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
  };

  // Pagination logic
  const totalPages = Math.ceil(applications.length / itemsPerPage);
  const paginatedApplications = applications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Detalles del Proyecto
          </h1>
          <p className="text-sm text-muted-foreground">
            Información y lista de empresarios postulados
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video w-full bg-muted rounded-t-lg overflow-hidden">
                {getImageUrl(project.image) ? (
                  <img
                    src={getImageUrl(project.image)}
                    alt={project.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold line-clamp-2">
                    {project.title}
                  </h2>
                  <div className="flex gap-2 mt-2">
                    <Badge
                      variant={
                        project.status === "published" ? "default" : "secondary"
                      }
                    >
                      {project.status === "published"
                        ? "Publicado"
                        : "Borrador"}
                    </Badge>
                    <Badge variant="outline">{project.priority}</Badge>
                  </div>
                </div>

                <div className="space-y-4 text-sm mt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {project.municipality}, {project.department}
                    </span>
                  </div>

                  <div className="grid gap-2 p-3 bg-muted/30 rounded-md border">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" /> Meta
                      </span>
                      <span className="font-bold text-lg">
                        ${Number(project.amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />{" "}
                        Invertido
                      </span>
                      <span className="font-bold text-green-600">
                        ${Number(project.invested_amount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1">
                        Faltante
                      </span>
                      <span className="font-bold text-amber-600">
                        $
                        {Number(project.remaining_amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {project.description && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-2">Descripción</h3>
                    <div
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: project.description,
                      }}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Empresarios
                  Postulados
                </CardTitle>
                <CardDescription>
                  Total: {applications.length} postulaciones
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={reportUi.exportExcelButton}
                  onClick={exportToExcel}
                  disabled={applications.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={reportUi.exportPdfButton}
                  onClick={exportToPDF}
                  disabled={applications.length === 0}
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Aún no hay empresarios postulados a este proyecto.
                </div>
              ) : (
                <div className="space-y-4">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {paginatedApplications.map((app) => (
                        <Card key={app.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="font-semibold text-lg flex items-center justify-between">
                                  <span>
                                    {app.enterprise_name ||
                                      "Empresa Sin Nombre"}
                                  </span>
                                  {app.capital_investment && (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200 ml-2">
                                      + $
                                      {Number(
                                        app.capital_investment,
                                      ).toLocaleString()}
                                    </Badge>
                                  )}
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
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
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
    </div>
  );
}

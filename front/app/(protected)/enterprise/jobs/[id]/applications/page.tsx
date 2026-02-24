'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { getImageUrl } from '@/lib/utils';
import { reportUi } from '@/utils/report-ui';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

type JobData = {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  image?: string;
};

type JobDetailResponse = {
  job?: JobData;
};

type JobApplication = {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  cv?: string;
  cv_url?: string;
  cover_letter?: string;
  created_at: string;
};

type ApplicationsListResponse =
  | JobApplication[]
  | {
      count?: number;
      next?: string | null;
      previous?: string | null;
      results?: JobApplication[] | { applications?: JobApplication[] };
    };

const PAGE_SIZE = 10;
const EXPORT_PAGE_SIZE = 100;

const extractApplications = (payload: ApplicationsListResponse) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      count: payload.length,
      next: null,
      previous: null,
      paginated: false,
    };
  }

  const items = Array.isArray(payload?.results)
    ? payload.results
    : payload?.results?.applications || [];

  return {
    items,
    count: typeof payload?.count === 'number' ? payload.count : items.length,
    next: payload?.next ?? null,
    previous: payload?.previous ?? null,
    paginated: true,
  };
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function EnterpriseJobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<JobData | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchApplicationsPage = async (page: number, pageSize: number = PAGE_SIZE) => {
    const query = new URLSearchParams();
    query.set('job', String(jobId));
    query.set('p', String(page));
    query.set('page_size', String(pageSize));

    const response = await apiClient.get<ApplicationsListResponse>(
      `/enterprise/applications/?${query.toString()}`
    );
    return extractApplications(response);
  };

  const loadPage = async (page: number) => {
    if (!jobId) return;

    setLoading(true);
    setError('');
    try {
      const parsed = await fetchApplicationsPage(page);
      setApplications(parsed.items);
      setTotalApplications(parsed.count);
      setHasNextPage(Boolean(parsed.next));
      setHasPreviousPage(Boolean(parsed.previous));
      setCurrentPage(page);
    } catch (err: any) {
      const message = err?.message || 'No se pudieron cargar las postulaciones.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const jobResponse = await apiClient.get<JobDetailResponse>(`/job/${jobId}/`);
        setJob(jobResponse?.job || null);

        const parsed = await fetchApplicationsPage(1);
        setApplications(parsed.items);
        setTotalApplications(parsed.count);
        setHasNextPage(Boolean(parsed.next));
        setHasPreviousPage(Boolean(parsed.previous));
        setCurrentPage(1);
      } catch (err: any) {
        const message = err?.message || 'No se pudieron cargar las postulaciones.';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const getExportApplications = async () => {
    if (!jobId) return [] as JobApplication[];

    const collected: JobApplication[] = [];
    let page = 1;

    while (true) {
      const parsed = await fetchApplicationsPage(page, EXPORT_PAGE_SIZE);
      collected.push(...parsed.items);

      if (!parsed.paginated || !parsed.next || parsed.items.length === 0) {
        break;
      }

      page += 1;
    }

    return collected;
  };

  const exportToExcel = async () => {
    if (totalApplications === 0) {
      toast.error('No hay postulaciones para exportar');
      return;
    }

    setExporting(true);
    try {
      const exportItems = await getExportApplications();
      if (exportItems.length === 0) {
        toast.error('No hay postulaciones para exportar');
        return;
      }

      const headers = ['Nombre', 'Correo', 'Teléfono', 'Fecha', 'CV', 'Carta de presentación'];
      const rows = exportItems.map((app) => [
        app.full_name,
        app.email,
        app.phone || '-',
        new Date(app.created_at).toLocaleString('es-ES'),
        app.cv_url || (app.cv ? getImageUrl(app.cv) : '-'),
        app.cover_letter || '-',
      ]);

      const csv = [
        headers.map(csvCell).join(','),
        ...rows.map((row) => row.map(csvCell).join(',')),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `postulaciones-${job?.title || jobId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Reporte Excel generado');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar el reporte Excel');
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (totalApplications === 0) {
      toast.error('No hay postulaciones para exportar');
      return;
    }

    setExporting(true);
    try {
      const exportItems = await getExportApplications();
      if (exportItems.length === 0) {
        toast.error('No hay postulaciones para exportar');
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Permite ventanas emergentes para exportar PDF');
        return;
      }

      const rows = exportItems
        .map(
          (app) => `
            <tr>
              <td>${app.full_name}</td>
              <td>${app.email}</td>
              <td>${app.phone || '-'}</td>
              <td>${new Date(app.created_at).toLocaleString('es-ES')}</td>
              <td>${app.cv_url || app.cv ? 'Sí' : 'No'}</td>
            </tr>
          `
        )
        .join('');

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Reporte de postulaciones</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
              h1 { margin: 0 0 8px; }
              p { margin: 4px 0; color: #4b5563; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 12px; }
              th { background: #f3f4f6; }
              .meta { margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; }
              @media print { body { padding: 8px; } }
            </style>
          </head>
          <body>
            <h1>Reporte de postulaciones</h1>
            <p><strong>Vacante:</strong> ${job?.title || 'Vacante'}</p>
            <div class="meta">
              <p><strong>Total:</strong> ${exportItems.length}</p>
              <p><strong>Generado:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Teléfono</th>
                  <th>Fecha</th>
                  <th>CV</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <script>
              window.onload = function() { window.print(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('Reporte PDF listo para impresión');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar el reporte PDF');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalApplications / PAGE_SIZE));
  const startIndex = totalApplications === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIndex = totalApplications === 0 ? 0 : startIndex + applications.length - 1;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Postulaciones</h1>
            <p className="text-muted-foreground">Vista separada de candidatos por oferta.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className={reportUi.exportButton} onClick={exportToExcel} disabled={loading || exporting || totalApplications === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" className={reportUi.exportButton} onClick={exportToPDF} disabled={loading || exporting || totalApplications === 0}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" asChild>
              <Link href="/enterprise/jobs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a empleos
              </Link>
            </Button>
          </div>
        </div>

        {job ? (
          <Card>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant={job.status === 'published' ? 'default' : 'secondary'}>
                  {job.status === 'published' ? 'Activa' : 'Inactiva'}
                </Badge>
                <span>{totalApplications} postulaciones</span>
              </CardDescription>
            </CardHeader>
            {job.image ? (
              <CardContent>
                <div className="h-44 overflow-hidden rounded-lg border bg-muted">
                  <img src={getImageUrl(job.image)} alt={job.title} className="h-full w-full object-cover" />
                </div>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando postulaciones...</div>
          ) : error ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Esta oferta aún no tiene candidatos.
              </CardContent>
            </Card>
          ) : (
            <>
              {applications.map((application) => (
                <Card key={application.id}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 font-semibold">
                          <UserRound className="h-4 w-4" />
                          {application.full_name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {application.email}
                        </div>
                        {application.phone ? (
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {application.phone}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        {new Date(application.created_at).toLocaleString()}
                      </div>
                    </div>

                    {application.cover_letter ? (
                      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                        {application.cover_letter}
                      </div>
                    ) : null}

                    {application.cv_url || application.cv ? (
                      <a
                        href={application.cv_url || getImageUrl(application.cv)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Ver hoja de vida
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">No adjuntó hoja de vida.</span>
                    )}
                  </CardContent>
                </Card>
              ))}

              {totalApplications > PAGE_SIZE && (
                <Card>
                  <CardContent className="pt-6">
                    <div className={reportUi.paginationRow}>
                      <p className={reportUi.paginationMeta}>
                        Mostrando {startIndex}-{endIndex} de {totalApplications} postulaciones
                      </p>
                      <div className={reportUi.paginationButtons}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPage(currentPage - 1)}
                          disabled={loading || !hasPreviousPage || currentPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadPage(currentPage + 1)}
                          disabled={loading || !hasNextPage || currentPage >= totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

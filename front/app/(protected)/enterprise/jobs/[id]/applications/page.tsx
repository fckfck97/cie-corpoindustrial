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
import { ArrowLeft, Mail, Phone, FileText, CalendarDays, UserRound } from 'lucide-react';
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

export default function EnterpriseJobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [job, setJob] = useState<JobData | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [jobResponse, applicationsResponse] = await Promise.all([
          apiClient.get<JobDetailResponse>(`/job/${jobId}/`),
          apiClient.get<JobApplication[] | { results?: { applications?: JobApplication[] } }>(
            `/enterprise/applications/?job=${jobId}`
          ),
        ]);
        setJob(jobResponse?.job || null);
        const parsedApplications = Array.isArray(applicationsResponse)
          ? applicationsResponse
          : applicationsResponse?.results?.applications || [];
        setApplications(parsedApplications);
      } catch (err: any) {
        setError(err?.message || 'No se pudieron cargar las postulaciones.');
        toast.error(err?.message || 'No se pudieron cargar las postulaciones.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Postulaciones</h1>
            <p className="text-muted-foreground">Vista separada de candidatos por oferta.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/enterprise/jobs">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a empleos
            </Link>
          </Button>
        </div>

        {job ? (
          <Card>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant={job.status === 'published' ? 'default' : 'secondary'}>
                  {job.status === 'published' ? 'Activa' : 'Inactiva'}
                </Badge>
                <span>{applications.length} postulaciones</span>
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
            applications.map((application) => (
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
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

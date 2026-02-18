"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import {
  getJobPriorityLabel,
  getJobStatusLabel,
} from "@/lib/model-choice-labels";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
} from "lucide-react";

type JobDetailResponse = {
  job?: {
    id: string;
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    image?: string;
    created?: string;
    start_date?: string;
    end_date?: string;
    user?: {
      enterprise?: string;
    };
    already_applied?: boolean;
    applications_count?: number;
  };
};

type EmployeeApplication = {
  id: string;
  job: string;
  job_title: string;
  enterprise_name?: string;
  full_name: string;
  email: string;
  phone?: string;
  cv?: string;
  cv_url?: string;
  cover_letter?: string;
  created_at: string;
};

export default function EmployeeJobDetailPage() {
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobDetailResponse["job"] | null>(null);
  const [myApplications, setMyApplications] = useState<EmployeeApplication[]>([]);
  
  // Application Form State
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    fullname: '',
    email: '',
    phone: '',
    cv: null as File | null,
    coverLetter: '',
  });

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get<JobDetailResponse>(
          `/job/${jobId}/`,
        );
        setJob(response?.job || null);
        const applications = await apiClient.get<EmployeeApplication[]>(
          `/employee/applications/?job=${jobId}`,
        );
        setMyApplications(applications || []);
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el detalle del empleo.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (job?.already_applied) {
      toast.error("Ya te postulaste a esta vacante.");
      return;
    }
    if (!applicationForm.cv) {
        toast.error("Debes adjuntar tu Hoja de Vida (PDF).");
        return;
    }

    setApplying(true);
    try {
        // Backend Integration
        const formData = new FormData();
        // Ensure jobId is a string
        if (jobId) formData.append('job', jobId as string);
        formData.append('full_name', applicationForm.fullname);
        formData.append('email', applicationForm.email);
        if (applicationForm.phone) formData.append('phone', applicationForm.phone);
        if (applicationForm.coverLetter) formData.append('cover_letter', applicationForm.coverLetter);
        formData.append('cv', applicationForm.cv);

        await apiClient.post('/applications/create/', formData);
        toast.success("¡Tu postulación ha sido enviada con éxito!");
        setJob((prev) => (prev ? { ...prev, already_applied: true } : prev));
        const applications = await apiClient.get<EmployeeApplication[]>(
          `/employee/applications/?job=${jobId}`,
        );
        setMyApplications(applications || []);
        setApplyOpen(false);
        setApplicationForm({
            fullname: '',
            email: '',
            phone: '',
            cv: null,
            coverLetter: '',
        });
    } catch (error: any) {
        const msg = error?.response?.data?.error || error?.message || "Error al enviar postulación.";
        toast.error(msg);
    } finally {
        setApplying(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">
          Cargando detalle de la vacante...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-destructive font-medium">{error}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Intentar de nuevo
        </Button>
      </div>
    );

  if (!job)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-muted-foreground">
          Esta vacante no existe o ha sido eliminada.
        </div>
        <Button asChild variant="outline">
          <Link href="/employees/jobs">Volver al listado</Link>
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
        <Button asChild variant="ghost" size="sm" className="pl-0 gap-2">
          <Link href="/employees/jobs">
            <ArrowLeft className="h-4 w-4" />
            Volver a empleos
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {job.user?.enterprise || "Empresa Confidencial"}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {job.created
                      ? new Date(job.created).toLocaleDateString()
                      : "Reciente"}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {job.title}
                </h1>
              </div>

              {getImageUrl(job.image) && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted mt-2">
                  <img
                    src={getImageUrl(job.image)}
                    alt={job.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description Card */}
          <div className="rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Descripción del puesto
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
              {job.description ? (
                <div dangerouslySetInnerHTML={{ __html: job.description }} />
              ) : (
                <p className="italic">
                  No hay descripción detallada disponible para esta vacante.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 sticky top-6">
            <h3 className="font-semibold text-lg">Resumen</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${job.status === "published" ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  <span className="font-medium capitalize">
                    {getJobStatusLabel(job.status || "published")}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Prioridad
                </span>
                <div>
                  <Badge
                    variant={
                      job.priority === "high" ? "destructive" : "secondary"
                    }
                  >
                    {getJobPriorityLabel(job.priority)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tu solicitud
                </span>
                {myApplications.length > 0 ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium text-foreground">Postulación enviada</div>
                    <div className="text-muted-foreground">
                      {new Date(myApplications[0].created_at).toLocaleString()}
                    </div>
                    {myApplications[0].cv_url || myApplications[0].cv ? (
                      <a
                        href={myApplications[0].cv_url || getImageUrl(myApplications[0].cv)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-primary underline"
                      >
                        Ver mi hoja de vida enviada
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Aún no has aplicado</span>
                  </div>
                )}
              </div>

              {typeof job.applications_count === 'number' && job.applications_count > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Postulaciones
                  </span>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center gap-2">
                    <span className="text-2xl">👥</span>
                    <div>
                      <div className="font-semibold text-foreground">{job.applications_count}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.applications_count === 1 ? 'persona aplicó' : 'personas aplicaron'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                    <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          size="lg"
                          variant={job.already_applied ? "secondary" : "default"}
                          disabled={!!job.already_applied}
                        >
                            {job.already_applied ? "Postulación enviada" : "Aplicar ahora"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Postularse a {job.title}</DialogTitle>
                            <DialogDescription>
                                Completa el formulario para enviar tu solicitud a la empresa.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleApply} className="space-y-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="fullname">Nombre completo</Label>
                                <Input 
                                    id="fullname" 
                                    required 
                                    placeholder="Tu nombre" 
                                    value={applicationForm.fullname}
                                    onChange={(e) => setApplicationForm(prev => ({...prev, fullname: e.target.value}))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        required 
                                        placeholder="correo@ejemplo.com" 
                                        value={applicationForm.email}
                                        onChange={(e) => setApplicationForm(prev => ({...prev, email: e.target.value}))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Teléfono</Label>
                                    <Input 
                                        id="phone" 
                                        type="tel" 
                                        placeholder="+57 300..." 
                                        value={applicationForm.phone}
                                        onChange={(e) => setApplicationForm(prev => ({...prev, phone: e.target.value}))}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="cv">Hoja de vida (PDF)</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        id="cv" 
                                        type="file" 
                                        accept=".pdf,.doc,.docx" 
                                        className="cursor-pointer"
                                        onChange={(e) => setApplicationForm(prev => ({...prev, cv: e.target.files?.[0] || null}))}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="coverLetter">Carta de presentación (Opcional)</Label>
                                <Textarea 
                                    id="coverLetter" 
                                    placeholder="Cuéntanos por qué eres el candidato ideal..." 
                                    rows={4}
                                    value={applicationForm.coverLetter}
                                    onChange={(e) => setApplicationForm(prev => ({...prev, coverLetter: e.target.value}))}
                                />
                            </div>
                            <DialogFooter className="pt-4">
                                <Button type="submit" disabled={applying} className="w-full sm:w-auto">
                                    {applying ? (
                                        "Enviando..." 
                                    ) : (
                                        <>
                                            Enviar Postulación <Send className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Al aplicar, aceptas compartir tu perfil con la empresa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

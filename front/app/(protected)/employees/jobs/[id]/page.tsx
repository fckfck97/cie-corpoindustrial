"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getJobPriorityLabel, getJobStatusLabel } from "@/lib/model-choice-labels";
import { getImageUrl } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  Send,
  FileText,
  Mail,
  Phone,
  User,
  CalendarDays,
  Sparkles,
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

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const normalizePhone = (s: string) => {
  const digits = onlyDigits(s);
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits.slice(0, 10);
};
const isValidPhone = (s: string) => /^3\d{9}$/.test(s);

function formatDateShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(d);
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function clampHtmlToPlainText(html?: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function EmployeeJobDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const jobId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState<JobDetailResponse["job"] | null>(null);
  const [myApplications, setMyApplications] = useState<EmployeeApplication[]>([]);

  // Application Form State
  const [applyOpen, setApplyOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyForOtherPerson, setApplyForOtherPerson] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    cv: null as File | null,
    coverLetter: "",
  });

  const getMyDefaultApplicationData = () => ({
    fullname:
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
      user?.name ||
      "",
    email: user?.email || "",
    phone: normalizePhone(user?.phone || ""),
    cv: null as File | null,
    coverLetter: "",
  });

  useEffect(() => {
    if (!jobId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get<JobDetailResponse>(`/job/${jobId}/`);
        setJob(response?.job || null);

        const applications = await apiClient.get<EmployeeApplication[]>(`/employee/applications/?job=${jobId}`);
        setMyApplications(applications || []);
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el detalle del empleo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [jobId]);

  const meta = useMemo(() => {
    const company = job?.user?.enterprise || "Empresa Confidencial";
    const created = job?.created ? formatDateShort(job.created) : "Reciente";

    const hasRange = Boolean(job?.start_date || job?.end_date);
    const rangeText = job?.start_date && job?.end_date
      ? `Del ${formatDateShort(job.start_date)} al ${formatDateShort(job.end_date)}`
      : job?.start_date
        ? `Desde ${formatDateShort(job.start_date)}`
        : job?.end_date
          ? `Hasta ${formatDateShort(job.end_date)}`
          : "";

    return { company, created, hasRange, rangeText };
  }, [job?.created, job?.end_date, job?.start_date, job?.user?.enterprise]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (job?.already_applied) {
      toast.error("Ya te postulaste a esta vacante.");
      return;
    }

    // Validación mínima
    const fullName = applicationForm.fullname.trim();
    const email = applicationForm.email.trim().toLowerCase();
    const phoneNormalized = normalizePhone(applicationForm.phone.trim());

    if (!fullName) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }
    if (!email) {
      toast.error("El correo es obligatorio.");
      return;
    }
    if (applicationForm.phone && phoneNormalized && !isValidPhone(phoneNormalized)) {
      toast.error("El teléfono debe tener 10 dígitos e iniciar por 3.");
      return;
    }
    if (!applicationForm.cv) {
      toast.error("Debes adjuntar tu Hoja de Vida (PDF).");
      return;
    }
    const isPdf =
      applicationForm.cv.type === "application/pdf" || applicationForm.cv.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("La Hoja de Vida debe ser PDF.");
      return;
    }

    setApplying(true);
    try {
      const formData = new FormData();
      if (jobId) formData.append("job", String(jobId));
      formData.append("full_name", fullName);
      formData.append("email", email);
      if (phoneNormalized) formData.append("phone", phoneNormalized);
      if (applicationForm.coverLetter.trim()) formData.append("cover_letter", applicationForm.coverLetter.trim());
      formData.append("cv", applicationForm.cv);

      await apiClient.post("/applications/create/", formData);

      toast.success("¡Tu postulación ha sido enviada con éxito!");
      setJob((prev) => (prev ? { ...prev, already_applied: true } : prev));

      const applications = await apiClient.get<EmployeeApplication[]>(`/employee/applications/?job=${jobId}`);
      setMyApplications(applications || []);

      setApplyOpen(false);
      setApplicationForm({ fullname: "", email: "", phone: "", cv: null, coverLetter: "" });
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || "Error al enviar postulación.";
      toast.error(msg);
    } finally {
      setApplying(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="animate-pulse text-muted-foreground">Cargando detalle de la vacante...</div>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-4">
        <div className="text-destructive font-medium">{error}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Intentar de nuevo
        </Button>
      </div>
    );

  if (!job)
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] gap-4">
        <div className="text-muted-foreground">Esta vacante no existe o ha sido eliminada.</div>
        <Button asChild variant="outline">
          <Link href="/employees/jobs">Volver al listado</Link>
        </Button>
      </div>
    );

  const canShowImage = Boolean(getImageUrl(job.image));

  const myLastApp = myApplications?.[0];

  return (
    <div className="w-full max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-fit">
        <Button asChild variant="ghost" size="sm" className="pl-0 gap-2">
          <Link href="/employees/jobs">
            <ArrowLeft className="h-4 w-4" />
            Volver a empleos
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {meta.company}
                  </Badge>

                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {meta.created}
                  </Badge>

                  {meta.hasRange && meta.rangeText ? (
                    <Badge variant="outline" className="gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {meta.rangeText}
                    </Badge>
                  ) : null}
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>

                {/* micro info */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge
                    variant={job.priority === "high" ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {getJobPriorityLabel(job.priority)}
                  </Badge>

                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {getJobStatusLabel(job.status || "published")}
                  </Badge>

                  {typeof job.applications_count === "number" ? (
                    <Badge variant="outline" className="gap-1">
                      👥 {job.applications_count}
                    </Badge>
                  ) : null}
                </div>
              </div>

              {canShowImage ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(job.image)}
                    alt={job.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Descripción del puesto
            </h2>

            <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert">
              {job.description ? (
                <div dangerouslySetInnerHTML={{ __html: job.description }} />
              ) : (
                <p className="italic">No hay descripción detallada disponible para esta vacante.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Tu postulación</h3>
              {job.already_applied ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Enviada
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  Pendiente
                </Badge>
              )}
            </div>

            {/* Estado de postulación */}
            {myApplications.length > 0 && myLastApp ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Postulación enviada</div>
                    <div className="text-muted-foreground">{formatDateTime(myLastApp.created_at)}</div>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>

                {myLastApp.cv_url || myLastApp.cv ? (
                  <a
                    href={myLastApp.cv_url || getImageUrl(myLastApp.cv)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary underline underline-offset-4"
                  >
                    <FileText className="h-4 w-4" />
                    Ver mi hoja de vida enviada
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                Aún no has aplicado a esta vacante.
              </div>
            )}

            {/* CTA */}
            <div className="pt-1">
              <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={job.already_applied ? "secondary" : "default"}
                    disabled={!!job.already_applied}
                    onClick={() => {
                      setApplyForOtherPerson(false);
                      setApplicationForm(getMyDefaultApplicationData());
                    }}
                  >
                    {job.already_applied ? "Postulación enviada" : "Aplicar ahora"}
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle className="leading-tight">Postularse a: {job.title}</DialogTitle>
                    <DialogDescription>
                      Completa tus datos y adjunta tu hoja de vida en PDF. La empresa recibirá tu postulación.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleApply} className="space-y-5 py-2">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyForOtherPerson}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setApplyForOtherPerson(checked);
                            if (checked) {
                              setApplicationForm({
                                fullname: "",
                                email: "",
                                phone: "",
                                cv: null,
                                coverLetter: "",
                              });
                            } else {
                              setApplicationForm(getMyDefaultApplicationData());
                            }
                          }}
                        />
                        Aplicar para otra persona
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {applyForOtherPerson
                          ? "Completa manualmente los datos de la persona postulada."
                          : "Se cargaron automáticamente tus datos para postularte."}
                      </p>
                    </div>

                    {/* Nombre */}
                    <div className="grid gap-2">
                      <Label htmlFor="fullname" className="text-foreground/80">
                        Nombre completo <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullname"
                          required
                          placeholder="Ej: Juan Carlos Pérez"
                          value={applicationForm.fullname}
                          onChange={(e) => setApplicationForm((prev) => ({ ...prev, fullname: e.target.value }))}
                          className="pl-9"
                          disabled={!applyForOtherPerson}
                        />
                      </div>
                    </div>

                    {/* Email + Phone */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="email" className="text-foreground/80">
                          Correo <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            required
                            placeholder="correo@ejemplo.com"
                            value={applicationForm.email}
                            onChange={(e) => setApplicationForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="pl-9"
                            disabled={!applyForOtherPerson}
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone" className="text-foreground/80">
                          Teléfono <span className="text-xs text-muted-foreground">(10 dígitos, inicia en 3)</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            placeholder="3001234567"
                            value={applicationForm.phone}
                            onChange={(e) => {
                              const digits = onlyDigits(e.target.value).slice(0, 10);
                              setApplicationForm((prev) => ({ ...prev, phone: digits }));
                            }}
                            className="pl-9"
                            inputMode="numeric"
                            maxLength={10}
                            disabled={!applyForOtherPerson}
                          />
                        </div>

                      </div>
                    </div>

                    {/* CV */}
                    <div className="grid gap-2">
                      <Label htmlFor="cv" className="text-foreground/80">
                        Hoja de vida (PDF) <span className="text-red-500">*</span>
                      </Label>

                      <div className="rounded-lg border bg-muted/20 p-3">
                        <Input
                          id="cv"
                          type="file"
                          accept="application/pdf,.pdf"
                          className="cursor-pointer"
                          onChange={(e) => setApplicationForm((prev) => ({ ...prev, cv: e.target.files?.[0] || null }))}
                        />

                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="truncate">
                            {applicationForm.cv ? applicationForm.cv.name : "Selecciona un archivo PDF"}
                          </span>
                          <span className="shrink-0">Máx. recomendado: 2–5MB</span>
                        </div>
                      </div>
                    </div>

                    {/* Carta */}
                    <div className="grid gap-2">
                      <Label htmlFor="coverLetter" className="text-foreground/80">
                        Carta de presentación <span className="text-muted-foreground text-[10px] ml-1">(Opcional)</span>
                      </Label>
                      <Textarea
                        id="coverLetter"
                        placeholder="Cuéntanos por qué eres un buen candidato, experiencia, disponibilidad, etc."
                        rows={4}
                        value={applicationForm.coverLetter}
                        onChange={(e) => setApplicationForm((prev) => ({ ...prev, coverLetter: e.target.value }))}
                        className="resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Sugerencia: 3–6 líneas. Evita repetir lo del CV.
                      </p>
                    </div>

                    <DialogFooter className="pt-2">
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

              <p className="text-xs text-center text-muted-foreground mt-3">
                Al aplicar, aceptas compartir tu información con la empresa.
              </p>
            </div>
          </div>

          {/* Extra: mini resumen (opcional visual) */}
          <div className="rounded-xl border bg-card/50 p-5 shadow-sm">
            <h4 className="font-semibold mb-3">Resumen de la vacante</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="truncate">{meta.company}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Publicada: {meta.created}</span>
              </div>
              {meta.hasRange && meta.rangeText ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{meta.rangeText}</span>
                </div>
              ) : null}
              <div className="pt-2 border-t text-xs">
                {clampHtmlToPlainText(job.description).slice(0, 140) || "Sin descripción."}
                {clampHtmlToPlainText(job.description).length > 140 ? "…" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

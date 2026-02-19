'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/RichTextEditor';
import { getImageUrl } from '@/lib/utils';

type Job = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  priority?: string;
  status?: string;
  created?: string;
  start_date?: string;
  end_date?: string;
};

type JobDetailResponse = {
  job?: Job;
};

const stripHtml = (html: string) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isValidDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// Convierte YYYY-MM-DD a ISO en UTC (00:00:00Z)
const dateToUtcIso = (yyyy_mm_dd: string) => {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0)).toISOString();
};

// Convierte ISO string a formato YYYY-MM-DD
const isoToDateStr = (iso?: string) => {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    status: 'published',
    image: null as File | null,
    start_date: '',
    end_date: '',
  });

  const loadJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<JobDetailResponse>(`/job/${jobId}/`);
      const job = data?.job;
      
      if (job) {
        setForm({
          title: job.title || '',
          description: job.description || '',
          priority: job.priority || 'Media',
          status: job.status || 'published',
          image: null,
          start_date: isoToDateStr(job.start_date),
          end_date: isoToDateStr(job.end_date),
        });
        setCurrentImage(job.image);
      }
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar el empleo.');
      router.push('/enterprise/jobs');
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const plainDescription = useMemo(() => stripHtml(form.description), [form.description]);

  const dateError = useMemo(() => {
    if (!form.start_date || !form.end_date) return '';
    if (!isValidDateStr(form.start_date) || !isValidDateStr(form.end_date)) return 'Formato de fecha inválido.';
    if (form.end_date < form.start_date) return 'La fecha de cierre no puede ser anterior a la fecha de inicio.';
    return '';
  }, [form.start_date, form.end_date]);

  const canSubmit = useMemo(() => {
    return (
      !!form.title.trim() &&
      !!plainDescription &&
      !!form.start_date &&
      !!form.end_date &&
      !dateError
    );
  }, [form.title, plainDescription, form.start_date, form.end_date, dateError]);

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !jobId) return;

    const title = form.title.trim();
    if (!title) return toast.error('El título es obligatorio.');
    if (!plainDescription) return toast.error('La descripción es obligatoria.');
    if (!form.start_date) return toast.error('La fecha de inicio es obligatoria.');
    if (!form.end_date) return toast.error('La fecha de cierre es obligatoria.');
    if (dateError) return toast.error(dateError);

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('id', jobId);
      body.append('title', title);
      body.append('description', form.description);
      body.append('priority', form.priority);
      body.append('status', form.status);

      if (form.image) {
        body.append('image', form.image);
      }

      body.append('start_date', dateToUtcIso(form.start_date));
      body.append('end_date', dateToUtcIso(form.end_date));

      await apiClient.put(`/job/edit/${jobId}/`, body);
      toast.success('Empleo actualizado correctamente.');
      router.push('/enterprise/jobs');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar el empleo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando empleo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/enterprise/jobs')}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Editar Empleo</h1>
            <p className="text-sm text-muted-foreground">Actualiza la información de la vacante.</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Detalles de la Oferta</CardTitle>
            <CardDescription>Esta información será visible para todos los empleados.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <form onSubmit={onUpdate} className="space-y-6">
              {/* Sección: Básico */}
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-muted-foreground">Información básica</h2>
                  <span className="text-xs text-muted-foreground">
                    Campos obligatorios <span className="text-red-500">*</span>
                  </span>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">
                    Título del Puesto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ej: Desarrollador Full Stack Senior"
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">
                      Nivel de Prioridad <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="priority"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.priority}
                      onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="status">
                      Estado <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="status"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      <option value="published">Activo</option>
                      <option value="draft">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="image">Imagen de Portada</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                  />
                  {currentImage && (
                    <div className="mt-2">
                      <p className="mb-2 text-xs text-muted-foreground">Imagen actual:</p>
                      <div className="relative h-32 w-full overflow-hidden rounded-md border bg-muted">
                        <img
                          src={getImageUrl(currentImage)}
                          alt="Portada actual"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {form.image ? 'Se subirá una nueva imagen.' : 'Deja vacío para mantener la imagen actual.'}
                  </p>
                </div>
              </div>

              {/* Sección: Fechas */}
              <div className="grid gap-4">
                <h2 className="text-sm font-semibold text-muted-foreground">Vigencia</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="start_date">
                      Fecha de Inicio <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="end_date">
                      Fecha de Cierre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                      required
                      min={form.start_date || undefined}
                    />
                  </div>
                </div>

                {dateError ? (
                  <p className="text-xs text-red-500">{dateError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {form.start_date && form.end_date
                      ? `Del ${form.start_date} al ${form.end_date}.`
                      : 'Selecciona el rango de días en los que la oferta estará activa.'}
                  </p>
                )}
              </div>

              {/* Sección: Descripción */}
              <div className="grid gap-2">
                <Label htmlFor="description">
                  Descripción Detallada <span className="text-red-500">*</span>
                </Label>

                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                  placeholder="Describe funciones, requisitos y beneficios. Usa cursivas, negrita y listas desde la barra."
                />

                {!plainDescription && (
                  <p className="text-xs text-red-500">La descripción no puede estar vacía.</p>
                )}

                <p className="text-[10px] text-muted-foreground">
                  El contenido se guarda con formato y se mostrará al empleado tal cual lo edites.
                </p>
              </div>

              {/* Acciones */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/enterprise/jobs')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>

                <Button type="submit" disabled={submitting || !canSubmit} className="min-w-[170px]">
                  {submitting ? (
                    'Actualizando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

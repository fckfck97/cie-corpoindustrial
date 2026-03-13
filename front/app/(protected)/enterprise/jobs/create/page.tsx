'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/RichTextEditor';

const stripHtml = (html: string) =>
  String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isValidDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// Convierte YYYY-MM-DD a ISO en UTC (00:00:00Z) evitando desfase por timezone
const dateToUtcIso = (yyyy_mm_dd: string) => {
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0)).toISOString();
};

export default function CreateJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    image: null as File | null,
    start_date: '', // YYYY-MM-DD
    end_date: '',   // YYYY-MM-DD
  });

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
      !!form.image &&
      !!form.start_date &&
      !!form.end_date &&
      !dateError
    );
  }, [form.title, plainDescription, form.image, form.start_date, form.end_date, dateError]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const title = form.title.trim();
    if (!title) return toast.error('El título es obligatorio.');
    if (!plainDescription) return toast.error('La descripción es obligatoria.');
    if (!form.image) return toast.error('La imagen es obligatoria.');
    if (!form.start_date) return toast.error('La fecha de inicio es obligatoria.');
    if (!form.end_date) return toast.error('La fecha de cierre es obligatoria.');
    if (dateError) return toast.error(dateError);

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('title', title);
      body.append('description', form.description);
      body.append('priority', form.priority);
      body.append('image', form.image);
      body.append('status', 'published');

      // Guardar como ISO en UTC al inicio del día (00:00:00Z)
      body.append('start_date', dateToUtcIso(form.start_date));
      body.append('end_date', dateToUtcIso(form.end_date));

      await apiClient.post('/job/create/', body);
      toast.success('Empleo creado correctamente.');
      router.push('/enterprise/jobs');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear empleo.');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-2xl font-bold tracking-tight">Crear oferta en Bolsa de Empleo</h1>
            <p className="text-sm text-muted-foreground">Completa la información para publicar una vacante.</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Detalles de la Oferta</CardTitle>
            <CardDescription>Esta información será visible para todos los empleados.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <form onSubmit={onCreate} className="space-y-6">
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
                    <Label htmlFor="image">
                      Imagen de Portada <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Formatos: JPG, PNG, WEBP. Recomendado: 1200×600px.
                    </p>
                  </div>
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
                    'Publicando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Publicar Oferta
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

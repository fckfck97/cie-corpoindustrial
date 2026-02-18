'use client';

import { useState } from 'react';
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

export default function CreateJobPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    image: null as File | null,
    start_date: '',
    end_date: '',
  });

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const plainDescription = form.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (!plainDescription) {
      toast.error('La descripción es obligatoria');
      return;
    }
    if (!form.image) {
      toast.error('La imagen es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('title', form.title);
      body.append('description', form.description);
      body.append('priority', form.priority);
      body.append('image', form.image);
      body.append('status', 'published');
      if (form.start_date) body.append('start_date', new Date(form.start_date).toISOString());
      if (form.end_date) body.append('end_date', new Date(form.end_date).toISOString());

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
        
        <div className="flex items-center gap-4">
             <Button variant="outline" size="icon" onClick={() => router.push('/enterprise/jobs')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Crear Nuevo Empleo</h1>
                <p className="text-sm text-muted-foreground">Completa la información para publicar una vacante.</p>
            </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Oferta</CardTitle>
            <CardDescription>Esta información será visible para todos los empleados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={onCreate} className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título del Puesto <span className="text-red-500">*</span></Label>
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
                        <Label htmlFor="priority">Nivel de Prioridad <span className="text-red-500">*</span></Label>
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
                        <Label htmlFor="image">Imagen de Portada <span className="text-red-500">*</span></Label>
                        <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                            required
                        />
                        <p className="text-[10px] text-muted-foreground">Formatos: JPG, PNG, WEBP. Rec.: 1200x600px.</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                     <div className="grid gap-2">
                        <Label htmlFor="start_date">Fecha de Inicio (Opcional)</Label>
                        <Input
                            id="start_date"
                            type="datetime-local"
                            value={form.start_date}
                            onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                        />
                    </div>
                     <div className="grid gap-2">
                         <Label htmlFor="end_date">Fecha de Cierre (Opcional)</Label>
                        <Input
                            id="end_date"
                            type="datetime-local"
                            value={form.end_date}
                            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                        />
                    </div>
                </div>
               
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción Detallada <span className="text-red-500">*</span></Label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                    placeholder="Describe funciones, requisitos y beneficios. Usa cursivas, negrita y listas desde la barra."
                  />
                  <p className="text-[10px] text-muted-foreground">
                    El contenido se guarda con formato y se muestra al empleado exactamente como lo edites.
                  </p>
                </div>

                <div className="flex justify-end pt-4 gap-2">
                    <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/enterprise/jobs')}
                    disabled={submitting}
                    >
                    Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting} className="min-w-[150px]">
                        {submitting ? 'Publicando...' : (
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

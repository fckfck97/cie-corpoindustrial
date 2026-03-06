'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const MAX_IMAGE_MB = 2;

export default function CreateProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!form.image) {
      setImagePreview(undefined);
      return;
    }
    const localUrl = URL.createObjectURL(form.image);
    setImagePreview(localUrl);
    return () => URL.revokeObjectURL(localUrl);
  }, [form.image]);

  const imageError = useMemo(() => {
    if (!form.image) return 'La imagen es obligatoria.';
    const sizeMb = form.image.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_MB) return `La imagen supera ${MAX_IMAGE_MB}MB.`;
    return '';
  }, [form.image]);

  const canSubmit = useMemo(() => {
    return (
      !!form.name.trim() &&
      !!form.description.trim() &&
      !!form.image &&
      !imageError
    );
  }, [form.name, form.description, form.image, imageError]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) return toast.error('El nombre es obligatorio.');
    if (!description) return toast.error('La descripción es obligatoria.');
    if (!form.image) return toast.error('La imagen es obligatoria.');
    if (imageError) return toast.error(imageError);

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('name', name);
      body.append('description', description);
      body.append('image', form.image);

      await apiClient.post('/product/create/', body);
      toast.success('Producto creado correctamente.');
      router.push('/enterprise/products');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear producto.');
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
            onClick={() => router.push('/enterprise/products')}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Crear Producto</h1>
            <p className="text-sm text-muted-foreground">Registra un nuevo producto para tu empresa.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Form */}
          <Card className="lg:col-span-7 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Datos del Producto</CardTitle>
              <CardDescription>Completa la información y adjunta una imagen de portada.</CardDescription>
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
                    <Label htmlFor="name">
                      Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Laptop Dell XPS 15"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">
                      Descripción <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe características, materiales, uso, garantía, etc."
                      rows={6}
                      required
                    />
                    {!form.description.trim() && (
                      <p className="text-xs text-red-500">La descripción no puede estar vacía.</p>
                    )}
                  </div>
                </div>

                {/* Sección: Imagen */}
                <div className="grid gap-4">
                  <h2 className="text-sm font-semibold text-muted-foreground">Multimedia</h2>

                  <div className="grid gap-2">
                    <Label htmlFor="image">
                      Imagen de portada <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Formatos: JPG, PNG, WEBP. Recomendado: 1200×1200 (o 1200×600). Máx: {MAX_IMAGE_MB}MB.
                    </p>
                    {imageError && <p className="text-xs text-red-500">{imageError}</p>}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/enterprise/products')}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={submitting || !canSubmit} className="min-w-[180px]">
                    {submitting ? (
                      'Guardando...'
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Guardar Producto
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="lg:col-span-5 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>Así se verá el producto antes de guardar.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={form.name || 'Vista previa producto'}
                  className="h-56 w-full rounded-md border object-cover"
                />
              ) : (
                <div className="h-56 w-full rounded-md border bg-muted" />
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium text-right">{form.name.trim() || '—'}</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-muted-foreground mb-1">Descripción</div>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {form.description.trim() || '—'}
                  </p>
                </div>
              </div>

              {!canSubmit && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Completa <span className="font-medium">Nombre</span>, <span className="font-medium">Descripción</span>{' '}
                  y selecciona una <span className="font-medium">Imagen</span> para habilitar “Guardar”.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

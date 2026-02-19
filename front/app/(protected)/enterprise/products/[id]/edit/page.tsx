'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';

type Product = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  category?: string;
  subcategory?: string;
  extracategory?: string;
};

type ProductDetailResponse = {
  product?: Product;
};

const MAX_IMAGE_MB = 2;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    extracategory: '',
    image: null as File | null,
  });

  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<ProductDetailResponse>(`/product/${productId}/`);
      const product = data?.product;

      if (product) {
        setForm({
          name: product.name || '',
          description: product.description || '',
          category: product.category || '',
          subcategory: product.subcategory || '',
          extracategory: product.extracategory || '',
          image: null,
        });
        setCurrentImage(product.image);
      }
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar el producto.');
      router.push('/enterprise/products');
    } finally {
      setLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

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
    if (!form.image) return '';
    const sizeMb = form.image.size / (1024 * 1024);
    if (sizeMb > MAX_IMAGE_MB) return `La imagen supera ${MAX_IMAGE_MB}MB.`;
    return '';
  }, [form.image]);

  const canSubmit = useMemo(() => {
    return !!form.name.trim() && !!form.description.trim() && !imageError;
  }, [form.name, form.description, imageError]);

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !productId) return;

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) return toast.error('El nombre es obligatorio.');
    if (!description) return toast.error('La descripción es obligatoria.');
    if (imageError) return toast.error(imageError);

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('id', productId);
      body.append('name', name);
      body.append('description', description);
      body.append('category', form.category.trim());
      body.append('subcategory', form.subcategory.trim());
      body.append('extracategory', form.extracategory.trim());
      if (form.image) {
        body.append('image', form.image);
      }

      await apiClient.put(`/product/edit/${productId}/`, body);
      toast.success('Producto actualizado correctamente.');
      router.push('/enterprise/products');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar el producto.');
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
            <p className="mt-4 text-sm text-muted-foreground">Cargando producto...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const displayImage = imagePreview || (currentImage ? getImageUrl(currentImage) : undefined);

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
            <h1 className="text-2xl font-bold tracking-tight">Editar Producto</h1>
            <p className="text-sm text-muted-foreground">Actualiza la información del beneficio.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Form */}
          <Card className="lg:col-span-7 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Datos del Producto</CardTitle>
              <CardDescription>Actualiza la información y adjunta una nueva imagen si lo deseas.</CardDescription>
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

                {/* Sección: Clasificación */}
                <div className="grid gap-4">
                  <h2 className="text-sm font-semibold text-muted-foreground">Clasificación</h2>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Input
                        id="category"
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                        placeholder="Ej: Electrónica"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="subcategory">Subcategoría</Label>
                      <Input
                        id="subcategory"
                        value={form.subcategory}
                        onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                        placeholder="Ej: Computadoras"
                      />
                    </div>

                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="extracategory">Extra categoría</Label>
                      <Input
                        id="extracategory"
                        value={form.extracategory}
                        onChange={(e) => setForm((p) => ({ ...p, extracategory: e.target.value }))}
                        placeholder="Ej: Portátiles"
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Imagen */}
                <div className="grid gap-4">
                  <h2 className="text-sm font-semibold text-muted-foreground">Multimedia</h2>

                  <div className="grid gap-2">
                    <Label htmlFor="image">Imagen de portada</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {form.image
                        ? 'Se subirá una nueva imagen.'
                        : 'Deja vacío para mantener la imagen actual.'}
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

          {/* Preview */}
          <Card className="lg:col-span-5 overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>Así se verá el producto con los cambios actuales.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={form.name || 'Vista previa producto'}
                  className="h-56 w-full rounded-md border object-cover"
                />
              ) : (
                <div className="h-56 w-full rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  Sin imagen
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Nombre</span>
                  <span className="font-medium text-right">{form.name.trim() || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Categoría</span>
                  <span className="font-medium text-right">{form.category.trim() || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Subcategoría</span>
                  <span className="font-medium text-right">{form.subcategory.trim() || '—'}</span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Extra</span>
                  <span className="font-medium text-right">{form.extracategory.trim() || '—'}</span>
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
                  Completa <span className="font-medium">Nombre</span> y{' '}
                  <span className="font-medium">Descripción</span> para habilitar "Guardar".
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

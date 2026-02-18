'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    extracategory: '',
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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image) {
      toast.error('La imagen es obligatoria');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('name', form.name);
      body.append('description', form.description);
      body.append('category', form.category);
      body.append('subcategory', form.subcategory);
      body.append('extracategory', form.extracategory);
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
      <div className="space-y-6">
        <Card className="border-none bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 shadow-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div>
              <h1 className="text-3xl font-black tracking-tight">Crear Producto</h1>
              <p className="mt-1 text-sm text-slate-600">Registra un nuevo producto de tu empresa.</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => router.push('/enterprise/products')}>
              <ArrowLeft className="h-4 w-4" />
              Volver al Listado
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos del Producto</CardTitle>
            <CardDescription>Completa la información del producto.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Ej: Laptop Dell XPS 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Ej: Electrónica"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoría</Label>
                  <Input
                    id="subcategory"
                    value={form.subcategory}
                    onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                    placeholder="Ej: Computadoras"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="extracategory">Extra Categoría</Label>
                  <Input
                    id="extracategory"
                    value={form.extracategory}
                    onChange={(e) => setForm((p) => ({ ...p, extracategory: e.target.value }))}
                    placeholder="Ej: Portátiles"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Descripción *</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    required
                    placeholder="Describe las características principales del producto..."
                    rows={5}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="image">Imagen *</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, WEBP. Tamaño máximo recomendado: 2MB
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/enterprise/products')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Guardar Producto'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vista Previa</CardTitle>
            <CardDescription>Así se verá tu producto antes de guardar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {imagePreview ? (
              <img src={imagePreview} alt={form.name || 'Vista previa producto'} className="h-48 w-full rounded-md border object-cover" />
            ) : (
              <div className="h-48 w-full rounded-md border bg-muted" />
            )}
            <div><strong>Nombre:</strong> {form.name || '-'}</div>
            <div><strong>Categoría:</strong> {form.category || '-'}</div>
            <div><strong>Subcategoría:</strong> {form.subcategory || '-'}</div>
            <div><strong>Extra categoría:</strong> {form.extracategory || '-'}</div>
            <div><strong>Descripción:</strong> {form.description || '-'}</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

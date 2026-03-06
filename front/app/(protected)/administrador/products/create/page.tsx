'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, Save, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type EnterpriseUser = {
  id: string;
  email: string;
  username: string;
  enterprise?: string;
  role: string;
  is_active?: boolean;
};

type EmployeeListResponse = {
  results?: {
    employees?: EnterpriseUser[];
  };
};

const MAX_IMAGE_MB = 2;

export default function AdminCreateProductPage() {
  const router = useRouter();
  const [loadingEnterprises, setLoadingEnterprises] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enterprises, setEnterprises] = useState<EnterpriseUser[]>([]);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  const [form, setForm] = useState({
    user: '',
    name: '',
    description: '',
    image: null as File | null,
  });

  const selectedEnterprise = useMemo(
    () => enterprises.find((enterprise) => enterprise.id === form.user),
    [enterprises, form.user],
  );

  useEffect(() => {
    const loadEnterprises = async () => {
      setLoadingEnterprises(true);
      try {
        const data = await apiClient.get<EmployeeListResponse>('/employee/list/');
        const items = (data?.results?.employees || []).filter(
          (item) => item.role === 'enterprise' && item.is_active !== false,
        );
        setEnterprises(items);
      } catch (error: any) {
        toast.error(error?.message || 'No se pudo cargar empresas.');
      } finally {
        setLoadingEnterprises(false);
      }
    };

    loadEnterprises();
  }, []);

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
    return !!form.user && !!form.name.trim() && !!form.description.trim() && !!form.image && !imageError;
  }, [form.user, form.name, form.description, form.image, imageError]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    const description = form.description.trim();

    if (!form.user) return toast.error('Selecciona una empresa.');
    if (!name) return toast.error('El nombre es obligatorio.');
    if (!description) return toast.error('La descripción es obligatoria.');
    if (!form.image) return toast.error('La imagen es obligatoria.');
    if (imageError) return toast.error(imageError);

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('user', form.user);
      body.append('name', name);
      body.append('description', description);
      body.append('image', form.image);

      await apiClient.post('/product/create/', body);
      toast.success('Beneficio creado para la empresa seleccionada.');
      router.push('/administrador/products');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear beneficio.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push('/administrador/products')}
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Crear Beneficio para Empresa</h1>
          <p className="text-sm text-muted-foreground">
            El beneficio quedará creado a nombre del empresario seleccionado.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Datos del Beneficio</CardTitle>
            <CardDescription>Completa la información y adjunta una imagen de portada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={onCreate} className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="enterprise">
                  Empresa <span className="text-red-500">*</span>
                </Label>
                <Popover open={enterpriseOpen} onOpenChange={setEnterpriseOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="enterprise"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={enterpriseOpen}
                      className="w-full justify-between"
                      disabled={loadingEnterprises}
                    >
                      {selectedEnterprise
                        ? `${selectedEnterprise.enterprise || selectedEnterprise.username} - ${selectedEnterprise.email}`
                        : loadingEnterprises
                          ? 'Cargando empresas...'
                          : 'Selecciona una empresa'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar empresa..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron empresas.</CommandEmpty>
                        <CommandGroup>
                          {enterprises.map((enterprise) => {
                            const label = `${enterprise.enterprise || enterprise.username} - ${enterprise.email}`;
                            return (
                              <CommandItem
                                key={enterprise.id}
                                value={label}
                                onSelect={() => {
                                  setForm((prev) => ({ ...prev, user: enterprise.id }));
                                  setEnterpriseOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    form.user === enterprise.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Bono de descuento"
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
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe el beneficio o producto."
                  rows={6}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="image">
                  Imagen de portada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Formatos: JPG, PNG, WEBP. Máximo: {MAX_IMAGE_MB}MB.
                </p>
                {imageError && <p className="text-xs text-red-500">{imageError}</p>}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/administrador/products')}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Crear beneficio
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Así se verá antes de guardar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt={form.name || 'Vista previa beneficio'}
                className="h-56 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="h-56 w-full rounded-md border bg-muted" />
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Empresa</span>
                <span className="text-right font-medium">
                  {selectedEnterprise?.enterprise || selectedEnterprise?.username || '—'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Nombre</span>
                <span className="text-right font-medium">{form.name.trim() || '—'}</span>
              </div>

              <div className="pt-2 border-t">
                <div className="mb-1 text-muted-foreground">Descripción</div>
                <p className="whitespace-pre-wrap leading-relaxed">{form.description.trim() || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

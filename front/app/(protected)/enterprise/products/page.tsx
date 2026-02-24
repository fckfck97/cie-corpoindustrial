'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Plus, Pencil, Gift, QrCode, Search, Filter, X, Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import { DEFAULT_PAGE_SIZE, buildPageQuery, getPageRange, parsePaginatedCollection } from '@/utils/pagination';
import { PaginationControls } from '@/components/PaginationControls';

type Product = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  category?: string;
  subcategory?: string;
  extracategory?: string;
  created?: string;
  views?: number;
  redemptions_count?: number;
};

type ProductsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    products?: Product[];
  };
};

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // QR
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPath, setQrPath] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadProducts = async (page: number = 1) => {
    setLoading(true);
    try {
      const query = buildPageQuery({ page, pageSize: DEFAULT_PAGE_SIZE, pageParam: 'p' });
      const data = await apiClient.get<ProductsResponse>(`/product/list/?${query}`);
      const parsed = parsePaginatedCollection<Product>(data, (payload) => payload?.results?.products || []);
      setProducts(parsed.items);
      setTotalProducts(parsed.count);
      setHasNextPage(Boolean(parsed.next));
      setHasPreviousPage(Boolean(parsed.previous));
      setCurrentPage(page);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts(1);
  }, []);

  const openEdit = (productId: string) => {
    router.push(`/enterprise/products/${productId}/edit`);
  };

  const openQr = async () => {
    if (!products.length) {
      toast.error('Debes tener al menos un beneficio para generar el QR de empresa.');
      return;
    }

    setQrLoading(true);
    try {
      const response = await apiClient.get<{
        qr_payload?: string;
        login_url?: string;
        benefits_url?: string;
      }>(`/enterprise/benefits/qr/`);

      setQrPath(response?.qr_payload || response?.login_url || response?.benefits_url || '');
      setQrOpen(true);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo generar el QR');
    } finally {
      setQrLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          (p.name || '').toLowerCase().includes(search) ||
          (p.description || '').toLowerCase().includes(search) ||
          (p.category || '').toLowerCase().includes(search) ||
          (p.subcategory || '').toLowerCase().includes(search) ||
          (p.extracategory || '').toLowerCase().includes(search)
        );
      });
    }

    // Categoría
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((p) => (p.category || '') === categoryFilter);
    }

    return filtered;
  }, [products, searchTerm, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean) as string[]);
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const hasActiveFilters = Boolean(searchTerm.trim() || categoryFilter !== 'all');

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const downloadQr = () => {
    if (!qrPath) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrPath)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'qr-beneficios-empresa.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR descargado');
  };

  const copyQrLink = async () => {
    if (!qrPath) return;
    try {
      await navigator.clipboard.writeText(qrPath);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const pageRange = getPageRange({
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
    currentItems: products.length,
    totalCount: totalProducts,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
                <Gift className="h-8 w-8 text-primary" />
                Productos y Beneficios
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Administra el catálogo de beneficios de tu empresa
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => openQr()}
                className="gap-2"
                disabled={qrLoading || loading || products.length === 0}
              >
                <QrCode className="h-4 w-4" />
                {qrLoading ? 'Generando...' : 'QR de Empresa'}
              </Button>

              <Button className="gap-2" onClick={() => router.push('/enterprise/products/create')}>
                <Plus className="h-4 w-4" />
                Crear Beneficio
              </Button>
            </div>
          </div>


        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Search */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Búsqueda
                </Label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, descripción, categoría..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchTerm('')}
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">Filtros activos</Badge>
                <Button onClick={clearFilters} variant="ghost" size="sm" className="h-7 gap-1">
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </Button>
              </div>
            )}

            {searchTerm.trim() && (
              <div className="mt-2 text-sm text-muted-foreground">
                Mostrando {filteredProducts.length} de {products.length} beneficios
              </div>
            )}
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Beneficios</CardTitle>
            <CardDescription>
              {loading
                ? 'Cargando...'
                : `Total: ${totalProducts} beneficio${
                    totalProducts !== 1 ? 's' : ''
                  }`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Cargando...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-10 text-center">
                <Gift className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? 'No se encontraron productos con esos criterios'
                    : 'No hay beneficios registrados. Crea uno para habilitar el QR de empresa.'}
                </p>

                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Imagen</th>
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Categoría</th>
                      <th className="p-3 font-semibold">Subcategoría</th>
                      <th className="p-3 font-semibold">Vistas</th>
                      <th className="p-3 font-semibold">Canjeados</th>
                      <th className="p-3 font-semibold">Fecha</th>
                      <th className="p-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3">
                          {getImageUrl(product.image) ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              className="h-12 w-12 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                              <Gift className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-medium">{product.name}</td>

                        <td className="p-3">
                          <Badge variant="secondary">{product.category || '-'}</Badge>
                        </td>

                        <td className="p-3 text-muted-foreground">{product.subcategory || '-'}</td>

                        <td className="p-3">
                          <Badge variant="outline" className="font-mono">
                            {product.views || 0}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Badge variant="default" className="font-mono">
                            {product.redemptions_count || 0}
                          </Badge>
                        </td>

                        <td className="p-3 text-xs text-muted-foreground">
                          {product.created
                            ? new Date(product.created).toLocaleDateString('es-CO')
                            : '-'}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(product.id)}
                              className="hover:bg-primary/10"
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          {!loading && (
            <CardContent className="pt-0">
              <PaginationControls
                currentPage={currentPage}
                totalPages={pageRange.totalPages}
                totalCount={totalProducts}
                start={pageRange.start}
                end={pageRange.end}
                hasPrevious={hasPreviousPage}
                hasNext={hasNextPage}
                loading={loading}
                itemLabel="beneficios"
                onPrevious={() => loadProducts(currentPage - 1)}
                onNext={() => loadProducts(currentPage + 1)}
              />
            </CardContent>
          )}
        </Card>

        {/* QR */}
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Código QR de tu Empresa
              </DialogTitle>
              <DialogDescription>
                Los empleados escanean este código para acceder directamente a todos los beneficios disponibles
              </DialogDescription>
            </DialogHeader>

            {qrPath ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="rounded-xl border-4 border-primary/20 bg-white p-4 shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                        qrPath
                      )}`}
                      alt="QR beneficios empresa"
                      className="rounded-md"
                    />
                  </div>

                  <div className="text-center">
                    <p className="font-semibold">Beneficios de la Empresa</p>
                    <p className="text-xs text-muted-foreground">Escanea para acceder</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Enlace directo</Label>
                  <div className="flex items-center gap-2">
                    <Input value={qrPath} readOnly className="text-xs font-mono" />
                    <Button
                      onClick={copyQrLink}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      aria-label="Copiar enlace"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={downloadQr} variant="outline" className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Descargar QR
                  </Button>
                  <Button onClick={copyQrLink} className="flex-1 gap-2">
                    <Share2 className="h-4 w-4" />
                    Copiar Enlace
                  </Button>
                </div>

                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary">💡 Instrucciones de uso</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Imprime o muestra este QR en un lugar visible</li>
                    <li>• Los empleados lo escanean con su cámara</li>
                    <li>• Accederán automáticamente al catálogo de beneficios</li>
                    <li>• Podrán canjear beneficios en el momento</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No se pudo generar el QR.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

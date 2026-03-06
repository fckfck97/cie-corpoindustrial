'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import { DEFAULT_PAGE_SIZE, buildPageQuery, getPageRange, parsePaginatedCollection } from '@/utils/pagination';
import { PaginationControls } from '@/components/PaginationControls';

type Product = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  user?: string;
  category?: string;
  created?: string;
};

type ProductsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    products?: Product[];
  };
};

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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [enterpriseFilter, setEnterpriseFilter] = useState('all');
  const [enterpriseMap, setEnterpriseMap] = useState<Record<string, string>>({});

  const loadProducts = useCallback(async (page: number = 1) => {
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
      toast.error(error?.message || 'No se pudo cargar beneficios.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEnterprises = useCallback(async () => {
    try {
      const data = await apiClient.get<EmployeeListResponse>('/employee/list/');
      const enterprises = (data?.results?.employees || []).filter((item) => item.role === 'enterprise');
      const map: Record<string, string> = {};
      enterprises.forEach((enterprise) => {
        map[enterprise.id] = enterprise.enterprise || enterprise.username || enterprise.email;
      });
      setEnterpriseMap(map);
    } catch {
      setEnterpriseMap({});
    }
  }, []);

  useEffect(() => {
    loadProducts(1);
    loadEnterprises();
  }, [loadProducts, loadEnterprises]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((product) => {
        const enterpriseName = enterpriseMap[product.user || ''] || '';
        return (
          (product.name || '').toLowerCase().includes(search) ||
          (product.description || '').toLowerCase().includes(search) ||
          (product.category || '').toLowerCase().includes(search) ||
          enterpriseName.toLowerCase().includes(search)
        );
      });
    }

    if (enterpriseFilter !== 'all') {
      filtered = filtered.filter((product) => product.user === enterpriseFilter);
    }

    return filtered;
  }, [products, searchTerm, enterpriseFilter, enterpriseMap]);

  const enterpriseOptions = useMemo(() => {
    const ids = Array.from(new Set(products.map((product) => product.user).filter(Boolean) as string[]));
    return ids
      .map((id) => ({ id, label: enterpriseMap[id] || id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [products, enterpriseMap]);

  const hasActiveFilters = Boolean(searchTerm.trim() || enterpriseFilter !== 'all');

  const clearFilters = () => {
    setSearchTerm('');
    setEnterpriseFilter('all');
  };

  const pageRange = getPageRange({
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
    currentItems: products.length,
    totalCount: totalProducts,
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            Beneficios de Empresas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Listado general de beneficios creados para empresas.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link href="/administrador/products/create">
            <Plus className="h-4 w-4" />
            Crear beneficio
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros y Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Búsqueda
              </Label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, categoría o empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {searchTerm && (
                  <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')} aria-label="Limpiar búsqueda">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={enterpriseFilter} onValueChange={setEnterpriseFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {enterpriseOptions.map((enterprise) => (
                    <SelectItem key={enterprise.id} value={enterprise.id}>
                      {enterprise.label}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Beneficios</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `Total: ${totalProducts} beneficio${totalProducts !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'No se encontraron beneficios con esos criterios.'
                  : 'No hay beneficios registrados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Beneficio</th>
                    <th className="p-3 font-semibold">Empresa</th>
                    <th className="p-3 font-semibold">Categoría</th>
                    <th className="p-3 font-semibold">Creación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {getImageUrl(product.image) ? (
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              className="h-12 w-12 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-md border bg-muted" />
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {product.description || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {enterpriseMap[product.user || ''] || '-'}
                      </td>
                      <td className="p-3 text-muted-foreground">{product.category || '-'}</td>
                      <td className="p-3 text-muted-foreground">
                        {product.created ? new Date(product.created).toLocaleDateString() : '-'}
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
    </div>
  );
}

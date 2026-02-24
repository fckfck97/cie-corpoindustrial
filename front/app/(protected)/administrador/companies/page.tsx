'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Wallet, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type BackendUser = {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  enterprise?: string;
  role: string;
  is_active?: boolean;
};

type EmployeeListResponse = {
  results?: {
    employees?: BackendUser[];
  };
};

export default function AdminCompaniesPage() {
  const [items, setItems] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEnterprises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<EmployeeListResponse>('/employee/list/');
      setItems(data?.results?.employees ?? []);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar empresas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnterprises();
  }, [loadEnterprises]);

  const sortedItems = useMemo(
    () => [...items].filter(item => item.is_active !== false).sort((a, b) => (a.enterprise || '').localeCompare(b.enterprise || '')),
    [items]
  );

  const onDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const payload = new FormData();
      payload.append('id', deleteId);
      payload.append('is_active', 'false');
      await apiClient.put(`/employee/edit/${deleteId}/`, payload);
      toast.success('Empresa desactivada correctamente.');
      setDeleteId(null);
      await loadEnterprises();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo desactivar la empresa.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Empresas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Modulo admin: listado y gestion de empresas.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="gap-2 ml-auto">
            <Link href="/administrador/companies/create">
              <Plus className="h-4 w-4" /> Crear Empresa
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Total empresas</CardDescription>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" />{sortedItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pagos empresas</CardDescription>
            <CardTitle>
              <Button asChild variant="outline" className="gap-2"><Link href="/administrador/payments"><Wallet className="h-4 w-4" />Ir a pagos</Link></Button>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de empresas</CardTitle>
          <CardDescription>{loading ? 'Cargando...' : `Total: ${sortedItems.length}`}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Empresa</th>
                    <th className="p-3 font-semibold">Correo</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold">{item.enterprise || item.username}</div>
                        <div className="text-xs text-muted-foreground">{`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Sin nombre'}</div>
                      </td>
                      <td className="p-3">{item.email}</td>
                      <td className="p-3">
                        {item.is_active === false
                          ? <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-800">Activa</Badge>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/administrador/payments?enterprise=${item.id}`}>
                              <Wallet className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/administrador/companies/${item.id}/edit`}>
                              <Edit2 className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        title="¿Desactivar empresa?"
        description="La empresa dejará de aparecer en el listado pero sus datos y empleados se conservarán."
        actionLabel="Desactivar"
        isDestructive
        isLoading={deleting}
        onConfirm={onDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
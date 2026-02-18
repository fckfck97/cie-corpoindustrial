'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  const [editingEnterprise, setEditingEnterprise] = useState<BackendUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    enterprise: '',
    is_active: true,
  });

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
    () => [...items].sort((a, b) => (a.enterprise || '').localeCompare(b.enterprise || '')),
    [items]
  );

  const openEditModal = (enterprise: BackendUser) => {
    setEditingEnterprise(enterprise);
    setEditForm({
      email: enterprise.email || '',
      username: enterprise.username || '',
      first_name: enterprise.first_name || '',
      last_name: enterprise.last_name || '',
      enterprise: enterprise.enterprise || '',
      is_active: enterprise.is_active !== false,
    });
    setEditModalOpen(true);
  };

  const submitEnterpriseEdit = async () => {
    if (!editingEnterprise) return;
    setEditSubmitting(true);
    try {
      const payload = {
        id: editingEnterprise.id,
        email: editForm.email.trim(),
        username: editForm.username.trim(),
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        enterprise: editForm.enterprise.trim(),
        is_active: editForm.is_active ? 'true' : 'false',
      };
      await apiClient.put(`/employee/edit/${editingEnterprise.id}/`, payload);
      toast.success('Empresa actualizada.');
      setEditModalOpen(false);
      setEditingEnterprise(null);
      await loadEnterprises();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar la empresa.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/employee/${deleteId}/`);
      toast.success('Empresa eliminada.');
      setDeleteId(null);
      await loadEnterprises();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Empresas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Modulo admin: listado y gestion de empresas.</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/companies/create">
            <Plus className="h-4 w-4" /> Crear Empresa
          </Link>
        </Button>
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
              <Button asChild variant="outline" className="gap-2"><Link href="/admin/payments"><Wallet className="h-4 w-4" />Ir a pagos</Link></Button>
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
                <thead className="border-b bg-slate-50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Empresa</th>
                    <th className="p-3 font-semibold">Correo</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-slate-50/60">
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
                            <Link href={`/admin/payments?enterprise=${item.id}`}>
                              <Wallet className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(item)}><Edit2 className="h-4 w-4" /></Button>
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
        title="Eliminar empresa"
        description="Esta accion no se puede deshacer."
        actionLabel="Eliminar"
        isDestructive
        isLoading={deleting}
        onConfirm={onDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>Actualiza datos de la empresa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2"><Label>Correo</Label><Input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Usuario</Label><Input value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Nombres</Label><Input value={editForm.first_name} onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Apellidos</Label><Input value={editForm.last_name} onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Empresa</Label><Input value={editForm.enterprise} onChange={(e) => setEditForm((p) => ({ ...p, enterprise: e.target.value }))} /></div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input id="is_active" type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))} />
              <Label htmlFor="is_active">Empresa activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={submitEnterpriseEdit} disabled={editSubmitting}>{editSubmitting ? 'Guardando...' : 'Guardar cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

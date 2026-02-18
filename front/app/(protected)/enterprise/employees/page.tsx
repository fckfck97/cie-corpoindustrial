'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
import { Badge } from '@/components/ui/badge';

import { Plus, Trash2, Pencil, Search, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { getBackendRoleLabel } from '@/lib/model-choice-labels';

type BackendUser = {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  enterprise?: string;
  role: string;
};

type EmployeeListResponse = {
  results?: {
    employees?: BackendUser[];
  };
};

export default function EnterpriseEmployeesPage() {
  const router = useRouter();

  const [items, setItems] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingUser, setEditingUser] = useState<BackendUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
  });

  const loadEmployees = useCallback(async () => {
    const data = await apiClient.get<EmployeeListResponse>('/employee/list/');
    setItems(data?.results?.employees ?? []);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  }, [loadEmployees]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sortedItems = useMemo(() => {
    let filtered = [...items];

    // Búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        return (
          (item.first_name || '').toLowerCase().includes(search) ||
          (item.last_name || '').toLowerCase().includes(search) ||
          (item.email || '').toLowerCase().includes(search) ||
          (item.username || '').toLowerCase().includes(search) ||
          (item.enterprise || '').toLowerCase().includes(search)
        );
      });
    }

    // Orden alfabético
    return filtered.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
  }, [items, searchTerm]);

  const onDelete = useCallback(async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await apiClient.delete(`/employee/${deleteId}/`);
      toast.success('Empleado eliminado.');
      setDeleteId(null);
      await reload();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar.');
    } finally {
      setDeleting(false);
    }
  }, [deleteId, reload]);

  const openEdit = (item: BackendUser) => {
    setEditingUser(item);
    setEditForm({
      email: item.email || '',
      first_name: item.first_name || '',
      last_name: item.last_name || '',
    });
    setEditOpen(true);
  };

  const onEdit = useCallback(async () => {
    if (!editingUser) return;

    setEditSubmitting(true);
    try {
      const emailTrim = editForm.email.trim();

      if (!emailTrim) {
        toast.error('El correo es obligatorio.');
        return;
      }

      const payload = {
        id: editingUser.id,
        email: emailTrim,
        username: emailTrim,
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
      };

      await apiClient.put(`/employee/edit/${editingUser.id}/`, payload);

      toast.success('Empleado actualizado.');
      setEditOpen(false);
      setEditingUser(null);
      await reload();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar.');
    } finally {
      setEditSubmitting(false);
    }
  }, [editingUser, editForm.email, editForm.first_name, editForm.last_name, reload]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
              <Users className="h-8 w-8 text-primary" />
              Empleados
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea y administra el personal de tu empresa
            </p>
          </div>

          <Button className="gap-2" onClick={() => router.push('/enterprise/employees/create')}>
            <Plus className="h-4 w-4" />
            Crear Empleado
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Búsqueda
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, correo, empresa..."
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
                  className="shrink-0"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {searchTerm && (
              <div className="mt-2 text-sm text-muted-foreground">
                Mostrando {sortedItems.length} de {items.length} empleados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Empleados</CardTitle>
            <CardDescription>
              {loading
                ? 'Cargando...'
                : `Total: ${sortedItems.length} empleado${sortedItems.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Cargando...</div>
            ) : sortedItems.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron empleados con ese criterio'
                    : 'No hay empleados registrados'}
                </p>

                {searchTerm && (
                  <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">
                    Limpiar búsqueda
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Nombre</th>
                      <th className="p-3 font-semibold">Correo</th>
                      <th className="p-3 font-semibold">Empresa</th>
                      <th className="p-3 font-semibold">Rol</th>
                      <th className="p-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b transition-colors hover:bg-muted/30"
                      >
                        <td className="p-3 font-medium">
                          {`${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username}
                        </td>

                        <td className="p-3 text-muted-foreground">{item.email}</td>

                        <td className="p-3">
                          <Badge variant="secondary">{item.enterprise || 'N/D'}</Badge>
                        </td>

                        <td className="p-3">
                          <Badge variant="outline">{getBackendRoleLabel(item.role)}</Badge>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(item)}
                              className="hover:bg-primary/10"
                              aria-label="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteId(item.id)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </Card>

        {/* Delete confirm */}
        <ConfirmDialog
          open={deleteId !== null}
          title="Eliminar empleado"
          description="Esta acción no se puede deshacer."
          actionLabel="Eliminar"
          isDestructive
          isLoading={deleting}
          onConfirm={onDelete}
          onCancel={() => setDeleteId(null)}
        />

        {/* Edit dialog */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingUser(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Empleado</DialogTitle>
              <DialogDescription>Actualiza la información básica del empleado.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Correo</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-first-name">Nombres</Label>
                <Input
                  id="edit-first-name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-last-name">Apellidos</Label>
                <Input
                  id="edit-last-name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={editSubmitting}
              >
                Cancelar
              </Button>

              <Button onClick={onEdit} disabled={editSubmitting}>
                {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

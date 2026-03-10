'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Plus, Wallet, Edit2, Trash2, MapPinned, QrCode, Download, Copy } from 'lucide-react';
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
  has_benefits?: boolean;
  benefits_count?: number;
  qr_payload?: string | null;
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
  const [qrCompany, setQrCompany] = useState<BackendUser | null>(null);

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

  const downloadQr = () => {
    if (!qrCompany?.qr_payload) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrCompany.qr_payload)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${(qrCompany.enterprise || qrCompany.username || 'empresa').toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR descargado');
  };

  const copyQrLink = async () => {
    if (!qrCompany?.qr_payload) return;
    try {
      await navigator.clipboard.writeText(qrCompany.qr_payload);
      toast.success('Enlace QR copiado');
    } catch {
      toast.error('No se pudo copiar el enlace');
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
          <Button asChild variant="outline" className="gap-2 ml-auto">
            <Link href="/administrador/companies/map">
              <MapPinned className="h-4 w-4" /> Ver Mapa
            </Link>
          </Button>
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
                    <th className="p-3 font-semibold">Beneficios</th>
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
                        {item.has_benefits ? (
                          <Badge className="bg-sky-100 text-sky-800">
                            {item.benefits_count || 0} beneficio{(item.benefits_count || 0) !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sin beneficios</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {item.is_active === false
                          ? <Badge className="bg-red-100 text-red-800">Inactiva</Badge>
                          : <Badge className="bg-emerald-100 text-emerald-800">Activa</Badge>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setQrCompany(item)}
                            disabled={!item.has_benefits || !item.qr_payload}
                            title={item.has_benefits ? 'Ver QR de beneficios' : 'La empresa no tiene beneficios'}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
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

      <Dialog open={Boolean(qrCompany)} onOpenChange={(open) => !open && setQrCompany(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR de Empresa
            </DialogTitle>
            <DialogDescription>
              {qrCompany?.enterprise || qrCompany?.username}
            </DialogDescription>
          </DialogHeader>

          {qrCompany?.qr_payload ? (
            <div className="space-y-3">
              <div className="mx-auto w-fit rounded-lg border bg-white p-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCompany.qr_payload)}`}
                  alt="QR de beneficios empresa"
                  className="h-[280px] w-[280px]"
                />
              </div>
              <p className="text-xs break-all text-muted-foreground">{qrCompany.qr_payload}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta empresa no tiene beneficios y no se puede generar QR.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={copyQrLink} disabled={!qrCompany?.qr_payload}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar enlace
            </Button>
            <Button onClick={downloadQr} disabled={!qrCompany?.qr_payload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

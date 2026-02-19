'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, X, MoreVertical, FileText, Eye, CreditCard } from 'lucide-react';
import { getPaymentMethodLabel, getPaymentStatusLabel } from '@/lib/model-choice-labels';
import { getImageUrl } from '@/lib/utils';
import { toast } from 'sonner';

type PaymentInfo = {
  id: number;
  year: number;
  month: number;
  amount: string;
  status: 'pending' | 'paid' | 'overdue' | string;
  due_date: string;
  grace_date?: string;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
};

type PaymentsResponse = {
  enterprise: {
    id: string;
    enterprise?: string;
    email: string;
  };
  summary: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  payments: PaymentInfo[];
};

const monthLabel = (year: number, month: number) => `${String(month).padStart(2, '0')}/${year}`;

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get<PaymentsResponse>('/billing/my-payments/');
        setData(response);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar pagos');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredPayments = useMemo(() => {
    if (!data?.payments) return [];
    let list = [...data.payments];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      list = list.filter((p) => {
        const ref = p.payment_reference?.toLowerCase() || '';
        const monthYear = monthLabel(p.year, p.month).toLowerCase();
        return ref.includes(search) || monthYear.includes(search);
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    return list;
  }, [data, searchTerm, statusFilter]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const badge = (status: string) => {
    const label = getPaymentStatusLabel(status);
    if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{label}</Badge>;
    if (status === 'overdue') return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{label}</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{label}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary" />
              Pagos Mensuales
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Consulta pagos al día y pendientes. El administrador registra los soportes.</p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Cargando pagos...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardHeader><CardDescription>Total</CardDescription><CardTitle>{data?.summary.total || 0}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Al día</CardDescription><CardTitle>{data?.summary.paid || 0}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Pendientes</CardDescription><CardTitle>{data?.summary.pending || 0}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Vencidos</CardDescription><CardTitle>{data?.summary.overdue || 0}</CardTitle></CardHeader></Card>
            </div>

            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Búsqueda y Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Referencia o Mes/Año (MM/YYYY)
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Ej: PSE-12345 o 02/2026..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {searchTerm && (
                        <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="paid">Pagado</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="overdue">Vencido</SelectItem>
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
                <CardTitle>Listado de pagos</CardTitle>
                <CardDescription>
                  {data?.enterprise?.enterprise || data?.enterprise?.email} 
                  <span className="ml-2">• {filteredPayments.length} registro(s)</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <CreditCard className="mx-auto h-12 w-12 opacity-20 mb-2" />
                    No se encontraron pagos con los filtros actuales.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr className="text-left">
                          <th className="p-3 font-semibold">Mes</th>
                          <th className="p-3 font-semibold">Estado</th>
                          <th className="p-3 font-semibold">Monto</th>
                          <th className="p-3 font-semibold text-center">Método</th>
                          <th className="p-3 font-semibold">Referencia</th>
                          <th className="p-3 font-semibold">Fecha Pago</th>
                          <th className="p-3 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{monthLabel(payment.year, payment.month)}</td>
                            <td className="p-3">{badge(payment.status)}</td>
                            <td className="p-3">$ {new Intl.NumberFormat('es-CO').format(parseFloat(payment.amount))}</td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-normal">
                                {getPaymentMethodLabel(payment.payment_method)}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono text-xs">{payment.payment_reference || '-'}</td>
                            <td className="p-3 text-muted-foreground">
                              {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-3 text-right">
                              {payment.payment_proof_url ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => window.open(getImageUrl(payment.payment_proof_url), '_blank')}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Ver soporte
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = getImageUrl(payment.payment_proof_url);
                                      link.download = `soporte-${payment.month}-${payment.year}.pdf`;
                                      link.click();
                                    }}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      Descargar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sin soporte</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

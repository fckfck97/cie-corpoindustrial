'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { apiClient } from '@/lib/api-client';
import { getPaymentMethodLabel } from '@/lib/model-choice-labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PaymentInfo = {
  id: number;
  enterprise: string;
  enterprise_name?: string;
  enterprise_email?: string;
  year: number;
  month: number;
  amount: string;
  due_date: string;
  grace_date: string;
  status: 'pending' | 'paid' | 'overdue' | string;
  payment_method?: string | null;
  payment_reference?: string | null;
  paid_amount?: string | null;
  payment_proof_url?: string | null;
  paid_reported_by_email?: string | null;
  paid_at?: string | null;
  notes?: string | null;
};

type BillingReportResponse = {
  summary: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  payments: PaymentInfo[];
};

const monthLabel = (year: number, month: number) => `${String(month).padStart(2, '0')}/${year}`;

export default function AdminEnterprisePaymentsDetailPage() {
  const params = useParams<{ enterpriseId: string }>();
  const enterpriseId = params?.enterpriseId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<BillingReportResponse | null>(null);

  useEffect(() => {
    if (!enterpriseId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ enterprise_id: enterpriseId });
        const data = await apiClient.get<BillingReportResponse>(`/billing/report/?${query.toString()}`);
        setReport(data);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el detalle de pagos.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [enterpriseId]);

  const enterpriseName = useMemo(() => {
    const first = report?.payments?.[0];
    return first?.enterprise_name || 'Empresa';
  }, [report]);

  const enterpriseEmail = useMemo(() => {
    const first = report?.payments?.[0];
    return first?.enterprise_email || '-';
  }, [report]);

  const statusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-800">Pagado</Badge>;
    if (status === 'overdue') return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
    return <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Detalle de Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {enterpriseName} · {enterpriseEmail}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/payments" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a pagos
          </Link>
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Cargando detalle...</CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-red-600">{error}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardHeader><CardDescription>Total</CardDescription><CardTitle>{report?.summary.total || 0}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Pagados</CardDescription><CardTitle>{report?.summary.paid || 0}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Pendientes</CardDescription><CardTitle>{report?.summary.pending || 0}</CardTitle></CardHeader></Card>
            <Card><CardHeader><CardDescription>Vencidos</CardDescription><CardTitle>{report?.summary.overdue || 0}</CardTitle></CardHeader></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historial completo</CardTitle>
              <CardDescription>Detalle por mes y soporte de pago registrado.</CardDescription>
            </CardHeader>
            <CardContent>
              {(report?.payments || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No hay pagos registrados para esta empresa.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr className="text-left">
                        <th className="p-3 font-semibold">Mes</th>
                        <th className="p-3 font-semibold">Estado</th>
                        <th className="p-3 font-semibold">Monto</th>
                        <th className="p-3 font-semibold">Fecha limite</th>
                        <th className="p-3 font-semibold">Gracia</th>
                        <th className="p-3 font-semibold">Metodo</th>
                        <th className="p-3 font-semibold">Referencia</th>
                        <th className="p-3 font-semibold">Pagado</th>
                        <th className="p-3 font-semibold">Reportado por</th>
                        <th className="p-3 font-semibold">Fecha pago</th>
                        <th className="p-3 font-semibold">Comprobante</th>
                        <th className="p-3 font-semibold">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report?.payments || []).map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-3">{monthLabel(payment.year, payment.month)}</td>
                          <td className="p-3">{statusBadge(payment.status)}</td>
                          <td className="p-3">{payment.amount}</td>
                          <td className="p-3">{new Date(payment.due_date).toLocaleDateString()}</td>
                          <td className="p-3">{new Date(payment.grace_date).toLocaleDateString()}</td>
                          <td className="p-3">{getPaymentMethodLabel(payment.payment_method)}</td>
                          <td className="p-3">{payment.payment_reference || '-'}</td>
                          <td className="p-3">{payment.paid_amount || '-'}</td>
                          <td className="p-3">{payment.paid_reported_by_email || '-'}</td>
                          <td className="p-3">{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '-'}</td>
                          <td className="p-3">
                            {payment.payment_proof_url ? (
                              <a
                                href={payment.payment_proof_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                Ver
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-3">{payment.notes || '-'}</td>
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
  );
}

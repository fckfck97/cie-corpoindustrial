'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPaymentMethodLabel } from '@/lib/model-choice-labels';

type PaymentInfo = {
  id: number;
  year: number;
  month: number;
  amount: string;
  status: 'pending' | 'paid' | 'overdue' | string;
  due_date: string;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
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

  const badge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-800">Al día</Badge>;
    return <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consulta pagos al día y pendientes. El registro lo realiza el admin.</p>
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

            <Card>
              <CardHeader>
                <CardTitle>Listado de pagos</CardTitle>
                <CardDescription>{data?.enterprise?.enterprise || data?.enterprise?.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr className="text-left">
                        <th className="p-3 font-semibold">Mes</th>
                        <th className="p-3 font-semibold">Estado</th>
                        <th className="p-3 font-semibold">Monto</th>
                        <th className="p-3 font-semibold">Método</th>
                        <th className="p-3 font-semibold">Referencia</th>
                        <th className="p-3 font-semibold">Fecha pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.payments || []).map((payment) => (
                        <tr key={payment.id} className="border-b">
                          <td className="p-3">{monthLabel(payment.year, payment.month)}</td>
                          <td className="p-3">{badge(payment.status)}</td>
                          <td className="p-3">{payment.amount}</td>
                          <td className="p-3">{getPaymentMethodLabel(payment.payment_method)}</td>
                          <td className="p-3">{payment.payment_reference || '-'}</td>
                          <td className="p-3">{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

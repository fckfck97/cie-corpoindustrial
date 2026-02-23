'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wallet, AlertTriangle } from 'lucide-react';

type EnterpriseUser = {
  id: string;
  email: string;
  username: string;
  enterprise?: string;
  is_active?: boolean;
};

type EmployeeListResponse = {
  results?: {
    employees?: EnterpriseUser[];
  };
};

type PaymentInfo = {
  id: number;
  year: number;
  month: number;
  status: 'pending' | 'paid' | 'overdue' | string;
  due_date: string;
};

type BillingRow = {
  enterprise: EnterpriseUser;
  payments?: PaymentInfo[];
};

type BillingResponse = {
  enterprises: BillingRow[];
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enterprises, setEnterprises] = useState<EnterpriseUser[]>([]);
  const [billingRows, setBillingRows] = useState<BillingRow[]>([]);

  useEffect(() => {
    const loadAdminDashboard = async () => {
      setLoading(true);
      setError('');
      try {
        const [enterprisesRes, billingRes] = await Promise.all([
          apiClient.get<EmployeeListResponse>('/employee/list/'),
          apiClient.get<BillingResponse>('/billing/enterprises/'),
        ]);
        setEnterprises(enterprisesRes?.results?.employees ?? []);
        setBillingRows(billingRes?.enterprises ?? []);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar el panel admin.');
      } finally {
        setLoading(false);
      }
    };

    loadAdminDashboard();
  }, []);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const metrics = useMemo(() => {
    const paymentsOfCurrentMonth: Array<{ enterprise: EnterpriseUser; payment: PaymentInfo }> = [];
    billingRows.forEach((row) => {
      const currentPayment = (row.payments || []).find(
        (payment) => payment.year === currentYear && payment.month === currentMonth
      );
      if (currentPayment) paymentsOfCurrentMonth.push({ enterprise: row.enterprise, payment: currentPayment });
    });

    const paid = paymentsOfCurrentMonth.filter((item) => item.payment.status === 'paid').length;
    const overdue = paymentsOfCurrentMonth.filter((item) => item.payment.status === 'overdue').length;
    const pending = paymentsOfCurrentMonth.filter((item) => item.payment.status === 'pending').length;
    const active = enterprises.filter((enterprise) => enterprise.is_active !== false).length;

    return {
      totalEnterprises: enterprises.length,
      activeEnterprises: active,
      currentMonthTotal: paymentsOfCurrentMonth.length,
      currentMonthPaid: paid,
      currentMonthPending: pending,
      currentMonthOverdue: overdue,
      paymentsOfCurrentMonth,
    };
  }, [billingRows, enterprises, currentMonth, currentYear]);

  const cards = [
    {
      title: 'Empresas Registradas',
      value: String(metrics.totalEnterprises),
      icon: Users,
      borderClass: 'border-l-blue-500',
      iconClass: 'bg-blue-100 text-blue-600',
      href: '/admin/companies',
    },
    {
      title: 'Pagos Mes Actual',
      value: `${metrics.currentMonthPaid}/${metrics.currentMonthTotal}`,
      icon: Wallet,
      borderClass: 'border-l-emerald-500',
      iconClass: 'bg-emerald-100 text-emerald-600',
      href: '/admin/payments',
    },
    {
      title: 'Vencidos Mes Actual',
      value: String(metrics.currentMonthOverdue),
      icon: AlertTriangle,
      borderClass: 'border-l-red-500',
      iconClass: 'bg-red-100 text-red-600',
      href: '/admin/payments',
    },
  ];

  return (
      <div className="space-y-10 pb-10">
        <div className="flex flex-col gap-3 border-b pb-6">
          <h1 className="text-4xl font-black tracking-tight text-primary">Dashboard Admin</h1>
          <p className="text-lg text-muted-foreground">
            Empresas registradas y control de pagos del mes en curso.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`h-full cursor-pointer border-l-4 transition-shadow hover:shadow-md ${card.borderClass}`}
              >
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-3xl font-bold">{card.value}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Corte {String(currentMonth).padStart(2, '0')}/{currentYear}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${card.iconClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Resumen Admin</CardTitle>
            <CardDescription>Empresas activas y estado de pagos del mes actual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-6 text-center text-muted-foreground">Cargando métricas...</div>
            ) : error ? (
              <div className="py-6 text-center text-red-600">{error}</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-4 text-sm">
                  <div className="rounded-md border p-3">
                    <strong>Empresas activas:</strong> {metrics.activeEnterprises}
                  </div>
                  <div className="rounded-md border p-3">
                    <strong>Pagadas:</strong> {metrics.currentMonthPaid}
                  </div>
                  <div className="rounded-md border p-3">
                    <strong>Pendientes:</strong> {metrics.currentMonthPending}
                  </div>
                  <div className="rounded-md border p-3">
                    <strong>Vencidas:</strong> {metrics.currentMonthOverdue}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3 font-semibold">Empresa</th>
                        <th className="p-3 font-semibold">Estado Pago Mes</th>
                        <th className="p-3 font-semibold">Vence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.paymentsOfCurrentMonth.map((item) => (
                        <tr
                          key={item.payment.id}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            {item.enterprise.enterprise || item.enterprise.username}
                          </td>
                          <td className="p-3">
                            {item.payment.status === 'paid' ? (
                              <Badge className="bg-emerald-100 text-emerald-800">Pagado</Badge>
                            ) : item.payment.status === 'overdue' ? (
                              <Badge className="bg-red-100 text-red-800">Vencido</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>
                            )}
                          </td>
                          <td className="p-3">{item.payment.due_date || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

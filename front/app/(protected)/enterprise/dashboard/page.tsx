'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Package, Users, Wallet, Gift, ArrowRight, AlertTriangle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { getJobStatusLabel } from '@/lib/model-choice-labels';

type EmployeeListResponse = {
  results?: {
    employees?: any[];
  };
};

type JobsResponse = {
  results?: {
    jobs?: any[];
  };
};

type ProductsResponse = {
  results?: {
    products?: any[];
  };
};

type PaymentsResponse = {
  payments?: Array<{
    id: number;
    year: number;
    month: number;
    amount: string;
    status: 'pending' | 'paid' | 'overdue' | string;
    due_date: string;
  }>;
  summary?: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
};

type EnterpriseBenefitsRedemptionsResponse = {
  redemptions?: Array<{
    id: string;
    product_name?: string;
    employee_name?: string;
    employee_last_name?: string;
    redeemed_at: string;
  }>;
  meta?: {
    total_redemptions?: number;
  };
};

export default function EnterpriseDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [redemptionsCount, setRedemptionsCount] = useState(0);
  const [redemptions, setRedemptions] = useState<EnterpriseBenefitsRedemptionsResponse['redemptions']>([]);
  const [payments, setPayments] = useState({ total: 0, paid: 0, pending: 0, overdue: 0 });
  const [paymentsList, setPaymentsList] = useState<PaymentsResponse['payments']>([]);

  useEffect(() => {
    const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';
    if (!isEnterprise) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [employeesRes, jobsRes, productsRes, paymentsRes, redemptionsRes] = await Promise.all([
          apiClient.get<EmployeeListResponse>('/employee/list/'),
          apiClient.get<JobsResponse>('/job/list/'),
          apiClient.get<ProductsResponse>('/product/list/'),
          apiClient.get<PaymentsResponse>('/billing/my-payments/'),
          apiClient.get<EnterpriseBenefitsRedemptionsResponse>('/enterprise/benefits/redemptions/'),
        ]);

        const employeesItems = employeesRes?.results?.employees || [];
        const jobsItems = jobsRes?.results?.jobs || [];
        const productsItems = productsRes?.results?.products || [];

        setJobs(jobsItems);
        setProducts(productsItems);
        setEmployeesCount(employeesItems.length);
        setJobsCount(jobsItems.length);
        setProductsCount(productsItems.length);

        setPayments(paymentsRes?.summary || { total: 0, paid: 0, pending: 0, overdue: 0 });
        setPaymentsList(paymentsRes?.payments || []);
        setRedemptionsCount(redemptionsRes?.meta?.total_redemptions || 0);
        setRedemptions(redemptionsRes?.redemptions || []);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar tu panel de empresa.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const cards = useMemo(
    () => [
      {
        title: 'Empleados activos',
        value: String(employeesCount),
        href: '/enterprise/employees',
        icon: Users,
        borderClass: 'border-l-blue-500',
        iconClass: 'bg-blue-100 text-blue-600',
      },
      {
        title: 'Vacantes publicadas',
        value: String(jobsCount),
        href: '/enterprise/jobs',
        icon: Briefcase,
        borderClass: 'border-l-violet-500',
        iconClass: 'bg-violet-100 text-violet-600',
      },
      {
        title: 'Beneficios activos',
        value: String(productsCount),
        href: '/enterprise/products',
        icon: Gift,
        borderClass: 'border-l-orange-500',
        iconClass: 'bg-orange-100 text-orange-600',
      },
      {
        title: 'Canjes acumulados',
        value: String(redemptionsCount),
        href: '/enterprise/products',
        icon: Package,
        borderClass: 'border-l-emerald-500',
        iconClass: 'bg-emerald-100 text-emerald-600',
      },
      {
        title: 'Pagos pendientes',
        value: String(payments.pending),
        href: '/enterprise/payments',
        icon: Wallet,
        borderClass: 'border-l-amber-500',
        iconClass: 'bg-amber-100 text-amber-600',
      },
      {
        title: 'Pagos vencidos',
        value: String(payments.overdue),
        href: '/enterprise/payments',
        icon: AlertTriangle,
        borderClass: 'border-l-red-500',
        iconClass: 'bg-red-100 text-red-600',
      },
    ],
    [employeesCount, jobsCount, payments.overdue, payments.pending, productsCount, redemptionsCount]
  );

  const recentJobs = jobs.slice(0, 4);
  const recentBenefits = products.slice(0, 4);
  const latestRedemptions = (redemptions || []).slice(0, 5);
  const nextPendingPayment = (paymentsList || []).find((payment) => payment.status !== 'paid');

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-muted-foreground animate-pulse">Cargando tu panel...</div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-red-500">{error}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-10">
      <div className="flex flex-col gap-3 border-b pb-6">
        <h1 className="text-4xl font-black tracking-tight text-primary">
          Hola, {user?.enterprise || user?.name || 'Empresa'}
        </h1>
        <p className="text-lg text-muted-foreground">
          Resumen de tu operación: equipo, vacantes, beneficios y estado de pagos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className={`h-full cursor-pointer border-l-4 transition-shadow hover:shadow-md ${card.borderClass}`}>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-3xl font-bold">{card.value}</h3>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.iconClass}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Estado de cartera</p>
            <h3 className="text-2xl font-bold">
              Pagados {payments.paid}/{payments.total}
            </h3>
            <p className="text-sm text-muted-foreground">
              Pendientes: {payments.pending} · Vencidos: {payments.overdue}
            </p>
            {nextPendingPayment ? (
              <p className="text-sm text-amber-700">
                Siguiente pago pendiente: {String(nextPendingPayment.month).padStart(2, '0')}/{nextPendingPayment.year}
              </p>
            ) : null}
          </div>
          <Button asChild>
            <Link href="/enterprise/payments" className="gap-2">
              Ver pagos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Vacantes recientes</h2>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/enterprise/jobs">
              Ir a empleos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {recentJobs.map((job) => (
            <Card key={job.id} className="overflow-hidden border">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-semibold">{job.title}</h3>
                  <Badge variant="secondary" className="shrink-0">
                    {getJobStatusLabel(job.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Postulaciones: {job.applications_count || 0}
                </p>
              </CardContent>
            </Card>
          ))}
          {recentJobs.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed py-10 text-center text-muted-foreground">
              No tienes vacantes registradas.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Beneficios recientes</h2>
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/enterprise/products">
              Ir a beneficios
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {recentBenefits.map((product) => (
            <Link key={product.id} href="/enterprise/products" className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                {getImageUrl(product.image) ? (
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                    <Gift className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-primary">{product.category || 'General'}</p>
                <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">{product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Canjes: {product.redemptions_count || 0}
                </p>
              </div>
            </Link>
          ))}
          {recentBenefits.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed py-12 text-center text-muted-foreground">
              No tienes beneficios creados.
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Ultimos canjes registrados</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/enterprise/products">Ver catálogo</Link>
            </Button>
          </div>
          {latestRedemptions.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Aun no hay canjes registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {latestRedemptions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{item.product_name || 'Beneficio'}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${item.employee_name || ''} ${item.employee_last_name || ''}`.trim() || 'Empleado'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.redeemed_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}

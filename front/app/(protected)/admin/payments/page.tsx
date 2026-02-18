'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wallet, Upload, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

type BackendUser = {
  id: string;
  email: string;
  username: string;
  enterprise?: string;
};

type PaymentInfo = {
  id: number;
  year: number;
  month: number;
  amount: string;
  status: 'pending' | 'paid' | 'overdue' | string;
  due_date: string;
  grace_date: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  paid_amount?: string | null;
  payment_proof_url?: string | null;
  paid_reported_by_email?: string | null;
  paid_at?: string | null;
  notes?: string | null;
  can_register?: boolean;
};

type BillingRow = {
  enterprise: BackendUser;
  payments?: PaymentInfo[];
  is_blocked: boolean;
};

type BillingResponse = {
  enterprises: BillingRow[];
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

const paymentMethods = [
  { value: 'transfer', label: 'Transferencia' },
  { value: 'pse', label: 'PSE' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'cash', label: 'Efectivo' },
];

const monthLabel = (year: number, month: number) => `${String(month).padStart(2, '0')}/${year}`;
const isPaymentEnabled = (payment: PaymentInfo) => payment.status !== 'paid' && payment.can_register === true;

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ payment: PaymentInfo; enterpriseName: string } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'transfer',
    paid_amount: '',
    payment_reference: '',
    notes: '',
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const [reportEnterpriseId, setReportEnterpriseId] = useState('');
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [reportMonth, setReportMonth] = useState(String(new Date().getMonth() + 1));
  const [reportData, setReportData] = useState<BillingReportResponse | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadBilling = useCallback(async () => {
    const data = await apiClient.get<BillingResponse>('/billing/enterprises/');
    setRows(data?.enterprises ?? []);
  }, []);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await loadBilling();
      } catch (error: any) {
        toast.error(error?.message || 'No se pudieron cargar los pagos.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadBilling]);

  useEffect(() => {
    const enterpriseId = searchParams.get('enterprise') || '';
    if (enterpriseId) {
      setReportEnterpriseId(enterpriseId);
    }
  }, [searchParams]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.enterprise.enterprise || '').localeCompare(b.enterprise.enterprise || '')),
    [rows]
  );

  const openPaymentModal = (payment: PaymentInfo, enterpriseName: string) => {
    setSelectedPayment({ payment, enterpriseName });
    setPaymentForm({ payment_method: 'transfer', paid_amount: payment.amount || '', payment_reference: '', notes: '' });
    setPaymentProof(null);
    setPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedPayment) return;
    setSavingPayment(true);
    try {
      const body = new FormData();
      body.append('payment_method', paymentForm.payment_method);
      body.append('paid_amount', paymentForm.paid_amount);
      if (paymentForm.payment_reference.trim()) body.append('payment_reference', paymentForm.payment_reference.trim());
      if (paymentForm.notes.trim()) body.append('notes', paymentForm.notes.trim());
      if (paymentProof) body.append('payment_proof', paymentProof);

      await apiClient.post(`/billing/payments/${selectedPayment.payment.id}/mark-paid/`, body);
      toast.success('Pago registrado y marcado como pagado.');
      setPaymentModalOpen(false);
      setSelectedPayment(null);
      await loadBilling();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo registrar el pago.');
    } finally {
      setSavingPayment(false);
    }
  };

  const loadBillingReport = async () => {
    if (!reportEnterpriseId) {
      toast.error('Selecciona una empresa.');
      return;
    }
    setLoadingReport(true);
    try {
      const params = new URLSearchParams({ enterprise_id: reportEnterpriseId, year: reportYear, month: reportMonth });
      const data = await apiClient.get<BillingReportResponse>(`/billing/report/?${params.toString()}`);
      setReportData(data);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar el reporte.');
    } finally {
      setLoadingReport(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'paid') return <Badge className="bg-emerald-100 text-emerald-800">Pagado</Badge>;
    if (status === 'overdue') return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
    return <Badge className="bg-amber-100 text-amber-800">Pendiente</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Pagos Empresas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro y trazabilidad de pagos por empresa.</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Cargando pagos...</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Reporte por empresa y mes</CardTitle>
              <CardDescription>Control mensual para auditoria y seguimiento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <select className="h-10 rounded-md border px-3" value={reportEnterpriseId} onChange={(e) => setReportEnterpriseId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {sortedRows.map((row) => (
                      <option key={row.enterprise.id} value={row.enterprise.id}>{row.enterprise.enterprise || row.enterprise.username}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2"><Label>Anio</Label><Input value={reportYear} onChange={(e) => setReportYear(e.target.value)} /></div>
                <div className="space-y-2"><Label>Mes</Label><Input value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} /></div>
                <div className="flex items-end"><Button onClick={loadBillingReport} disabled={loadingReport} className="w-full">{loadingReport ? 'Cargando...' : 'Ver reporte'}</Button></div>
              </div>

              {reportData && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-2 md:grid-cols-4 text-sm">
                    <div><strong>Total:</strong> {reportData.summary.total}</div>
                    <div><strong>Pagados:</strong> {reportData.summary.paid}</div>
                    <div><strong>Pendientes:</strong> {reportData.summary.pending}</div>
                    <div><strong>Vencidos:</strong> {reportData.summary.overdue}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Accordion type="multiple" className="w-full">
                {sortedRows.map((row) => {
                  const enterpriseName = row.enterprise.enterprise || row.enterprise.username;
                  const pendingCount = (row.payments || []).filter((p) => p.status !== 'paid').length;

                  return (
                    <AccordionItem key={row.enterprise.id} value={row.enterprise.id}>
                      <AccordionTrigger className="px-4">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <div className="font-semibold">{enterpriseName}</div>
                              <div className="text-xs text-muted-foreground">{row.enterprise.email}</div>
                            </div>
                            <div className="hidden md:block text-xs text-muted-foreground">{row.is_blocked ? 'Bloqueada' : 'Operativa'}</div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">{pendingCount} pendientes</div>
                            <div className="text-xs rounded-full bg-slate-100 px-3 py-1 text-slate-700">Ver</div>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-0">
                        <div className="p-4">
                          <div className="mb-4 flex justify-end">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/payments/${row.enterprise.id}`}>Ver detalle completo</Link>
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b bg-slate-50">
                                <tr className="text-left">
                                  <th className="p-3 font-semibold">Mes</th>
                                  <th className="p-3 font-semibold">Estado</th>
                                  <th className="p-3 font-semibold">Monto</th>
                                  <th className="p-3 font-semibold">Accion</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(row.payments || []).map((p) => (
                                  <tr key={p.id} className="border-b">
                                    <td className="p-3">{monthLabel(p.year, p.month)}</td>
                                    <td className="p-3">{statusBadge(p.status)}</td>
                                    <td className="p-3">{p.amount}</td>
                                    <td className="p-3">
                                      {p.status === 'paid' ? (
                                        <span className="text-xs text-muted-foreground">Registrado</span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="gap-2"
                                          onClick={() => openPaymentModal(p, enterpriseName)}
                                          disabled={!isPaymentEnabled(p)}
                                          title={p.can_register ? 'Habilitado para registrar' : 'Se habilita al cierre del mes'}
                                        >
                                          <Wallet className="h-4 w-4" /> Marcar pagado
                                        </Button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Empresa: <strong>{selectedPayment?.enterpriseName || '-'}</strong> | Mes: <strong>{selectedPayment ? monthLabel(selectedPayment.payment.year, selectedPayment.payment.month) : '-'}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Metodo</Label>
              <select className="h-10 rounded-md border px-3" value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}>
                {paymentMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="grid gap-2"><Label>Valor pagado</Label><Input type="number" min="1" value={paymentForm.paid_amount} onChange={(e) => setPaymentForm((p) => ({ ...p, paid_amount: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Referencia</Label><Input value={paymentForm.payment_reference} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_reference: e.target.value }))} /></div>
            <div className="grid gap-2">
              <Label>Comprobante (opcional)</Label>
              <div className="flex items-center gap-2"><Input type="file" onChange={(e) => setPaymentProof(e.target.files?.[0] || null)} /><Upload className="h-4 w-4 text-slate-500" /></div>
            </div>
            <div className="grid gap-2"><Label>Notas</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)} disabled={savingPayment}>Cancelar</Button>
            <Button onClick={submitPayment} disabled={savingPayment || !paymentForm.paid_amount}>
              {savingPayment ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span> : 'Guardar y marcar pagado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

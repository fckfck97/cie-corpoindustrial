'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Users,
  Gift,
  X,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { reportUi } from '@/utils/report-ui';
import { ExportPdfButton } from '@/components/ExportPdfButton';

type Redemption = {
  id: string;
  product_deleted?: boolean;
  product_name?: string;
  product_id_snapshot?: string;
  employee_enterprise_name?: string;
  employee_name?: string;
  employee_last_name?: string;
  employee_email?: string;
  redeemed_at: string;
  redeemed_date?: string;
};

type EnterpriseReport = {
  redemptions: Redemption[];
  by_enterprise: Array<{
    enterprise: string;
    enterprise__enterprise?: string;
    enterprise__username?: string;
    total: number;
  }>;
  enterprises: Array<{
    enterprise: string;
    enterprise__enterprise?: string;
    enterprise__username?: string;
  }>;
  meta?: {
    total_redemptions?: number;
    filtered?: boolean;
  };
};

export default function EnterpriseBenefitsRedemptionsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<EnterpriseReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [openEnterprises, setOpenEnterprises] = useState<Set<string>>(new Set());

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedMonth !== 'all') params.set('month', selectedMonth);

      const url = `/enterprise/benefits/redemptions/${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await apiClient.get<EnterpriseReport>(url);
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [searchTerm, selectedMonth]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedMonth('all');
  };

  const hasActiveFilters = searchTerm || selectedMonth !== 'all';

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  }, []);

  const benefitsGroups = useMemo(() => {
    const grouped = new Map<string, Redemption[]>();
    (report?.redemptions || []).forEach((redemption) => {
      const key = redemption.product_name || redemption.product_id_snapshot || 'Sin beneficio';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(redemption);
    });
    return Array.from(grouped.entries())
      .map(([name, redemptions]) => ({ name, redemptions, total: redemptions.length }))
      .sort((a, b) => b.total - a.total);
  }, [report?.redemptions]);

  const toggleBenefit = (benefitName: string) => {
    setOpenEnterprises((prev) => {
      const next = new Set(prev);
      if (next.has(benefitName)) next.delete(benefitName);
      else next.add(benefitName);
      return next;
    });
  };

  const getEnterpriseLabel = (redemption: Redemption) => redemption.employee_enterprise_name?.trim() || '-';

  const exportToPDF = () => {
    if (!report?.redemptions || report.redemptions.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permite ventanas emergentes para exportar PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Canjes de Beneficios</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
            .meta { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
            .meta-item { display: inline-block; margin-right: 30px; font-size: 14px; }
            .meta-label { font-weight: bold; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #2563eb; color: white; padding: 12px; text-align: left; font-weight: 600; }
            td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .deleted { color: #f59e0b; font-size: 11px; font-weight: 600; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
            @media print { body { margin: 0; padding: 15px; } }
          </style>
        </head>
        <body>
          <h1>📊 Reporte de Canjes de Beneficios</h1>
          <div class="meta">
            <div class="meta-item"><span class="meta-label">Total de canjes:</span> ${report.meta?.total_redemptions || 0}</div>
            <div class="meta-item"><span class="meta-label">Fecha de generación:</span> ${new Date().toLocaleString('es-ES')}</div>
            ${hasActiveFilters ? '<div class="meta-item"><span class="meta-label">⚠️ Reporte filtrado</span></div>' : ''}
          </div>
          <h2>Canjes por Beneficio</h2>
          ${(benefitsGroups || [])
            .map(
              (group) => `
            <h3 style="margin-top:22px;">${group.name} (${group.total} canjes)</h3>
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Empleado</th>
                  <th>Correo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                ${group.redemptions
                  .map(
                    (r) => `
                  <tr>
                    <td>${getEnterpriseLabel(r)}</td>
                    <td>${`${r.employee_name || ''} ${r.employee_last_name || ''}`.trim() || '-'}</td>
                    <td>${r.employee_email || '-'}</td>
                    <td>${new Date(r.redeemed_at).toLocaleString('es-ES')}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          `
            )
            .join('')}
          <div class="footer"><p>Sistema de Gestión de Beneficios Empresariales</p></div>
          <script>window.onload = function(){ window.print(); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className={reportUi.headerRow}>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Gift className="h-8 w-8 text-primary" />
              Canjes de Beneficios
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Canjes de tu empresa: cuántos hay y quién canjeó cada beneficio.
            </p>
          </div>
          <div className={reportUi.actionsRow}>
            <ExportPdfButton
              onClick={exportToPDF}
              className={reportUi.exportButton}
              disabled={(report?.redemptions || []).length === 0}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Búsqueda
                </label>
                <Input
                  placeholder="Buscar por beneficio, nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Mes
                </label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">Filtros activos</Badge>
                <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-7 gap-1">
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Canjes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report?.meta?.total_redemptions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {report?.meta?.filtered ? 'Resultados filtrados' : 'Todos los registros'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Beneficios Canjeados</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{benefitsGroups.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Con al menos un canje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Beneficio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {benefitsGroups.length > 0
                  ? Math.round((report?.meta?.total_redemptions || 0) / benefitsGroups.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Canjes por beneficio</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Resumen por Beneficio
            </CardTitle>
            <CardDescription>Cuántos canjes tiene cada beneficio</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : benefitsGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Sin registros</div>
            ) : (
              <div className="space-y-2">
                {benefitsGroups.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="font-semibold">{item.name}</div>
                    <Badge className="text-sm">{item.total} canjes</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalle de Canjes
            </CardTitle>
            <CardDescription>
              Vista detallada de todos los canjes ({report?.redemptions?.length || 0} registros)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (report?.redemptions || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay canjes registrados</div>
            ) : (
              <div className="space-y-4">
                {benefitsGroups.map((benefitItem) => {
                  const redemptions = benefitItem.redemptions;
                  const isOpen = openEnterprises.has(benefitItem.name);
                  return (
                    <Collapsible
                      key={benefitItem.name}
                      open={isOpen}
                      onOpenChange={() => toggleBenefit(benefitItem.name)}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-base">{benefitItem.name}</CardTitle>
                                <CardDescription>{benefitItem.total} canjes registrados</CardDescription>
                              </div>
                              <Badge variant="secondary" className="text-base px-3 py-1">
                                {benefitItem.total}
                              </Badge>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <Separator className="mb-4" />
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="border-b bg-muted/50">
                                  <tr className="text-left">
                                    <th className="p-3 font-semibold">Empresa</th>
                                    <th className="p-3 font-semibold">Empleado</th>
                                    <th className="p-3 font-semibold">Correo</th>
                                    <th className="p-3 font-semibold">Fecha</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {redemptions.map((redemption) => (
                                    <tr key={redemption.id} className="border-b hover:bg-muted/30 transition-colors">
                                      <td className="p-3 text-muted-foreground">{getEnterpriseLabel(redemption)}</td>
                                      <td className="p-3">
                                        {`${redemption.employee_name || ''} ${redemption.employee_last_name || ''}`.trim() || '-'}
                                      </td>
                                      <td className="p-3 text-muted-foreground">{redemption.employee_email || '-'}</td>
                                      <td className="p-3 text-muted-foreground">
                                        {new Date(redemption.redeemed_at).toLocaleString('es-ES', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

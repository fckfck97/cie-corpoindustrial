'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api-client';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Building2,
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

type Redemption = {
  id: string;
  product_deleted?: boolean;
  product_name?: string;
  product_id_snapshot?: string;
  enterprise_name?: string;
  employee_name?: string;
  employee_last_name?: string;
  employee_email?: string;
  redeemed_at: string;
  redeemed_date?: string;
  enterprise?: string;
};

type Enterprise = {
  enterprise: string;
  enterprise__enterprise?: string;
  enterprise__username?: string;
};

type AdminReport = {
  redemptions: Redemption[];
  by_enterprise: Array<{ 
    enterprise: string; 
    enterprise__enterprise?: string; 
    enterprise__username?: string; 
    total: number;
  }>;
  enterprises: Enterprise[];
  meta?: { 
    total_redemptions?: number;
    filtered?: boolean;
  };
};

export default function AdminBenefitsRedemptionsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnterprise, setSelectedEnterprise] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [openEnterprises, setOpenEnterprises] = useState<Set<string>>(new Set());

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedEnterprise !== 'all') params.set('enterprise_id', selectedEnterprise);
      if (selectedMonth !== 'all') params.set('month', selectedMonth);
      
      const url = `/api/admin/benefits/redemptions/${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await apiClient.get<AdminReport>(url);
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [searchTerm, selectedEnterprise, selectedMonth]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedEnterprise('all');
    setSelectedMonth('all');
  };

  const hasActiveFilters = searchTerm || selectedEnterprise !== 'all' || selectedMonth !== 'all';

  // Generar opciones de meses (últimos 12 meses)
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

  // Agrupar redenciones por empresa
  const redemptionsByEnterprise = useMemo(() => {
    const grouped = new Map<string, Redemption[]>();
    (report?.redemptions || []).forEach((redemption) => {
      const key = redemption.enterprise || 'sin-empresa';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(redemption);
    });
    return grouped;
  }, [report?.redemptions]);

  const topEnterprises = useMemo(() => report?.by_enterprise || [], [report]);

  const toggleEnterprise = (enterpriseId: string) => {
    setOpenEnterprises((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(enterpriseId)) {
        newSet.delete(enterpriseId);
      } else {
        newSet.add(enterpriseId);
      }
      return newSet;
    });
  };

  const exportToExcel = () => {
    if (!report?.redemptions || report.redemptions.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear CSV (compatible con Excel)
    const headers = ['Empresa', 'Beneficio', 'Empleado', 'Correo', 'Fecha'];
    const rows = report.redemptions.map((r) => [
      r.enterprise_name || '-',
      r.product_name || r.product_id_snapshot || '-',
      `${r.employee_name || ''} ${r.employee_last_name || ''}`.trim() || '-',
      r.employee_email || '-',
      new Date(r.redeemed_at).toLocaleString('es-ES'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `canjes-beneficios-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!report?.redemptions || report.redemptions.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Abrir ventana de impresión (el usuario puede guardar como PDF)
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
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1 {
              color: #2563eb;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 10px;
            }
            .meta {
              margin: 20px 0;
              padding: 15px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .meta-item {
              display: inline-block;
              margin-right: 30px;
              font-size: 14px;
            }
            .meta-label {
              font-weight: bold;
              color: #64748b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) {
              background: #f8fafc;
            }
            .deleted {
              color: #f59e0b;
              font-size: 11px;
              font-weight: 600;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body>
          <h1>📊 Reporte de Canjes de Beneficios</h1>
          <div class="meta">
            <div class="meta-item">
              <span class="meta-label">Total de canjes:</span> ${report.meta?.total_redemptions || 0}
            </div>
            <div class="meta-item">
              <span class="meta-label">Fecha de generación:</span> ${new Date().toLocaleString('es-ES')}
            </div>
            ${hasActiveFilters ? '<div class="meta-item"><span class="meta-label">⚠️ Reporte filtrado</span></div>' : ''}
          </div>
          
          <h2>Resumen por Empresa</h2>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th style="text-align: right;">Total de Canjes</th>
              </tr>
            </thead>
            <tbody>
              ${topEnterprises
                .map(
                  (item) => `
                <tr>
                  <td>${item.enterprise__enterprise || item.enterprise__username || item.enterprise}</td>
                  <td style="text-align: right; font-weight: bold;">${item.total}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <h2 style="margin-top: 40px;">Detalle de Canjes</h2>
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Beneficio</th>
                <th>Empleado</th>
                <th>Correo</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${report.redemptions
                .map(
                  (r) => `
                <tr>
                  <td>${r.enterprise_name || '-'}</td>
                  <td>
                    ${r.product_name || r.product_id_snapshot || '-'}
                    ${r.product_deleted ? '<span class="deleted">[Eliminado]</span>' : ''}
                  </td>
                  <td>${`${r.employee_name || ''} ${r.employee_last_name || ''}`.trim() || '-'}</td>
                  <td>${r.employee_email || '-'}</td>
                  <td>${new Date(r.redeemed_at).toLocaleString('es-ES')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Sistema de Gestión de Beneficios Empresariales</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            Canjes de Beneficios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control y análisis de redenciones por empresa
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Búsqueda */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Búsqueda
              </label>
              <Input
                placeholder="Buscar por nombre, correo, beneficio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro por Empresa */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Empresa
              </label>
              <Select value={selectedEnterprise} onValueChange={setSelectedEnterprise}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {(report?.enterprises || []).map((ent) => (
                    <SelectItem key={ent.enterprise} value={ent.enterprise}>
                      {ent.enterprise__enterprise || ent.enterprise__username || ent.enterprise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Mes */}
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
              <Badge variant="secondary" className="gap-1">
                Filtros activos
              </Badge>
              <Button onClick={handleClearFilters} variant="ghost" size="sm" className="h-7 gap-1">
                <X className="h-3 w-3" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
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
            <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topEnterprises.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Con beneficios canjeados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Empresa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topEnterprises.length > 0
                ? Math.round((report?.meta?.total_redemptions || 0) / topEnterprises.length)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Canjes por empresa</p>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Resumen por Empresa
          </CardTitle>
          <CardDescription>Ranking de empresas por número de canjes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : topEnterprises.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Sin registros</div>
          ) : (
            <div className="space-y-2">
              {topEnterprises.map((item, idx) => {
                const total = report?.meta?.total_redemptions || 1;
                const percentage = ((item.total / total) * 100).toFixed(1);
                return (
                  <div
                    key={`${item.enterprise}-${idx}`}
                    className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {item.enterprise__enterprise || item.enterprise__username || item.enterprise}
                      </div>
                      <div className="text-sm text-muted-foreground">{percentage}% del total</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{item.total}</div>
                      <div className="text-xs text-muted-foreground">canjes</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle por Empresa (Agrupado) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalle de Canjes por Empresa
          </CardTitle>
          <CardDescription>
            Vista organizada de todos los canjes ({report?.redemptions?.length || 0} registros)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (report?.redemptions || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay canjes registrados</div>
          ) : (
            <div className="space-y-4">
              {topEnterprises.map((enterpriseItem) => {
                const redemptions = redemptionsByEnterprise.get(enterpriseItem.enterprise) || [];
                const isOpen = openEnterprises.has(enterpriseItem.enterprise);
                const enterpriseName =
                  enterpriseItem.enterprise__enterprise ||
                  enterpriseItem.enterprise__username ||
                  enterpriseItem.enterprise;

                return (
                  <Collapsible
                    key={enterpriseItem.enterprise}
                    open={isOpen}
                    onOpenChange={() => toggleEnterprise(enterpriseItem.enterprise)}
                  >
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{enterpriseName}</CardTitle>
                                <CardDescription>{enterpriseItem.total} canjes registrados</CardDescription>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-base px-3 py-1">
                              {enterpriseItem.total}
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
                                  <th className="p-3 font-semibold">Beneficio</th>
                                  <th className="p-3 font-semibold">Empleado</th>
                                  <th className="p-3 font-semibold">Correo</th>
                                  <th className="p-3 font-semibold">Fecha</th>
                                </tr>
                              </thead>
                              <tbody>
                                {redemptions.map((redemption) => (
                                  <tr key={redemption.id} className="border-b hover:bg-muted/30 transition-colors">
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                          {redemption.product_name || redemption.product_id_snapshot || '-'}
                                        </span>
                                        {redemption.product_deleted && (
                                          <Badge variant="outline" className="border-amber-500/40 text-amber-700 text-xs">
                                            Eliminado
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3">
                                      {`${redemption.employee_name || ''} ${redemption.employee_last_name || ''}`
                                        .trim() || '-'}
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
  );
}

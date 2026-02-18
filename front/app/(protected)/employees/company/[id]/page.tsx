'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchEmployeeEnterpriseDetail, type EmployeeEnterpriseDetailResponse } from '@/lib/employee-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';
import { getJobPriorityLabel } from '@/lib/model-choice-labels';

export default function EmployeesCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<EmployeeEnterpriseDetailResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchEmployeeEnterpriseDetail(companyId);
        setDetail(response);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar la empresa.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  if (loading) return <div className="py-10 text-center text-muted-foreground">Cargando empresa...</div>;
  if (error) return <div className="py-10 text-center text-red-600">{error}</div>;
  if (!detail) return <div className="py-10 text-center text-muted-foreground">Empresa no encontrada.</div>;

  const enterprise = detail.enterprise;
  const normalizeLink = (value?: string) => {
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `https://${value}`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero Banner */}
      <div className="relative rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="h-48 md:h-64 w-full bg-muted/30">
        {getImageUrl(enterprise.banner) && (
          <img src={getImageUrl(enterprise.banner)} alt={`Banner ${enterprise.name}`} className="h-full w-full object-cover" />
        )}
        </div>
        
        <div className="relative px-6 pb-6 mt-[-3rem] md:flex md:items-end md:justify-between md:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
                <div className="h-24 w-24 rounded-xl border-4 border-background bg-card shadow-lg overflow-hidden shrink-0">
                    {getImageUrl(enterprise.avatar) ? (
                    <img src={getImageUrl(enterprise.avatar)} alt={enterprise.name} className="h-full w-full object-cover" />
                    ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">Sin logo</div>
                    )}
                </div>
                <div className="text-center md:text-left md:mb-2">
                    <h1 className="text-3xl font-black tracking-tight">{enterprise.name}</h1>
                    <p className="text-sm text-muted-foreground">{enterprise.niche || 'Empresa'}</p>
                </div>
            </div>
            
            <div className="mt-4 md:mt-0 md:mb-2 flex gap-2 justify-center">
                 <Button asChild variant="outline" className="backdrop-blur-xl bg-background/50">
                    <Link href="/employees/company">Volver al directorio</Link>
                 </Button>
            </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
             <div className="rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm space-y-4">
                <h2 className="text-lg font-semibold tracking-tight">Acerca de {enterprise.name}</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p>{enterprise.description || 'Sin descripción disponible.'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-background/50 border text-sm">
                        <span className="block font-medium text-foreground">Dirección</span>
                        <span className="text-muted-foreground">{enterprise.address || 'No registrada'}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border text-sm">
                         <span className="block font-medium text-foreground">Contacto</span>
                        <span className="text-muted-foreground">{enterprise.email || '-'}</span>
                    </div>
                </div>
             </div>

             {/* Jobs Grid */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Vacantes disponibles</h3>
                    <Badge variant="secondary">{detail.jobs.length}</Badge>
                </div>
                {detail.jobs.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                         {detail.jobs.slice(0, 10).map((job) => (
                            <Link key={job.id} href={`/employees/jobs/${job.id}`} className="group block">
                                <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{job.title}</div>
                                        <Badge variant="outline" className="text-[10px] h-5">{getJobPriorityLabel(job.priority)}</Badge>
                                    </div>
                                    <div className="h-32 w-full rounded-lg bg-muted overflow-hidden mb-3">
                                        {getImageUrl(job.image) && (
                                            <img src={getImageUrl(job.image)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )}
                                    </div>
                                    <Button size="sm" variant="secondary" className="w-full">Ver detalle</Button>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        No hay vacantes activas por el momento.
                    </div>
                )}
             </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
            <div className="rounded-xl border bg-card/50 p-5 backdrop-blur-sm shadow-sm space-y-4">
                 <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Redes Sociales</h3>
                 <div className="space-y-2">
                    {enterprise.facebook && (
                        <a href={normalizeLink(enterprise.facebook)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-sm">
                            <span>Facebook</span>
                            <span className="text-primary">Ver perfil &rarr;</span>
                        </a>
                    )}
                    {enterprise.instagram && (
                        <a href={normalizeLink(enterprise.instagram)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-sm">
                            <span>Instagram</span>
                            <span className="text-primary">Ver perfil &rarr;</span>
                        </a>
                    )}
                    {enterprise.X && (
                        <a href={normalizeLink(enterprise.X)} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-sm">
                            <span>X (Twitter)</span>
                            <span className="text-primary">Ver perfil &rarr;</span>
                        </a>
                    )}
                    {!enterprise.facebook && !enterprise.instagram && !enterprise.X && (
                        <p className="text-sm text-muted-foreground p-2">Sin redes conectadas.</p>
                    )}
                 </div>
            </div>

            <div className="rounded-xl border bg-card/50 p-5 backdrop-blur-sm shadow-sm">
                 <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Beneficios Activos</h3>
                 <div className="space-y-3">
                    {detail.benefits.slice(0, 5).map((benefit) => (
                         <Link key={benefit.id} href={`/employees/benefits/${benefit.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group">
                             <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0 border">
                                {getImageUrl(benefit.image) && (
                                    <img src={getImageUrl(benefit.image)} alt="" className="h-full w-full object-cover" />
                                )}
                             </div>
                             <div className="overflow-hidden">
                                 <div className="text-sm font-medium truncate group-hover:text-primary">{benefit.name}</div>
                                 <div className="text-xs text-muted-foreground">{benefit.category}</div>
                             </div>
                         </Link>
                    ))}
                    {detail.benefits.length === 0 && (
                        <p className="text-sm text-muted-foreground">Esta empresa no tiene beneficios listados.</p>
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}

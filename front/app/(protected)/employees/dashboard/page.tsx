'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchEmployeeDashboard, type EmployeePortalResponse } from '@/lib/employee-portal';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Briefcase, Gift, Building2, ArrowRight, MapPin, Clock, RotateCcw } from 'lucide-react';
import { getJobPriorityLabel } from '@/lib/model-choice-labels';
import { getImageUrl } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function EmployeesDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeePortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardOpen, setCardOpen] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  useEffect(() => {
    const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';
    if (!isEmployee) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetchEmployeeDashboard();
        setData(response);
      } catch (err: any) {
        setError(err?.message || 'No se pudo cargar tu panel.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading) {
     return <div className="py-20 text-center text-muted-foreground animate-pulse">Cargando tu panel...</div>;
  }

  if (error) {
     return <div className="py-20 text-center text-red-500">{error}</div>;
  }

  const linkedEnterprise = data?.linked_enterprise || null;
  const employeeName = user?.name || 'Empleado';
  const employeeDocument = user?.nuip || 'Sin documento';
  const enterpriseName = linkedEnterprise?.name || user?.enterprise || 'Empresa asociada';
  const enterpriseLogo = getImageUrl(linkedEnterprise?.avatar || '');
  const enterpriseAddress = linkedEnterprise?.address || 'Sin dirección registrada';
  const enterprisePhone = linkedEnterprise?.phone || 'Sin teléfono registrado';
  const enterpriseEmail = linkedEnterprise?.email || 'Sin correo registrado';

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight text-primary">Hola, {user?.name || 'Bienvenido'}</h1>
          <p className="text-lg text-muted-foreground">
            Resumen de tu actividad y oportunidades recientes.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCardFlipped(false);
            setCardOpen(true);
          }}
        >
          Ver tarjeta
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/employees/company">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Empresas Aliadas</p>
                <h3 className="text-3xl font-bold">{data?.meta.total_enterprises || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/employees/jobs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 border-l-green-500">
             <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Bolsa de Empleo activa</p>
                <h3 className="text-3xl font-bold">{data?.meta.total_jobs || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <Briefcase className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/employees/benefits">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-l-4 border-l-orange-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Portafolio de Beneficios</p>
                <h3 className="text-3xl font-bold">{data?.meta.total_benefits || 0}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Gift className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Bolsa de Empleo reciente</h2>
            <Button asChild variant="ghost" className="gap-2">
                <Link href="/employees/jobs">Ver todos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.jobs || []).map((job) => (
                <div key={job.id} className="group relative bg-card rounded-xl border shadow-sm transition-all hover:shadow-md overflow-hidden flex flex-col">
                     <div className="p-5 flex-1 space-y-4">
                         <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border bg-muted">
                                    <AvatarImage src={getImageUrl(job.image)} alt={job.enterprise || 'Empresa'} />
                                    <AvatarFallback className="text-xs uppercase">{job.enterprise?.substring(0,2) || 'EM'}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium line-clamp-1">{job.enterprise || 'Confidencial'}</p>
                                    <p className="text-xs text-muted-foreground">Empresa Contratante</p>
                                </div>
                            </div>
                            {job.priority && (
                                <Badge variant={job.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize shrink-0">
                                    {getJobPriorityLabel(job.priority)}
                                </Badge>
                            )}
                         </div>
                         
                         <div>
                             <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">{job.title}</h3>
                             <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{job.city || 'Remoto'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>Reciente</span>
                                </div>
                             </div>
                         </div>
                     </div>
                     <div className="p-4 border-t bg-muted/30">
                        <Button asChild className="w-full" variant="outline">
                            <Link href={`/employees/jobs/${job.id}`}>Ver Oportunidad</Link>
                        </Button>
                     </div>
                </div>
            ))}
             {(!data?.jobs || data.jobs.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                    No hay ofertas recientes.
                </div>
            )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Portafolio de Beneficios reciente</h2>
            <Button asChild variant="ghost" className="gap-2">
                <Link href="/employees/benefits">Ver todos <ArrowRight className="h-4 w-4" /></Link>
            </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(data?.benefits || []).map((benefit) => (
                <Link key={benefit.id} href={`/employees/benefits/${benefit.id}`} className="group block">
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted">
                         {getImageUrl(benefit.image) ? (
                            <img
                                src={getImageUrl(benefit.image)}
                                alt={benefit.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-secondary/30">
                                <Gift className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                        )}
                        <div className="absolute top-2 right-2">
                             <Badge className="bg-white/90 text-black shadow-sm backdrop-blur-sm hover:bg-white">
                                {benefit.discount_percentage ? `-${benefit.discount_percentage}%` : 'Promo'}
                             </Badge>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-primary uppercase tracking-wider">{benefit.category || 'General'}</p>
                        <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-1">{benefit.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{benefit.enterprise || 'Empresa Aliada'}</p>
                    </div>
                </Link>
            ))}
             {(!data?.benefits || data.benefits.length === 0) && (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                    No hay beneficios recientes en el portafolio.
                </div>
            )}
        </div>
      </div>

      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tarjeta de empleado</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="mx-auto w-full max-w-md cursor-pointer [perspective:1200px]"
              onClick={() => setCardFlipped((prev) => !prev)}
              role="button"
              aria-label="Girar tarjeta"
            >
              <div className={`relative aspect-[1.586/1] w-full transition-transform duration-700 [transform-style:preserve-3d] ${cardFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                <div className="absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden]">
                  <img
                    src="/card/cie-card-front.jpg"
                    alt="Tarjeta frontal"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <img
                    src="/card/cie-card-back.jpg"
                    alt="Tarjeta reverso"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 text-white">
                    <div className="absolute inset-x-0 top-0 h-[44%] bg-slate-500/84" />
                    <div className="absolute inset-x-0 top-[44%] h-[7%] bg-gradient-to-r from-amber-900/80 via-amber-500/55 to-amber-900/80" />
                    <div className="absolute inset-x-0 bottom-0 h-[49%] bg-black/68" />

                    <div className="relative z-10 h-full p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-white/80">Empresa</p>
                          <p className="line-clamp-1 text-[23px] font-bold leading-tight">{enterpriseName}</p>
                        </div>
                        {enterpriseLogo ? (
                          <div className="rounded-xl bg-white p-1.5 shadow-md">
                            <img
                              src={enterpriseLogo}
                              alt={enterpriseName}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xs font-bold text-black shadow-md">
                            {enterpriseName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5 text-base leading-tight">
                        <p><span className="text-white/75">Empleado:</span> {employeeName}</p>
                        <p><span className="text-white/75">Documento:</span> {employeeDocument}</p>
                        <p><span className="text-white/75">Correo:</span> {enterpriseEmail}</p>
                        <p><span className="text-white/75">Tel:</span> {enterprisePhone}</p>
                        <p className="line-clamp-2"><span className="text-white/75">Dirección:</span> {enterpriseAddress}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-center text-xs text-muted-foreground animate-pulse">
              Haz click sobre la tarjeta para girarla
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { fetchEmployeeEnterpriseDetail, type EmployeeEnterpriseDetailResponse } from '@/lib/employee-portal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/utils';
import { getJobPriorityLabel } from '@/lib/model-choice-labels';
import { ExternalLink, Facebook, Instagram, Mail, MapPin, Twitter } from 'lucide-react';

export default function EmployeesCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const companyId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<EmployeeEnterpriseDetailResponse | null>(null);
  const [openLocationModal, setOpenLocationModal] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [jobsPage, setJobsPage] = useState(1);
  const [benefitsPage, setBenefitsPage] = useState(1);
  const PAGE_SIZE = 10;

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

  useEffect(() => {
    setJobsPage(1);
    setBenefitsPage(1);
  }, [detail?.enterprise?.id]);
  const enterprise = detail?.enterprise;
  const parseCoordinate = (value?: string | number | null) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const latitude = parseCoordinate(enterprise?.latitude);
  const longitude = parseCoordinate(enterprise?.longitude);
  const hasCoordinates = latitude !== null && longitude !== null;
  const displayAddress = enterprise?.address || resolvedAddress || (hasCoordinates ? 'Buscando dirección...' : 'No registrada');
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(longitude - 0.02)}%2C${(latitude - 0.02)}%2C${(longitude + 0.02)}%2C${(latitude + 0.02)}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;
  const openStreetMapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
    : '';

  const normalizeLink = (value?: string) => {
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `https://${value}`;
  };

  useEffect(() => {
    if (!enterprise || enterprise.address || !hasCoordinates) {
      setResolvedAddress('');
      return;
    }

    let cancelled = false;
    const resolve = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        );
        if (!response.ok) return;
        const data = await response.json();
        const label = data?.display_name ? String(data.display_name).trim() : '';
        if (!cancelled) setResolvedAddress(label);
      } catch {
        if (!cancelled) setResolvedAddress('');
      }
    };
    resolve();

    return () => {
      cancelled = true;
    };
  }, [enterprise, hasCoordinates, latitude, longitude]);

  if (loading) return <div className="py-10 text-center text-muted-foreground">Cargando empresa...</div>;
  if (error) return <div className="py-10 text-center text-red-600">{error}</div>;
  if (!enterprise || !detail) return <div className="py-10 text-center text-muted-foreground">Empresa no encontrada.</div>;

  const jobsTotalPages = Math.max(1, Math.ceil(detail.jobs.length / PAGE_SIZE));
  const safeJobsPage = Math.min(jobsPage, jobsTotalPages);
  const jobsStart = (safeJobsPage - 1) * PAGE_SIZE;
  const paginatedJobs = detail.jobs.slice(jobsStart, jobsStart + PAGE_SIZE);

  const benefitsTotalPages = Math.max(1, Math.ceil(detail.benefits.length / PAGE_SIZE));
  const safeBenefitsPage = Math.min(benefitsPage, benefitsTotalPages);
  const benefitsStart = (safeBenefitsPage - 1) * PAGE_SIZE;
  const paginatedBenefits = detail.benefits.slice(benefitsStart, benefitsStart + PAGE_SIZE);

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
                <div className="text-center md:text-left md:mb-2 md:mt-15">
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

      <div className="space-y-6">
             <div className="rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm space-y-4">
                <h2 className="text-lg font-semibold tracking-tight">Acerca de {enterprise.name}</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                    <p>{enterprise.description || 'Sin descripción disponible.'}</p>
                </div>
                <div className="pt-2">
                  <div className="rounded-xl border bg-background/70 p-4 text-sm shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="rounded-full bg-sky-100 p-1.5">
                            <Mail className="h-4 w-4 text-sky-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Contacto</p>
                            <p className="text-muted-foreground break-all">{enterprise.email || 'No registrado'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="rounded-full bg-emerald-100 p-1.5">
                            <MapPin className="h-4 w-4 text-emerald-700" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">Dirección</p>
                            <p className="text-muted-foreground leading-relaxed">{displayAddress}</p>
                          </div>
                        </div>
                      </div>
                      {hasCoordinates ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenLocationModal(true)}
                          className="gap-2 self-start"
                        >
                          <MapPin className="h-4 w-4" />
                          Ver ubicación
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="pt-1 space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Redes Sociales</h3>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {enterprise.facebook && (
                      <a
                        href={normalizeLink(enterprise.facebook)}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-3 transition-all hover:shadow-sm hover:border-blue-200 text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Facebook className="h-4 w-4 text-blue-600" />
                          Facebook
                        </span>
                        <span className="text-blue-600 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </a>
                    )}
                    {enterprise.instagram && (
                      <a
                        href={normalizeLink(enterprise.instagram)}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/60 p-3 transition-all hover:shadow-sm hover:border-pink-200 text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Instagram className="h-4 w-4 text-pink-600" />
                          Instagram
                        </span>
                        <span className="text-pink-600 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </a>
                    )}
                    {enterprise.X && (
                      <a
                        href={normalizeLink(enterprise.X)}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition-all hover:shadow-sm hover:border-neutral-300 text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Twitter className="h-4 w-4 text-neutral-700" />
                          X (Twitter)
                        </span>
                        <span className="text-neutral-700 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                      </a>
                    )}
                  </div>
                  {!enterprise.facebook && !enterprise.instagram && !enterprise.X && (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
                      Sin redes conectadas.
                    </p>
                  )}
                </div>
             </div>

             {/* Jobs Grid */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Vacantes disponibles</h3>
                    <Badge variant="secondary">{detail.jobs.length}</Badge>
                </div>
                {detail.jobs.length > 0 ? (
                    <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                         {paginatedJobs.map((job) => (
                            <Link key={job.id} href={`/employees/jobs/${job.id}`} className="group block">
                                <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 aspect-square flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{job.title}</div>
                                        <Badge variant="outline" className="text-[10px] h-5">{getJobPriorityLabel(job.priority)}</Badge>
                                    </div>
                                    <div className="w-full rounded-lg bg-muted overflow-hidden mb-3 aspect-square">
                                        {getImageUrl(job.image) && (
                                            <img src={getImageUrl(job.image)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )}
                                    </div>
                                    <Button size="sm" variant="secondary" className="w-full mt-auto">Ver detalle</Button>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {detail.jobs.length > PAGE_SIZE ? (
                      <div className="mt-4 flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Página {safeJobsPage} de {jobsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setJobsPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeJobsPage <= 1}
                          >
                            Anterior
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setJobsPage((prev) => Math.min(jobsTotalPages, prev + 1))}
                            disabled={safeJobsPage >= jobsTotalPages}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        No hay vacantes activas por el momento.
                    </div>
                )}
             </div>

             {/* Benefits Grid */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Beneficios activos</h3>
                    <Badge variant="secondary">{detail.benefits.length}</Badge>
                </div>
                {detail.benefits.length > 0 ? (
                    <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                         {paginatedBenefits.map((benefit) => (
                            <Link key={benefit.id} href={`/employees/benefits/${benefit.id}`} className="group block">
                                <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 aspect-square flex flex-col">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <div className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{benefit.name}</div>
                                        <Badge variant="outline" className="text-[10px] h-5">{benefit.category || 'Beneficio'}</Badge>
                                    </div>
                                    <div className="w-full rounded-lg bg-muted overflow-hidden mb-3 aspect-square">
                                        {getImageUrl(benefit.image) && (
                                            <img src={getImageUrl(benefit.image)} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        )}
                                    </div>
                                    <Button size="sm" variant="secondary" className="w-full mt-auto">Ver detalle</Button>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {detail.benefits.length > PAGE_SIZE ? (
                      <div className="mt-4 flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Página {safeBenefitsPage} de {benefitsTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBenefitsPage((prev) => Math.max(1, prev - 1))}
                            disabled={safeBenefitsPage <= 1}
                          >
                            Anterior
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBenefitsPage((prev) => Math.min(benefitsTotalPages, prev + 1))}
                            disabled={safeBenefitsPage >= benefitsTotalPages}
                          >
                            Siguiente
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        Esta empresa no tiene beneficios activos por el momento.
                    </div>
                )}
             </div>
      </div>

      <Dialog open={openLocationModal} onOpenChange={setOpenLocationModal}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación de {enterprise.name}
            </DialogTitle>
            <DialogDescription>{displayAddress}</DialogDescription>
          </DialogHeader>

          {mapUrl ? (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  title={`Ubicación ${enterprise.name}`}
                  src={mapUrl}
                  className="h-[420px] w-full"
                  loading="lazy"
                />
              </div>
              <Button asChild variant="outline" className="gap-2">
                <a href={openStreetMapUrl} target="_blank" rel="noreferrer">
                  Abrir en OpenStreetMap
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta empresa no tiene coordenadas registradas.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

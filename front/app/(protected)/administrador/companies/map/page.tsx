'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2, ExternalLink, MapPinned, Search } from 'lucide-react';
import { toast } from 'sonner';

type EnterpriseItem = {
  id: string;
  name: string;
  email: string;
  address?: string;
  niche?: string;
  phone?: string;
  description?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type EnterpriseMapResponse = {
  enterprises?: EnterpriseItem[];
};

const parseCoordinate = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAddress = (value?: string) => {
  if (!value) return '';
  return value.trim();
};

const buildMapUrl = (latitude: number, longitude: number) => {
  const delta = 0.02;
  const left = longitude - delta;
  const right = longitude + delta;
  const bottom = latitude - delta;
  const top = latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

export default function AdminCompaniesMapPage() {
  const [items, setItems] = useState<EnterpriseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resolvedAddressById, setResolvedAddressById] = useState<Record<string, string>>({});
  const PAGE_SIZE = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get<EnterpriseMapResponse>('/admin/enterprise-map/');
        const enterprises = data?.enterprises ?? [];
        setItems(enterprises);

        const firstWithLocation = enterprises.find((item) => {
          const lat = parseCoordinate(item.latitude);
          const lng = parseCoordinate(item.longitude);
          return lat !== null && lng !== null;
        });
        setSelectedId(firstWithLocation?.id ?? null);
      } catch (error: any) {
        toast.error(error?.message || 'No se pudo cargar el mapa de empresas.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const locatedEnterprises = useMemo(
    () =>
      items.filter((item) => {
        const lat = parseCoordinate(item.latitude);
        const lng = parseCoordinate(item.longitude);
        return lat !== null && lng !== null;
      }),
    [items],
  );

  const nonLocatedEnterprises = useMemo(
    () =>
      items.filter((item) => {
        const lat = parseCoordinate(item.latitude);
        const lng = parseCoordinate(item.longitude);
        return lat === null || lng === null;
      }),
    [items],
  );

  const filteredLocatedEnterprises = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return locatedEnterprises;
    return locatedEnterprises.filter((item) => {
      return (
        (item.name || '').toLowerCase().includes(search) ||
        (item.email || '').toLowerCase().includes(search) ||
        (item.address || '').toLowerCase().includes(search) ||
        (item.niche || '').toLowerCase().includes(search)
      );
    });
  }, [locatedEnterprises, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredLocatedEnterprises.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEnterprises = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredLocatedEnterprises.slice(start, start + PAGE_SIZE);
  }, [filteredLocatedEnterprises, safePage]);

  const selectedEnterprise = useMemo(
    () => paginatedEnterprises.find((item) => item.id === selectedId) ?? paginatedEnterprises[0],
    [paginatedEnterprises, selectedId],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (paginatedEnterprises.length === 0) {
      setSelectedId(null);
      return;
    }
    const existsInPage = paginatedEnterprises.some((item) => item.id === selectedId);
    if (!existsInPage) {
      setSelectedId(paginatedEnterprises[0].id);
    }
  }, [paginatedEnterprises, selectedId]);

  useEffect(() => {
    const enterprisesToResolve = paginatedEnterprises.filter((item) => {
      const existingAddress = normalizeAddress(item.address);
      const alreadyResolved = normalizeAddress(resolvedAddressById[item.id]);
      const lat = parseCoordinate(item.latitude);
      const lng = parseCoordinate(item.longitude);
      return !existingAddress && !alreadyResolved && lat !== null && lng !== null;
    });

    if (!enterprisesToResolve.length) return;

    let cancelled = false;

    const resolveAddresses = async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        enterprisesToResolve.map(async (item) => {
          const lat = parseCoordinate(item.latitude);
          const lng = parseCoordinate(item.longitude);
          if (lat === null || lng === null) return;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            );
            if (!response.ok) return;
            const data = await response.json();
            const label = data?.display_name ? String(data.display_name).trim() : '';
            if (label) updates[item.id] = label;
          } catch {
            // Sin bloqueo de UI si falla geocodificación.
          }
        }),
      );
      if (cancelled || !Object.keys(updates).length) return;
      setResolvedAddressById((prev) => ({ ...prev, ...updates }));
    };

    resolveAddresses();
    return () => {
      cancelled = true;
    };
  }, [paginatedEnterprises, resolvedAddressById]);

  const selectedLatitude = parseCoordinate(selectedEnterprise?.latitude);
  const selectedLongitude = parseCoordinate(selectedEnterprise?.longitude);
  const selectedAddress =
    normalizeAddress(selectedEnterprise?.address) ||
    normalizeAddress(selectedEnterprise ? resolvedAddressById[selectedEnterprise.id] : '') ||
    'Buscando dirección...';
  const mapUrl =
    selectedLatitude !== null && selectedLongitude !== null
      ? buildMapUrl(selectedLatitude, selectedLongitude)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <MapPinned className="h-8 w-8 text-primary" />
            Mapa de Empresas
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualización geográfica de empresas registradas con coordenadas.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2 w-full md:w-auto">
          <Link href="/administrador/companies">
            <ArrowLeft className="h-4 w-4" />
            Volver a empresas
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Empresas con ubicación</CardDescription>
            <CardTitle>{locatedEnterprises.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Empresas sin coordenadas</CardDescription>
            <CardTitle>{nonLocatedEnterprises.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total empresas</CardDescription>
            <CardTitle>{items.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Cargando mapa...</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Empresas ubicadas</CardTitle>
              <CardDescription>
                Selecciona una empresa para centrar el mapa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[540px] overflow-auto">
              <div className="relative pb-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredLocatedEnterprises.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay empresas con latitud/longitud registradas.</p>
              ) : (
                paginatedEnterprises.map((item) => {
                  const active = selectedEnterprise?.id === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                    >
                      <p className="font-semibold">{item.name || item.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {normalizeAddress(item.address) ||
                          normalizeAddress(resolvedAddressById[item.id]) ||
                          'Buscando dirección...'}
                      </p>
                    </button>
                  );
                })
              )}

              {filteredLocatedEnterprises.length > 0 ? (
                <div className="flex items-center justify-between border-t pt-3 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Página {safePage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={safePage <= 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={safePage >= totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedEnterprise?.name || 'Mapa de empresas'}</CardTitle>
              <CardDescription>{selectedAddress}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mapUrl ? (
                <>
                  <div className="relative overflow-hidden rounded-xl border">
                    <iframe
                      title="Mapa de empresas"
                      src={mapUrl}
                      className="h-[460px] w-full"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute left-3 top-3 max-w-[85%] rounded-lg border bg-white/95 p-3 shadow-md">
                      <div className="flex items-start gap-2">
                        <div className="rounded-full bg-primary/10 p-2">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{selectedEnterprise?.name || 'Empresa'}</p>
                          <p className="text-xs text-muted-foreground">{selectedAddress}</p>
                          {selectedEnterprise?.phone ? (
                            <p className="text-xs text-muted-foreground mt-1">{selectedEnterprise.phone}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No hay una empresa seleccionada con ubicación válida.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

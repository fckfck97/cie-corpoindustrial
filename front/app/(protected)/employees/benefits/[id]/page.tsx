'use client';

import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { getImageUrl } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { CheckCircle2, Sparkles, Gift, ArrowRight, AlertTriangle } from 'lucide-react';

type BenefitDetailResponse = {
  product?: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    category?: string;
    subcategory?: string;
    extracategory?: string;
    created?: string;
    views?: number;
    redemptions_count?: number;
    already_redeemed?: boolean;
    enterprise_id?: string;
    user?: { enterprise?: string };
  };
};

type BenefitUnlockStore = {
  date: string;
  enterpriseIds: string[];
};

const BENEFITS_UNLOCK_KEY = 'benefits_unlocked_enterprises';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getUnlockedEnterpriseIdsToday(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BENEFITS_UNLOCK_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as BenefitUnlockStore;
    if (!parsed?.date || !Array.isArray(parsed.enterpriseIds)) return [];

    if (parsed.date !== getTodayKey()) {
      localStorage.setItem(
        BENEFITS_UNLOCK_KEY,
        JSON.stringify({ date: getTodayKey(), enterpriseIds: [] })
      );
      return [];
    }

    return parsed.enterpriseIds;
  } catch {
    return [];
  }
}

export default function EmployeeBenefitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const benefitId = params?.id;

  const benefitMode = useMemo(() => {
    return ['1', 'true'].includes((searchParams.get('benefit') || '').toLowerCase());
  }, [searchParams]);

  const enterpriseId = useMemo(() => (searchParams.get('enterprise_id') || '').trim(), [searchParams]);
  const source = useMemo(() => (searchParams.get('source') || '').trim(), [searchParams]);

  const backToBenefits = useMemo(() => {
    const q = new URLSearchParams();
    if (enterpriseId) q.set('enterprise_id', enterpriseId);
    if (benefitMode) q.set('benefit', '1');
    if (source) q.set('source', source);

    return `/employees/benefits${q.toString() ? `?${q.toString()}` : ''}`;
  }, [enterpriseId, benefitMode, source]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [benefit, setBenefit] = useState<BenefitDetailResponse['product'] | null>(null);

  const [redeeming, setRedeeming] = useState(false);

  const [unlockedEnterpriseIds, setUnlockedEnterpriseIds] = useState<string[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  useEffect(() => {
    setUnlockedEnterpriseIds(getUnlockedEnterpriseIdsToday());
  }, [searchParams]);

  const loadBenefit = useCallback(async () => {
    if (!benefitId) return;

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get<BenefitDetailResponse>(`/product/${benefitId}/`);
      setBenefit(response?.product || null);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el detalle del producto.');
    } finally {
      setLoading(false);
    }
  }, [benefitId]);

  useEffect(() => {
    loadBenefit();
  }, [loadBenefit]);

  const isRedeemEnabled = Boolean(
    benefitMode || (benefit?.enterprise_id && unlockedEnterpriseIds.includes(benefit.enterprise_id))
  );

  useEffect(() => {
    if (!benefitId) return;
    if (searchParams.get('redeem') !== '1') return;
    if (!benefitMode) return;

    const autoRedeem = async () => {
      if (benefit?.already_redeemed) return;

      try {
        const response = await apiClient.post<{ detail?: string }>(`/product/${benefitId}/redeem/`);
        setSuccessMessage(response?.detail || 'Canjeado correctamente.');
        setSuccessOpen(true);
      } catch {
        // noop
      } finally {
        loadBenefit();
      }
    };

    autoRedeem();
  }, [benefitId, searchParams, benefit?.already_redeemed, benefitMode, loadBenefit]);

  const handleRedeem = async () => {
    if (!benefitId) return;
    if (!isRedeemEnabled) return;

    setRedeeming(true);
    try {
      const response = await apiClient.post<{ detail?: string }>(`/product/${benefitId}/redeem/`);
      setSuccessMessage(response?.detail || 'Canjeado correctamente.');
      setSuccessOpen(true);
    } finally {
      await loadBenefit();
      setRedeeming(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-muted-foreground">Cargando detalle...</div>;
  if (error) return <div className="py-10 text-center text-red-600">{error}</div>;
  if (!benefit) return <div className="py-10 text-center text-muted-foreground">Producto no encontrado.</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">
            {benefit.user?.enterprise || 'Proveedor'}
          </Badge>

          <h1 className="text-3xl font-black tracking-tight lg:text-4xl">{benefit.name}</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Disfruta de este beneficio exclusivo para empleados.
          </p>
        </div>

        <Button asChild variant="outline" className="bg-background/50 backdrop-blur-xl">
          <Link href={backToBenefits}>Volver al catálogo</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        {/* Image Column */}
        <div>
          <div className="aspect-video overflow-hidden rounded-xl border bg-muted/50 md:aspect-square">
            {getImageUrl(benefit.image) ? (
              <img
                src={getImageUrl(benefit.image)}
                alt={benefit.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <span className="text-muted-foreground">Sin imagen</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border bg-card/50 p-6 backdrop-blur-sm shadow-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{benefit.category || 'General'}</Badge>
              {benefit.subcategory && <Badge variant="outline">{benefit.subcategory}</Badge>}
              {benefit.extracategory && (
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/5 text-primary"
                >
                  Extra: {benefit.extracategory}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Descripción</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {benefit.description || 'No hay descripción disponible para este beneficio.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Button
                size="lg"
                className="w-full sm:w-auto"
                disabled={redeeming || !!benefit.already_redeemed || !isRedeemEnabled}
                onClick={handleRedeem}
              >
                {benefit.already_redeemed
                  ? 'Beneficio canjeado'
                  : redeeming
                    ? 'Canjeando...'
                    : 'Canjear Beneficio'}
              </Button>
            </div>

            {!isRedeemEnabled && !benefit.already_redeemed ? (
              <p className="text-xs text-amber-700">
                Para canjear, ingresa desde el QR oficial de la empresa.
              </p>
            ) : null}

            <div className="mt-4 space-y-1 border-t pt-2 text-xs text-muted-foreground">
              <div>
                Publicado el{' '}
                {benefit.created ? new Date(benefit.created).toLocaleDateString('es-CO') : 'N/A'}
              </div>
              <div>
                Visualizaciones: {benefit.views || 0} · Canjeados: {benefit.redemptions_count || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center space-y-6 py-4 text-center">
            {/* Success Icon */}
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
              <div className="relative rounded-full bg-gradient-to-br from-green-400 to-emerald-500 p-4 shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <div className="absolute -right-1 -top-1">
                <Sparkles className="h-6 w-6 animate-pulse text-yellow-400" />
              </div>
            </div>

            {/* Title & Message */}
            <div className="space-y-2">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-green-600">
                <Gift className="h-6 w-6" />
                ¡Beneficio Canjeado!
              </DialogTitle>

              <DialogDescription className="max-w-sm text-base text-muted-foreground">
                {successMessage}
              </DialogDescription>
            </div>

            {/* Benefit Info Card */}
            <div className="w-full space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                {getImageUrl(benefit.image) ? (
                  <img
                    src={getImageUrl(benefit.image)}
                    alt={benefit.name}
                    className="h-16 w-16 rounded-lg border-2 border-green-500/30 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                    <Gift className="h-8 w-8 text-primary" />
                  </div>
                )}

                <div className="flex-1 text-left">
                  <h4 className="line-clamp-1 text-sm font-semibold">{benefit.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {benefit.user?.enterprise || 'Beneficio exclusivo'}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {benefit.category || 'General'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Total de canjes:</span>
                  <span className="font-semibold text-foreground">
                    {benefit.redemptions_count || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Fecha de canje:</span>
                  <span className="font-semibold text-foreground">
                    {new Date().toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Success Message Box */}
            <div className="w-full rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
              <p className="flex items-start gap-2 text-sm text-green-800 dark:text-green-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Este beneficio ya está registrado en tu cuenta. Puedes presentar esta confirmación
                  cuando lo necesites.
                </span>
              </p>
            </div>

            {/* Actions */}
            <DialogFooter className="w-full gap-4 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmCloseOpen(true)}
                className="flex-1"
              >
                Cerrar
              </Button>

              <Button
                onClick={() => {
                  setSuccessOpen(false);
                  router.push(backToBenefits);
                }}
                className="flex-1 gap-2"
              >
                Ver más beneficios
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              ¿Estás seguro de cerrar?
            </AlertDialogTitle>

            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">
                Asegúrate de haber guardado o capturado la información de tu canje.
              </p>

              <p>
                Esta confirmación es necesaria para presentarla cuando vayas a recibir tu beneficio.
                Te recomendamos tomar una captura de pantalla o anotar los detalles antes de cerrar.
              </p>

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 <strong>Consejo:</strong> Toma una captura de pantalla ahora para tener tu
                  comprobante de canje.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmCloseOpen(false)}>
              Volver a ver mi canje
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={() => {
                setConfirmCloseOpen(false);
                setSuccessOpen(false);
              }}
            >
              Sí, ya guardé la información
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

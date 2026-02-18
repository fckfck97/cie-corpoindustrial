"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchEmployeeBenefits,
  fetchEmployeeBenefitRedemptions,
  type PaginatedResponse,
  type EmployeePortalBenefit,
  type EmployeeBenefitRedemption,
} from "@/lib/employee-portal";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

type BenefitUnlockStore = {
  date: string;
  enterpriseIds: string[];
};

const BENEFITS_UNLOCK_KEY = "benefits_unlocked_enterprises";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readUnlockStore(): BenefitUnlockStore {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), enterpriseIds: [] };
  }
  try {
    const raw = localStorage.getItem(BENEFITS_UNLOCK_KEY);
    if (!raw) return { date: getTodayKey(), enterpriseIds: [] };
    const parsed = JSON.parse(raw) as BenefitUnlockStore;
    if (!parsed?.date || !Array.isArray(parsed.enterpriseIds)) {
      return { date: getTodayKey(), enterpriseIds: [] };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), enterpriseIds: [] };
  }
}

function writeUnlockStore(store: BenefitUnlockStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BENEFITS_UNLOCK_KEY, JSON.stringify(store));
}

export default function EmployeesBenefitsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<EmployeePortalBenefit> | null>(null);
  const [redemptions, setRedemptions] = useState<EmployeeBenefitRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const enterpriseId = (searchParams.get("enterprise_id") || "").trim();
  const benefitMode = ["1", "true"].includes((searchParams.get("benefit") || "").toLowerCase());
  const source = (searchParams.get("source") || "").trim();
  const baseDetailQuery = new URLSearchParams();
  if (enterpriseId) baseDetailQuery.set("enterprise_id", enterpriseId);
  if (benefitMode) baseDetailQuery.set("benefit", "1");
  if (source) baseDetailQuery.set("source", source);
  const detailQuerySuffix = baseDetailQuery.toString() ? `?${baseDetailQuery.toString()}` : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = getTodayKey();
    const current = readUnlockStore();

    // Reset diario (medianoche)
    if (current.date !== today) {
      writeUnlockStore({ date: today, enterpriseIds: [] });
      return;
    }

    // Desbloqueo por QR para empresa actual
    if (enterpriseId && benefitMode) {
      const nextSet = new Set(current.enterpriseIds);
      nextSet.add(enterpriseId);
      writeUnlockStore({ date: today, enterpriseIds: Array.from(nextSet) });
    }
  }, [enterpriseId, benefitMode]);

  useEffect(() => {
    const isEmployee = user?.backendRole === "employees" || user?.role === "employee";
    if (!isEmployee) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchEmployeeBenefits({ p: page, search, enterprise_id: enterpriseId });
        setData(response);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, page, search, enterpriseId]);

  useEffect(() => {
    const isEmployee = user?.backendRole === "employees" || user?.role === "employee";
    if (!isEmployee) {
      setLoadingRedemptions(false);
      return;
    }

    const loadRedemptions = async () => {
      setLoadingRedemptions(true);
      try {
        const response = await fetchEmployeeBenefitRedemptions();
        setRedemptions(response || []);
      } finally {
        setLoadingRedemptions(false);
      }
    };
    loadRedemptions();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const pageBenefits = data?.results || [];
  const availableBenefits = pageBenefits.filter((benefit) => !benefit.already_redeemed);
  const redeemedBenefits = pageBenefits.filter((benefit) => !!benefit.already_redeemed);
  const normalizedSearch = search.trim().toLowerCase();

  const deletedRedemptions = redemptions.filter((redemption) => {
    if (!redemption.product_deleted) return false;
    if (enterpriseId && redemption.enterprise !== enterpriseId) return false;
    if (!normalizedSearch) return true;
    const searchable = `${redemption.product_name || ""} ${redemption.enterprise_name || ""}`.toLowerCase();
    return searchable.includes(normalizedSearch);
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Beneficios</h1>
          <p className="text-muted-foreground">
            {enterpriseId ? "Beneficios de la empresa seleccionada." : "Beneficios y recursos disponibles para ti."}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar beneficio..."
              className="pl-9 bg-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {availableBenefits.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">No canjeados</h2>
                <p className="text-sm text-muted-foreground">Beneficios disponibles para canjear.</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {availableBenefits.map((benefit) => (
                  <Link
                    key={benefit.id}
                    href={`/employees/benefits/${benefit.id}${detailQuerySuffix}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      {getImageUrl(benefit.image) ? (
                        <img
                          src={getImageUrl(benefit.image)}
                          alt={benefit.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-secondary/50">
                          Inside
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5 space-y-3">
                      <div className="space-y-1">
                        <h3 className="font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {benefit.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {benefit.enterprise || "Empresa"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="font-normal text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                          {benefit.category || "General"}
                        </Badge>
                      </div>

                      {benefit.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {benefit.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {redeemedBenefits.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Canjeados</h2>
                <p className="text-sm text-muted-foreground">Beneficios que ya canjeaste hoy.</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {redeemedBenefits.map((benefit) => (
                  <Link
                    key={benefit.id}
                    href={`/employees/benefits/${benefit.id}${detailQuerySuffix}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      {getImageUrl(benefit.image) ? (
                        <img
                          src={getImageUrl(benefit.image)}
                          alt={benefit.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-secondary/50">
                          Inside
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5 space-y-3">
                      <div className="space-y-1">
                        <h3 className="font-semibold leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                          {benefit.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium">
                          {benefit.enterprise || "Empresa"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="font-normal text-[10px] px-2 py-0.5 border-primary/20 bg-primary/5 text-primary">
                          {benefit.category || "General"}
                        </Badge>
                        <Badge variant="secondary" className="font-normal text-[10px] px-2 py-0.5">
                          Canjeado
                        </Badge>
                      </div>

                      {benefit.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {benefit.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Historial de canjes</h2>
              <p className="text-sm text-muted-foreground">
                Registro protegido de beneficios ya canjeados, aunque la empresa elimine el producto.
              </p>
            </div>
            {loadingRedemptions ? (
              <div className="text-sm text-muted-foreground">Cargando historial...</div>
            ) : deletedRedemptions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay canjes históricos de beneficios eliminados.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {deletedRedemptions.map((redemption) => (
                  <div key={redemption.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold">
                        {redemption.product_name || "Beneficio eliminado"}
                      </h3>
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                        Eliminado
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {redemption.enterprise_name || "Empresa"}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Canjeado el {new Date(redemption.redeemed_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {(!data?.results || data.results.length === 0) && deletedRedemptions.length === 0 && (
             <div className="text-center py-20">
               <p className="text-muted-foreground">No se encontraron productos.</p>
             </div>
          )}

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.previous}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="w-24"
            >
              Anterior
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              Página {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!data?.next}
              onClick={() => setPage((prev) => prev + 1)}
              className="w-24"
            >
              Siguiente
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

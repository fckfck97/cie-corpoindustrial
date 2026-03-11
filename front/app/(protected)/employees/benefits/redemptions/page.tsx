"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeeBenefitRedemptions,
  type EmployeeBenefitRedemption,
} from "@/lib/employee-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, CalendarClock, History, Search } from "lucide-react";

const PAGE_SIZE = 10;

export default function EmployeeRedemptionsPage() {
  const [items, setItems] = useState<EmployeeBenefitRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRedemption, setSelectedRedemption] = useState<EmployeeBenefitRedemption | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchEmployeeBenefitRedemptions();
        setItems(response || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const searchable = `${item.product_name || ""} ${item.enterprise_name || ""} ${item.enterprise || ""}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(start, start + PAGE_SIZE);
  const selectedDate = selectedRedemption ? new Date(selectedRedemption.redeemed_at) : null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Productos canjeados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial completo de beneficios que has canjeado.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/employees/benefits">
            <ArrowLeft className="h-4 w-4" />
            Volver a beneficios
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Buscar en historial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex w-full max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar producto o empresa..."
                className="pl-9 bg-background"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de canjes</CardTitle>
          <CardDescription>{loading ? "Cargando..." : `Total: ${filteredItems.length}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando historial...</div>
          ) : paginatedItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No hay productos canjeados para mostrar.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((redemption) => (
                <div key={redemption.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 font-semibold">
                      {redemption.product_name || "Beneficio"}
                    </h3>
                    {redemption.product_deleted ? (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                        Eliminado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Canjeado</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {redemption.enterprise_name || "Empresa"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Canjeado el {new Date(redemption.redeemed_at).toLocaleString()}
                  </p>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedRedemption(redemption)}
                      className="gap-2"
                    >
                      <CalendarClock className="h-4 w-4" />
                      Ver detalle
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredItems.length > PAGE_SIZE ? (
            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="w-24"
              >
                Anterior
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="w-24"
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRedemption)} onOpenChange={(open) => !open && setSelectedRedemption(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Detalle del canje
            </DialogTitle>
            <DialogDescription>
              Información del beneficio canjeado y la fecha exacta del canje.
            </DialogDescription>
          </DialogHeader>

          {selectedRedemption ? (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Producto</p>
                <p className="font-medium">{selectedRedemption.product_name || "Beneficio"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</p>
                <p className="font-medium">{selectedRedemption.enterprise_name || "Empresa"}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Día</p>
                  <p className="font-medium">
                    {selectedDate?.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) || "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hora</p>
                  <p className="font-medium">
                    {selectedDate?.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) || "-"}
                  </p>
                </div>
              </div>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

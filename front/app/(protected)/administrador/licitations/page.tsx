"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Plus, Briefcase, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Licitation = {
  id: string;
  title: string;
  department?: string;
  municipality?: string;
  status?: string;
  applications_count?: number;
};

type LicitationsResponse = {
  results?: {
    licitations?: Licitation[];
  };
};

export default function AdminLicitationsPage() {
  const router = useRouter();
  const [licitations, setLicitations] = useState<Licitation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLicitations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<LicitationsResponse>("/api/licitations/?page_size=200");
      setLicitations(data?.results?.licitations || []);
    } catch (error: any) {
      toast.error(error?.message || "No se pudieron cargar las licitaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicitations();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            Oportunidad Licitaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administración general de licitaciones.
          </p>
        </div>
        <Button className="gap-2 ml-auto" onClick={() => router.push("/administrador/licitations/create")}>
          <Plus className="h-4 w-4" />
          Crear Licitación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Licitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Cargando...</div>
          ) : licitations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No hay licitaciones registradas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Título</th>
                    <th className="p-3 font-semibold">Ubicación</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold">Postulaciones</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {licitations.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{item.title}</td>
                      <td className="p-3 text-muted-foreground">
                        {item.municipality || "-"}, {item.department || "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant={item.status === "published" ? "default" : "outline"}>
                          {item.status === "published" ? "Activo" : "Desactivado"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {item.applications_count || 0}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/administrador/licitations/${item.id}`)}>
                              <Eye className="mr-2 h-4 w-4" /> Gestionar Internamente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

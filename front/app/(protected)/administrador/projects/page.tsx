"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Plus,
  Briefcase,
  Eye,
  Trash,
  Pencil,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Project = {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  department?: string;
  municipality?: string;
  image?: string;
  priority?: string;
  status?: string;
  created?: string;
  start_date?: string;
  end_date?: string;
  applications_count?: number;
  invested_amount?: number;
  remaining_amount?: number;
};

type ProjectsResponse = {
  projects?: {
    results?: Project[];
  };
};

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      // Endpoint used for Admin List Projects
      const data = await apiClient.get<any>("/api/projects/");
      setProjects(data?.results?.projects || []);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cargar proyectos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            Proyectos Registrados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administración de proyectos de la plataforma
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="gap-2 ml-auto"
            onClick={() => router.push("/administrador/projects/create")}
          >
            <Plus className="h-4 w-4" />
            Crear Proyecto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              Cargando...
            </div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No hay proyectos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Título</th>
                    <th className="p-3 font-semibold">Ubicación</th>
                    <th className="p-3 font-semibold">Monto</th>
                    <th className="p-3 font-semibold">Estado</th>
                    <th className="p-3 font-semibold">Postulaciones</th>
                    <th className="p-3 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 font-medium flex items-center gap-2">
                        {getImageUrl(project.image) && (
                          <img
                            src={getImageUrl(project.image)}
                            alt={project.title}
                            className="h-10 w-10 rounded-md object-cover border"
                          />
                        )}
                        <span className="line-clamp-2">{project.title}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {project.municipality}, {project.department}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="font-semibold text-sm">
                            Meta: $
                            {Number(project.amount || 0).toLocaleString()}
                          </span>
                          <span className="text-green-600">
                            Invertido: $
                            {Number(
                              project.invested_amount || 0,
                            ).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            project.status === "published"
                              ? "default"
                              : "outline"
                          }
                        >
                          {project.status === "published"
                            ? "Publicado"
                            : "Borrador"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {project.applications_count || 0}
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
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/administrador/projects/${project.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
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

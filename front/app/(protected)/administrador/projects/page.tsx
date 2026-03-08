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

type Project = {
  id: string;
  title: string;
  description?: string;
  department?: string;
  municipality?: string;
  priority?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  applications_count?: number;
};

type ProjectsResponse = {
  results?: {
    projects?: Project[];
  };
};

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ProjectsResponse>("/api/projects/?page_size=200");
      setProjects(data?.results?.projects || []);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cargar la bolsa de negocios");
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
            Bolsa de negocios Amigos Corpoindustrial
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administración general de oportunidades.
          </p>
        </div>
        <Button className="gap-2 ml-auto" onClick={() => router.push("/administrador/projects/create")}>
          <Plus className="h-4 w-4" />
          Crear Oportunidad
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 md:p-6">
            <h2 className="text-base font-bold text-primary md:text-lg">Sobre la Bolsa de Amigos</h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              La Bolsa de Amigos es un espacio exclusivo para empresarios afiliados a Corpoindustrial
              interesados en explorar oportunidades de inversión conjunta. A través de este mecanismo,
              los empresarios pueden sumar esfuerzos y capital para participar en proyectos que, por su
              escala o alcance, pueden requerir la participación de varios actores.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              Cuando exista una oportunidad de inversión, esta sección se activará para que los afiliados
              interesados apliquen a una reunión privada de presentación, donde se compartirá la
              información general del proyecto.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              La participación es voluntaria, confidencial y reservada para los empresarios que decidan
              explorar la iniciativa. Este espacio busca fortalecer la confianza empresarial y abrir
              nuevas oportunidades de crecimiento dentro del ecosistema Corpoindustrial.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Oportunidades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Cargando...</div>
          ) : projects.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No hay oportunidades registradas.</div>
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
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{project.title}</td>
                      <td className="p-3 text-muted-foreground">
                        {project.municipality || "-"}, {project.department || "-"}
                      </td>
                      <td className="p-3">
                        <Badge variant={project.status === "published" ? "default" : "outline"}>
                          {project.status === "published" ? "Activo" : "Desactivado"}
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
                            <DropdownMenuItem onClick={() => router.push(`/administrador/projects/${project.id}`)}>
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

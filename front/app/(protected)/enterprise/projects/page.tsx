"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Search, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
};

type ProjectsResponse = {
  projects?: {
    results?: Project[];
  };
};

export default function EnterpriseProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadProjects = async (search: string = "") => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await apiClient.get<any>(`/api/projects-list/${qs}`);
      setProjects(data?.results?.projects || []);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo cargar los proyectos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects(searchTerm);
  }, [searchTerm]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            Oportunidades de Inversión
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explora proyectos registrados en la plataforma e invierte.
          </p>
        </div>

        <div className="flex gap-2 bg-card p-2 rounded-lg border shadow-sm items-center max-w-md">
          <Search className="h-5 w-5 ml-2 text-muted-foreground" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 px-2"
            placeholder="Buscar proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            Cargando proyectos...
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              No hay proyectos disponibles para invertir en este momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="aspect-video w-full bg-muted">
                  {getImageUrl(project.image) ? (
                    <img
                      src={getImageUrl(project.image)}
                      alt={project.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Sin imagen
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <Badge
                      variant="secondary"
                      className="font-semibold text-primary bg-primary/10"
                    >
                      ${Number(project.amount || 0).toLocaleString()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Prioridad {project.priority}
                    </Badge>
                  </div>
                  <CardTitle
                    className="line-clamp-2 text-lg hover:text-primary cursor-pointer transition-colors"
                    onClick={() =>
                      router.push(`/enterprise/projects/${project.id}`)
                    }
                  >
                    {project.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {project.municipality},{" "}
                    {project.department}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  {project.description && (
                    <div
                      className="text-sm text-muted-foreground line-clamp-3 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: project.description }}
                    />
                  )}
                </CardContent>
                <CardFooter className="pt-0 border-t p-4 mt-auto">
                  <Button
                    className="w-full gap-2"
                    onClick={() =>
                      router.push(`/enterprise/projects/${project.id}`)
                    }
                  >
                    Ver Detalles <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

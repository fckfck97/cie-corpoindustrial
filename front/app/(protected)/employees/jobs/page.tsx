"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchEmployeeJobs,
  type PaginatedResponse,
  type EmployeePortalJob,
} from "@/lib/employee-portal";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  getJobPriorityLabel,
  getJobStatusLabel,
} from "@/lib/model-choice-labels";
import { getImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Briefcase } from "lucide-react";

export default function EmployeesJobsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedResponse<EmployeePortalJob> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const isEmployee =
      user?.backendRole === "employees" || user?.role === "employee";
    if (!isEmployee) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const response = await fetchEmployeeJobs({ p: page, search });
        setData(response);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Vacantes
          </h1>
          <p className="text-muted-foreground">
            Encuentra nuevas oportunidades laborales.
          </p>
        </div>
        <form
          onSubmit={handleSearch}
          className="flex w-full max-w-sm items-center space-x-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar vacante..."
              className="pl-9 bg-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.results || []).map((job) => (
              <Link
                key={job.id}
                href={`/employees/jobs/${job.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 h-full"
              >
                <div className="relative h-48 w-full bg-muted overflow-hidden">
                  {getImageUrl(job.image) ? (
                    <img
                      src={getImageUrl(job.image)}
                      alt={job.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-secondary/30">
                        <Briefcase className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge
                      variant={job.priority === "high" ? "destructive" : "secondary"}
                      className="shadow-sm backdrop-blur-sm bg-background/80 hover:bg-background/90"
                    >
                      {getJobPriorityLabel(job.priority)}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5 gap-3">
                  <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate pr-2">
                            {job.enterprise || "Empresa Confidencial"}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                             {job.created ? new Date(job.created).toLocaleDateString() : 'Reciente'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {job.title}
                      </h3>
                  </div>

                  <div className="line-clamp-2 text-sm text-muted-foreground/90 prose prose-sm max-w-none" 
                       dangerouslySetInnerHTML={{ __html: job.description || '' }} 
                  />

                  <div className="mt-auto pt-4 space-y-2">
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:underline decoration-primary/50 underline-offset-4">
                        Ver vacante completa
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                          {getJobStatusLabel(job.status || "published")}
                      </Badge>
                    </div>
                    {typeof job.applications_count === 'number' && job.applications_count > 0 && (
                      <div className="flex items-center justify-center gap-2 p-2 rounded-md bg-muted/50 border text-sm">
                        <span className="text-muted-foreground">👥</span>
                        <span className="font-medium">{job.applications_count}</span>
                        <span className="text-muted-foreground text-xs">
                          {job.applications_count === 1 ? 'persona aplicó' : 'personas aplicaron'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {(!data?.results || data.results.length === 0) && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">
                No se encontraron vacantes disponibles.
              </p>
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

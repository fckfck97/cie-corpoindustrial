"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Search, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_PAGE_SIZE, buildPageQuery, getPageRange, parsePaginatedCollection } from "@/utils/pagination";
import { PaginationControls } from "@/components/PaginationControls";

type Licitation = {
  id: string;
  title: string;
  description?: string;
  department?: string;
  municipality?: string;
  priority?: string;
  status?: string;
  created?: string;
};

type LicitationsResponse = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: {
    licitations?: Licitation[];
  };
};

export default function EnterpriseLicitationsPage() {
  const router = useRouter();
  const [licitations, setLicitations] = useState<Licitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLicitations, setTotalLicitations] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const loadLicitations = async (search: string = "", page: number = 1) => {
    setLoading(true);
    try {
      const query = buildPageQuery({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        pageParam: "page",
        extra: { search: search || undefined },
      });
      const data = await apiClient.get<LicitationsResponse>(`/api/licitations-list/?${query}`);
      const parsed = parsePaginatedCollection<Licitation>(data, (payload) => payload?.results?.licitations || []);
      setLicitations(parsed.items);
      setTotalLicitations(parsed.count);
      setHasNextPage(Boolean(parsed.next));
      setHasPreviousPage(Boolean(parsed.previous));
      setCurrentPage(page);
    } catch (error: any) {
      toast.error(error?.message || "No se pudieron cargar las licitaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicitations(searchTerm, 1);
  }, [searchTerm]);

  const pageRange = getPageRange({
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
    currentItems: licitations.length,
    totalCount: totalLicitations,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-primary" />
            Oportunidad Licitaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Explora licitaciones y postúlate.</p>
        </div>

        <div className="flex gap-2 bg-card p-2 rounded-lg border shadow-sm items-center max-w-md">
          <Search className="h-5 w-5 ml-2 text-muted-foreground" />
          <Input
            className="border-0 shadow-none focus-visible:ring-0 px-2"
            placeholder="Buscar licitaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Cargando licitaciones...</div>
        ) : licitations.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay licitaciones disponibles.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {licitations.map((item) => (
                <Card key={item.id} className="overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">Prioridad {item.priority}</Badge>
                    </div>
                    <CardTitle className="line-clamp-2 text-lg hover:text-primary cursor-pointer transition-colors" onClick={() => router.push(`/enterprise/licitations/${item.id}`)}>
                      {item.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {item.municipality}, {item.department}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {item.description && (
                      <div className="text-sm text-muted-foreground line-clamp-3 prose prose-sm" dangerouslySetInnerHTML={{ __html: item.description }} />
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 border-t p-4 mt-auto">
                    <Button className="w-full gap-2" onClick={() => router.push(`/enterprise/licitations/${item.id}`)}>
                      Ver Licitación <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="pt-6">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={pageRange.totalPages}
                  totalCount={totalLicitations}
                  start={pageRange.start}
                  end={pageRange.end}
                  hasPrevious={hasPreviousPage}
                  hasNext={hasNextPage}
                  loading={loading}
                  itemLabel="licitaciones"
                  onPrevious={() => loadLicitations(searchTerm, currentPage - 1)}
                  onNext={() => loadLicitations(searchTerm, currentPage + 1)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

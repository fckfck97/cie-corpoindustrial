'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchEmployeeCompanies, type EmployeeCompaniesResponse, type PaginatedResponse } from '@/lib/employee-portal';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function EmployeesCompanyPage() {
  const [portal, setPortal] = useState<PaginatedResponse<EmployeeCompaniesResponse> | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingList(true);
      try {
        const response = await fetchEmployeeCompanies({ p: page, search });
        setPortal(response);
      } finally {
        setLoadingList(false);
      }
    };
    load();
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Empresas</h1>
          <p className="text-muted-foreground">Explora el directorio de empresas aliadas.</p>
        </div>
        <form onSubmit={handleSearch} className="flex w-full max-w-sm items-center space-x-2">
           <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar empresa..."
              className="pl-9 bg-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>
      </div>

      {loadingList ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(portal?.results || []).map((enterprise) => (
              <Link 
                key={enterprise.id}
                href={`/employees/company/${enterprise.id}`}
                className="group relative flex flex-col rounded-xl border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/50 h-full"
              >
                {/* Banner Section */}
                <div className="relative h-32 w-full overflow-hidden bg-muted/50 rounded-t-xl">
                  {getImageUrl(enterprise.banner) ? (
                    <img
                      src={getImageUrl(enterprise.banner)}
                      alt={`Banner ${enterprise.name}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-r from-primary/10 via-primary/5 to-muted" />
                  )}
                </div>

                {/* Avatar Section - Overlapping */}
                <div className="relative px-6 -mt-10 mb-4">
                  <div className="relative w-fit">
                    <div className="rounded-full border-4 border-background bg-background shadow-lg">
                      {getImageUrl(enterprise.avatar) ? (
                        <img
                          src={getImageUrl(enterprise.avatar)}
                          alt={enterprise.name}
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-xl font-bold text-primary">
                          {enterprise.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col px-6 pb-6">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors mb-1">
                      {enterprise.name}
                    </h3>
                     {enterprise.email && (
                        <p className="text-xs text-muted-foreground truncate">{enterprise.email}</p>
                     )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-4">
                    {enterprise.description || 'Sin descripción disponible.'}
                  </p>
                  
                  <div className="mt-auto border-t pt-3">
                    <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:underline decoration-primary/50 underline-offset-4">
                      Ver perfil completo
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {(!portal?.results || portal.results.length === 0) && (
             <div className="text-center py-20">
               <p className="text-muted-foreground">No se encontraron empresas.</p>
             </div>
          )}

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={!portal?.previous}
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
              disabled={!portal?.next}
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

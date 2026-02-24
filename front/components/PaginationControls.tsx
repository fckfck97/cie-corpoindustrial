'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { reportUi } from '@/utils/report-ui';

type Props = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  start: number;
  end: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
  itemLabel?: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  start,
  end,
  hasPrevious,
  hasNext,
  loading,
  itemLabel = 'registros',
  onPrevious,
  onNext,
}: Props) {
  if (totalCount <= 10) return null;

  return (
    <div className={reportUi.paginationRow}>
      <p className={reportUi.paginationMeta}>
        Mostrando {start}-{end} de {totalCount} {itemLabel}
      </p>
      <div className={reportUi.paginationButtons}>
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={Boolean(loading) || !hasPrevious || currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={Boolean(loading) || !hasNext || currentPage >= totalPages}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

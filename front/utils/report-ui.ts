export const reportUi = {
  headerRow: 'flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
  actionsRow: 'flex flex-col gap-2 sm:flex-row',
  exportButton: 'gap-2',
  exportExcelButton: 'gap-2 border-green-600 text-green-600 hover:bg-green-50',
  exportPdfButton: 'gap-2 border-red-600 text-red-600 hover:bg-red-50',
  paginationRow: 'flex items-center justify-between gap-3 border-t pt-4',
  paginationMeta: 'text-sm text-muted-foreground',
  paginationButtons: 'flex items-center gap-2',
} as const;

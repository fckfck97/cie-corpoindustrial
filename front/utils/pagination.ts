export const DEFAULT_PAGE_SIZE = 10;

export type PaginatedState = {
  count: number;
  next: string | null;
  previous: string | null;
};

export type ParsedPaginatedCollection<T> = PaginatedState & {
  items: T[];
  paginated: boolean;
};

export function parsePaginatedCollection<T>(
  payload: unknown,
  pickItems: (payload: any) => T[]
): ParsedPaginatedCollection<T> {
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      count: payload.length,
      next: null,
      previous: null,
      paginated: false,
    };
  }

  const data = (payload ?? {}) as any;
  const items = pickItems(data) || [];

  return {
    items,
    count: typeof data.count === 'number' ? data.count : items.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
    paginated: true,
  };
}

export function buildPageQuery(params: {
  page: number;
  pageSize?: number;
  pageParam?: string;
  extra?: Record<string, string | number | undefined | null>;
}) {
  const searchParams = new URLSearchParams();
  const pageParam = params.pageParam || 'p';
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;

  searchParams.set(pageParam, String(Math.max(1, params.page)));
  searchParams.set('page_size', String(pageSize));

  Object.entries(params.extra || {}).forEach(([key, value]) => {
    if (value == null) return;
    const text = String(value).trim();
    if (!text) return;
    searchParams.set(key, text);
  });

  return searchParams.toString();
}

export function getPageRange(params: {
  page: number;
  pageSize?: number;
  currentItems: number;
  totalCount: number;
}) {
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!params.totalCount || !params.currentItems) {
    return { start: 0, end: 0, totalPages: 1 };
  }

  const start = (Math.max(1, params.page) - 1) * pageSize + 1;
  const end = start + params.currentItems - 1;
  const totalPages = Math.max(1, Math.ceil(params.totalCount / pageSize));
  return { start, end, totalPages };
}

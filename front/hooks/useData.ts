/**
 * Data fetching hooks with caching
 */

import { useEffect, useState } from 'react';

interface UseDataOptions {
  skip?: boolean;
  onError?: (error: Error) => void;
}

export function useData<T>(
  endpoint: string,
  options?: UseDataOptions
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.skip) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
          {
            headers: {
              Authorization: `JWT ${
                typeof window !== 'undefined'
                  ? localStorage.getItem('__auth_token') || ''
                  : ''
              }`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch');

        const result = await response.json();
        setData(result.data || result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        options?.onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, options?.skip]);

  return { data, loading, error };
}

export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedItems = items.slice(start, start + pageSize);

  return {
    items: paginatedItems,
    page,
    setPage,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

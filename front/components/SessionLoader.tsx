'use client';

/**
 * Session Loader Component
 * Skeleton UI shown while verifying session
 */

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md p-6">
        <div className="space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}

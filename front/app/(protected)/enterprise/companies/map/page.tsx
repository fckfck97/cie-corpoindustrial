'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { EnterpriseMapExplorer } from '@/components/EnterpriseMapExplorer';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function EnterpriseCompaniesMapPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full min-h-[70dvh] flex-col gap-3">
        <div className="flex items-center justify-end">
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <a href="/data.xlsx" download="data.xlsx">
              <Download className="h-4 w-4" />
              Descargar base de datos
            </a>
          </Button>
        </div>
        <div className="flex-1">
          <EnterpriseMapExplorer />
        </div>
      </div>
    </DashboardLayout>
  );
}

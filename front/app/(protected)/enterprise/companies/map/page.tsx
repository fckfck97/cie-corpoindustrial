'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { EnterpriseMapExplorer } from '@/components/EnterpriseMapExplorer';

export default function EnterpriseCompaniesMapPage() {
  return (
    <DashboardLayout>
      <EnterpriseMapExplorer />
    </DashboardLayout>
  );
}


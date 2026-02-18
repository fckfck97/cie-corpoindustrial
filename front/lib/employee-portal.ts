import { apiClient } from '@/lib/api-client';

export type EmployeePortalJob = {
  id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  created?: string;
  image?: string | null;
  enterprise_id?: string;
  enterprise?: string;
  applications_count?: number;
};

export type EmployeePortalBenefit = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  extracategory?: string;
  created?: string;
  image?: string | null;
  enterprise_id?: string;
  enterprise?: string;
  views?: number;
  redemptions_count?: number;
  already_redeemed?: boolean;
};

export type EmployeeBenefitRedemption = {
  id: string;
  product?: string | null;
  product_deleted?: boolean;
  product_name?: string;
  product_id_snapshot?: string | null;
  enterprise?: string;
  enterprise_name?: string;
  redeemed_date?: string;
  redeemed_at: string;
};

export type EmployeePortalResponse = {
  enterprises: Array<{
    id: string;
    name: string;
    email?: string;
    description?: string;
    niche?: string;
    phone?: string;
    address?: string;
    facebook?: string;
    instagram?: string;
    X?: string;
    avatar?: string | null;
    banner?: string | null;
    jobs_count?: number;
    benefits_count?: number;
  }>;
  jobs: EmployeePortalJob[];
  benefits: EmployeePortalBenefit[];
  meta: {
    total_enterprises: number;
    total_jobs: number;
    total_benefits: number;
  };
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type EmployeeCompaniesResponse = {
  id: string;
  name: string;
  email?: string;
  description?: string;
  niche?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  X?: string;
  avatar?: string | null;
  banner?: string | null;
  jobs_count?: number;
  benefits_count?: number;
};

export type EmployeeEnterpriseDetailResponse = {
  enterprise: {
    id: string;
    name: string;
    email?: string;
    description?: string;
    niche?: string;
    phone?: string;
    address?: string;
    facebook?: string;
    instagram?: string;
    X?: string;
    avatar?: string | null;
    banner?: string | null;
  };
  jobs: EmployeePortalJob[];
  benefits: EmployeePortalBenefit[];
  suggested_jobs: EmployeePortalJob[];
  suggested_benefits: EmployeePortalBenefit[];
  meta: {
    total_jobs: number;
    total_benefits: number;
    niche?: string;
  };
};

export async function fetchEmployeeEnterpriseDetail(enterpriseId: string) {
  return apiClient.get<EmployeeEnterpriseDetailResponse>(`/employee/portal/enterprises/${enterpriseId}/`);
}

export async function fetchEmployeeDashboard() {
  return apiClient.get<EmployeePortalResponse>('/employee/dashboard/');
}

function buildQuery(params: { p?: number; search?: string; enterprise_id?: string }) {
  const query = new URLSearchParams();
  if (params.p && params.p > 0) query.set('p', String(params.p));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.enterprise_id?.trim()) query.set('enterprise_id', params.enterprise_id.trim());
  const value = query.toString();
  return value ? `?${value}` : '';
}

export async function fetchEmployeeCompanies(params: { p?: number; search?: string } = {}) {
  return apiClient.get<PaginatedResponse<EmployeeCompaniesResponse>>(`/employee/companies/${buildQuery(params)}`);
}

export async function fetchEmployeeJobs(params: { p?: number; search?: string } = {}) {
  return apiClient.get<PaginatedResponse<EmployeePortalJob>>(`/employee/jobs/${buildQuery(params)}`);
}

export async function fetchEmployeeBenefits(params: { p?: number; search?: string; enterprise_id?: string } = {}) {
  return apiClient.get<PaginatedResponse<EmployeePortalBenefit>>(`/employee/benefits/${buildQuery(params)}`);
}

export async function fetchEmployeeBenefitRedemptions() {
  return apiClient.get<EmployeeBenefitRedemption[]>('/employee/benefits/redemptions/');
}

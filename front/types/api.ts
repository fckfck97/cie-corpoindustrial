/**
 * API Types & Common Response Structures
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  sector?: string;
  employees?: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  companyId: string;
  startDate?: string;
  status: 'active' | 'inactive' | 'on-leave';
}

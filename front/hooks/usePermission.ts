'use client';

/**
 * usePermission Hook
 * Component-level permission checking
 */

import { useAuth } from './useAuth';
import { hasPermission, hasRole } from '@/lib/rbac';

type Permission =
  | 'view_dashboard'
  | 'manage_employees'
  | 'manage_company'
  | 'view_reports'
  | 'manage_settings';

type Role = 'admin' | 'manager' | 'employee';

export function usePermission() {
  const { user } = useAuth();

  return {
    can: (permission: Permission) => hasPermission(user, permission),
    is: (role: Role | Role[]) => hasRole(user, role),
    user,
  };
}

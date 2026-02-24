/**
 * RBAC Utilities
 * Role-based access control helpers
 */

import type { User } from '@/types/auth';

type Permission =
  | 'view_dashboard'
  | 'manage_employees'
  | 'manage_company'
  | 'view_reports'
  | 'manage_settings';

type Role = User['role'];

const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'view_dashboard',
    'manage_employees',
    'manage_company',
    'view_reports',
    'manage_settings',
  ],
  manager: ['view_dashboard', 'manage_employees', 'view_reports'],
  employee: ['view_dashboard'],
};

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  const permissions = rolePermissions[user.role] || [];
  return permissions.includes(permission) || user.permissions?.includes(permission) || false;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: User | null, roles: Role | Role[]): boolean {
  if (!user) return false;
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role);
}

/**
 * Get allowed routes for user role
 */
export function getAllowedRoutes(user: User | null): string[] {
  if (!user) return [];

  const baseRoutes = [
    user.role === 'admin'
      ? '/administrador/dashboard'
      : user.role === 'manager'
        ? '/enterprise/dashboard'
        : '/employees/dashboard',
  ];

  if (hasPermission(user, 'manage_employees')) {
    baseRoutes.push('/employees');
  }

  if (hasPermission(user, 'manage_settings')) {
    baseRoutes.push('/settings');
  }

  baseRoutes.push('/profile');

  return baseRoutes;
}

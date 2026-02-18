import type { User } from '@/types/auth';

export function getHomeByRole(user: User | null | undefined): string {
  if (!user) return '/login';

  const isAdmin = user.backendRole === 'Admin' || user.role === 'admin';
  if (isAdmin) return '/admin/dashboard';

  const isEnterprise = user.backendRole === 'enterprise' || user.role === 'manager';
  if (isEnterprise) return '/enterprise/dashboard';

  return '/employees/dashboard';
}

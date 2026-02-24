import type { User } from '@/types/auth';

export function getHomeByRole(user: User | null | undefined): string {
  if (!user) return '/login';

  const isAdmin = user.backendRole === 'Admin' || user.role === 'admin';
  if (isAdmin) return '/administrador/dashboard';

  const isEnterprise = user.backendRole === 'enterprise' || user.role === 'manager';
  if (isEnterprise) return '/enterprise/dashboard';

  return '/employees/dashboard';
}

export function canAccessPathByRole(user: User | null | undefined, path: string): boolean {
  if (!user) return false;

  const isAdmin = user.backendRole === 'Admin' || user.role === 'admin';
  if (isAdmin) return path.startsWith('/administrador');

  const isEnterprise = user.backendRole === 'enterprise' || user.role === 'manager';
  if (isEnterprise) return path.startsWith('/enterprise');

  return path.startsWith('/employees');
}

export function getPostLoginPath(user: User | null | undefined, nextPath?: string | null): string {
  const home = getHomeByRole(user);
  if (!nextPath) return home;
  return canAccessPathByRole(user, nextPath) ? nextPath : home;
}

'use client';

/**
 * Sidebar Component
 * Navigation menu with RBAC filtering
 */

import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Briefcase,
  Package,
  Wallet,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const { can } = usePermission();
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.backendRole === 'Admin' || user?.role === 'admin';
  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';
  const isEmployee = user?.backendRole === 'employees' || user?.role === 'employee';
  
  const dashboardHref = isAdmin
    ? '/admin/dashboard'
    : isEnterprise
      ? '/enterprise/dashboard'
      : '/employees/dashboard';

  const navItems = [
    {
      label: 'Panel de Control',
      href: dashboardHref,
      icon: LayoutDashboard,
      visible: can('view_dashboard'),
    },
    {
      label: isAdmin ? 'Empresas' : 'Empleados',
      href: isAdmin ? '/admin/companies' : '/enterprise/employees',
      icon: Users,
      visible: can('manage_employees'),
    },
    {
      label: 'Empleos',
      href: '/enterprise/jobs',
      icon: Briefcase,
      visible: isEnterprise,
    },
    {
      label: 'Productos',
      href: '/enterprise/products',
      icon: Package,
      visible: isEnterprise,
    },
    {
      label: 'Empleos',
      href: '/employees/jobs',
      icon: Briefcase,
      visible: isEmployee,
    },
    {
      label: 'Beneficios',
      href: '/employees/benefits',
      icon: Package,
      visible: isEmployee,
    },
    {
      label: 'Empresas',
      href: '/employees/company',
      icon: Building2,
      visible: isEmployee,
    },
    {
      label: 'Pagos',
      href: '/enterprise/payments',
      icon: Wallet,
      visible: isEnterprise,
    },
    {
      label: 'Pagos Empresas',
      href: '/admin/payments',
      icon: Wallet,
      visible: isAdmin,
    },
    {
      label: 'Canjes Beneficios',
      href: '/admin/benefits/redemptions',
      icon: Package,
      visible: isAdmin,
    },
    {
      label: 'Mi Perfil',
      href: '/profile',
      icon: UserCircle,
      visible: can('view_dashboard'),
    },
  ];

  return (
    <aside className={cn('h-full w-64 shrink-0 overflow-y-auto border-r bg-card/50 backdrop-blur-xl', className)}>
      <nav className="space-y-1 p-3 sm:p-4">
        {navItems.map((item) => {
          if (!item.visible) return null;

          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className="block">
              <div
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

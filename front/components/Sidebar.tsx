"use client";

/**
 * Sidebar Component
 * Navigation menu with RBAC filtering
 */

import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Briefcase,
  Package,
  Ticket,
  Wallet,
  Building2,
  MapPinned,
  AlertTriangle,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const { can } = usePermission();
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.backendRole === "Admin" || user?.role === "admin";
  const isEnterprise =
    user?.backendRole === "enterprise" || user?.role === "manager";
  const isEmployee =
    user?.backendRole === "employees" || user?.role === "employee";
  const enterpriseBlocked =
    isEnterprise && user?.enterpriseProfileCompleted === false;
  const employeeBlocked =
    isEmployee && user?.employeeProfileCompleted === false;
  const profileBlocked = enterpriseBlocked || employeeBlocked;
  const missingLabelsMap: Record<string, string> = {
    email: "Correo",
    first_name: "Nombres",
    last_name: "Apellidos",
    enterprise: "Nombre de empresa",
    phone: "Teléfono del representante",
    document_type: "Tipo documento",
    nuip: "Número de documento",
    document_type_enterprise: "Tipo documento empresa",
    nuip_enterprise: "NIT empresa",
    description: "Descripción",
    niche: "Sector Económico",
    address: "Dirección",
  };
  const missingFieldsRaw = enterpriseBlocked
    ? user?.enterpriseProfileMissing || []
    : user?.employeeProfileMissing || [];
  const missingFields = missingFieldsRaw.map((item) => {
    if (item === "phone" && employeeBlocked) return "Teléfono";
    return missingLabelsMap[item] || item;
  });

  const dashboardHref = isAdmin
    ? "/administrador/dashboard"
    : isEnterprise
      ? "/enterprise/dashboard"
      : "/employees/dashboard";

  const navItems = [
    {
      label: "Panel de Control",
      href: dashboardHref,
      icon: LayoutDashboard,
      visible: can("view_dashboard"),
    },
    {
      label: isAdmin ? "Empresas" : "Empleados",
      href: isAdmin ? "/administrador/companies" : "/enterprise/employees",
      icon: Users,
      visible: can("manage_employees"),
    },
    {
      label: "Bolsa de Empleo",
      href: "/enterprise/jobs",
      icon: Briefcase,
      visible: isEnterprise,
    },
    {
      label: "Portafolio de Beneficios",
      href: "/enterprise/products",
      icon: Package,
      visible: isEnterprise,
    },
    {
      label: "Canjes",
      href: "/enterprise/benefits/redemptions",
      icon: Ticket,
      visible: isEnterprise,
    },
    {
      label: "Beneficios de Empresas",
      href: "/administrador/products",
      icon: Package,
      visible: isAdmin,
    },
    {
      label: "Bolsa de Empleo",
      href: "/employees/jobs",
      icon: Briefcase,
      visible: isEmployee,
    },
    {
      label: "Portafolio de Beneficios",
      href: "/employees/benefits",
      icon: Package,
      visible: isEmployee,
    },
    {
      label: "Empresas",
      href: "/employees/company",
      icon: Building2,
      visible: isEmployee,
    },
    {
      label: "Mapa de Empresas",
      href: "/employees/company/map",
      icon: MapPinned,
      visible: isEmployee,
    },
    {
      label: "Pagos Empresas",
      href: "/administrador/payments",
      icon: Wallet,
      visible: isAdmin,
    },
    {
      label: "Mapa Empresas",
      href: "/administrador/companies/map",
      icon: MapPinned,
      visible: isAdmin,
    },
    {
      label: "Canjes Beneficios",
      href: "/administrador/benefits/redemptions",
      icon: Package,
      visible: isAdmin,
    },
    {
      label: "Bolsa de negocios Amigos Corpoindustrial",
      href: "/administrador/projects",
      icon: Briefcase,
      visible: isAdmin,
    },
    {
      label: "Oportunidad Licitaciones",
      href: "/administrador/licitations",
      icon: Briefcase,
      visible: isAdmin,
    },
    {
      label: "Bolsa de negocios Amigos Corpoindustrial",
      href: "/enterprise/projects",
      icon: Briefcase,
      visible: isEnterprise,
    },
    {
      label: "Radar de proyectos licitaciones",
      href: "/enterprise/licitations",
      icon: Briefcase,
      visible: isEnterprise,
    },
    {
      label: "Mapa de Empresas",
      href: "/enterprise/companies/map",
      icon: MapPinned,
      visible: isEnterprise,
    },
    {
      label: "Mi Perfil",
      href: "/profile",
      icon: UserCircle,
      visible: can("view_dashboard"),
    },
    {
      label: "Pagos",
      href: "/enterprise/payments",
      icon: Wallet,
      visible: isEnterprise,
    },
  ];
  const visibleNavItems = navItems.filter((item) => item.visible);
  const activeHref =
    visibleNavItems
      .filter(
        (item) =>
          pathname === item.href ||
          pathname.startsWith(item.href + "/"),
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href || "";

  return (
    <aside
      className={cn(
        "h-full w-64 shrink-0 overflow-y-auto border-r bg-card/50 backdrop-blur-xl",
        className,
      )}
    >
      <nav className="space-y-1 p-3 sm:p-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;
          const disabled = profileBlocked && item.href !== "/profile";

          return (
            <div key={item.href} className="block">
              {disabled ? (
                <div
                  className={cn(
                    "group flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-60",
                    isActive
                      ? "bg-muted text-muted-foreground"
                      : "text-muted-foreground",
                  )}
                  aria-disabled="true"
                >
                  <Lock className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              ) : (
                <Link href={item.href} onClick={onNavigate} className="block">
                  <div
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                </Link>
              )}
            </div>
          );
        })}

        {profileBlocked && (
          <div className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Perfil incompleto
            </div>
            <p>
              Completa todos los datos en <strong>Mi Perfil</strong> para
              habilitar el sistema.
            </p>
            {missingFields.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 font-medium">Faltan:</p>
                <ul className="list-disc pl-4">
                  {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

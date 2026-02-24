"use client";

/**
 * Login Page
 * OTP-based authentication flow
 */

import { Suspense, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpForm } from "@/components/OtpForm";
import { Building2 } from "lucide-react";
import { getPostLoginPath } from "@/lib/role-home";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(getPostLoginPath(user, safeNext));
    }
  }, [isAuthenticated, isLoading, router, user, safeNext]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="flex h-full w-full">
        {/* Left side - Branding with Image */}
        <div className="hidden w-1/2 relative lg:flex flex-col justify-between overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-contain bg-center"
            style={{ backgroundImage: "url(/curved9.jpg)" }}
          />


        </div>

        {/* Right side - Login Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-12 lg:px-16 bg-gradient-to-br from-white/50 to-white/30 dark:from-slate-900/50 dark:to-slate-800/30 backdrop-blur-xl">
          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="mb-10 text-center lg:hidden animate-fade-in">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl border-2 border-secondary/30">
                  <Building2 className="h-8 w-8 text-secondary" />
                </div>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-primary">CIE</span>{" "}
                <span className="text-secondary">Corpoindustrial</span>
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Sistema de Gestión Empresarial
              </p>
            </div>

            {/* Desktop header */}
            <div className="mb-10 hidden text-center lg:block animate-fade-in">
              <Image
                src="/logo.png"
                alt="CIE Logo"
                width={80}
                height={80}
                className="mx-auto mb-6"
              />
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Bienvenido
              </h2>
              <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
                Ingresa tu email para recibir un código de verificación
              </p>
            </div>

            {/* Form Card */}
            <div className="animate-slide-in-left delay-100 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-slate-200/50 dark:border-slate-700/50">
              <OtpForm onSuccess={(verifiedUser) => router.replace(getPostLoginPath(verifiedUser, safeNext))} />
            </div>

            {/* Footer text */}
            <div className="mt-8 text-center space-y-3 animate-fade-in delay-200">
              <p className="text-sm text-muted-foreground">
                ¿Problemas para acceder?{" "}
                <button className="font-semibold text-primary hover:text-secondary transition-colors duration-300">
                  Contacta al soporte
                </button>
              </p>
              <p className="text-xs text-muted-foreground/70">
                Tu información está protegida con encriptación de extremo a
                extremo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

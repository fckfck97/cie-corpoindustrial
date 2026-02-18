'use client';

/**
 * Dashboard Layout Component
 * Main layout wrapper for protected pages
 */

import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar className="hidden md:block" />

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 pt-12">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de navegacion</SheetTitle>
            </SheetHeader>
            <Sidebar className="w-full border-r-0" onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="p-3 sm:p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

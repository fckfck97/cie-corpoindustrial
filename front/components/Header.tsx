'use client';

/**
 * Header Component
 * Top navigation with user menu
 */

import { useAuth } from '@/hooks/useAuth';
import { getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Settings, PanelLeft } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-4">


          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg">
               <Image src="/logo.png" alt="CIE Logo" fill className="object-cover" />
            </div>
            <span className="text-sm font-bold tracking-tight md:hidden">CIE</span>
            <span className="hidden text-lg font-bold tracking-tight md:block">CIE-Corpoindustrial</span>
          </div>

                    <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
            aria-label="Abrir menu"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar className="h-9 w-9 border shadow-sm">
                    <AvatarImage src={getImageUrl(user.avatar)} alt={user.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 p-2" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email || user.phone}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/profile" className="flex cursor-pointer items-center gap-2 p-2">
                    <Settings className="h-4 w-4" />
                    <span>Mi perfil</span>
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex cursor-pointer items-center gap-2 p-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

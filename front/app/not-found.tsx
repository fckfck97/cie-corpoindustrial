import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Home, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'No encontrado - CIE Corpoindustrial',
  description: 'La página solicitada no pudo encontrarse',
}

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/5">
      <div className="mx-auto max-w-md px-4 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-6 mb-4">
            <span className="text-5xl font-bold text-primary">404</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground">Página no encontrada</h1>
        
        <p className="mt-3 text-lg text-muted-foreground">
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>

        <div className="mt-8 space-y-3">
          <Link href="/">
            <Button className="w-full h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Home className="h-4 w-4" />
              Ir al Panel de Control
            </Button>
          </Link>

          <Link href="/">
            <Button variant="outline" className="w-full h-11 gap-2">
              Inicio
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          ¿Necesitas ayuda?{' '}
          <button className="font-medium text-primary hover:underline">
            Contacta al soporte
          </button>
        </p>
      </div>
    </div>
  )
}

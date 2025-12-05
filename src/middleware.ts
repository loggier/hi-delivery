import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Este middleware ahora solo se encarga de redirecciones básicas.
// La protección de rutas de admin se maneja en el layout del cliente.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Si el usuario va a la raíz, lo mandamos directo a la página de marketing
  if (pathname === '/') {
     return NextResponse.redirect(new URL('/site', request.url))
  }
  
  // Opcional: si un usuario autenticado intenta ir a /sign-in,
  // podríamos querer redirigirlo. Pero sin acceso a la sesión aquí,
  // esta lógica se mueve al layout de /sign-in si es necesaria.

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site (public marketing pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|site|deliveryman|store).*)',
  ],
}

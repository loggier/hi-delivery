import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Este middleware ya no tiene lógica de autenticación.
// Solo redirige de la raíz al dashboard.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Si el usuario va a la raíz, lo mandamos directo al dashboard
  if (pathname === '/') {
     return NextResponse.redirect(new URL('/dashboard', request.url))
  }

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
     * - deliveryman (public apply form)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|deliveryman).*)',
  ],
}

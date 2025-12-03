import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('supabase_session');

  // Si el usuario va a la raíz, lo mandamos directo al dashboard
  if (pathname === '/') {
     return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Proteger rutas de admin si no hay sesión (excepto la de login)
  if (pathname.startsWith('/admin') && !sessionCookie) {
      // return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  // Si el usuario está logueado e intenta ir a sign-in, redirigirlo
  if (pathname === '/sign-in' && sessionCookie) {
    // return NextResponse.redirect(new URL('/dashboard', request.url))
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

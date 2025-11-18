import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_STORAGE_KEY } from './store/auth-store';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_STORAGE_KEY);

  // Redirigir de la raíz al dashboard si hay sesión, si no, al login.
  if (pathname === '/') {
     if (sessionCookie) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
     }
     return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  
  // Proteger rutas de admin si no hay sesión
  if (pathname.startsWith('/dashboard') && !sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('next', pathname); // Opcional: para redirigir de vuelta después del login
      return NextResponse.redirect(url);
  }

  // Si el usuario está logueado e intenta ir a sign-in, redirigirlo
  if (pathname === '/sign-in' && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Proteger los pasos del formulario de repartidor si no hay sesión (excepto el primero)
  if (pathname.startsWith('/deliveryman/apply/') && pathname !== '/deliveryman/apply' && !sessionCookie) {
      return NextResponse.redirect(new URL('/deliveryman/apply', request.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (imágenes públicas, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo-hid.png|logo-hidelivery.png).*)',
  ],
}

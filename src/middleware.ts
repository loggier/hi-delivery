import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// const AUTH_COOKIE_NAME = 'hub_session'
// const PROTECTED_ROUTES = ['/dashboard', '/businesses', '/riders', '/products', '/categories', '/users']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

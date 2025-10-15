import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// const AUTH_COOKIE_NAME = 'hub_session'
// const PROTECTED_ROUTES = ['/dashboard', '/businesses', '/riders', '/products', '/categories', '/users']
// const PUBLIC_ROUTES = ['/sign-in', '/deliveryman/apply']

export function middleware(request: NextRequest) {
  // const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  // const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

  // if (isProtectedRoute && !sessionCookie) {
  //   const absoluteURL = new URL('/sign-in', request.nextUrl.origin)
  //   return NextResponse.redirect(absoluteURL.toString())
  // }

  // if (pathname === '/sign-in' && sessionCookie) {
  //   const absoluteURL = new URL('/dashboard', request.nextUrl.origin)
  //   return NextResponse.redirect(absoluteURL.toString())
  // }
  
  // if (pathname === '/') {
  //    if (sessionCookie) {
  //       return NextResponse.redirect(new URL('/dashboard', request.url))
  //    }
  //    return NextResponse.redirect(new URL('/sign-in', request.url))
  // }

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
    '/((?!api|_next/static|_next/image|favicon.ico|sign-in).*)',
  ],
}

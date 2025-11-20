import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    '/((?!api|_next/static|_next/image|favicon.ico|logo-hid.png|logo-hidelivery.png|site).*)',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const AUTH_STORAGE_KEY = "hid-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_STORAGE_KEY);

  if (pathname === '/') {
     if (sessionCookie) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
     }
     return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  
  const isAdminPath = pathname.startsWith('/dashboard') || pathname.startsWith('/business-categories') || pathname.startsWith('/businesses') || pathname.startsWith('/customers') || pathname.startsWith('/plans') || pathname.startsWith('/product-categories') || pathname.startsWith('/riders') || pathname.startsWith('/roles') || pathname.startsWith('/settings') || pathname.startsWith('/subscriptions') || pathname.startsWith('/users') || pathname.startsWith('/zones');

  if (isAdminPath && !sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
  }

  if (pathname === '/sign-in' && sessionCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Allow access to the root of apply pages without a session
  if (pathname.startsWith('/deliveryman/apply/') && pathname !== '/deliveryman/apply') {
    // For subsequent steps in rider application, we don't need a session cookie,
    // as state might be handled client-side or via URL params.
    // Let's assume no server-side session check is needed for these steps.
  }
  
  if (pathname.startsWith('/store/apply/') && pathname !== '/store/apply') {
    // Same for store application
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo-hid.png|logo-hidelivery.png).*)',
  ],
}

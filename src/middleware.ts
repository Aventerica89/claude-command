import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/health']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if auth is enabled (MC3_PASSWORD is set)
  // Note: We can't access process.env in middleware, so we check the cookie
  const sessionCookie = request.cookies.get('mc3_session')

  // If no password is set (determined by trying to access protected route without cookie)
  // we'll let the server-side check handle it
  // For now, if there's no session cookie, redirect to login
  // The login page will auto-redirect if auth is disabled

  if (!sessionCookie && pathname.startsWith('/dashboard')) {
    // Check for auth disabled header (set by a previous request)
    // For simplicity, redirect to login and let login page handle auth-disabled case
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/trpc/:path*', '/api/sessions/:path*'],
}

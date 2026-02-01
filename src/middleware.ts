import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/check', '/api/health']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if auth is enabled (MC3_PASSWORD is set)
  // Note: We can't access process.env in middleware, so we check the cookie
  const sessionCookie = request.cookies.get('mc3_session')

  // If no session cookie, handle based on route type
  if (!sessionCookie) {
    // For dashboard routes, redirect to login
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // For API routes, return 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/trpc/:path*', '/api/sessions/:path*'],
}

import { NextResponse } from 'next/server'
import { getAuthConfig, isAuthenticated } from '@/lib/auth'

export async function GET() {
  const config = getAuthConfig()

  if (!config) {
    // Auth is disabled
    return NextResponse.json({ authEnabled: false, authenticated: true })
  }

  const authenticated = await isAuthenticated()
  return NextResponse.json({ authEnabled: true, authenticated })
}

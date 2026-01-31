import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession, setSessionCookie, getAuthConfig } from '@/lib/auth'

export async function POST(request: NextRequest) {
  // If auth is disabled, just redirect
  if (!getAuthConfig()) {
    return NextResponse.json({ success: true })
  }

  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const valid = await verifyPassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const token = await createSession()
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

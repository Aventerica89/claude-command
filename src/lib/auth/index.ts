import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'

const SESSION_COOKIE = 'mc3_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Simple in-memory session store (for single-user, single-instance use)
const sessions = new Map<string, { createdAt: number }>()

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function getAuthConfig() {
  const password = process.env.MC3_PASSWORD
  if (!password) {
    console.warn('MC3_PASSWORD not set - auth disabled')
    return null
  }
  return {
    passwordHash: hashPassword(password),
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  const config = getAuthConfig()
  if (!config) return true // Auth disabled if no password set

  return hashPassword(password) === config.passwordHash
}

export async function createSession(): Promise<string> {
  const token = generateSessionToken()
  sessions.set(token, { createdAt: Date.now() })

  // Clean up old sessions
  const now = Date.now()
  for (const [key, value] of sessions) {
    if (now - value.createdAt > SESSION_MAX_AGE * 1000) {
      sessions.delete(key)
    }
  }

  return token
}

export async function validateSession(token: string): Promise<boolean> {
  const session = sessions.get(token)
  if (!session) return false

  const now = Date.now()
  if (now - session.createdAt > SESSION_MAX_AGE * 1000) {
    sessions.delete(token)
    return false
  }

  return true
}

export async function destroySession(token: string): Promise<void> {
  sessions.delete(token)
}

export async function isAuthenticated(): Promise<boolean> {
  const config = getAuthConfig()
  if (!config) return true // Auth disabled

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)
  if (!sessionCookie) return false

  return validateSession(sessionCookie.value)
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)
  if (sessionCookie) {
    await destroySession(sessionCookie.value)
  }
  cookieStore.delete(SESSION_COOKIE)
}

export { SESSION_COOKIE }

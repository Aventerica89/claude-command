import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'crypto'
import Redis from 'ioredis'

const SESSION_COOKIE = 'mc3_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
const SESSION_PREFIX = 'mc3:session:'

// Redis client for session storage
let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })

    redis.on('error', (err) => {
      console.error('Redis connection error:', err)
    })
  }
  return redis
}

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
  const redis = getRedisClient()

  try {
    // Store session in Redis with expiry
    await redis.setex(
      `${SESSION_PREFIX}${token}`,
      SESSION_MAX_AGE,
      JSON.stringify({ createdAt: Date.now() })
    )
  } catch (error) {
    console.error('Failed to create session in Redis:', error)
    throw new Error('Session creation failed')
  }

  return token
}

export async function validateSession(token: string): Promise<boolean> {
  const redis = getRedisClient()

  try {
    const sessionData = await redis.get(`${SESSION_PREFIX}${token}`)
    return sessionData !== null
  } catch (error) {
    console.error('Failed to validate session:', error)
    return false
  }
}

export async function destroySession(token: string): Promise<void> {
  const redis = getRedisClient()

  try {
    await redis.del(`${SESSION_PREFIX}${token}`)
  } catch (error) {
    console.error('Failed to destroy session:', error)
  }
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

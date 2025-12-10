import { cookies } from 'next/headers'
import crypto from 'crypto'

const CSRF_TOKEN_COOKIE = 'csrf-token'
const CSRF_TOKEN_HEADER = 'x-csrf-token'

/**
 * Generate a CSRF token and set it in a cookie
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const cookieStore = await cookies()
  
  cookieStore.set(CSRF_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
  
  return token
}

/**
 * Verify CSRF token from request header against cookie
 */
export async function verifyCsrfToken(token: string | null | undefined): Promise<boolean> {
  if (!token) {
    console.log('[CSRF] No token provided in header')
    return false
  }

  const cookieStore = await cookies()
  const storedToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value

  if (!storedToken) {
    console.log('[CSRF] No token found in cookie')
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(storedToken)
    )
    if (!isValid) {
      console.log('[CSRF] Token mismatch - header token does not match cookie token')
    }
    return isValid
  } catch (error) {
    console.error('[CSRF] Error comparing tokens:', error)
    return false
  }
}

/**
 * Get CSRF token from cookie (for server components)
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(CSRF_TOKEN_COOKIE)?.value || null
}

/**
 * CSRF token header name
 */
export const CSRF_HEADER_NAME = CSRF_TOKEN_HEADER


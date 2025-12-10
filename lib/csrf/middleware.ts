import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, CSRF_HEADER_NAME } from './token'
import { logSecurityEvent, getClientIp, getUserAgent } from '@/lib/logging/security-logger'

/**
 * Middleware to verify CSRF token for state-changing operations
 * Skip for GET, HEAD, OPTIONS requests
 */
export async function requireCsrfToken(request: NextRequest): Promise<{ valid: boolean; response?: NextResponse }> {
  const method = request.method.toUpperCase()
  
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true }
  }

  const token = request.headers.get(CSRF_HEADER_NAME)
  
  // Debug logging
  console.log(`[CSRF] Checking token for ${method} ${request.nextUrl.pathname}`)
  console.log(`[CSRF] Token in header: ${token ? 'present' : 'missing'}`)
  
  const isValid = await verifyCsrfToken(token)
  
  console.log(`[CSRF] Token valid: ${isValid}`)

  if (!isValid) {
    console.error(`[CSRF] Token validation failed - token: ${token ? 'present but invalid' : 'missing'}`)
    
    // Log CSRF failure (non-blocking)
    logSecurityEvent({
      event_type: 'csrf_failure',
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request),
      path: request.nextUrl.pathname,
      method: method,
      error_message: token ? 'Invalid CSRF token' : 'Missing CSRF token',
      metadata: {
        has_token: !!token,
      },
    }).catch(() => {
      // Ignore logging errors - don't break the request
    })
    
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      ),
    }
  }

  return { valid: true }
}


import { NextResponse, NextRequest } from 'next/server'
import { logSecurityEvent, getClientIp, getUserAgent } from '@/lib/logging/security-logger'
import { RateLimitResult } from './rate-limit'

/**
 * Create a rate limit error response
 * @param result - Rate limit result
 * @param request - Optional request object for logging context
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  request?: NextRequest
): NextResponse {
  const resetDate = new Date(result.resetTime).toISOString()
  
  // Log rate limit violation (non-blocking)
  if (request) {
    logSecurityEvent({
      event_type: 'rate_limit_exceeded',
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request),
      path: request.nextUrl.pathname,
      method: request.method,
      error_message: 'Rate limit exceeded',
      metadata: {
        remaining: result.remaining,
        reset_time: resetDate,
      },
    }).catch(() => {
      // Ignore logging errors - don't break the request
    })
  }
  
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
      },
    }
  )
}


import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent, getClientIp, getUserAgent, SecurityEventType } from '@/lib/logging/security-logger'
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { createRateLimitResponse } from '@/lib/middleware/rate-limit-response'

/**
 * API endpoint for logging security events from client-side
 * Rate limited to prevent abuse
 */
export async function POST(request: NextRequest) {
  // Rate limit this endpoint heavily to prevent spam
  const identifier = getRateLimitIdentifier(request)
  const limitResult = rateLimit(identifier, 10, 60 * 1000) // 10 requests per minute
  if (!limitResult.allowed) {
    return createRateLimitResponse(limitResult, request)
  }

  try {
    console.log('[Security Log API] Received request to log event')
    const body = await request.json()
    const { event_type, error_message, metadata } = body

    console.log('[Security Log API] Event type:', event_type)

    // Validate event type
    const validEventTypes: SecurityEventType[] = [
      'failed_login',
      'suspicious_activity',
    ]

    if (!validEventTypes.includes(event_type)) {
      console.error('[Security Log API] Invalid event type:', event_type)
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Log the security event (non-blocking)
    console.log('[Security Log API] Calling logSecurityEvent...')
    await logSecurityEvent({
      event_type,
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request),
      path: request.nextUrl.pathname,
      method: 'POST',
      error_message: error_message || null,
      metadata: metadata || null,
    })
    console.log('[Security Log API] logSecurityEvent completed')

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    // Don't expose internal errors, but log them
    console.error('[Security Log API] Error in POST handler:', {
      error_message: error.message,
      error_stack: error.stack,
    })
    return NextResponse.json(
      { error: 'Failed to log event' },
      { status: 500 }
    )
  }
}


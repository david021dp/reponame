import { NextRequest, NextResponse } from 'next/server'

/**
 * Request size limits (in bytes)
 */
export const REQUEST_SIZE_LIMITS = {
  // General API endpoints: 100KB (sufficient for JSON payloads)
  general: 100 * 1024, // 100KB
  
  // Appointment creation: 50KB (appointment data is small)
  appointment: 50 * 1024, // 50KB
  
  // Registration: 10KB (user data is small)
  registration: 10 * 1024, // 10KB
} as const

/**
 * Check if request body size exceeds limit
 * Note: In Next.js, we can't easily get body size before parsing,
 * so this is a best-effort check. The framework has built-in limits.
 */
export function checkRequestSize(request: NextRequest, maxSize: number): { valid: boolean; response?: NextResponse } {
  const contentLength = request.headers.get('content-length')
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > maxSize) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: `Request body too large. Maximum size: ${Math.round(maxSize / 1024)}KB` },
          { status: 413 } // Payload Too Large
        ),
      }
    }
  }
  
  return { valid: true }
}


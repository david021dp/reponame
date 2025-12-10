import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Security event types that should be logged
 */
export type SecurityEventType =
  | 'failed_login'
  | 'csrf_failure'
  | 'rate_limit_exceeded'
  | 'authorization_failure'
  | 'validation_failure'
  | 'suspicious_activity'

/**
 * Security log entry (safe for production - no sensitive data)
 */
export interface SecurityLogData {
  event_type: SecurityEventType
  user_id?: string | null // User ID only (not email)
  ip_address?: string | null
  user_agent?: string | null
  path?: string | null
  method?: string | null
  error_message?: string | null // Error message only (no passwords/tokens)
  metadata?: Record<string, any> | null // Additional safe context
}

/**
 * Log a security event to the database
 * This function is safe - it never logs passwords, tokens, emails, or cookies
 */
export async function logSecurityEvent(data: SecurityLogData): Promise<void> {
  try {
    // Check if service role key is configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Security Logger] SUPABASE_SERVICE_ROLE_KEY is not configured. Cannot log security events.')
      return
    }

    // Use admin client to bypass RLS for security logging
    let supabase
    try {
      supabase = createAdminClient()
    } catch (clientError: any) {
      console.error('[Security Logger] Failed to create admin client:', clientError.message)
      return
    }

    // Sanitize metadata to ensure no sensitive data
    const safeMetadata = data.metadata ? sanitizeMetadata(data.metadata) : null

    const logEntry = {
      event_type: data.event_type,
      user_id: data.user_id || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      path: data.path || null,
      method: data.method || null,
      error_message: data.error_message || null,
      metadata: safeMetadata,
    }

    console.log('[Security Logger] Attempting to log event:', data.event_type, 'to path:', data.path)

    const { data: insertedData, error } = await supabase
      .from('security_logs')
      .insert(logEntry)
      .select()

    if (error) {
      // Don't throw - logging failures shouldn't break the app
      // But log to console for debugging
      console.error('[Security Logger] Failed to insert security log:', {
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        event_type: data.event_type,
      })
    } else {
      console.log('[Security Logger] Successfully logged security event:', data.event_type, 'ID:', insertedData?.[0]?.id)
    }
  } catch (error: any) {
    // Don't throw - logging failures shouldn't break the app
    console.error('[Security Logger] Unexpected error logging security event:', {
      error_message: error.message,
      error_stack: error.stack,
      event_type: data.event_type,
    })
  }
}

/**
 * Sanitize metadata to remove any sensitive information
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    'password',
    'token',
    'csrf_token',
    'jwt',
    'session',
    'cookie',
    'email',
    'authorization',
    'api_key',
    'secret',
  ]

  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase()

    // Skip sensitive keys
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      continue
    }

    // If value is an object, recursively sanitize
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, any>)
    } else if (Array.isArray(value)) {
      // For arrays, sanitize each object element
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeMetadata(item as Record<string, any>)
          : item
      )
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Helper to extract IP address from request
 */
export function getClientIp(request: Request | { headers: Headers }): string | null {
  const headers = 'headers' in request ? request.headers : new Headers()
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return headers.get('x-real-ip') || null
}

/**
 * Helper to extract user agent from request
 */
export function getUserAgent(request: Request | { headers: Headers }): string | null {
  const headers = 'headers' in request ? request.headers : new Headers()
  return headers.get('user-agent') || null
}


import { NextRequest } from 'next/server'

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

/**
 * Simple rate limiting function
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  // No record or expired - create new
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    }
  }

  // Check if limit exceeded
  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  // Increment count
  record.count++
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Get rate limit identifier from request (IP address)
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (handles proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 
      request.ip || 
      'unknown'
  
  return ip
}

/**
 * Rate limit configuration presets
 */
export const RATE_LIMITS = {
  // General API routes: 100 requests per hour
  general: { maxRequests: 100, windowMs: 60 * 60 * 1000 },
  
  // Authentication routes: 10 requests per hour (brute force protection)
  auth: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  
  // Appointment creation: 10 appointments per hour
  appointments: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  
  // Admin registration: 20 registrations per hour
  registration: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
} as const


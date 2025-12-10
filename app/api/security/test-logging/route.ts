import { NextRequest, NextResponse } from 'next/server'
import { logSecurityEvent, getClientIp, getUserAgent } from '@/lib/logging/security-logger'

/**
 * Test endpoint to verify security logging is working
 * This helps diagnose if service role key is configured
 */
export async function GET(request: NextRequest) {
  try {
    // Check if service role key exists
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL

    // Try to log a test event
    await logSecurityEvent({
      event_type: 'failed_login',
      ip_address: getClientIp(request),
      user_agent: getUserAgent(request),
      path: '/api/security/test-logging',
      method: 'GET',
      error_message: 'Test logging event',
      metadata: { test: true },
    })

    return NextResponse.json({
      success: true,
      diagnostics: {
        has_service_role_key: hasServiceKey,
        has_supabase_url: hasSupabaseUrl,
        service_key_length: hasServiceKey ? process.env.SUPABASE_SERVICE_ROLE_KEY!.length : 0,
        message: hasServiceKey 
          ? 'Service role key is configured. Check server console for logging results.'
          : '⚠️ SUPABASE_SERVICE_ROLE_KEY is NOT configured. Add it to .env.local',
      },
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnostics: {
        has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      },
    }, { status: 500 })
  }
}


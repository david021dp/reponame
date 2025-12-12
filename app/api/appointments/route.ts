import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppointmentInsert, Appointment } from '@/types/database.types'
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { createRateLimitResponse } from '@/lib/middleware/rate-limit-response'
import { validateAppointment } from '@/lib/validation/appointment'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { checkRequestSize, REQUEST_SIZE_LIMITS } from '@/lib/middleware/request-size-limit'
import { logSecurityEvent, getClientIp, getUserAgent } from '@/lib/logging/security-logger'
import { getClientCreatedAppointmentsCountForUTC1Day } from '@/lib/queries/appointments'
import { getTodayInUTC1 } from '@/lib/utils/timezone'

export async function GET(request: NextRequest) {
  // Rate limiting
  const identifier = getRateLimitIdentifier(request)
  const limitResult = rateLimit(identifier, RATE_LIMITS.general.maxRequests, RATE_LIMITS.general.windowMs)
  if (!limitResult.allowed) {
    return createRateLimitResponse(limitResult, request)
  }

  try {
    const supabase = await createClient()
    
    // Fetch all services
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('duration', { ascending: true })

    if (error) {
      console.error('Error fetching services:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ services }, { status: 200 })
  } catch (error: any) {
    console.error('Error in GET /api/appointments:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Request size check
  const sizeCheck = checkRequestSize(request, REQUEST_SIZE_LIMITS.appointment)
  if (!sizeCheck.valid) {
    return sizeCheck.response!
  }

  // CSRF protection
  const csrfCheck = await requireCsrfToken(request)
  if (!csrfCheck.valid) {
    return csrfCheck.response!
  }

  // Rate limiting for appointment creation
  const identifier = getRateLimitIdentifier(request)
  const limitResult = rateLimit(identifier, RATE_LIMITS.appointments.maxRequests, RATE_LIMITS.appointments.windowMs)
  if (!limitResult.allowed) {
    return createRateLimitResponse(limitResult, request)
  }

  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Log authorization failure (non-blocking)
      logSecurityEvent({
        event_type: 'authorization_failure',
        ip_address: getClientIp(request),
        user_agent: getUserAgent(request),
        path: request.nextUrl.pathname,
        method: 'POST',
        error_message: 'Unauthorized - no user session',
      }).catch(() => {
        // Ignore logging errors
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body (using the same NextRequest object to avoid body consumption issues)
    let rawBody: any
    try {
      console.log('[POST /api/appointments] Parsing request body...')
      rawBody = await request.json()
      console.log('[POST /api/appointments] Body parsed successfully')
    } catch (bodyError: any) {
      console.error('[POST /api/appointments] Failed to parse request body:', bodyError.message)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }
    
    // Validate input
    let body: AppointmentInsert
    try {
      console.log('[POST /api/appointments] Validating appointment data...')
      body = validateAppointment({ ...rawBody, user_id: user.id }) as AppointmentInsert
      console.log('[POST /api/appointments] Validation successful')
    } catch (error: any) {
      console.error('[POST /api/appointments] Validation failed:', error.message, error.errors)
      if (error.errors) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: `Validation failed: ${error.message}` },
        { status: 400 }
      )
    }

    // Check daily appointment creation limit (per real day in Europe/Belgrade)
    const MAX_APPOINTMENTS_PER_DAY = 3
    const todayUtc1 = getTodayInUTC1()
    const existingAppointmentsCount = await getClientCreatedAppointmentsCountForUTC1Day(
      user.id,
      todayUtc1
    )

    if (existingAppointmentsCount >= MAX_APPOINTMENTS_PER_DAY) {
      return NextResponse.json(
        { error: 'Dostigli ste maksimalan broj današnjih termina.' },
        { status: 400 }
      )
    }

    // Create appointment
    console.log('[POST /api/appointments] Inserting appointment into database...')
    const { data, error } = await supabase
      .from('appointments')
      .insert(body)
      .select()
      .single<Appointment>()

    if (error) {
      console.error('[POST /api/appointments] Database error:', error.code, error.message)
      
      // Handle unique constraint violation (double booking)
      if (error.code === '23505' || error.message.includes('unique_appointment_slot')) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('[POST /api/appointments] Appointment created successfully:', data.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/appointments] Unexpected error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


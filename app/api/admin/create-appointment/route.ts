import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAdminActivity } from '@/lib/queries/admin-logs'
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { createRateLimitResponse } from '@/lib/middleware/rate-limit-response'
import { validateAdminAppointment } from '@/lib/validation/appointment'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { checkRequestSize, REQUEST_SIZE_LIMITS } from '@/lib/middleware/request-size-limit'
import { createNotificationAsAdmin } from '@/lib/queries/notifications'
import { NotificationInsert } from '@/types/database.types'

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

  try {
    const supabase = await createClient()
    
    // Verify user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin' && userData?.role !== 'head_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Rate limiting - use user ID and admin limit for admins/head_admins
    const identifier = getRateLimitIdentifier(request, user.id)
    const limitResult = rateLimit(identifier, RATE_LIMITS.adminAppointments.maxRequests, RATE_LIMITS.adminAppointments.windowMs)
    if (!limitResult.allowed) {
      return createRateLimitResponse(limitResult, request)
    }

    // Parse request body (using the same NextRequest object to avoid body consumption issues)
    let rawBody
    try {
      rawBody = await request.json()
    } catch (parseError: any) {
      console.error('Error parsing request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }
    
    // Validate input
    let validatedData
    try {
      validatedData = validateAdminAppointment(rawBody)
    } catch (error: any) {
      console.error('Validation error:', error)
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

    // Use authenticated user's ID, not from request body (fixes authorization bypass)
    const admin_id = user.id

    const { 
      client_first_name,
      client_last_name,
      client_phone,
      service_name,
      appointment_date,
      appointment_time,
      notes,
      worker_name,
      worker_id,
      duration
    } = validatedData

    // Validate worker_id is present
    if (!worker_id) {
      console.error('worker_id is missing from validated data:', validatedData)
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get admin's email for the appointment record
    const { data: adminUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', admin_id)
      .single()

    const adminEmail = adminUser?.email || 'admin@system.local'

    // Use admin's user_id directly - no new user creation needed
    const insertData: any = {
      user_id: admin_id,
      first_name: client_first_name,
      last_name: client_last_name,
      phone: client_phone || null,
      email: adminEmail,
      service: service_name,
      appointment_date: appointment_date,
      appointment_time: appointment_time,
      notes: notes || null,
      worker: worker_name,
      worker_id: worker_id,
      duration: duration,
      status: 'scheduled',
      is_rescheduled: false,
    }
    
    const { data: appointmentData, error: appointmentError } = await adminSupabase
      .from('appointments')
      .insert(insertData)
      .select()
      .single()

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError)
      
      // Handle unique constraint violation (double booking)
      if (appointmentError.code === '23505' || appointmentError.message.includes('unique_appointment_slot')) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: appointmentError.message },
        { status: 400 }
      )
    }

    const appointment: any = appointmentData

    // Create notification for the assigned worker (not the admin creating it)
    // Use admin client to bypass RLS and ensure notification is created
    if (worker_id) {
      try {
        const notificationData: NotificationInsert = {
          admin_id: worker_id, // Notify the assigned worker, not the admin creating it
          appointment_id: appointment.id,
          type: 'appointment_created',
          message: `New appointment created: ${client_first_name} ${client_last_name} - ${service_name}`,
          is_read: false,
        }

        const { error: notifError } = await createNotificationAsAdmin(notificationData)
        
        if (notifError) {
          console.error('Error creating notification:', notifError)
          console.error('Notification error details:', JSON.stringify(notifError, null, 2))
          // Don't fail the appointment creation if notification fails
        }
      } catch (notifError: any) {
        console.error('Error creating notification (catch):', notifError)
        console.error('Notification error stack:', notifError?.stack)
        // Don't fail the appointment creation if notification fails
      }
    } else {
      console.warn('No worker_id provided, skipping notification creation')
    }

    // Log admin activity (who created the appointment)
    try {
      await logAdminActivity(admin_id, 'create_appointment', {
        appointment_id: appointment.id,
        client_name: `${client_first_name} ${client_last_name}`,
        service: service_name,
        worker_id: worker_id,
      })
    } catch (logError: any) {
      console.error('Error logging admin activity:', logError)
      // Don't fail the appointment creation if logging fails
    }

    return NextResponse.json(
      { 
        success: true,
        appointment: appointmentData,
        message: 'Appointment created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/admin/create-appointment:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


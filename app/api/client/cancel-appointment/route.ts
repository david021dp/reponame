import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCancelAppointment } from '@/lib/validation/appointment'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { Database } from '@/types/database.types'

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfCheck = await requireCsrfToken(request)
  if (!csrfCheck.valid) {
    return csrfCheck.response!
  }

  try {
    const supabase = await createClient()
    
    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body (using the same NextRequest object to avoid body consumption issues)
    let rawBody: any
    try {
      console.log('[POST /api/client/cancel-appointment] Parsing request body...')
      rawBody = await request.json()
      console.log('[POST /api/client/cancel-appointment] Body parsed successfully')
    } catch (bodyError: any) {
      console.error('[POST /api/client/cancel-appointment] Failed to parse request body:', bodyError.message)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }
    
    // Validate input
    let validatedData
    try {
      console.log('[POST /api/client/cancel-appointment] Validating cancellation data...')
      validatedData = validateCancelAppointment(rawBody)
      console.log('[POST /api/client/cancel-appointment] Validation successful')
    } catch (error: any) {
      console.error('[POST /api/client/cancel-appointment] Validation failed:', error.message, error.errors)
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

    const { appointment_id, reason } = validatedData

    // Get the appointment to verify ownership and get details
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, user_id, worker, service, appointment_date, appointment_time, duration')
      .eq('id', appointment_id)
      .eq('user_id', user.id) // Verify ownership
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found or unauthorized' },
        { status: 404 }
      )
    }

    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Appointment is already cancelled' },
        { status: 400 }
      )
    }

    // Update appointment to cancelled
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_by: 'client',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq('id', appointment_id)
      .select()
      .single()

    if (updateError) {
      console.error('[POST /api/client/cancel-appointment] Database error:', updateError.code, updateError.message)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    console.log('[POST /api/client/cancel-appointment] Appointment cancelled successfully:', appointment_id)

    // Get client info
    const { data: clientData } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    // Use worker_id directly from appointment
    if (appointment.worker_id) {
      const clientName = clientData 
        ? `${clientData.first_name} ${clientData.last_name}`
        : appointment.email

      // Use admin client to bypass RLS for notification creation
      const supabaseAdmin = createAdminClient()
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          admin_id: appointment.worker_id,
          appointment_id: appointment.id,
          type: 'appointment_cancelled' as const,
          message: `${clientName} cancelled their ${appointment.service} appointment on ${appointment.appointment_date} at ${appointment.appointment_time}`,
          cancellation_reason: reason,
          is_read: false,
        } satisfies Database['public']['Tables']['notifications']['Insert'])

      if (notifError) {
        console.error('Error creating notification:', notifError)
        // Don't fail the cancellation if notification fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Appointment cancelled successfully',
        appointment: updatedAppointment,
        cancelled: true,
        appointment_id: appointment_id,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[POST /api/client/cancel-appointment] Unexpected error:', error.message, error.stack)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


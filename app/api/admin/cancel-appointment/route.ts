import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAdminActivity } from '@/lib/queries/admin-logs'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { createNotificationAsAdmin } from '@/lib/queries/notifications'
import { NotificationInsert } from '@/types/database.types'

export async function POST(request: NextRequest) {
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

    // Check if user is admin
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

    // Use authenticated user's ID, not from request body (fixes authorization bypass)
    const admin_id = user.id

    // Parse request body (using the same NextRequest object to avoid body consumption issues)
    let rawBody: any
    try {
      console.log('[POST /api/admin/cancel-appointment] Parsing request body...')
      rawBody = await request.json()
      console.log('[POST /api/admin/cancel-appointment] Body parsed successfully')
    } catch (bodyError: any) {
      console.error('[POST /api/admin/cancel-appointment] Failed to parse request body:', bodyError.message)
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      )
    }

    const { appointment_id } = rawBody

    // First, fetch the appointment to check if it's a blocked appointment
    const { data: appointmentData, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single()

    if (fetchError) {
      // If appointment doesn't exist, return success (it's already gone)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            success: true,
            message: 'Appointment not found (may have been already deleted)'
          },
          { status: 200 }
        )
      }
      console.error('Error fetching appointment:', fetchError)
      return NextResponse.json(
        { error: fetchError.message },
        { status: 400 }
      )
    }

    // Check if this is a blocked appointment
    const isBlockedAppointment = appointmentData.first_name === 'Blocked' && appointmentData.last_name === 'Time'

    if (isBlockedAppointment) {
      // Delete blocked appointments instead of cancelling them
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment_id)

      if (deleteError) {
        console.error('Error deleting blocked appointment:', deleteError)
        return NextResponse.json(
          { error: deleteError.message },
          { status: 400 }
        )
      }

      // Log admin activity for unblocking (using cancel_appointment type since it's the closest match)
      await logAdminActivity(admin_id, 'cancel_appointment', {
        appointment_id,
        action: 'unblock_time',
        service: appointmentData.service,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
      })

      // Create notification for the worker assigned to this blocked time
      try {
        // Get cancelling admin name
        const { data: cancellingAdmin } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', admin_id)
          .single()

        // Use worker_id directly from appointment
        if (appointmentData.worker_id && cancellingAdmin) {
          const cancellingAdminName = `${cancellingAdmin.first_name} ${cancellingAdmin.last_name}`
          
          const notificationData: NotificationInsert = {
            admin_id: appointmentData.worker_id,
            appointment_id: appointment_id,
            type: 'appointment_cancelled',
            message: `${cancellingAdminName} unblocked time slot on ${appointmentData.appointment_date} at ${appointmentData.appointment_time}`,
            cancellation_reason: null,
            is_read: false,
          }
          
          await createNotificationAsAdmin(notificationData)
        }
      } catch (notifError: any) {
        console.error('Error creating notification for unblock:', notifError)
        // Don't fail the unblock operation if notification fails
      }

      return NextResponse.json(
        { 
          success: true,
          message: 'Time unblocked successfully',
          deleted: true,
          appointment_id: appointment_id
        },
        { status: 200 }
      )
    }

    // For regular appointments, update status to cancelled
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment_id)
      .select()
      .single()

    if (error) {
      console.error('Error cancelling appointment:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Log admin activity
    await logAdminActivity(admin_id, 'cancel_appointment', {
      appointment_id,
      client_email: data.email,
      client_name: `${data.first_name} ${data.last_name}`,
      service: data.service,
      appointment_date: data.appointment_date,
      appointment_time: data.appointment_time,
    })

    // Create notification for the worker assigned to this appointment
    try {
      // Get cancelling admin name
      const { data: cancellingAdmin } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', admin_id)
        .single()

      // Use worker_id directly from appointment
      if (data.worker_id && cancellingAdmin) {
        const cancellingAdminName = `${cancellingAdmin.first_name} ${cancellingAdmin.last_name}`
        const clientName = `${data.first_name} ${data.last_name}`
        
        const notificationData: NotificationInsert = {
          admin_id: data.worker_id,
          appointment_id: appointment_id,
          type: 'appointment_cancelled',
          message: `${cancellingAdminName} cancelled ${clientName}'s ${data.service} appointment on ${data.appointment_date} at ${data.appointment_time}`,
          cancellation_reason: null,
          is_read: false,
        }
        
        await createNotificationAsAdmin(notificationData)
      }
    } catch (notifError: any) {
      console.error('Error creating notification for cancellation:', notifError)
      // Don't fail the cancellation if notification fails
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Appointment cancelled successfully'
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/admin/cancel-appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


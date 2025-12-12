import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateAppointment } from '@/lib/queries/appointments'
import { getServices } from '@/lib/queries/services'
import { rateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { createRateLimitResponse } from '@/lib/middleware/rate-limit-response'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { checkRequestSize, REQUEST_SIZE_LIMITS } from '@/lib/middleware/request-size-limit'
import { getWorkerAppointmentsForDate } from '@/lib/queries/appointments'
import { Appointment } from '@/types/database.types'

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

    // Rate limiting - use user ID and admin update limit for admins/head_admins
    const identifier = getRateLimitIdentifier(request, user.id)
    const limitResult = rateLimit(identifier, RATE_LIMITS.adminAppointmentUpdates.maxRequests, RATE_LIMITS.adminAppointmentUpdates.windowMs)
    if (!limitResult.allowed) {
      return createRateLimitResponse(limitResult, request)
    }

    // Parse request body
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

    const {
      appointment_id,
      service_ids,
      appointment_date,
      appointment_time,
      notes,
      worker_id,
    } = rawBody

    // Validate required fields
    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(service_ids) || service_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one service must be selected' },
        { status: 400 }
      )
    }

    if (!appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'Appointment date and time are required' },
        { status: 400 }
      )
    }

    if (!worker_id) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      )
    }

    // Get the appointment to verify it exists and get current values
    const adminSupabase = createAdminClient()
    const { data: existingAppointment, error: fetchError } = await adminSupabase
      .from('appointments')
      .select('*')
      .eq('id', appointment_id)
      .single<Appointment>()

    if (fetchError || !existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Verify appointment is scheduled (not cancelled)
    if (existingAppointment.status !== 'scheduled') {
      return NextResponse.json(
        { error: 'Cannot edit cancelled appointments' },
        { status: 400 }
      )
    }

    // Get services to convert IDs to names and calculate duration
    const services = await getServices()
    const selectedServices = services.filter((s) => service_ids.includes(s.id))
    
    if (selectedServices.length !== service_ids.length) {
      return NextResponse.json(
        { error: 'One or more selected services are invalid' },
        { status: 400 }
      )
    }

    const serviceNames = selectedServices.map((s) => s.name).join(', ')
    const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)

    // Format time (remove seconds if present)
    let formattedTime = appointment_time
    if (formattedTime.includes(':')) {
      const parts = formattedTime.split(':')
      if (parts.length === 3) {
        formattedTime = `${parts[0]}:${parts[1]}`
      }
    }

    // Check time slot availability (excluding current appointment)
    // Fetch all appointments for this worker/date with IDs to properly exclude current appointment
    type AppointmentConflict = {
      id: string
      appointment_time: string
      duration: number
      status: string
    }
    
    const { data: existingAppointments, error: appointmentsError } = await adminSupabase
      .from('appointments')
      .select('id, appointment_time, duration, status')
      .eq('worker_id', worker_id)
      .eq('appointment_date', appointment_date)
      .eq('status', 'scheduled')
      .returns<AppointmentConflict[]>()

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError)
      return NextResponse.json(
        { error: 'Failed to check appointment availability' },
        { status: 500 }
      )
    }

    // Filter out current appointment from conflict checks
    const appointmentsToCheck = (existingAppointments || []).filter(
      (apt) => apt.id !== appointment_id
    )

    // Check for exact time slot conflict
    const conflictingAppointments = appointmentsToCheck.filter(
      (apt) => apt.appointment_time === formattedTime
    )

    if (conflictingAppointments.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select another time.' },
        { status: 409 }
      )
    }

    const [timeHour, timeMin] = formattedTime.split(':').map(Number)
    const startMinutes = timeHour * 60 + timeMin
    const endMinutes = startMinutes + totalDuration

    for (const apt of appointmentsToCheck) {
      const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number)
      const aptStartMinutes = aptHour * 60 + aptMin
      const aptEndMinutes = aptStartMinutes + apt.duration

      // Check for overlap
      if (
        (startMinutes >= aptStartMinutes && startMinutes < aptEndMinutes) ||
        (endMinutes > aptStartMinutes && startMinutes < aptStartMinutes)
      ) {
        return NextResponse.json(
          { error: 'Selected time slot conflicts with existing appointment' },
          { status: 409 }
        )
      }
    }

    // Update the appointment
    const updatedAppointment = await updateAppointment(
      appointment_id,
      {
        service: serviceNames,
        appointment_date: appointment_date,
        appointment_time: formattedTime,
        duration: totalDuration,
        notes: notes || null,
      },
      user.id
    )

    return NextResponse.json(
      {
        success: true,
        appointment: updatedAppointment,
        message: 'Appointment updated successfully',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/admin/update-appointment:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


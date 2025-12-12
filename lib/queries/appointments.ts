import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AppointmentInsert } from '@/types/database.types'
import { logAdminActivity } from './admin-logs'
import { getUtcRangeForUTC1Day } from '@/lib/utils/timezone'

export async function createAppointment(appointmentData: AppointmentInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserAppointments(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getAdminAppointments(
  role: 'admin' | 'head_admin',
  currentWorkerId: string,
  filterWorkerId?: string | 'all'
) {
  const supabase = await createClient()
  let query = supabase
    .from('appointments')
    .select('*')
  
  // Regular admin: always filter by their own worker_id
  if (role === 'admin') {
    query = query.eq('worker_id', currentWorkerId)
  } 
  // Head admin: filter based on filterWorkerId
  else if (role === 'head_admin') {
    if (filterWorkerId && filterWorkerId !== 'all') {
      // Always filter by filterWorkerId, even if it equals currentWorkerId
      query = query.eq('worker_id', filterWorkerId)
    }
    // If filterWorkerId is 'all' or undefined, no filter (all appointments)
  }
  
  const { data, error } = await query
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })

  if (error) throw error
  return data || []
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'scheduled' | 'cancelled',
  adminId?: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) throw error

  // Log admin activity if adminId is provided
  if (adminId && status === 'cancelled') {
    await logAdminActivity(adminId, 'cancel_appointment', {
      appointment_id: appointmentId,
      new_status: status,
    })
  }

  return data
}

export async function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string,
  adminId?: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .update({
      appointment_date: newDate,
      appointment_time: newTime,
      is_rescheduled: true,
    })
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) throw error

  // Log admin activity if adminId is provided
  if (adminId) {
    await logAdminActivity(adminId, 'reschedule_appointment', {
      appointment_id: appointmentId,
      new_date: newDate,
      new_time: newTime,
    })
  }

  return data
}

export async function getWorkerAppointmentsForDate(
  workerId: string,
  date: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select('appointment_time, duration, status')
    .eq('worker_id', workerId)
    .eq('appointment_date', date)
    .eq('status', 'scheduled')

  if (error) throw error
  return data || []
}

export async function getClientAppointmentsCountForDate(
  userId: string,
  date: string
): Promise<number> {
  // Use admin client to bypass RLS for accurate count
  // This ensures the limit check works regardless of worker_id (head_admin or regular admin)
  // It's safe because we're only counting appointments by user_id, not exposing sensitive data
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('appointment_date', date)
    .eq('status', 'scheduled') // Only count scheduled appointments, not cancelled ones

  if (error) throw error
  return count || 0
}

export async function getClientCreatedAppointmentsCountForUTC1Day(
  userId: string,
  date: string
): Promise<number> {
  const { startIso, endIso } = getUtcRangeForUTC1Day(date)

  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'scheduled')
    .gte('created_at', startIso)
    .lt('created_at', endIso)

  if (error) throw error
  return count || 0
}

export async function updateAppointment(
  appointmentId: string,
  updates: {
    service?: string
    appointment_date?: string
    appointment_time?: string
    duration?: number
    notes?: string | null
  },
  adminId?: string
) {
  const supabase = await createClient()
  
  const updateData: any = {}
  if (updates.service !== undefined) updateData.service = updates.service
  if (updates.appointment_date !== undefined) updateData.appointment_date = updates.appointment_date
  if (updates.appointment_time !== undefined) updateData.appointment_time = updates.appointment_time
  if (updates.duration !== undefined) updateData.duration = updates.duration
  if (updates.notes !== undefined) updateData.notes = updates.notes
  
  // Set is_rescheduled if date or time changed
  if (updates.appointment_date !== undefined || updates.appointment_time !== undefined) {
    updateData.is_rescheduled = true
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select()
    .single()

  if (error) throw error

  // Log admin activity if adminId is provided
  // Use 'reschedule_appointment' if date/time changed, otherwise skip logging
  // (Database constraint may not include 'update_appointment' yet)
  if (adminId) {
    try {
      if (updates.appointment_date !== undefined || updates.appointment_time !== undefined) {
        await logAdminActivity(adminId, 'reschedule_appointment', {
          appointment_id: appointmentId,
          new_date: updates.appointment_date,
          new_time: updates.appointment_time,
        })
      }
    } catch (logError) {
      // Logging failure shouldn't break the update
      console.warn('Failed to log admin activity:', logError)
    }
  }

  return data
}


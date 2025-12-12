import { createClient } from '@/lib/supabase/server'
import { AdminLogInsert } from '@/types/database.types'

export async function logAdminActivity(
  adminId: string,
  actionType: 'register_client' | 'create_appointment' | 'cancel_appointment' | 'reschedule_appointment',
  details?: Record<string, any>
) {
  const supabase = await createClient()
  
  const logData: AdminLogInsert = {
    admin_id: adminId,
    action_type: actionType,
    details: details || null,
  }

  const { data, error } = await supabase
    .from('admin_activity_logs')
    .insert(logData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAdminLogs(adminId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}


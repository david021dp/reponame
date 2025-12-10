import { createClient } from '@/lib/supabase/server'
import { NotificationInsert } from '@/types/database.types'

export async function createNotification(notificationData: NotificationInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUnreadNotifications(adminId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('admin_id', adminId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getAllNotifications(adminId: string, limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getUnreadCount(adminId: string) {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('admin_id', adminId)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function markAllNotificationsAsRead(adminId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('admin_id', adminId)
    .eq('is_read', false)

  if (error) throw error
  return data
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}


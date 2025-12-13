import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * Create notification using admin client (bypasses RLS)
 * Use this when creating notifications for other users
 */
export function createNotificationAsAdmin(notificationData: NotificationInsert) {
  const supabaseAdmin = createAdminClient()
  return supabaseAdmin
    .from('notifications')
    // @ts-ignore - TypeScript has issues with type inference for createAdminClient
    .insert(notificationData)
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

/**
 * Client notification functions
 */

export async function getClientNotifications(clientId: string, limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function getClientUnreadCount(clientId: string) {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', clientId)
    .eq('is_read', false)

  if (error) throw error
  return count || 0
}

export async function getClientUnreadRescheduleNotifications(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', clientId)
    .eq('type', 'appointment_rescheduled')
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function markClientNotificationAsRead(notificationId: string, clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', clientId) // Verify ownership
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Create client notification using admin client (bypasses RLS)
 * Use this when admins create notifications for clients
 */
export async function createClientNotification(notificationData: NotificationInsert) {
  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin
    .from('notifications')
    // @ts-ignore - TypeScript has issues with type inference for createAdminClient
    .insert(notificationData)
    .select()
    .single()

  if (error) throw error
  return data
}


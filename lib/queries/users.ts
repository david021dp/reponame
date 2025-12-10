import { createClient } from '@/lib/supabase/server'
import { UserInsert } from '@/types/database.types'

export async function getUser(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserByEmail(email: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) throw error
  return data
}

export async function getAdmins() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email')
    .in('role', ['admin', 'head_admin'])
    .order('first_name')

  if (error) throw error
  return data || []
}

export async function createUser(userData: UserInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) throw error
  return data
}


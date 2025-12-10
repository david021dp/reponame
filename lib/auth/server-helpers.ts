import { createClient } from '@/lib/supabase/server'

// Server-side auth functions only

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user data from users table
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return userData
}

export async function getUserRole() {
  const userData = await getCurrentUser()
  return userData?.role || null
}


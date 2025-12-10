import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

/**
 * Service Role Client - Bypasses RLS
 * ⚠️ WARNING: Only use this for trusted server-side operations
 * This client has FULL database access and bypasses all RLS policies
 * 
 * Use cases:
 * - Creating notifications for other users
 * - Admin operations that need to bypass RLS
 * - System-level operations
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable. This is required for security logging and admin operations.')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}


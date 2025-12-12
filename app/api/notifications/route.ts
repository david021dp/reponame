import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { User } from '@/types/database.types'

export async function GET(request: Request) {
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

    // Get user role to check if head_admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<Pick<User, 'role'>>()

    // Get adminId from query parameter (for head_admin filtering)
    const { searchParams } = new URL(request.url)
    const adminIdParam = searchParams.get('userId') || searchParams.get('adminId')
    
    // Calculate which admin ID to use
    // If head_admin and adminId param is provided and valid UUID, use it
    // Otherwise, use logged-in user's ID
    let notificationsAdminId = user.id
    if (userData?.role === 'head_admin' && adminIdParam) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(adminIdParam)) {
        notificationsAdminId = adminIdParam
      }
    }

    // Get recent notifications (last 5 for dropdown)
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('admin_id', notificationsAdminId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get unread count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', notificationsAdminId)
      .eq('is_read', false)

    if (countError) {
      console.error('Error counting notifications:', countError)
    }

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: count || 0,
    })
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


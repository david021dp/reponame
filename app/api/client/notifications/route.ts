import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getClientNotifications, getClientUnreadCount } from '@/lib/queries/notifications'

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

    // Get user role to verify they are a client
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (userData?.role !== 'client') {
      return NextResponse.json(
        { error: 'Forbidden - Client access required' },
        { status: 403 }
      )
    }

    // Get recent notifications (last 5 for dropdown)
    const notifications = await getClientNotifications(user.id, 5)

    // Get unread count
    const unreadCount = await getClientUnreadCount(user.id)

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    })
  } catch (error: any) {
    console.error('Error in GET /api/client/notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


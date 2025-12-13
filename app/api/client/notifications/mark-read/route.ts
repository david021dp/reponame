import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markClientNotificationAsRead } from '@/lib/queries/notifications'
import { requireCsrfToken } from '@/lib/csrf/middleware'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // CSRF protection
  const csrfCheck = await requireCsrfToken(request)
  if (!csrfCheck.valid) {
    return csrfCheck.response!
  }

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

    const { notification_id } = await request.json()

    if (!notification_id) {
      return NextResponse.json(
        { error: 'Missing notification_id' },
        { status: 400 }
      )
    }

    // Mark notification as read (with ownership verification)
    const notification = await markClientNotificationAsRead(notification_id, user.id)

    return NextResponse.json({ success: true, notification })
  } catch (error: any) {
    console.error('Error in POST /api/client/notifications/mark-read:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


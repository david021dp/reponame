import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Notification } from '@/types/database.types'

export async function POST(request: Request) {
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

    const { notification_id } = await request.json()

    if (!notification_id) {
      return NextResponse.json(
        { error: 'Missing notification_id' },
        { status: 400 }
      )
    }

    // Mark notification as read
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('admin_id', user.id) // Verify ownership
      .select()
      .single<Notification>()

    if (error) {
      console.error('Error marking notification as read:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, notification: data })
  } catch (error: any) {
    console.error('Error in POST /api/notifications/mark-read:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


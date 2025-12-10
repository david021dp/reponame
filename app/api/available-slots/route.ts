import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTimeSlots, calculateOccupiedSlots } from '@/lib/utils/timeSlots'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('workerId') || searchParams.get('worker') // Support both for backward compatibility
    const date = searchParams.get('date')

    if (!workerId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: workerId and date' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS and see ALL appointments for this worker
    const adminSupabase = createAdminClient()
    
    // Fetch appointments for this worker on this date using worker_id
    const { data: appointments, error } = await adminSupabase
      .from('appointments')
      .select('appointment_time, duration, status')
      .eq('worker_id', workerId)
      .eq('appointment_date', date)
      .eq('status', 'scheduled')

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Generate all possible time slots
    const allSlots = generateTimeSlots()

    // Calculate which slots are occupied
    const occupiedSlots = calculateOccupiedSlots(appointments || [])

    // Return available and occupied slots
    return NextResponse.json({
      allSlots,
      occupiedSlots: Array.from(occupiedSlots),
      appointments: appointments || [],
    })
  } catch (error: any) {
    console.error('Error in GET /api/available-slots:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


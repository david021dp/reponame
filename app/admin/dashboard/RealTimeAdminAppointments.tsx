'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Appointment } from '@/types/database.types'
import WeeklyCalendar from './WeeklyCalendar'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'
import { getCurrentWeekDates, formatDateKey } from '@/lib/utils/calendarHelpers'

interface RealTimeAdminAppointmentsProps {
  initialAppointments: Appointment[]
  workerId: string
  workerName: string
  adminId: string
  userRole?: string
  filterWorkerId?: string | 'all'
  workerAdminIdForActions: string
}

export default function RealTimeAdminAppointments({
  initialAppointments,
  workerId,
  workerName,
  adminId,
  userRole,
  filterWorkerId,
  workerAdminIdForActions,
}: RealTimeAdminAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [isHydrated, setIsHydrated] = useState(false)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getCurrentWeekDates().start)
  
  // Create stable Supabase client
  const supabase = useMemo(() => createClient(), [])

  // FIX #1: Wait for hydration to complete before subscribing
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Sync Realtime auth token to prevent connection errors
  useEffect(() => {
    if (!isHydrated) return

    let mounted = true

    const syncRealtimeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('RealTimeAdminAppointments: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('RealTimeAdminAppointments: Error syncing Realtime auth', err)
      }
    }

    syncRealtimeAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted && session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }
    })

    return () => {
      mounted = false
      authListener?.subscription.unsubscribe()
    }
  }, [isHydrated, supabase])

  // Sync initialAppointments to state when filter changes (server re-renders with new data)
  useEffect(() => {
    setAppointments(initialAppointments)
  }, [initialAppointments])

  useEffect(() => {
    // Don't subscribe until component is fully hydrated
    if (!isHydrated) return

    // Validate workerId for regular admins
    if (userRole !== 'head_admin' && (!workerId || workerId.trim() === '')) {
      console.warn('RealTimeAdminAppointments: workerId is invalid, skipping subscription')
      return
    }

    // Validate filterWorkerId for head admins when filtering to specific admin
    if (userRole === 'head_admin' && filterWorkerId && filterWorkerId !== 'all' && filterWorkerId.trim() === '') {
      console.warn('RealTimeAdminAppointments: filterWorkerId is invalid, skipping subscription')
      return
    }

    let isSubscribed = true
    let retryTimeout: NodeJS.Timeout

    // FIX #3: Subscription with status tracking and retry logic
    const setupSubscription = () => {
      const channel = supabase
        .channel('admin-appointments', {
          config: {
            broadcast: { self: true },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            // Head admin: filter by filterWorkerId if set, otherwise all appointments
            // Regular admin: always filter by their own worker_id
            filter: userRole === 'head_admin' 
              ? (filterWorkerId && filterWorkerId !== 'all' 
                  ? `worker_id=eq.${filterWorkerId}` 
                  : undefined)
              : `worker_id=eq.${workerId}`,
          },
          (payload) => {
            if (!isSubscribed) return

            if (payload.eventType === 'INSERT') {
              const newAppointment = payload.new as Appointment
              setAppointments((prev) => {
                if (prev.some((apt) => apt.id === newAppointment.id)) {
                  return prev
                }
                const updated = [...prev, newAppointment]
                return sortAppointments(updated)
              })
            } else if (payload.eventType === 'UPDATE') {
              const updatedAppointment = payload.new as Appointment
              setAppointments((prev) => {
                // If appointment is cancelled, remove it from the list
                if (updatedAppointment.status === 'cancelled') {
                  return prev.filter((apt) => apt.id !== updatedAppointment.id)
                }
                const updated = prev.map((apt) =>
                  apt.id === updatedAppointment.id ? updatedAppointment : apt
                )
                return sortAppointments(updated)
              })
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              setAppointments((prev) => prev.filter((apt) => apt.id !== deletedId))
            }
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' && isSubscribed) {
            console.error('Subscription error, retrying in 2s...', err)
            // FIX #4: Auto-reconnect on error
            retryTimeout = setTimeout(() => {
              if (isSubscribed) {
                supabase.removeChannel(channel)
                setupSubscription()
              }
            }, 2000)
          }
        })

      return channel
    }

    const channel = setupSubscription()

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false
      clearTimeout(retryTimeout)
      supabase.removeChannel(channel)
    }
  }, [isHydrated, workerId, supabase, userRole, filterWorkerId])

  const sortAppointments = (apts: Appointment[]) => {
    return [...apts].sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date)
      if (dateCompare !== 0) return dateCompare
      return a.appointment_time.localeCompare(b.appointment_time)
    })
  }

  // Calculate week dates for statistics - use displayed week from calendar
  const weekEndDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + 6)
  const weekStartStr = formatDateKey(currentWeekStart)
  const weekEndStr = formatDateKey(weekEndDate)
  const todayStr = formatDateKey(new Date())

  // Calculate month dates for cancelled appointments (first day to last day of displayed month)
  const monthStart = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), 1)
  const monthEnd = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth() + 1, 0) // Last day of month
  const monthStartStr = formatDateKey(monthStart)
  const monthEndStr = formatDateKey(monthEnd)

  // Total: appointments in displayed week (Monday to Sunday), excluding cancelled
  const weekAppointments = appointments.filter((apt) => {
    return apt.appointment_date >= weekStartStr 
      && apt.appointment_date <= weekEndStr
      && apt.status !== 'cancelled'
  })

  // Scheduled: appointments for today only with status 'scheduled'
  const todayScheduledCount = appointments.filter((apt) => {
    return apt.appointment_date === todayStr && apt.status === 'scheduled'
  }).length

  // Cancelled: appointments in displayed month with status 'cancelled'
  const cancelledCount = appointments.filter((apt) => {
    return apt.status === 'cancelled'
      && apt.appointment_date >= monthStartStr
      && apt.appointment_date <= monthEndStr
  }).length

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        throw new Error('Failed to get security token. Please refresh the page.')
      }

      const response = await fetch('/api/admin/cancel-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          appointment_id: appointmentId,
          admin_id: adminId,
        }),
      })

      if (!response.ok) {
        // Try to read the actual error message from the API
        let errorMessage = 'Failed to cancel appointment'
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (parseError) {
          // If we can't parse the error, use status-based message
          if (response.status === 400) {
            errorMessage = 'Invalid request. Please check your input.'
          } else if (response.status === 403) {
            errorMessage = 'Security verification failed. Please refresh the page and try again.'
          } else if (response.status === 404) {
            errorMessage = 'Appointment not found or already cancelled.'
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment and try again.'
          }
        }
        
        // If appointment doesn't exist, remove it from state
        if (response.status === 400 && errorMessage.includes('not found')) {
          setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId))
          return
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      // If this was a blocked appointment that was deleted, immediately remove it from state
      if (data.deleted && data.appointment_id) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== data.appointment_id))
        return
      }
      
      // For regular appointments, real-time subscription will handle the UI update
    } catch (error: any) {
      console.error('Failed to cancel appointment:', error)
      // If appointment doesn't exist, remove it from state
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId))
        return
      }
      alert(error.message || 'Failed to cancel appointment')
    }
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-12">
        <div className="bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border-2 border-purple-100 hover:shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                <svg
                  className="h-8 w-8 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Total Appointments
                </dt>
                <dd className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {weekAppointments.length}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border-2 border-emerald-100 hover:shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl">
                <svg
                  className="h-8 w-8 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Scheduled
                </dt>
                <dd className="text-3xl font-bold text-emerald-600">
                  {todayScheduledCount}
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border-2 border-red-100 hover:shadow-xl transition-all">
          <div className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 flex-1">
                <dt className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Cancelled
                </dt>
                <dd className="text-3xl font-bold text-red-600">
                  {cancelledCount}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Calendar */}
      <WeeklyCalendar
        appointments={appointments}
        onCancelAppointment={handleCancelAppointment}
        adminId={workerAdminIdForActions}
        workerName={workerName}
        onWeekChange={setCurrentWeekStart}
      />
    </>
  )
}


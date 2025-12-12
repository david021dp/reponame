'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Appointment } from '@/types/database.types'
import AppointmentCard from '@/components/AppointmentCard'
import CancelAppointmentModal from '@/components/CancelAppointmentModal'
import Link from 'next/link'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface RealTimeClientAppointmentsProps {
  initialAppointments: Appointment[]
  userId: string
}

export default function RealTimeClientAppointments({
  initialAppointments,
  userId,
}: RealTimeClientAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  
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
          console.warn('RealTimeClientAppointments: getSession error', error)
          return
        }
        const token = data.session?.access_token
        if (token && mounted) {
          supabase.realtime.setAuth(token)
        }
      } catch (err) {
        console.warn('RealTimeClientAppointments: Error syncing Realtime auth', err)
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

  useEffect(() => {
    // Don't subscribe until component is fully hydrated
    if (!isHydrated) return

    // Validate userId before creating subscription
    if (!userId || userId.trim() === '') {
      console.warn('RealTimeClientAppointments: userId is invalid, skipping subscription')
      return
    }

    let isSubscribed = true
    let retryTimeout: NodeJS.Timeout

    // FIX #3: Subscription with status tracking and retry logic
    const setupSubscription = () => {
      const channel = supabase
        .channel('client-appointments', {
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
            filter: `user_id=eq.${userId}`,
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
            const errorMessage = err?.message || err || 'Unknown error'
            console.error('Subscription error, retrying in 2s...', errorMessage)
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
  }, [isHydrated, userId, supabase])

  const sortAppointments = (apts: Appointment[]) => {
    return [...apts].sort((a, b) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date)
      if (dateCompare !== 0) return dateCompare
      return a.appointment_time.localeCompare(b.appointment_time)
    })
  }

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsModalOpen(true)
  }

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedAppointment) return

    // Get CSRF token
    const csrfToken = await getCsrfToken()
    if (!csrfToken) {
      throw new Error('Failed to get security token. Please refresh the page.')
    }

    const response = await fetch('/api/client/cancel-appointment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        appointment_id: selectedAppointment.id,
        reason,
      }),
    })

    if (!response.ok) {
      // Try to read the actual error message from the API
      let errorMessage = 'Failed to cancel appointment'
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
          // If there are validation details, append them
          if (errorData.details && Array.isArray(errorData.details)) {
            const details = errorData.details.map((d: any) => d.message || d).join(', ')
            if (details) {
              errorMessage += `: ${details}`
            }
          }
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
      throw new Error(errorMessage)
    }

    const data = await response.json()
    
    // If appointment was cancelled, immediately remove it from state
    if (data.cancelled && data.appointment_id) {
      setAppointments((prev) => prev.filter((apt) => apt.id !== data.appointment_id))
    }

    // Close modal
    setIsModalOpen(false)
    setSelectedAppointment(null)
  }

  // Filter out cancelled appointments from display
  const activeAppointments = appointments.filter((apt) => apt.status !== 'cancelled')

  if (activeAppointments.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-pink-100 p-16 text-center">
        <div className="inline-block p-6 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full mb-6">
          <svg
            className="w-16 h-16 text-pink-400"
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
        <h3 className="mt-2 text-2xl font-bold text-gray-900 mb-2">
          No appointments yet
        </h3>
        <p className="mt-1 text-gray-600 mb-8">
          Get started by scheduling your first appointment
        </p>
        <Link
          href="/client/schedule"
          className="inline-flex items-center px-8 py-4 border border-transparent shadow-lg text-base font-semibold rounded-xl text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transform hover:-translate-y-0.5 transition-all"
        >
          ✨ Schedule Appointment
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            showClientInfo={false}
            showCancelButton={true}
            onCancelClick={handleCancelClick}
          />
        ))}
      </div>

      {/* Cancel Appointment Modal */}
      {selectedAppointment && (
        <CancelAppointmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedAppointment(null)
          }}
          appointment={selectedAppointment}
          onConfirm={handleConfirmCancel}
        />
      )}
    </>
  )
}


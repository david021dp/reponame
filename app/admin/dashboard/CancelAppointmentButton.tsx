'use client'

import { useState } from 'react'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface CancelAppointmentButtonProps {
  appointmentId: string
  adminId: string
}

export default function CancelAppointmentButton({
  appointmentId,
  adminId,
}: CancelAppointmentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        setError('Failed to get security token. Please refresh the page.')
        setLoading(false)
        return
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
        throw new Error(errorMessage)
      }

      // FIX #2: Removed router.refresh() - real-time subscription will update UI
      // No need to remount entire page, WebSocket will deliver the UPDATE event
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        {loading ? 'Cancelling...' : '❌ Cancel Appointment'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 font-semibold">{error}</p>
      )}
    </>
  )
}


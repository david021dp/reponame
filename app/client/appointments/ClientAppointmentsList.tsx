'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Appointment } from '@/types/database.types'
import AppointmentCard from '@/components/AppointmentCard'
import CancelAppointmentModal from '@/components/CancelAppointmentModal'
import Link from 'next/link'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface ClientAppointmentsListProps {
  appointments: Appointment[]
}

export default function ClientAppointmentsList({ appointments }: ClientAppointmentsListProps) {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()

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

    // Close modal and refresh
    setIsModalOpen(false)
    setSelectedAppointment(null)
    router.refresh()
  }

  if (appointments.length === 0) {
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
        {appointments.map((appointment) => (
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


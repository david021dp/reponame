'use client'

import { useState } from 'react'
import { Appointment } from '@/types/database.types'

interface CancelAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  onConfirm: (reason: string) => Promise<void>
}

export default function CancelAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onConfirm,
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onConfirm(reason)
      onClose()
      setReason('')
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-2xl border-2 border-pink-100 max-w-lg w-full p-8 animate-[scale-in_0.2s_ease-out]">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Cancel Appointment?
          </h2>
          <p className="text-center text-gray-600 mb-6">
            This action cannot be undone
          </p>

          {/* Appointment Details */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 mb-6 border-2 border-pink-100">
            <h3 className="font-bold text-gray-900 mb-3">Appointment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="text-gray-700">
                <span className="font-semibold">Service{appointment.service.includes(',') ? 's' : ''}:</span>{' '}
                {appointment.service.includes(',') ? (
                  <div className="mt-1 space-y-1">
                    {appointment.service.split(',').map((service, idx) => (
                      <div key={idx} className="text-gray-700">• {service.trim()}</div>
                    ))}
                  </div>
                ) : (
                  appointment.service
                )}
              </div>
              <p className="text-gray-700">
                <span className="font-semibold">Worker:</span> {appointment.worker}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Date:</span> {formatDate(appointment.appointment_date)}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Time:</span> {appointment.appointment_time}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Duration:</span> {appointment.duration} minutes
              </p>
            </div>
          </div>

          {/* Reason Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-semibold text-gray-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={4}
                className="block w-full px-4 py-3 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700"
                placeholder="Please let us know why you need to cancel..."
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3">
                <p className="text-sm text-red-700 font-semibold">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold disabled:opacity-50"
              >
                Keep Appointment
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}


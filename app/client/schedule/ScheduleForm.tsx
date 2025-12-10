'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Service } from '@/types/database.types'
import Calendar from '@/components/Calendar'
import TimeSlotPicker from '@/components/TimeSlotPicker'
import ServiceSelector from '@/components/ServiceSelector'
import { getTodayInUTC1 } from '@/lib/utils/timezone'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface Worker {
  id: string
  name: string
}

interface ScheduleFormProps {
  workers: Worker[]
  services: Service[]
  userId: string
  userEmail: string
  userFirstName: string
  userLastName: string
  userPhone: string | null
}

export default function ScheduleForm({
  workers,
  services,
  userId,
  userEmail,
  userFirstName,
  userLastName,
  userPhone,
}: ScheduleFormProps) {
  const [selectedWorker, setSelectedWorker] = useState('')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selectedServicesData = services.filter((s) => selectedServices.includes(s.id))
  const totalDuration = selectedServicesData.reduce((sum, s) => sum + s.duration, 0)
  const totalPrice = selectedServicesData.reduce((sum, s) => sum + s.price, 0)
  const selectedWorkerData = workers.find((w) => w.id === selectedWorker)

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!selectedWorker || selectedServices.length === 0 || !appointmentDate || !appointmentTime) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        setError('Failed to get security token. Please refresh the page.')
        setLoading(false)
        return
      }

      const serviceNames = selectedServicesData.map((s) => s.name).join(', ')
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include', // Include cookies
        body: JSON.stringify({
          user_id: userId,
          first_name: userFirstName,
          last_name: userLastName,
          phone: userPhone,
          email: userEmail,
          service: serviceNames,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          notes,
          worker: selectedWorkerData?.name,
          worker_id: selectedWorker,
          duration: totalDuration,
          status: 'scheduled',
          is_rescheduled: false,
        }),
      })

      if (!response.ok) {
        // Try to read the actual error message from the API
        let errorMessage = 'Failed to create appointment'
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
          } else if (response.status === 429) {
            errorMessage = 'Too many requests. Please wait a moment and try again.'
          } else if (response.status === 409) {
            errorMessage = 'This time slot is already booked. Please select another time.'
          }
        }
        throw new Error(errorMessage)
      }

      router.push('/client/appointments')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to schedule appointment')
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (today) - format in UTC+1 timezone
  const today = getTodayInUTC1()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Worker Selection */}
      <div>
        <label htmlFor="worker" className="block text-sm font-semibold text-gray-700 mb-3">
          Select Worker <span className="text-pink-500">*</span>
        </label>
        <select
          id="worker"
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          required
          className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700 font-medium"
        >
          <option value="">Choose a worker...</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </select>
      </div>

      {/* Service Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Services <span className="text-pink-500">*</span>
        </label>
        <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-100 rounded-xl p-6 max-h-[600px] overflow-y-auto">
          <ServiceSelector
            services={services}
            selectedServices={selectedServices}
            onToggle={handleServiceToggle}
          />
        </div>
        {selectedServices.length === 0 && (
          <p className="mt-3 text-sm text-gray-500 text-center">Please select at least one service</p>
        )}
      </div>

      {/* Service Info Display */}
      {selectedServicesData.length > 0 && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-2xl border-2 border-pink-200">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-white rounded-lg">
              <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-pink-900 mb-2">Selected Services</h3>
              <div className="space-y-2 mb-3">
                {selectedServicesData.map((service) => (
                  <div key={service.id} className="text-sm text-pink-800 font-medium">
                    • {service.name} - ${service.price} ({service.duration} min)
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-pink-200 text-sm text-pink-900 font-bold">
                <p>💰 Total Price: ${totalPrice.toFixed(2)}</p>
                <p>⏱️ Total Duration: {totalDuration} minutes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Date <span className="text-pink-500">*</span>
        </label>
        <Calendar
          value={appointmentDate}
          onChange={setAppointmentDate}
          minDate={today}
        />
      </div>

      {/* Time Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Time <span className="text-pink-500">*</span>
        </label>
        <TimeSlotPicker
          value={appointmentTime}
          onChange={setAppointmentTime}
          workerId={selectedWorker}
          workerName={selectedWorkerData?.name || ''}
          date={appointmentDate}
          duration={totalDuration}
          selectedDate={appointmentDate}
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-3">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="block w-full px-4 py-4 border-2 border-pink-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-white/50 backdrop-blur-sm transition-all text-gray-700"
          placeholder="Any special requests or information..."
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4">
          <p className="text-sm text-red-700 font-semibold">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
      >
        {loading ? '✨ Scheduling...' : '✨ Schedule Appointment'}
      </button>
    </form>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Service, Appointment } from '@/types/database.types'
import CustomDatePicker from '@/components/CustomDatePicker'
import CustomTimePicker from '@/components/CustomTimePicker'
import ServiceSelector from '@/components/ServiceSelector'
import { getTodayInUTC1 } from '@/lib/utils/timezone'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface EditAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  adminId: string
  workerName: string
  onSuccess?: () => void
}

export default function EditAppointmentModal({
  isOpen,
  onClose,
  appointment,
  adminId,
  workerName,
  onSuccess,
}: EditAppointmentModalProps) {
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disabledTimes, setDisabledTimes] = useState<string[]>([])
  const [insufficientTimes, setInsufficientTimes] = useState<string[]>([])
  const [showServices, setShowServices] = useState(false)

  const selectedServicesData = services.filter((s) => selectedServices.includes(s.id))
  const totalDuration = selectedServicesData.reduce((sum, s) => sum + s.duration, 0)
  const totalPrice = selectedServicesData.reduce((sum, s) => sum + s.price, 0)

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  // Initialize form with appointment data
  useEffect(() => {
    if (isOpen && appointment) {
      setAppointmentDate(appointment.appointment_date)
      setAppointmentTime(appointment.appointment_time)
      setNotes(appointment.notes || '')
      fetchServices()
    }
  }, [isOpen, appointment])

  // Match existing services to IDs
  useEffect(() => {
    if (services.length > 0 && appointment) {
      const existingServiceNames = appointment.service.split(',').map((s) => s.trim())
      const matchedServiceIds = services
        .filter((s) => existingServiceNames.includes(s.name))
        .map((s) => s.id)
      setSelectedServices(matchedServiceIds)
    }
  }, [services, appointment])

  useEffect(() => {
    if (appointmentDate && workerName && selectedServices.length > 0) {
      fetchBlockedTimes()
    }
  }, [appointmentDate, workerName, selectedServices])

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/appointments', {
        method: 'GET',
      })
      if (response.ok) {
        const data = await response.json()
        if (data.services) {
          setServices(data.services)
        }
      } else {
        console.error('Failed to fetch services, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  const fetchBlockedTimes = async () => {
    try {
      const response = await fetch(
        `/api/available-slots?workerId=${encodeURIComponent(adminId)}&date=${appointmentDate}`
      )
      if (response.ok) {
        const data = await response.json()
        
        const serviceDuration = totalDuration
        
        if (serviceDuration > 0 && data.appointments) {
          // Filter out current appointment from conflicts by comparing time and duration
          const otherAppointments = data.appointments.filter(
            (apt: any) => !(apt.appointment_time === appointment?.appointment_time && apt.duration === appointment?.duration)
          )
          const { booked, insufficient } = calculateBlockedSlots(otherAppointments, serviceDuration)
          setDisabledTimes(booked)
          setInsufficientTimes(insufficient)
        } else if (data.occupiedSlots) {
          setDisabledTimes(data.occupiedSlots)
          setInsufficientTimes([])
        }
      }
    } catch (error) {
      console.error('Failed to fetch booked times:', error)
      setDisabledTimes([])
      setInsufficientTimes([])
    }
  }

  const calculateBlockedSlots = (appointments: any[], serviceDuration: number) => {
    const booked: string[] = []
    const insufficient: string[] = []
    
    const allSlots: string[] = []
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        allSlots.push(timeString)
      }
    }
    
    allSlots.forEach((slotTime) => {
      const [slotHour, slotMin] = slotTime.split(':').map(Number)
      const slotMinutes = slotHour * 60 + slotMin
      const endMinutes = slotMinutes + serviceDuration
      
      for (const apt of appointments) {
        const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number)
        const aptStartMinutes = aptHour * 60 + aptMin
        const aptEndMinutes = aptStartMinutes + apt.duration
        
        if (slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes) {
          booked.push(slotTime)
          break
        } else if (endMinutes > aptStartMinutes && slotMinutes < aptStartMinutes) {
          insufficient.push(slotTime)
          break
        }
      }
    })
    
    return { booked, insufficient }
  }

  const getTodayString = () => {
    return getTodayInUTC1()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!appointment) {
      setError('Appointment data is missing')
      setLoading(false)
      return
    }

    if (selectedServices.length === 0) {
      setError('Please select at least one service')
      setLoading(false)
      return
    }

    try {
      let formattedTime = appointmentTime
      if (formattedTime.includes(':')) {
        const parts = formattedTime.split(':')
        if (parts.length === 3) {
          formattedTime = `${parts[0]}:${parts[1]}`
        }
      }

      const csrfToken = await getCsrfToken()
      if (!csrfToken) {
        setError('Failed to get security token. Please refresh the page.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/update-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [CSRF_HEADER_NAME]: csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          appointment_id: appointment.id,
          service_ids: selectedServices,
          appointment_date: appointmentDate,
          appointment_time: formattedTime,
          notes: notes || null,
          worker_id: adminId,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorMessage = 'Failed to update appointment'
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const data = await response.json()
            errorMessage = data.error || errorMessage
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError)
            errorMessage = `Server error (${response.status}): ${response.statusText}`
          }
        } else {
          errorMessage = `Server error (${response.status}): ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }

      // Success - close modal and notify parent
      handleClose()
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update appointment')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedServices([])
    setAppointmentDate('')
    setAppointmentTime('')
    setNotes('')
    setError(null)
    setShowServices(false)
    onClose()
  }

  if (!isOpen || !appointment) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-50 border-b border-gray-300 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Edit Appointment
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Update services, date, or time for this appointment
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client Information Display */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Client Information
            </h3>
            <div className="text-lg font-semibold text-gray-900">
              {appointment.first_name} {appointment.last_name}
            </div>
            {appointment.email && (
              <div className="text-sm text-gray-600 mt-1">{appointment.email}</div>
            )}
            {appointment.phone && (
              <div className="text-sm text-gray-600">{appointment.phone}</div>
            )}
          </div>

          {/* Appointment Details Section */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Appointment Details
            </h3>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Services <span className="text-red-500">*</span>
              </label>
              
              <button
                type="button"
                onClick={() => setShowServices(!showServices)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-800">
                      {selectedServicesData.length > 0
                        ? `${selectedServicesData.length} Service${selectedServicesData.length > 1 ? 's' : ''} Selected`
                        : 'Select Services'}
                    </div>
                    {selectedServicesData.length > 0 && !showServices && (
                      <div className="text-xs text-gray-600 mt-1">
                        Total: ${totalPrice.toFixed(2)} • {totalDuration} min
                      </div>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                    showServices ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showServices && (
                <div className="mt-3 bg-white border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto transition-all duration-200">
                  <ServiceSelector
                    services={services}
                    selectedServices={selectedServices}
                    onToggle={handleServiceToggle}
                  />
                </div>
              )}

              {selectedServices.length === 0 && !showServices && (
                <p className="mt-2 text-xs text-gray-500 text-center">Please select at least one service</p>
              )}
              {selectedServicesData.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm font-semibold text-gray-800">Selected Services ({selectedServicesData.length})</div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {selectedServicesData.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{service.name}</div>
                          <div className="text-xs text-gray-600">${service.price} • {service.duration} min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-gray-300">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Total Price:</span>
                      <span className="text-lg font-semibold text-gray-900">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-gray-700">Total Duration:</span>
                      <span className="text-lg font-semibold text-gray-900">{totalDuration} minutes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <CustomDatePicker
                value={appointmentDate}
                onChange={setAppointmentDate}
                minDate={getTodayString()}
                label="Date"
                required
              />

              <CustomTimePicker
                value={appointmentTime}
                onChange={setAppointmentTime}
                label="Time"
                required
                minTime="09:00"
                maxTime="21:00"
                disabledTimes={disabledTimes}
                insufficientTimes={insufficientTimes}
                selectedDate={appointmentDate}
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-sm resize-none transition-all hover:border-gray-400"
                placeholder="Any special requests..."
              />
            </div>
          </div>

          {/* Worker Display */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-600 font-medium">Assigned to:</span>
              <span className="font-semibold text-gray-800">{workerName}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'Updating...' : 'Update Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


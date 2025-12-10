'use client'

import { useState, useEffect } from 'react'
import CustomDatePicker from '@/components/CustomDatePicker'
import CustomTimePicker from '@/components/CustomTimePicker'
import { getCsrfToken, CSRF_HEADER_NAME } from '@/lib/csrf/client'

interface BlockTimeModalProps {
  isOpen: boolean
  onClose: () => void
  adminId: string
  workerName: string
}

export default function BlockTimeModal({
  isOpen,
  onClose,
  adminId,
  workerName,
}: BlockTimeModalProps) {
  const [mode, setMode] = useState<'specific' | 'fullday'>('specific')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [numDays, setNumDays] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [disabledTimes, setDisabledTimes] = useState<string[]>([])
  const [insufficientTimes, setInsufficientTimes] = useState<string[]>([])

  useEffect(() => {
    if (startDate && workerName && mode === 'specific') {
      fetchBlockedTimes()
    }
  }, [startDate, workerName, mode, duration])

  const getTodayString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const fetchBlockedTimes = async () => {
    try {
      const response = await fetch(
        `/api/available-slots?workerId=${encodeURIComponent(adminId)}&date=${startDate}`
      )
      if (response.ok) {
        const data = await response.json()
        
        const blockDuration = parseInt(duration)
        
        if (blockDuration > 0 && data.appointments) {
          const { booked, insufficient } = calculateBlockedSlots(data.appointments, blockDuration)
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
    }
  }

  const calculateBlockedSlots = (appointments: any[], blockDuration: number) => {
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
      const endMinutes = slotMinutes + blockDuration
      
      for (const apt of appointments) {
        const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number)
        const aptStartMinutes = aptHour * 60 + aptMin
        const aptEndMinutes = aptStartMinutes + apt.duration
        
        // Already booked (slot is during an existing appointment)
        if (slotMinutes >= aptStartMinutes && slotMinutes < aptEndMinutes) {
          booked.push(slotTime)
          break
        }
        // Insufficient time (slot + duration would overlap)
        else if (endMinutes > aptStartMinutes && slotMinutes < aptStartMinutes) {
          insufficient.push(slotTime)
          break
        }
      }
    })
    
    return { booked, insufficient }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'specific') {
        // Block specific time
        await createBlockAppointment(startDate, startTime, parseInt(duration))
      } else {
        // Block full days
        const days = parseInt(numDays)
        const [year, month, day] = startDate.split('-').map(Number)
        
        for (let i = 0; i < days; i++) {
          const blockDate = new Date(year, month - 1, day + i)
          const dateString = `${blockDate.getFullYear()}-${(blockDate.getMonth() + 1).toString().padStart(2, '0')}-${blockDate.getDate().toString().padStart(2, '0')}`
          
          // Create 12-hour block (09:00-21:00)
          await createBlockAppointment(dateString, '09:00:00', 720) // 12 hours = 720 minutes
        }
      }

      // Success - close modal
      handleClose()
    } catch (err: any) {
      setError(err.message || 'Failed to block time')
    } finally {
      setLoading(false)
    }
  }

  const createBlockAppointment = async (date: string, time: string, durationMinutes: number) => {
    // Get CSRF token
    const csrfToken = await getCsrfToken()
    if (!csrfToken) {
      throw new Error('Failed to get security token. Please refresh the page.')
    }

    const response = await fetch('/api/admin/create-appointment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [CSRF_HEADER_NAME]: csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        client_first_name: 'Blocked',
        client_last_name: 'Time',
        client_phone: null,
        service_name: 'Blocked Time',
        appointment_date: date,
        appointment_time: time,
        notes: mode === 'fullday' ? 'Full day blocked' : 'Time blocked by admin',
        worker_name: workerName,
        worker_id: adminId,
        duration: durationMinutes,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to block time')
    }
  }

  const handleClose = () => {
    setMode('specific')
    setStartDate('')
    setStartTime('')
    setDuration('60')
    setNumDays('1')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border-4 border-gray-400"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-gray-100 to-gray-200 border-b-4 border-gray-300 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                🚫 Block Time
              </h2>
              <p className="text-sm text-gray-600 mt-1">Mark time as unavailable</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-white/50 rounded-lg"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Selection */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border-2 border-gray-300 shadow-sm space-y-3">
            <div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all">
                <input
                  type="radio"
                  name="mode"
                  value="specific"
                  checked={mode === 'specific'}
                  onChange={(e) => setMode(e.target.value as 'specific')}
                  className="w-5 h-5 text-pink-600"
                />
                <div>
                  <div className="font-bold text-gray-800">Block Specific Time</div>
                  <div className="text-xs text-gray-600">Block a specific time slot (15min - 3hrs)</div>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all">
                <input
                  type="radio"
                  name="mode"
                  value="fullday"
                  checked={mode === 'fullday'}
                  onChange={(e) => setMode(e.target.value as 'fullday')}
                  className="w-5 h-5 text-pink-600"
                />
                <div>
                  <div className="font-bold text-gray-800">Block Full Day(s)</div>
                  <div className="text-xs text-gray-600">Block entire day(s) 09:00-21:00</div>
                </div>
              </label>
            </div>
          </div>

          {/* Specific Time Mode */}
          {mode === 'specific' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200 shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <CustomDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  minDate={getTodayString()}
                  label="Date"
                  required
                />

                <CustomTimePicker
                  value={startTime}
                  onChange={setStartTime}
                  label="Start Time"
                  required
                  minTime="09:00"
                  maxTime="21:00"
                  disabledTimes={disabledTimes}
                  insufficientTimes={insufficientTimes}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Duration <span className="text-red-500">*</span>
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium cursor-pointer transition-all hover:border-blue-300"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                </select>
              </div>
            </div>
          )}

          {/* Full Day Mode */}
          {mode === 'fullday' && (
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-200 shadow-sm space-y-3">
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                minDate={getTodayString()}
                label="Start Date"
                required
              />

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Number of Days <span className="text-red-500">*</span>
                </label>
                <select
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm font-medium cursor-pointer transition-all hover:border-orange-300"
                >
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                  <option value="4">4 days</option>
                  <option value="5">5 days</option>
                  <option value="6">6 days</option>
                  <option value="7">7 days (1 week)</option>
                </select>
              </div>

              <div className="bg-white rounded-lg p-3 border border-orange-300">
                <p className="text-xs text-gray-600">
                  This will block <span className="font-bold text-orange-600">{numDays} full day(s)</span> from 09:00 to 21:00
                </p>
              </div>
            </div>
          )}

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
              className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-base shadow-md hover:shadow-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-base transform hover:scale-[1.02]"
            >
              {loading ? '⏳ Blocking...' : '🚫 Block Time'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


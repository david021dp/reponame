'use client'

import { useState, useEffect } from 'react'
import { isSlotAvailable, calculateEndTime, formatDuration } from '@/lib/utils/timeSlots'
import { isTimePastInUTC1, getTodayInUTC1 } from '@/lib/utils/timezone'

interface TimeSlotPickerProps {
  value: string
  onChange: (time: string) => void
  workerId: string
  workerName: string
  date: string
  duration: number
  selectedDate?: string
}

export default function TimeSlotPicker({
  value,
  onChange,
  workerId,
  workerName,
  date,
  duration,
  selectedDate,
}: TimeSlotPickerProps) {
  const [allSlots, setAllSlots] = useState<string[]>([])
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workerId || !date) {
      setAllSlots([])
      setOccupiedSlots(new Set())
      return
    }

    fetchAvailableSlots()
  }, [workerId, workerName, date])

  const fetchAvailableSlots = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/available-slots?workerId=${encodeURIComponent(workerId)}&date=${date}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch available slots')
      }

      const data = await response.json()
      setAllSlots(data.allSlots)
      setOccupiedSlots(new Set(data.occupiedSlots))
    } catch (err: any) {
      setError(err.message || 'Failed to load time slots')
      console.error('Error fetching slots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotClick = (time: string) => {
    if (!isSlotAvailable(time, duration, occupiedSlots)) {
      return
    }
    onChange(time)
  }

  if (!workerId || !date) {
    return (
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl p-8 text-center">
        <svg className="w-12 h-12 text-pink-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-600 font-medium">
          Please select a worker and date first
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-100 rounded-2xl p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-pink-200 border-t-pink-600 mb-3"></div>
        <p className="text-gray-600 font-medium">Loading available time slots...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
        <p className="text-red-700 font-semibold">{error}</p>
        <button
          onClick={fetchAvailableSlots}
          className="mt-3 text-sm text-pink-600 hover:text-pink-700 font-semibold"
        >
          Try Again
        </button>
      </div>
    )
  }

  const slotsNeeded = Math.ceil(duration / 15)
  const endTime = value ? calculateEndTime(value, duration) : ''

  return (
    <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-100 rounded-2xl p-4 sm:p-6 shadow-lg">
      {/* Header Info */}
      <div className="mb-4 pb-4 border-b border-pink-100">
        <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">Select Time Slot</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Duration: {formatDuration(duration)}
          </span>
          <span className="text-pink-600">•</span>
          <span>Needs {slotsNeeded} consecutive slot{slotsNeeded > 1 ? 's' : ''}</span>
        </div>
        {value && (
          <div className="mt-2 text-xs sm:text-sm font-semibold text-pink-700">
            ✓ Selected: {value} - {endTime}
          </div>
        )}
      </div>

      {/* Time Slots Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {allSlots.map((time) => {
          const isOccupied = occupiedSlots.has(time)
          const available = isSlotAvailable(time, duration, occupiedSlots)
          const selected = value === time
          // Check if time is in the past for today
          const dateToCheck = selectedDate || date
          const isPast = isTimePastInUTC1(time, dateToCheck)
          const isDisabled = !available || isPast

          return (
            <button
              key={time}
              type="button"
              onClick={() => handleSlotClick(time)}
              disabled={isDisabled}
              className={`
                px-3 py-3 rounded-xl text-sm font-semibold transition-all touch-manipulation
                ${isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through opacity-50'
                  : selected
                  ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-pink-100 text-gray-700 hover:bg-gradient-to-br hover:from-pink-100 hover:to-purple-100 hover:border-pink-300 hover:scale-105 active:scale-95'
                }
              `}
            >
              {time}
              {(isOccupied && !available && !isPast) && (
                <div className="text-[10px] text-gray-400 mt-0.5">Booked</div>
              )}
              {isPast && (
                <div className="text-[10px] text-gray-400 mt-0.5">Past</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-pink-100 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white border-2 border-pink-100 rounded-lg"></div>
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg"></div>
          <span className="text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gray-100 rounded-lg opacity-50"></div>
          <span className="text-gray-600">Occupied</span>
        </div>
      </div>
    </div>
  )
}


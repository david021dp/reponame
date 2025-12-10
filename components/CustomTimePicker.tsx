'use client'

import { useState, useRef, useEffect } from 'react'
import { isTimePastInUTC1 } from '@/lib/utils/timezone'

interface CustomTimePickerProps {
  value: string
  onChange: (time: string) => void
  label: string
  required?: boolean
  minTime?: string
  maxTime?: string
  disabledTimes?: string[]
  insufficientTimes?: string[]
  selectedDate?: string
}

export default function CustomTimePicker({
  value,
  onChange,
  label,
  required = false,
  minTime = '09:00',
  maxTime = '21:00',
  disabledTimes = [],
  insufficientTimes = [],
  selectedDate,
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const generateTimeSlots = () => {
    const slots: string[] = []
    const [minHour] = minTime.split(':').map(Number)
    const [maxHour] = maxTime.split(':').map(Number)

    for (let hour = minHour; hour <= maxHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleTimeClick = (time: string) => {
    onChange(time)
    setIsOpen(false)
  }

  const formatDisplayTime = () => {
    if (!value) return 'Select time...'
    return value
  }

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-xs font-bold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm font-medium cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50 text-left flex items-center justify-between"
      >
        <span className={value ? 'text-gray-700' : 'text-gray-400'}>
          {formatDisplayTime()}
        </span>
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-3 z-50 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-blue-50">
          <div className="grid grid-cols-4 gap-2">
            {timeSlots.map((time) => {
              const isSelected = value === time
              const isBooked = disabledTimes.includes(time)
              const isInsufficient = insufficientTimes.includes(time)
              // Check if time is in the past for today
              const isPast = selectedDate ? isTimePastInUTC1(time, selectedDate) : false
              const isDisabled = isBooked || isInsufficient || isPast
              
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => !isDisabled && handleTimeClick(time)}
                  disabled={isDisabled}
                  title={
                    isPast 
                      ? 'Time has passed' 
                      : isBooked 
                      ? 'Already booked' 
                      : isInsufficient 
                      ? 'Not enough time' 
                      : ''
                  }
                  className={`
                    px-3 py-2 rounded-lg text-sm font-semibold transition-all
                    ${isBooked
                      ? 'bg-red-100 text-red-400 cursor-not-allowed line-through border-2 border-red-300'
                      : isInsufficient
                      ? 'bg-orange-100 text-orange-400 cursor-not-allowed border-2 border-orange-300'
                      : isPast
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through opacity-50'
                      : isSelected
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-md'
                      : 'bg-blue-50 text-gray-700 hover:bg-blue-100 hover:shadow-sm cursor-pointer'
                    }
                  `}
                >
                  {time}
                </button>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-gray-600">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
              <span className="text-gray-600">Not enough time</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


'use client'

import { useState, useRef, useEffect } from 'react'
import { getTodayInUTC1 } from '@/lib/utils/timezone'

interface CustomDatePickerProps {
  value: string
  onChange: (date: string) => void
  minDate?: string
  label: string
  required?: boolean
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  label,
  required = false,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number)
      return new Date(year, month - 1, 1)
    }
    return new Date()
  })
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

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isDateDisabled = (date: Date) => {
    // Format the date as YYYY-MM-DD
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    
    if (!minDate) {
      // If no minDate provided, use today in UTC+1
      const today = getTodayInUTC1()
      return dateString < today
    }
    // Compare date strings directly
    return dateString < minDate
  }

  const isDatePast = (date: Date) => {
    // Format the date as YYYY-MM-DD
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const today = getTodayInUTC1()
    return dateString < today
  }

  const isToday = (date: Date) => {
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    const today = getTodayInUTC1()
    return dateString === today
  }

  const isSelected = (date: Date) => {
    if (!value) return false
    const [year, month, day] = value.split('-').map(Number)
    return date.getDate() === day &&
           date.getMonth() === month - 1 &&
           date.getFullYear() === year
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    
    if (isDateDisabled(date)) return

    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const dayStr = date.getDate().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    onChange(dateString)
    setIsOpen(false)
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const renderCalendarDays = () => {
    const days = []
    const totalDays = daysInMonth(currentMonth)
    const firstDay = firstDayOfMonth(currentMonth)

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square"></div>)
    }

    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const disabled = isDateDisabled(date)
      const past = isDatePast(date)
      const today = isToday(date)
      const selected = isSelected(date)

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          className={`
            aspect-square rounded-lg text-sm font-semibold transition-all
            ${disabled 
              ? past
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-blue-100 cursor-pointer'
            }
            ${selected 
              ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-md' 
              : 'text-gray-700'
            }
            ${today && !selected 
              ? 'border-2 border-pink-400 font-bold' 
              : ''
            }
          `}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const formatDisplayDate = () => {
    if (!value) return 'Select date...'
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
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
          {formatDisplayDate()}
        </span>
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl border-2 border-blue-300 p-4 z-50">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={previousMonth}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <h3 className="text-base font-bold text-gray-800">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-blue-600 uppercase p-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarDays()}
          </div>
        </div>
      )}
    </div>
  )
}


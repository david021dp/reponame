'use client'

import { useState, useEffect } from 'react'
import { getTodayInUTC1 } from '@/lib/utils/timezone'

interface CalendarProps {
  value: string
  onChange: (date: string) => void
  minDate?: string
}

export default function Calendar({ value, onChange, minDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (!value) return null
    // Parse value as local date to avoid timezone shift
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  })

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
    if (!selectedDate) return false
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear()
  }

  const handleDateClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    
    if (isDateDisabled(date)) return

    setSelectedDate(date)
    // Format date in local timezone (avoid UTC conversion!)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const dayStr = date.getDate().toString().padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    onChange(dateString)
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

    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square p-1 sm:p-2"></div>
      )
    }

    // Actual days of the month
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
            aspect-square p-1 sm:p-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all touch-manipulation
            ${disabled 
              ? past
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : 'text-gray-300 cursor-not-allowed'
              : 'active:scale-95 hover:bg-gradient-to-br hover:from-pink-100 hover:to-purple-100 sm:hover:scale-110 cursor-pointer'
            }
            ${selected 
              ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg scale-105 sm:scale-110' 
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

  return (
    <div className="bg-white/80 backdrop-blur-sm border-2 border-pink-100 rounded-2xl p-3 sm:p-6 shadow-lg w-full max-w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          type="button"
          onClick={previousMonth}
          className="p-2 sm:p-2 hover:bg-pink-100 rounded-xl transition-all group touch-manipulation"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-pink-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="p-2 sm:p-2 hover:bg-pink-100 rounded-xl transition-all group touch-manipulation"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 group-hover:text-pink-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-pink-600 uppercase tracking-wide p-1 sm:p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-pink-100 flex items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs flex-wrap">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-pink-400 rounded-lg flex-shrink-0"></div>
          <span className="text-gray-600">Today</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex-shrink-0"></div>
          <span className="text-gray-600">Selected</span>
        </div>
      </div>
    </div>
  )
}


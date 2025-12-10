import { Appointment } from '@/types/database.types'

/**
 * Get the start date (Monday) and end date (Sunday) of the current week
 */
export function getCurrentWeekDates(): { start: Date; end: Date } {
  const today = new Date()
  // Use local date components to avoid timezone issues
  const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return getWeekDates(localDate)
}

/**
 * Get the start date (Monday) and end date (Sunday) for a given date
 */
export function getWeekDates(date: Date): { start: Date; end: Date } {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  
  const monday = new Date(current.getFullYear(), current.getMonth(), diff)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  
  return { start: monday, end: sunday }
}

/**
 * Get array of all 7 days in a week starting from Monday
 */
export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i)
    days.push(day)
  }
  return days
}

/**
 * Format date for display (e.g., "Mon 12", "Tue 13")
 */
export function formatDayHeader(date: Date): { dayName: string; dayNumber: number } {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return {
    dayName: dayNames[date.getDay()],
    dayNumber: date.getDate(),
  }
}

/**
 * Format date range for header (e.g., "July 12, 2021 - July 18, 2021")
 */
export function formatWeekRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
}

/**
 * Generate time slots from 09:00 to 21:00 in 1-hour intervals
 */
export function getTimeSlots(): string[] {
  const slots: string[] = []
  for (let hour = 9; hour <= 21; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
  }
  return slots
}

/**
 * Calculate exact pixel position for appointment based on time
 * Each 1-hour slot = 120px, so 1 minute = 120/60 = 2px
 */
const SLOT_HEIGHT = 120 // pixels per 1-hour slot
const MINUTES_PER_SLOT = 60
const PIXELS_PER_MINUTE = SLOT_HEIGHT / MINUTES_PER_SLOT

export function calculateAppointmentPosition(appointment: Appointment): {
  top: number
  height: number
} {
  const [hours, minutes] = appointment.appointment_time.split(':').map(Number)
  
  // Calculate minutes since 9:00 AM (start of calendar)
  const minutesSinceStart = (hours - 9) * 60 + minutes
  
  // Calculate exact pixel position
  const top = minutesSinceStart * PIXELS_PER_MINUTE
  const height = appointment.duration * PIXELS_PER_MINUTE
  
  return { top, height }
}

/**
 * Parse appointment time and return position (for backwards compatibility)
 */
export function getAppointmentPosition(appointment: Appointment): {
  row: number
  span: number
} {
  const [hours, minutes] = appointment.appointment_time.split(':').map(Number)
  const totalMinutes = (hours - 9) * 60 + minutes
  const row = Math.floor(totalMinutes / 30)
  const span = Math.ceil(appointment.duration / 30)
  return { row, span }
}

/**
 * Check if date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Format date as YYYY-MM-DD for comparison with appointment dates
 * Uses local date to avoid timezone shifts
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse appointment date string to local Date object
 * Prevents timezone shift issues
 */
export function parseAppointmentDate(dateString: string): Date {
  // dateString is in format 'YYYY-MM-DD'
  const [year, month, day] = dateString.split('-').map(Number)
  // Create date in local timezone (not UTC)
  return new Date(year, month - 1, day)
}

/**
 * Group appointments by date
 */
export function groupAppointmentsByDate(
  appointments: Appointment[]
): Map<string, Appointment[]> {
  const grouped = new Map<string, Appointment[]>()
  
  appointments.forEach((appointment) => {
    const dateKey = appointment.appointment_date
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    grouped.get(dateKey)!.push(appointment)
  })
  
  return grouped
}

/**
 * Check if two appointments overlap
 */
export function appointmentsOverlap(apt1: Appointment, apt2: Appointment): boolean {
  if (apt1.appointment_date !== apt2.appointment_date) {
    return false
  }
  
  const pos1 = getAppointmentPosition(apt1)
  const pos2 = getAppointmentPosition(apt2)
  
  const end1 = pos1.row + pos1.span
  const end2 = pos2.row + pos2.span
  
  return pos1.row < end2 && pos2.row < end1
}

/**
 * Get color class based on status or service
 */
export function getAppointmentColor(appointment: Appointment): string {
  if (appointment.status === 'cancelled') {
    return 'bg-gray-100 border-l-4 border-gray-400'
  }
  
  // Color code by service type (you can customize these)
  // Handle comma-separated services by using the first service for color
  const firstService = appointment.service.split(',')[0].trim()
  
  const serviceColors: Record<string, string> = {
    'Quick Polish Change': 'bg-cyan-50 border-l-4 border-cyan-500',
    'Express Nail Repair': 'bg-orange-50 border-l-4 border-orange-500',
    'Classic Manicure': 'bg-purple-50 border-l-4 border-purple-500',
    'Deluxe Pedicure': 'bg-pink-50 border-l-4 border-pink-500',
    'Gel Nail Polish': 'bg-green-50 border-l-4 border-green-500',
    'Acrylic Full Set': 'bg-blue-50 border-l-4 border-blue-500',
    'Nail Art Design': 'bg-yellow-50 border-l-4 border-yellow-500',
    'French Manicure': 'bg-rose-50 border-l-4 border-rose-500',
    'Spa Pedicure': 'bg-teal-50 border-l-4 border-teal-500',
    'Gel Pedicure': 'bg-emerald-50 border-l-4 border-emerald-500',
    'Dip Powder Manicure': 'bg-violet-50 border-l-4 border-violet-500',
    'Acrylic Fill': 'bg-sky-50 border-l-4 border-sky-500',
    'Gel Fill': 'bg-lime-50 border-l-4 border-lime-500',
    'Nail Extension': 'bg-amber-50 border-l-4 border-amber-500',
    'Paraffin Treatment': 'bg-fuchsia-50 border-l-4 border-fuchsia-500',
    'Hand Massage': 'bg-stone-50 border-l-4 border-stone-500',
    'Foot Massage': 'bg-slate-50 border-l-4 border-slate-500',
    'Nail Repair (Single)': 'bg-red-50 border-l-4 border-red-500',
    'Color Change': 'bg-indigo-50 border-l-4 border-indigo-500',
    'Gel Removal': 'bg-zinc-50 border-l-4 border-zinc-500',
    'Acrylic Removal': 'bg-neutral-50 border-l-4 border-neutral-500',
  }
  
  return serviceColors[firstService] || 'bg-indigo-50 border-l-4 border-indigo-500'
}

/**
 * Format time for display in 24-hour format (e.g., "10:00", "14:30")
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Format time range in 24-hour format (e.g., "10:00 - 11:00")
 */
export function formatTimeRange(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const endMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(currentStart: Date): Date {
  return new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() - 7)
}

/**
 * Navigate to next week
 */
export function getNextWeek(currentStart: Date): Date {
  return new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() + 7)
}


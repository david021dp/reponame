import { Appointment } from '@/types/database.types'

/**
 * Generate all available time slots from 09:00 to 20:45 in 15-minute increments
 * Returns array of time strings in 24-hour format
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = []
  
  for (let hour = 9; hour <= 20; hour++) {
    for (let minute of [0, 15, 30, 45]) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(timeString)
    }
  }
  
  return slots
}

/**
 * Calculate all 15-minute time slots occupied by existing appointments
 * @param appointments - Array of appointments for a specific worker/date
 * @returns Set of occupied time slot strings
 */
export function calculateOccupiedSlots(appointments: Appointment[]): Set<string> {
  const occupiedSlots = new Set<string>()

  appointments.forEach((appointment) => {
    // Skip cancelled appointments
    if (appointment.status === 'cancelled') return

    const startTime = appointment.appointment_time
    const duration = appointment.duration

    // Parse start time
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes

    // Calculate how many 15-minute slots this appointment occupies
    const slotsNeeded = Math.ceil(duration / 15)

    // Mark each 15-minute slot as occupied
    for (let i = 0; i < slotsNeeded; i++) {
      const slotMinutes = startMinutes + (i * 15)
      const slotHours = Math.floor(slotMinutes / 60)
      const slotMins = slotMinutes % 60

      const slotTime = `${slotHours.toString().padStart(2, '0')}:${slotMins.toString().padStart(2, '0')}`
      occupiedSlots.add(slotTime)
    }
  })

  return occupiedSlots
}

/**
 * Check if a time slot has enough consecutive available slots for the given duration
 * @param startTime - The start time to check (e.g., "15:00")
 * @param duration - Duration in minutes
 * @param occupiedSlots - Set of occupied time slots
 * @returns true if the slot and all required consecutive slots are available
 */
export function isSlotAvailable(
  startTime: string,
  duration: number,
  occupiedSlots: Set<string>
): boolean {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes

  // Calculate how many 15-minute slots needed
  const slotsNeeded = Math.ceil(duration / 15)

  // Check if all required consecutive slots are available
  for (let i = 0; i < slotsNeeded; i++) {
    const slotMinutes = startMinutes + (i * 15)
    const slotHours = Math.floor(slotMinutes / 60)
    const slotMins = slotMinutes % 60

    const slotTime = `${slotHours.toString().padStart(2, '0')}:${slotMins.toString().padStart(2, '0')}`

    // If this slot is occupied, the start time is not available
    if (occupiedSlots.has(slotTime)) {
      return false
    }

    // Check if slot goes beyond business hours (21:00)
    if (slotHours >= 21) {
      return false
    }
  }

  return true
}

/**
 * Format time in 24-hour format for display
 * @param timeString - Time string in format "HH:mm"
 * @returns Formatted time string
 */
export function formatTime24Hour(timeString: string): string {
  return timeString // Already in 24-hour format
}

/**
 * Get human-readable duration text
 * @param duration - Duration in minutes
 * @returns String like "30 minutes" or "1 hour 30 minutes"
 */
export function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  if (hours === 0) return `${minutes} minutes`
  if (minutes === 0) return hours === 1 ? '1 hour' : `${hours} hours`
  return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`
}

/**
 * Calculate the end time given a start time and duration
 * @param startTime - Start time in "HH:mm" format
 * @param duration - Duration in minutes
 * @returns End time in "HH:mm" format
 */
export function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startMinutes = hours * 60 + minutes
  const endMinutes = startMinutes + duration

  const endHours = Math.floor(endMinutes / 60)
  const endMins = endMinutes % 60

  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
}


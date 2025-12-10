/**
 * Utility functions for handling UTC+1 (Belgrade) timezone
 */

/**
 * Get current date in UTC+1 timezone as YYYY-MM-DD string
 */
export function getTodayInUTC1(): string {
  // Use Intl.DateTimeFormat to get date in UTC+1 timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date())
}

/**
 * Get current time in UTC+1 timezone as HH:MM string
 */
export function getCurrentTimeInUTC1(): string {
  // Use Intl.DateTimeFormat to get time in UTC+1 timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Belgrade',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return formatter.format(new Date())
}

/**
 * Check if a date is today in UTC+1 timezone
 */
export function isTodayInUTC1(date: Date, dateString?: string): boolean {
  const today = getTodayInUTC1()
  if (dateString) {
    return dateString === today
  }
  // Format the provided date in UTC+1
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(date)
  return dateStr === today
}

/**
 * Check if a date is before today in UTC+1 timezone
 */
export function isDateBeforeTodayInUTC1(date: Date, dateString?: string): boolean {
  const today = getTodayInUTC1()
  if (dateString) {
    return dateString < today
  }
  // Format the provided date in UTC+1
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const dateStr = formatter.format(date)
  return dateStr < today
}

/**
 * Convert a date string (YYYY-MM-DD) to Date object in UTC+1 context
 */
export function parseDateInUTC1(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number)
  // Create date at midnight in Belgrade timezone
  // We'll create it as UTC and then interpret it as Belgrade time
  const date = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00+01:00`)
  return date
}

/**
 * Check if a time slot is in the past for today in UTC+1
 */
export function isTimePastInUTC1(timeString: string, dateString: string): boolean {
  const today = getTodayInUTC1()
  if (dateString !== today) {
    return false // Only check past times for today
  }
  
  const currentTime = getCurrentTimeInUTC1()
  return timeString < currentTime
}

/**
 * Get the UTC start/end ISO strings for a Europe/Belgrade calendar day.
 * Useful for counting things created "today" in local salon time.
 */
export function getUtcRangeForUTC1Day(dateString: string): { startIso: string; endIso: string } {
  // Compute the timezone offset for the provided date in Europe/Belgrade,
  // accounting for DST. This uses formatToParts to derive the offset.
  const timeZone = 'Europe/Belgrade'
  const dateAtUtcMidnight = new Date(`${dateString}T00:00:00Z`)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(dateAtUtcMidnight)
  const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value)

  const localYear = getPart('year')
  const localMonth = getPart('month') - 1 // zero-based
  const localDay = getPart('day')
  const localHour = getPart('hour')
  const localMinute = getPart('minute')
  const localSecond = getPart('second')

  // `asUTC` is the UTC timestamp that corresponds to local time components
  const asUTC = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond)
  const offsetMinutes = (dateAtUtcMidnight.getTime() - asUTC) / 60000 // negative for UTC+ offsets
  const offset = -offsetMinutes // positive minutes to shift back to UTC

  const [year, month, day] = dateString.split('-').map(Number)
  const startUtcMs = Date.UTC(year, month - 1, day) - offset * 60 * 1000
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  }
}


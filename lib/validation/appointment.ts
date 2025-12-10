import { z } from 'zod'

/**
 * Validation schema for appointment creation
 */
export const appointmentSchema = z.object({
  user_id: z.string().uuid('Invalid user ID format'),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  phone: z.preprocess(
    (val) => {
      // Convert empty string to null
      if (val === '' || val === null || val === undefined) return null
      // Remove spaces, dashes, parentheses for validation (but keep original format)
      return typeof val === 'string' ? val.replace(/[\s\-\(\)]/g, '') : val
    },
    z.string()
      .regex(/^\+?[0-9]\d{6,14}$/, 'Invalid phone number format')
      .min(7, 'Phone number must be at least 7 digits')
      .max(15, 'Phone number must be less than 16 digits'),
  ),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  service: z.string()
    .min(1, 'Service is required')
    .max(500, 'Service name must be less than 500 characters'),
  appointment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  appointment_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format. Use HH:MM'),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .nullable(),
  worker: z.string()
    .min(1, 'Worker is required')
    .max(200, 'Worker name must be less than 200 characters'),
  worker_id: z.string().uuid('Invalid worker ID format'),
  duration: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration must be less than 8 hours'),
  status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
  is_rescheduled: z.boolean().default(false),
})

/**
 * Validation schema for admin appointment creation
 * Note: admin_id is removed - it comes from authenticated user
 */
export const adminAppointmentSchema = z.object({
  client_first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  client_last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  client_phone: z.preprocess(
    (val) => {
      // Convert empty string to null
      if (val === '' || val === null || val === undefined) return null
      // Remove spaces, dashes, parentheses for validation (but keep original format)
      return typeof val === 'string' ? val.replace(/[\s\-\(\)]/g, '') : val
    },
    z.union([
      z.string()
        .regex(/^\+?[0-9]\d{6,14}$/, 'Invalid phone number format')
        .min(7, 'Phone number must be at least 7 digits')
        .max(15, 'Phone number must be less than 16 digits'),
      z.null(),
    ]).optional(),
  ),
  service_name: z.string()
    .min(1, 'Service is required')
    .max(500, 'Service name must be less than 500 characters'),
  appointment_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  appointment_time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format. Use HH:MM'),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .nullable(),
  worker_name: z.string()
    .min(1, 'Worker name is required')
    .max(200, 'Worker name must be less than 200 characters'),
  worker_id: z.string().uuid('Invalid worker ID format'),
  duration: z.number()
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration must be less than 8 hours'),
})

/**
 * Validation schema for client registration
 */
export const registerClientSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
  first_name: z.string()
    .min(1, 'First name is required')
    .max(100, 'First name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
  phone: z.preprocess(
    (val) => {
      // Convert empty string to null
      if (val === '' || val === null || val === undefined) return null
      // Remove spaces, dashes, parentheses for validation (but keep original format)
      return typeof val === 'string' ? val.replace(/[\s\-\(\)]/g, '') : val
    },
    z.string()
      .regex(/^\+?[0-9]\d{6,14}$/, 'Invalid phone number format')
      .min(7, 'Phone number must be at least 7 digits')
      .max(15, 'Phone number must be less than 16 digits'),
  ),
  admin_id: z.string().uuid('Invalid admin ID format'),
})

/**
 * Validation schema for appointment cancellation
 */
export const cancelAppointmentSchema = z.object({
  appointment_id: z.string().uuid('Invalid appointment ID format'),
  reason: z.string()
    .min(1, 'Cancellation reason is required')
    .max(500, 'Reason must be less than 500 characters'),
})

/**
 * Helper function to validate and return errors
 */
export function validateAppointment(data: unknown) {
  return appointmentSchema.parse(data)
}

export function validateAdminAppointment(data: unknown) {
  return adminAppointmentSchema.parse(data)
}

export function validateRegisterClient(data: unknown) {
  return registerClientSchema.parse(data)
}

export function validateCancelAppointment(data: unknown) {
  return cancelAppointmentSchema.parse(data)
}


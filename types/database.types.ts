export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'admin' | 'client' | 'head_admin'
          first_name: string
          last_name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role: 'admin' | 'client' | 'head_admin'
          first_name: string
          last_name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'admin' | 'client'
          first_name?: string
          last_name?: string
          phone?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          first_name: string
          last_name: string
          phone: string | null
          email: string
          service: string
          appointment_date: string
          appointment_time: string
          notes: string | null
          created_at: string
          worker: string
          worker_id: string
          duration: number
          status: 'scheduled' | 'cancelled'
          is_rescheduled: boolean
          cancelled_by: 'client' | 'admin' | null
          cancelled_at: string | null
          cancellation_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          first_name: string
          last_name: string
          phone?: string | null
          email: string
          service: string
          appointment_date: string
          appointment_time: string
          notes?: string | null
          created_at?: string
          worker: string
          worker_id: string
          duration: number
          status?: 'scheduled' | 'cancelled'
          is_rescheduled?: boolean
          cancelled_by?: 'client' | 'admin' | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string
          last_name?: string
          phone?: string | null
          email?: string
          service?: string
          appointment_date?: string
          appointment_time?: string
          notes?: string | null
          created_at?: string
          worker?: string
          worker_id?: string
          duration?: number
          status?: 'scheduled' | 'cancelled'
          is_rescheduled?: boolean
          cancelled_by?: 'client' | 'admin' | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          price: number
          duration: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          duration: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          duration?: number
          created_at?: string
        }
      }
      admin_activity_logs: {
        Row: {
          id: string
          admin_id: string
          action_type: 'register_client' | 'create_appointment' | 'cancel_appointment' | 'reschedule_appointment'
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action_type: 'register_client' | 'create_appointment' | 'cancel_appointment' | 'reschedule_appointment'
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action_type?: 'register_client' | 'create_appointment' | 'cancel_appointment' | 'reschedule_appointment'
          details?: Json | null
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          admin_id: string
          appointment_id: string | null
          type: 'appointment_cancelled' | 'appointment_created'
          message: string
          cancellation_reason: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          appointment_id?: string | null
          type: 'appointment_cancelled' | 'appointment_created'
          message: string
          cancellation_reason?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          appointment_id?: string | null
          type?: 'appointment_cancelled' | 'appointment_created'
          message?: string
          cancellation_reason?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}

// Helper types for easier use
export type User = Database['public']['Tables']['users']['Row']
export type Appointment = Database['public']['Tables']['appointments']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type AdminLog = Database['public']['Tables']['admin_activity_logs']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type UserInsert = Database['public']['Tables']['users']['Insert']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type ServiceInsert = Database['public']['Tables']['services']['Insert']
export type AdminLogInsert = Database['public']['Tables']['admin_activity_logs']['Insert']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']


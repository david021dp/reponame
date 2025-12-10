-- =============================================
-- Complete Database Schema for Appointment Scheduling App
-- Run this script in Supabase SQL Editor to recreate the entire database
-- =============================================

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- Table: users (user accounts with role-based access)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'head_admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: appointments (appointment bookings)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  service TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  worker TEXT NOT NULL,
  worker_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  is_rescheduled BOOLEAN DEFAULT false,
  cancelled_by TEXT CHECK (cancelled_by IN ('client', 'admin')),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT
);

-- Table: services (available nail services)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: admin_activity_logs (audit trail of admin actions)
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('register_client', 'create_appointment', 'cancel_appointment', 'reschedule_appointment')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: notifications (admin notifications for appointments)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment_cancelled', 'appointment_created')),
  message TEXT NOT NULL,
  cancellation_reason TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: security_logs (security event logging)
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('failed_login', 'csrf_failure', 'rate_limit_exceeded', 'authorization_failure', 'validation_failure', 'suspicious_activity')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES
-- =============================================

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Indexes for appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_email ON appointments(email);
CREATE INDEX IF NOT EXISTS idx_appointments_worker ON appointments(worker);
CREATE INDEX IF NOT EXISTS idx_appointments_worker_id ON appointments(worker_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_appointment_slot ON appointments (worker, appointment_date, appointment_time) WHERE status = 'scheduled';

-- Indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Indexes for admin_activity_logs table
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at);

-- Indexes for security_logs table
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip_address ON security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS POLICIES - Users Table
-- =============================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (id = auth.uid());

-- Authenticated users can read all users for app functionality
CREATE POLICY "Authenticated users can read all users for app functionality" ON users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================
-- 5. RLS POLICIES - Appointments Table
-- =============================================

-- Clients can read their own appointments
CREATE POLICY "Clients can read own appointments" ON appointments
  FOR SELECT
  USING (user_id = auth.uid());

-- Clients can create appointments
CREATE POLICY "Clients can create appointments" ON appointments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Clients can update own appointments
CREATE POLICY "Clients can update own appointments" ON appointments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Clients can cancel own appointments
CREATE POLICY "Clients can cancel own appointments" ON appointments
  FOR UPDATE
  USING ((user_id = auth.uid()) AND (status = 'scheduled'))
  WITH CHECK ((user_id = auth.uid()) AND (status = 'cancelled') AND (cancelled_by = 'client'));

-- Clients can delete own appointments
CREATE POLICY "Clients can delete own appointments" ON appointments
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can read their appointments (using worker_id)
CREATE POLICY "Admins can read their appointments" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.id = appointments.worker_id
    )
  );

-- Admins can update their appointments (using worker_id)
CREATE POLICY "Admins can update their appointments" ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.id = appointments.worker_id
    )
  );

-- Admins can delete any appointment
CREATE POLICY "Admins can delete any appointment" ON appointments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Head admin can read all appointments
CREATE POLICY "Head admin can read all appointments" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'head_admin'
    )
  );

-- Head admin can update all appointments
CREATE POLICY "Head admin can update all appointments" ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'head_admin'
    )
  );

-- =============================================
-- 6. RLS POLICIES - Services Table
-- =============================================

-- Authenticated users can read services
CREATE POLICY "Authenticated users can read services" ON services
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- =============================================
-- 7. RLS POLICIES - Admin Activity Logs Table
-- =============================================

-- Admins can read their own activity logs
CREATE POLICY "Admins can read own logs" ON admin_activity_logs
  FOR SELECT
  USING (admin_id = auth.uid());

-- Admins can create activity logs
CREATE POLICY "Admins can create logs" ON admin_activity_logs
  FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- =============================================
-- 8. RLS POLICIES - Notifications Table
-- =============================================

-- System can create notifications (allows service role inserts)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Admins can read own notifications
CREATE POLICY "Admins can read own notifications" ON notifications
  FOR SELECT
  USING (admin_id = auth.uid());

-- Admins can update own notifications
CREATE POLICY "Admins can update own notifications" ON notifications
  FOR UPDATE
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Head admin can read all notifications
CREATE POLICY "Head admin can read all notifications" ON notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'head_admin'
    )
  );

-- =============================================
-- 9. RLS POLICIES - Security Logs Table
-- =============================================

-- Admins can read security logs
CREATE POLICY "Admins can read security logs" ON security_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =============================================
-- 10. SEED DATA - Services
-- =============================================

-- Insert nail salon services (required for app functionality)
INSERT INTO services (name, price, duration) VALUES
  ('Classic Manicure', 35.00, 45),
  ('Deluxe Pedicure', 55.00, 60),
  ('Gel Nail Polish', 45.00, 60),
  ('Acrylic Full Set', 75.00, 90),
  ('Nail Art Design', 65.00, 75),
  ('Express Nail Repair', 25.00, 30),
  ('French Manicure', 40.00, 50),
  ('Spa Pedicure', 65.00, 75),
  ('Gel Pedicure', 50.00, 65),
  ('Dip Powder Manicure', 55.00, 70),
  ('Acrylic Fill', 45.00, 60),
  ('Gel Fill', 40.00, 55),
  ('Nail Extension', 85.00, 100),
  ('Paraffin Treatment', 20.00, 25),
  ('Hand Massage', 15.00, 20),
  ('Foot Massage', 20.00, 25),
  ('Nail Repair (Single)', 10.00, 15),
  ('Color Change', 20.00, 30),
  ('Gel Removal', 15.00, 20),
  ('Acrylic Removal', 20.00, 30)
ON CONFLICT DO NOTHING;

-- =============================================
-- 11. ENABLE REAL-TIME REPLICA IDENTITY
-- =============================================

-- This is REQUIRED for real-time subscriptions to receive UPDATE and DELETE events
-- Without REPLICA IDENTITY FULL, subscriptions will fail with WebSocket connection errors
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;


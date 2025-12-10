-- =============================================
-- Appointment Scheduling App - Database Setup
-- =============================================

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  duration INTEGER NOT NULL, -- duration in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('register_client', 'create_appointment', 'cancel_appointment', 'reschedule_appointment')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 20 nail services with prices and durations
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
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Users Table Policies
-- =============================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- Appointments Table Policies
-- =============================================

-- Clients can read their own appointments
CREATE POLICY "Clients can read own appointments" ON appointments
  FOR SELECT
  USING (
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Clients can create appointments
CREATE POLICY "Clients can create appointments" ON appointments
  FOR INSERT
  WITH CHECK (
    email = (SELECT email FROM users WHERE id = auth.uid())
  );

-- Admins can read appointments where they are the worker
CREATE POLICY "Admins can read their appointments" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND CONCAT(first_name, ' ', last_name) = appointments.worker
    )
  );

-- Admins can update appointments where they are the worker
CREATE POLICY "Admins can update their appointments" ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND CONCAT(first_name, ' ', last_name) = appointments.worker
    )
  );

-- =============================================
-- Services Table Policies
-- =============================================

-- Everyone can read services
CREATE POLICY "Anyone can read services" ON services
  FOR SELECT
  USING (true);

-- =============================================
-- Admin Activity Logs Policies
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
-- Indexes for better query performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_appointments_email ON appointments(email);
CREATE INDEX IF NOT EXISTS idx_appointments_worker ON appointments(worker);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);


-- =============================================
-- Migration: Add worker_id column to appointments table
-- =============================================

-- Step 1: Add worker_id column as nullable first
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES users(id);

-- Step 2: Populate existing records by matching worker name to users table
UPDATE appointments a
SET worker_id = (
  SELECT u.id
  FROM users u
  WHERE CONCAT(u.first_name, ' ', u.last_name) = a.worker
  AND u.role IN ('admin', 'head_admin')
  LIMIT 1
)
WHERE worker_id IS NULL;

-- Step 3: Make worker_id NOT NULL after population
ALTER TABLE appointments
ALTER COLUMN worker_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_worker_id ON appointments(worker_id);

-- Step 5: Update RLS policies to use worker_id instead of worker name

-- Drop old policies
DROP POLICY IF EXISTS "Admins can read their appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can update their appointments" ON appointments;

-- Create new policies using worker_id
CREATE POLICY "Admins can read their appointments" ON appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND id = appointments.worker_id
    )
  );

CREATE POLICY "Admins can update their appointments" ON appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'admin'
      AND id = appointments.worker_id
    )
  );

-- Head admin policies remain unchanged (they can read/update all)


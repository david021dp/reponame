-- Add unique constraint to prevent double booking
-- Run this in Supabase SQL Editor

-- Create unique index to prevent double booking of the same time slot
CREATE UNIQUE INDEX IF NOT EXISTS unique_appointment_slot 
ON appointments (worker, appointment_date, appointment_time) 
WHERE status = 'scheduled';


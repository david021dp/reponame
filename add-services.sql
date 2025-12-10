-- Add 15 additional nail salon services
-- Run this in Supabase SQL Editor to add more services to your database

INSERT INTO services (name, price, duration) VALUES
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


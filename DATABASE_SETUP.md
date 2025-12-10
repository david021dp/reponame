# Database Setup Instructions

## Step 1: Create Users and Appointments Tables

Go to your Supabase Dashboard → SQL Editor and run these commands:

### Create Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Create Appointments Table
```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  is_rescheduled BOOLEAN DEFAULT false
);
```

## Step 2: Run the Migration File

Copy all contents from `supabase-migration.sql` and run it in your Supabase SQL Editor.

This will:
- ✅ Create `services` table with 5 nail services
- ✅ Create `admin_activity_logs` table
- ✅ Set up Row Level Security (RLS) policies
- ✅ Create database indexes for performance

## Step 3: Enable Email Confirmation

1. Go to: Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", enable **"Confirm email"**
3. This ensures clients must verify their email before logging in

## Step 4: Create Your First Admin User

In Supabase Dashboard → Authentication → Users, click "Add User":
- Email: your-admin-email@example.com
- Password: your-secure-password
- Auto Confirm User: ✅ (check this)

Then in SQL Editor, update the user's role:
```sql
INSERT INTO users (id, email, role, first_name, last_name, phone)
VALUES (
  'USER_ID_FROM_AUTH_USERS',
  'your-admin-email@example.com',
  'admin',
  'Admin',
  'Name',
  '555-0000'
);
```

Replace `USER_ID_FROM_AUTH_USERS` with the actual UUID from auth.users table.

## Done!

Your database is now ready. Return to the app and start the development server:
```bash
npm run dev
```


# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Database Setup (2 minutes)

1. Go to your Supabase Dashboard → SQL Editor
2. Copy all contents from `supabase-migration.sql`
3. Paste and run it
4. Create the `users` and `appointments` tables using SQL from `DATABASE_SETUP.md`

### Step 2: Enable Email Verification (30 seconds)

1. Supabase Dashboard → Authentication → Settings
2. Under "Email Auth", enable **"Confirm email"**

### Step 3: Create First Admin (1 minute)

In Supabase Dashboard → Authentication → Users:
1. Click "Add User"
2. Enter email and password
3. Check "Auto Confirm User"
4. Click "Create User"

Then in SQL Editor:
```sql
INSERT INTO users (id, email, role, first_name, last_name, phone)
VALUES (
  'PASTE_USER_ID_HERE',  -- Get from auth.users table
  'admin@example.com',
  'admin',
  'John',
  'Doe',
  '555-0000'
);
```

### Step 4: Start the App (1 minute)

```bash
cd my-app
npm run dev
```

Open http://localhost:3000

### Step 5: Test the App

1. **Login as Admin**: Use the email/password from Step 3
2. **Register a Client**: Click "Register Client" in navbar
3. **Client verifies email**: Check their inbox and click verification link
4. **Client logs in**: Use the credentials admin created
5. **Client schedules**: Go to Schedule page and book appointment
6. **Admin views**: Go back to admin account, see the appointment!

## 🎉 Done!

Your appointment scheduling app is now running!

## Common Issues

**"User not found"** → Make sure you created the admin in both auth.users AND users tables

**"Email not verified"** → Check Supabase email settings are enabled

**"Permission denied"** → Run the full migration file with RLS policies

**Admin sees no appointments** → Worker name must match admin's first + last name exactly


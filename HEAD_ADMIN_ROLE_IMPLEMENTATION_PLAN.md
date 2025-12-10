# Head Admin Role Implementation Plan

## Overview
Implement 'head_admin' role value in users.role field. Head admin can see and update ALL appointments, while regular admin only sees their own.

## Database Changes

### 1. Update CHECK constraint on users.role
- Current: `CHECK (role IN ('admin', 'client'))`
- New: `CHECK (role IN ('admin', 'client', 'head_admin'))`

### 2. Update RLS Policies on appointments table

**Current policies:**
- "Admins can read their appointments" - only where worker = admin name
- "Admins can update their appointments" - only where worker = admin name

**New policies needed:**
- "Head admin can read all appointments" - no filter
- "Head admin can update all appointments" - no filter

**Update existing policies:**
- Ensure "Admins can read their appointments" explicitly excludes head_admin (role = 'admin' only)
- Ensure "Admins can update their appointments" explicitly excludes head_admin (role = 'admin' only)

## Code Changes

### 1. TypeScript Types
- Update `types/database.types.ts` to include 'head_admin' in role type

### 2. Queries
- Update `lib/queries/appointments.ts`:
  - `getAdminAppointments()` - add userRole parameter, filter by worker only if role = 'admin'
  
### 3. Dashboard & Pages
- Update `app/admin/dashboard/page.tsx`:
  - Check for 'admin' OR 'head_admin' role
  - Pass userRole to getAdminAppointments()
  
- Update `app/admin/notifications/page.tsx`:
  - Check for 'admin' OR 'head_admin' role
  
- Update `app/admin/register/page.tsx`:
  - Check for 'admin' OR 'head_admin' role

### 4. API Routes
- Update `app/api/admin/*` routes:
  - Check for 'admin' OR 'head_admin' role
  - For cancel/update operations, allow head_admin to modify any appointment

### 5. Middleware
- Update `lib/supabase/middleware.ts`:
  - Allow 'head_admin' access to admin routes

### 6. Real-time Subscriptions
- Update `app/admin/dashboard/RealTimeAdminAppointments.tsx`:
  - If head_admin, subscribe to ALL appointments (no worker filter)
  - If admin, subscribe only to their appointments (worker filter)

### 7. Login & Navigation
- Update `app/login/page.tsx`:
  - Redirect 'head_admin' to admin dashboard
  
- Update `components/Navbar.tsx`:
  - Handle 'head_admin' role (treat as admin)

## Implementation Order

1. Database migration (CHECK constraint + RLS policies)
2. TypeScript types update
3. Queries update
4. Dashboard pages update
5. API routes update
6. Middleware update
7. Real-time subscriptions update
8. Login/navigation update


# Head Admin Role Implementation - Complete

## Summary

Successfully implemented 'head_admin' role value in users.role field. Head admin can see and update ALL appointments, while regular admin only sees their own.

## Database Changes ✅

### Migration Applied
- Updated CHECK constraint on `users.role` to include 'head_admin'
- Added RLS policy: "Head admin can read all appointments" (no filter)
- Added RLS policy: "Head admin can update all appointments" (no filter)
- Updated existing "Admins can read their appointments" policy to explicitly exclude head_admin (role = 'admin' only)
- Updated existing "Admins can update their appointments" policy to explicitly exclude head_admin (role = 'admin' only)

## Code Changes ✅

### 1. TypeScript Types
- ✅ Updated `types/database.types.ts` to include 'head_admin' in role type

### 2. Queries
- ✅ Updated `lib/queries/appointments.ts`:
  - `getAdminAppointments()` now accepts optional `userRole` parameter
  - If `userRole === 'head_admin'`, returns all appointments (no worker filter)
  - If `userRole !== 'head_admin'`, filters by worker name (existing behavior)

### 3. Dashboard & Pages
- ✅ Updated `app/admin/dashboard/page.tsx`:
  - Checks for 'admin' OR 'head_admin' role
  - Passes `user.role` to `getAdminAppointments()`
  - Passes `user.role` to `RealTimeAdminAppointments` component
  - Passes `user.role` to Navbar component

- ✅ Updated `app/admin/notifications/page.tsx`:
  - Checks for 'admin' OR 'head_admin' role
  - Passes `user.role` to Navbar component

- ✅ Updated `app/admin/register/page.tsx`:
  - Checks for 'admin' OR 'head_admin' role
  - Passes `user.role` to Navbar component

### 4. Real-time Subscriptions
- ✅ Updated `app/admin/dashboard/RealTimeAdminAppointments.tsx`:
  - Accepts optional `userRole` prop
  - If `userRole === 'head_admin'`, subscribes to ALL appointments (no worker filter)
  - If `userRole !== 'head_admin'`, subscribes only to their appointments (worker filter)

### 5. API Routes
- ✅ Updated `app/api/admin/register-client/route.ts`:
  - Checks for 'admin' OR 'head_admin' role

- ✅ Updated `app/api/admin/create-appointment/route.ts`:
  - Checks for 'admin' OR 'head_admin' role
  - Fixed linter error (changed `request` to `req` in `createRateLimitResponse`)

- ✅ Updated `app/api/admin/cancel-appointment/route.ts`:
  - Checks for 'admin' OR 'head_admin' role
  - RLS policies automatically allow head_admin to cancel any appointment

### 6. Middleware
- ✅ Updated `lib/supabase/middleware.ts`:
  - Allows 'head_admin' access to admin routes (same as 'admin')

### 7. Login & Navigation
- ✅ Updated `app/login/page.tsx`:
  - Redirects 'head_admin' to admin dashboard (same as 'admin')

- ✅ Updated `components/Navbar.tsx`:
  - Accepts 'head_admin' in userRole type
  - Treats 'head_admin' as admin for navigation links

## How It Works

### Regular Admin (role = 'admin')
- Can only see appointments where `worker = CONCAT(first_name, ' ', last_name)`
- Can only update appointments where `worker = CONCAT(first_name, ' ', last_name)`
- RLS policies enforce this at the database level

### Head Admin (role = 'head_admin')
- Can see ALL appointments (no worker filter)
- Can update ALL appointments (no worker filter)
- RLS policies allow this at the database level
- Real-time subscriptions receive all appointment changes
- Dashboard shows all appointments from all workers

## Testing

To test the implementation:

1. **Create a head_admin user:**
   ```sql
   UPDATE users SET role = 'head_admin' WHERE email = 'headadmin@example.com';
   ```

2. **Verify head_admin can see all appointments:**
   - Login as head_admin
   - Navigate to `/admin/dashboard`
   - Should see appointments from all workers, not just their own

3. **Verify regular admin still sees only their appointments:**
   - Login as regular admin
   - Navigate to `/admin/dashboard`
   - Should see only appointments where worker = their full name

4. **Verify head_admin can cancel any appointment:**
   - Login as head_admin
   - Try to cancel an appointment from a different worker
   - Should succeed (RLS allows it)

5. **Verify regular admin cannot cancel other workers' appointments:**
   - Login as regular admin
   - Try to cancel an appointment from a different worker
   - Should fail (RLS blocks it)

## Files Modified

1. `types/database.types.ts` - Added 'head_admin' to role type
2. `lib/queries/appointments.ts` - Updated getAdminAppointments() to accept userRole
3. `app/admin/dashboard/page.tsx` - Updated role checks and passed userRole
4. `app/admin/dashboard/RealTimeAdminAppointments.tsx` - Updated real-time subscription filter
5. `app/admin/notifications/page.tsx` - Updated role checks
6. `app/admin/register/page.tsx` - Updated role checks
7. `app/api/admin/register-client/route.ts` - Updated role checks
8. `app/api/admin/create-appointment/route.ts` - Updated role checks and fixed linter error
9. `app/api/admin/cancel-appointment/route.ts` - Updated role checks
10. `lib/supabase/middleware.ts` - Updated admin route protection
11. `app/login/page.tsx` - Updated redirect logic
12. `components/Navbar.tsx` - Updated userRole type and navigation logic

## Database Migration

Migration name: `add_head_admin_role`
Status: ✅ Applied successfully

The migration:
- Updates CHECK constraint on users.role
- Adds RLS policies for head_admin
- Updates existing RLS policies to exclude head_admin


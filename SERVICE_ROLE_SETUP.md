# Service Role Key Setup Instructions

## ⚠️ IMPORTANT: Complete This Step to Enable Notifications

The client cancellation notification system requires the **Service Role Key** to work.

## Why is This Needed?

The service role key allows the server to create notifications for admins (who are different users) without being blocked by Row Level Security policies. This prevents clients from inserting fake notifications while allowing legitimate system notifications.

## Step-by-Step Instructions

### 1. Get Your Service Role Key

Go to your Supabase Project Settings:

**Direct Link:** https://supabase.com/dashboard/project/eplmpbhbumynkelpzwos/settings/api

Or navigate manually:
1. Open Supabase Dashboard
2. Select your project "websajt"
3. Click "Settings" in the sidebar
4. Click "API"
5. Scroll to "Project API keys" section
6. Find **"service_role"** key (NOT the anon key!)
7. Click "Reveal" and copy the key

⚠️ **WARNING:** The service role key has FULL database access. Keep it secret!

### 2. Add to Your Environment File

You need to manually add this to your `.env.local` file.

**Option A: Using PowerShell (Recommended):**

Open PowerShell in your `my-app` folder and run:

```powershell
Add-Content -Path .env.local -Value "`nSUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE"
```

Replace `YOUR_SERVICE_ROLE_KEY_HERE` with the actual key you copied.

**Option B: Manual Edit:**

1. Open the file: `my-app/.env.local`
2. Add a new line at the end:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key...
```

### 3. Verify the File

Your `.env.local` should now look like:

```
NEXT_PUBLIC_SUPABASE_URL=https://eplmpbhbumynkelpzwos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Note the difference:
- `NEXT_PUBLIC_*` = Available in browser (public)
- `SUPABASE_SERVICE_ROLE_KEY` = Server-only (NO NEXT_PUBLIC prefix)

### 4. Restart Your Dev Server

The environment variable is only loaded on server startup:

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 5. Test the Cancellation

1. Log in as a client
2. Go to "My Appointments"
3. Click "Cancel" on an appointment
4. Enter a reason and confirm
5. ✅ Should work without errors now!

## Security Notes

### What is Service Role Key?

- **Master admin key** for your database
- Bypasses ALL Row Level Security policies
- Has full read/write access to everything
- Should NEVER be exposed to the browser/client

### Why is it Safe Here?

✅ **Only used server-side** - In Next.js API routes  
✅ **Not exposed to browser** - No NEXT_PUBLIC prefix  
✅ **Limited scope** - Only used for notification creation  
✅ **Controlled by your code** - Clients can't access it  
✅ **Validated operations** - Your API validates all inputs first

### What if Someone Gets This Key?

If the service role key is compromised:
1. They have full database access
2. Can read/write/delete any data
3. Bypass all RLS policies

**Prevention:**
- ✅ Never commit `.env.local` to Git (already gitignored)
- ✅ Never log the key
- ✅ Never send to browser
- ✅ Rotate key if suspected compromise (Supabase Dashboard → API → Reset)

## Troubleshooting

### Error: "Missing Supabase URL or Service Role Key"

**Cause:** The key isn't in your `.env.local` or the server hasn't restarted.

**Fix:**
1. Double-check the key is in `.env.local`
2. Restart dev server (`npm run dev`)

### Error: "Invalid API key"

**Cause:** Wrong key format or copied incorrectly.

**Fix:**
1. Go back to Supabase Dashboard → Settings → API
2. Copy the **service_role** key again (not anon key!)
3. Make sure you copied the entire key (it's very long)

### Notification Still Not Created

**Cause:** Policy might still be blocking it.

**Fix:**
1. Check Supabase logs for errors
2. Verify the policy was removed: Check Table Editor → notifications → RLS Policies
3. Should only see SELECT and UPDATE policies, NO INSERT policy

## Current RLS Policies on notifications Table

After implementation:

✅ **SELECT:** "Admins can read own notifications"
   - USING: admin_id = auth.uid()
   - Allows: Admins see their own notifications only

✅ **UPDATE:** "Admins can update own notifications"  
   - USING: admin_id = auth.uid()
   - Allows: Admins mark their own notifications as read

❌ **INSERT:** No policy
   - Regular users CANNOT insert
   - Only service role can insert (your server API)
   - Prevents fake notification attacks

✅ **DELETE:** No policy
   - Regular users CANNOT delete
   - Notifications are permanent (audit trail)

## Files Modified

1. `lib/supabase/admin.ts` - Created service role client
2. `app/api/client/cancel-appointment/route.ts` - Uses admin client for notifications
3. `.env.local` - Add SUPABASE_SERVICE_ROLE_KEY (manual step)
4. Supabase notifications table - Removed INSERT policy

## Summary

After adding the service role key and restarting your server:

✅ Clients CAN cancel appointments  
✅ Notifications ARE created in database  
✅ Admins SEE notifications in bell icon  
✅ Clients CANNOT insert fake notifications  
✅ Complete security + functionality

**Follow the instructions above to complete the setup!**


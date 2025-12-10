# Security Logging Diagnosis - Failed Login Not Logging

## Current Status
❌ Failed login attempts are NOT being logged to `security_logs` table

## Root Cause Analysis

### Most Likely Cause: Missing Service Role Key

The `logSecurityEvent()` function uses `createAdminClient()` which requires `SUPABASE_SERVICE_ROLE_KEY` environment variable. If this key is missing:

1. `createAdminClient()` throws an error
2. Error is caught silently in `logSecurityEvent()`
3. No log entry is created
4. No visible error to user (by design - logging shouldn't break app)

### Diagnostic Steps Added

I've added diagnostic logging to help identify the issue:

1. **Service Role Key Check** - Logs error if key is missing
2. **Admin Client Creation** - Logs error if client creation fails
3. **Insert Operation** - Logs success/failure of database insert
4. **API Endpoint** - Logs when endpoint is called and completed

## How to Verify

### Step 1: Check Server Console
When you try to log in with wrong password, check your terminal/console where `npm run dev` is running. You should see:

- `[Security Log API] Received request to log event`
- `[Security Logger] Attempting to log event: failed_login`
- Either success message or error message

### Step 2: Check Environment Variables
Verify that `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local` file:

```bash
# Should be in .env.local (NOT .env - that's for public vars)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get the key:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Find "service_role" key (NOT anon key!)
4. Copy it
5. Add to `.env.local`

### Step 3: Restart Dev Server
After adding the key, restart your dev server:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 4: Test Again
1. Try to log in with wrong password
2. Check server console for diagnostic messages
3. Check database: `SELECT * FROM security_logs WHERE event_type = 'failed_login' ORDER BY created_at DESC LIMIT 5;`

## Files Modified (Diagnostic Only)

1. `lib/logging/security-logger.ts`
   - Added service role key check
   - Added detailed error logging
   - Added success logging

2. `app/api/security/log-event/route.ts`
   - Added request/response logging
   - Added error logging

3. `lib/supabase/admin.ts`
   - Improved error messages (more specific)

## Security Impact

✅ **No security reduction:**
- Only added diagnostic logging
- No changes to security logic
- No changes to RLS policies
- No changes to authentication

## Next Steps

1. **Check if service role key is configured**
   - Look for error: `SUPABASE_SERVICE_ROLE_KEY is not configured`
   - If you see this, add the key to `.env.local`

2. **Check server console for errors**
   - Look for `[Security Logger]` messages
   - These will tell you exactly what's failing

3. **If key is configured but still not working:**
   - Check server console for specific error messages
   - Share the error messages for further diagnosis

## Expected Behavior After Fix

When you enter wrong password:
1. Login fails (expected)
2. Client calls `/api/security/log-event`
3. Server logs event to `security_logs` table
4. You can query: `SELECT * FROM security_logs WHERE event_type = 'failed_login'`

## Verification Query

Run this in Supabase SQL Editor after testing:

```sql
SELECT 
  event_type,
  ip_address,
  error_message,
  created_at
FROM security_logs 
WHERE event_type = 'failed_login' 
ORDER BY created_at DESC 
LIMIT 5;
```

You should see your failed login attempts listed.


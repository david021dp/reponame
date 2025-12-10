# Real-time Testing Guide

## Important: Use Regular Browser Tabs

⚠️ **Do NOT use Cursor's embedded browser** - it has WebSocket limitations.

✅ **Use these browsers:** Chrome, Firefox, Edge, Safari

## Step-by-Step Testing

### Setup

1. **Open your dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open TWO regular browser tabs** (e.g., Chrome):
   - Tab 1: Admin dashboard
   - Tab 2: Client view

3. **Open Developer Console (F12) in BOTH tabs**

---

## Test 1: Client Schedules Appointment

**Expected: Admin sees appointment instantly**

### Steps:

1. **Tab 1 (Admin Dashboard)**
   - Log in as admin: `davidheh15@gmail.com`
   - Keep console open
   - You should see:
     ```
     🔧 Admin Realtime Setup: {workerName: "david papic", ...}
     📡 Admin subscription status: SUBSCRIBED
     ```

2. **Tab 2 (Client Schedule)**
   - Log in as client: `davidbrother432@gmail.com`
   - Go to Schedule Appointment page
   - Fill out form and click "Schedule Appointment"

3. **Watch Tab 1 Console**
   - You should IMMEDIATELY see:
     ```
     🔥 ADMIN EVENT RECEIVED: {type: "INSERT", worker: "david papic", ...}
     ➕ Adding new appointment
     ```

4. **Watch Tab 1 UI**
   - New appointment card should appear **instantly**
   - No page refresh needed!

5. **Watch Notification Bell** (in Tab 1)
   - Should see:
     ```
     🔥 NOTIFICATION EVENT RECEIVED: {type: "INSERT", ...}
     ➕ New notification
     ```
   - Badge count should increase immediately

---

## Test 2: Admin Cancels Appointment

**Expected: Client sees cancellation instantly**

### Steps:

1. **Tab 2 (Client Appointments)**
   - Log in as client: `davidbrother432@gmail.com`
   - Go to "My Appointments" page
   - Keep console open
   - You should see:
     ```
     🔧 Client Realtime Setup: {userId: "...", ...}
     📡 Client subscription status: SUBSCRIBED
     ```

2. **Tab 1 (Admin Dashboard)**
   - Find an appointment
   - Click "❌ Cancel Appointment"
   - Confirm cancellation

3. **Watch Tab 2 Console**
   - You should IMMEDIATELY see:
     ```
     🔥 CLIENT EVENT RECEIVED: {type: "UPDATE", status: "cancelled", ...}
     ✏️ Updating appointment
     📊 Appointments after update: ...
     ```

4. **Watch Tab 2 UI**
   - Appointment status should change to "Cancelled" **instantly**
   - No page refresh needed!

---

## Test 3: Client Cancels Appointment

**Expected: Admin sees cancellation instantly + gets notification**

### Steps:

1. **Tab 1 (Admin Dashboard)**
   - Keep page open with console visible

2. **Tab 2 (Client Appointments)**
   - Go to an appointment
   - Click cancel button
   - Enter reason and confirm

3. **Watch Tab 1 Console**
   - Should see TWO events:
     ```
     🔥 ADMIN EVENT RECEIVED: {type: "UPDATE", status: "cancelled", ...}
     ✏️ Updating appointment
     
     🔥 NOTIFICATION EVENT RECEIVED: {type: "INSERT", ...}
     ➕ New notification
     ```

4. **Watch Tab 1 UI**
   - Appointment should move to cancelled section **instantly**
   - Notification bell badge should increase **instantly**

---

## Troubleshooting

### If you see "SUBSCRIBED" but no events:

1. **Check the filter values in console:**
   ```
   🔧 Admin Realtime Setup: {workerName: "david papic", filter: "worker=eq.david papic"}
   ```
   - Make sure workerName matches exactly (case-sensitive!)

2. **Verify RLS policies allow reading:**
   ```sql
   -- In Supabase SQL Editor, test as the logged-in user:
   SELECT * FROM appointments WHERE worker = 'david papic';
   ```

3. **Check Supabase Realtime is enabled:**
   - Go to Supabase Dashboard > Database > Replication
   - Verify `appointments` and `notifications` tables are in publication

### If you see "CLOSED" status:

This means RLS is blocking the subscription. Check:
1. Are you logged in?
2. Do the RLS policies allow SELECT for your user?
3. Check console for any error messages

### If you see NO console messages at all:

1. Make sure you're using a **regular browser tab** (not Cursor's browser)
2. Hard refresh (Ctrl + Shift + R)
3. Check if JavaScript is enabled
4. Check for any React errors in console

---

## Expected Console Output

### Admin Dashboard (when everything works):
```
🔧 Admin Realtime Setup: {workerName: "david papic", filter: "worker=eq.david papic", initialCount: 3}
📡 Admin subscription status: SUBSCRIBED
🔧 Notifications Realtime Setup: {adminId: "fa5e4c98-...", filter: "admin_id=eq.fa5e4c98-..."}
📡 Notifications subscription status: SUBSCRIBED

[When client schedules:]
🔥 ADMIN EVENT RECEIVED: {type: "INSERT", worker: "david papic", id: "...", status: "scheduled"}
➕ Adding new appointment
🔥 NOTIFICATION EVENT RECEIVED: {type: "INSERT", adminId: "fa5e4c98-...", id: "..."}
➕ New notification
```

### Client Appointments (when everything works):
```
🔧 Client Realtime Setup: {userId: "7eb701c2-...", filter: "user_id=eq.7eb701c2-...", initialCount: 2}
📡 Client subscription status: SUBSCRIBED

[When admin cancels:]
🔥 CLIENT EVENT RECEIVED: {type: "UPDATE", userId: "7eb701c2-...", id: "...", status: "cancelled"}
✏️ Updating appointment
📊 Appointments after update: 2
```

---

## Success Checklist

✅ Subscription status shows "SUBSCRIBED"
✅ Events appear in console when actions happen
✅ UI updates without page refresh
✅ No delay (updates appear within 1-2 seconds)
✅ Works in regular browser tabs (Chrome/Firefox/Edge/Safari)

If all checkmarks are green, **real-time is working perfectly!** 🎉


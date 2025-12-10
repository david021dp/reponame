# Nail Salon Appointment Scheduling App

A full-stack Next.js appointment scheduling application with Supabase backend, featuring role-based access control, email verification, and comprehensive activity logging.

## Features

### For Clients
- ✅ Secure login with email verification
- ✅ Schedule appointments with preferred worker
- ✅ Select from 5 nail services
- ✅ Choose date and time slots
- ✅ Add notes to appointments
- ✅ View all their scheduled appointments
- ✅ Auto-fill personal information from account

### For Admins
- ✅ Separate admin dashboard
- ✅ View appointments scheduled with them (filtered by worker name)
- ✅ Register new client accounts
- ✅ Cancel appointments
- ✅ Track statistics (total, scheduled, cancelled)
- ✅ Comprehensive activity logging

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email verification
- **Styling**: Tailwind CSS
- **Deployment**: Ready for Vercel

## Database Schema

### Tables
1. **users** - User accounts with role-based access (admin/client)
2. **appointments** - Appointment bookings with full details
3. **services** - Available nail services with pricing
4. **admin_activity_logs** - Audit trail of all admin actions

### Row Level Security (RLS)
- Clients can only view/create their own appointments
- Admins can only view appointments where they are the worker
- All tables protected with appropriate RLS policies

## Setup Instructions

### 1. Environment Variables

Your `.env.local` file is already configured with:
```
NEXT_PUBLIC_SUPABASE_URL=https://eplmpbhbumynkelpzwos.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Database Setup

Follow the instructions in `DATABASE_SETUP.md` to:
1. Create users and appointments tables
2. Run the migration file (`supabase-migration.sql`)
3. Enable email confirmation in Supabase
4. Create your first admin user

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Application Flow

### Client Journey
1. Admin registers client account (client receives verification email)
2. Client clicks verification link in email
3. Client logs in with provided credentials
4. Client schedules appointment:
   - Select worker (admin)
   - Choose service
   - Pick date and time
   - Add optional notes
5. Client views their appointments

### Admin Journey
1. Admin logs in
2. Admin can:
   - View dashboard with appointments scheduled with them
   - Register new clients
   - Cancel appointments
   - See statistics

## Project Structure

```
my-app/
├── app/
│   ├── admin/
│   │   ├── dashboard/        # Admin dashboard
│   │   └── register/         # Client registration
│   ├── client/
│   │   ├── appointments/     # View appointments
│   │   └── schedule/         # Schedule new appointment
│   ├── login/               # Login page
│   └── api/
│       ├── appointments/    # Create appointment API
│       └── admin/           # Admin-specific APIs
├── components/
│   ├── AppointmentCard.tsx  # Reusable appointment card
│   └── Navbar.tsx          # Navigation bar
├── lib/
│   ├── supabase/           # Supabase client utilities
│   ├── queries/            # Database query functions
│   └── auth/               # Authentication helpers
├── types/
│   └── database.types.ts   # TypeScript types
├── middleware.ts           # Route protection
└── .env.local             # Environment variables
```

## Key Features Explained

### Separated Admin Pages
Each admin only sees appointments where the `worker` field matches their full name (`first_name + last_name`). This provides natural separation without complex filtering.

### Client Auto-Fill
When clients schedule appointments, their personal information (name, email, phone) is automatically pulled from their user account - they don't see or fill these fields.

### Email Verification
When admins register clients:
1. Client account is created in Supabase Auth
2. Supabase automatically sends verification email
3. Client must verify before logging in
4. Admin activity is logged

### Activity Logging
All admin actions are logged with:
- Admin ID
- Action type (register_client, cancel_appointment, etc.)
- Detailed information in JSON format
- Timestamp

## API Endpoints

### `/api/appointments` (POST)
Create new appointment (client-facing)

### `/api/admin/register-client` (POST)
Register new client account (admin-only)

### `/api/admin/cancel-appointment` (POST)
Cancel appointment (admin-only)

## Services Available

1. Classic Manicure - $35 (45 min)
2. Deluxe Pedicure - $55 (60 min)
3. Gel Nail Polish - $45 (60 min)
4. Acrylic Full Set - $75 (90 min)
5. Nail Art Design - $65 (75 min)

## Security Features

- Row Level Security (RLS) on all tables
- Email verification required for new clients
- Role-based access control (admin/client)
- Protected routes with middleware
- Secure session management
- Activity audit trail

## Production Deployment

### Vercel Deployment
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## Troubleshooting

### Email Verification Not Working
- Check Supabase Dashboard → Authentication → Settings
- Ensure "Confirm email" is enabled
- Verify email templates are configured

### RLS Policies Blocking Queries
- Run the migration file completely
- Check that users have correct roles in the database
- Verify RLS is enabled on all tables

### Admin Not Seeing Appointments
- Ensure `worker` field matches admin's full name exactly
- Check that admin's `first_name` and `last_name` are correct in users table

## Support

For issues or questions, check:
1. Database setup in `DATABASE_SETUP.md`
2. Supabase logs for auth issues
3. Browser console for client-side errors
4. Server logs for API errors

## License

MIT

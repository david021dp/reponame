# CAPTCHA Setup Instructions

## Step 1: Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click **"Create"** to create a new site
3. Choose **reCAPTCHA v3** (recommended - invisible)
4. Add your domain (e.g., `localhost` for development, your production domain)
5. Accept the terms and click **"Submit"**
6. You'll get two keys:
   - **Site Key** (public, goes in `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)
   - **Secret Key** (private, goes in `RECAPTCHA_SECRET_KEY`)

## Step 2: Add to .env.local

Create or update `.env.local` in the `my-app` folder:

```bash
# CAPTCHA Configuration (Optional but Recommended)
RECAPTCHA_SECRET_KEY=your_secret_key_here
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here

# Your existing Supabase keys (if not already present)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Restart Development Server

After adding the keys, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

- **Development**: CAPTCHA is optional (will work without keys)
- **Production**: CAPTCHA verification is required if keys are set
- The system automatically uses reCAPTCHA v3 (invisible, no user interaction needed)
- Backend verifies the token before processing registration

## Alternative: hCaptcha

If you prefer hCaptcha instead:

1. Get keys from [hCaptcha](https://www.hcaptcha.com/)
2. Use these environment variables:
   ```
   HCAPTCHA_SECRET_KEY=your_hcaptcha_secret
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
   ```

The code automatically detects which service you're using based on which keys are set.

## Testing

1. Without keys: Registration works (development mode)
2. With invalid keys: Registration fails with "CAPTCHA verification failed"
3. With valid keys: Registration works normally with bot protection


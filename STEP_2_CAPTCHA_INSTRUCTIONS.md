# Step 2: CAPTCHA Configuration - What You Need to Do

## ✅ Status: Setup Guide Created

I've created the setup files for you. Here's what you need to do:

## Quick Setup (5 minutes)

### Option A: Skip CAPTCHA for Now (Development)
- **You can skip this step** if you're still in development
- The app will work without CAPTCHA keys
- CAPTCHA verification is optional in development mode
- **You MUST add CAPTCHA keys before going to production**

### Option B: Set Up CAPTCHA Now (Recommended)

1. **Get reCAPTCHA Keys:**
   - Visit: https://www.google.com/recaptcha/admin
   - Click "Create" → Choose "reCAPTCHA v3"
   - Add your domain (use `localhost` for testing)
   - Copy your **Site Key** and **Secret Key**

2. **Add to .env.local:**
   - Open or create `my-app/.env.local`
   - Add these lines:
   ```
   RECAPTCHA_SECRET_KEY=paste_your_secret_key_here
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=paste_your_site_key_here
   ```

3. **Restart Server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## Files Created

- ✅ `CAPTCHA_SETUP.md` - Detailed setup instructions
- ✅ `.env.local.example` - Template file (copy to `.env.local`)

## What This Does

- Protects registration endpoint from bots
- Works invisibly (no user interaction needed)
- Automatically verifies tokens on the backend
- Optional in development, required in production

## Next Step

After setting up CAPTCHA (or skipping it), proceed to **Step 3** (see instructions below).


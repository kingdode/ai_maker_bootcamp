# Supabase Email/Password Auth Setup for DealStackr Admin

## Step 1: Your Supabase Project

Your project is already set up. Get your credentials from the [Supabase Dashboard](https://supabase.com/dashboard/project/tqrhrbebgucsyfbdirgi/settings/api).

## Step 2: Create Your Admin Account

1. Go to `http://localhost:3000/admin/login`
2. Click **"Don't have an account? Sign up"**
3. Enter your admin email
4. Create a password (minimum 6 characters)
5. Click **"Create Account"**
6. Check your email for a confirmation link (if enabled)
7. Click the link to confirm your account
8. Now you can sign in!

## Step 3: Verify Email Settings in Supabase (if emails not arriving)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/tqrhrbebgucsyfbdirgi/auth/providers)
2. Click **Email** provider
3. Make sure **Enable Email provider** is ON
4. Check **Confirm email** setting (can disable for easier testing)

## Step 4: Railway Environment Variables

In Railway dashboard → Your Service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `ADMIN_EMAIL` | Your admin email address |
| `OPENAI_API_KEY` | Your OpenAI API key (for AI article generation) |
| `SYNC_API_KEY` | A custom sync key for the Chrome extension (optional) |

## How Security Works

1. **Email Restriction**: Only the email in `ADMIN_EMAIL` can access `/admin`
2. **Middleware Protection**: Every request to `/admin/*` is checked
3. **Supabase Sessions**: Secure, HTTP-only cookies managed by Supabase
4. **Server-side Secrets**: OpenAI API key is stored server-side only

## Skip Email Confirmation (for testing)

If you don't want to wait for email confirmation:

1. Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/tqrhrbebgucsyfbdirgi/auth/providers)
2. Click **Email**
3. Turn OFF "Confirm email"
4. Save

Now you can sign up and immediately sign in without email confirmation.

## Troubleshooting

### "Invalid login credentials"
- Make sure you signed up first
- Check if email confirmation is required
- Try resetting your password

### Can't access /admin after login
- Make sure your email matches `ADMIN_EMAIL` exactly
- Check the console for errors

### Email not arriving
- Check spam folder
- Verify email settings in Supabase dashboard
- Consider disabling email confirmation for testing

# Supabase Email/Password Auth Setup for DealStackr Admin

## Step 1: Your Supabase Project

Your project is already set up:
- **Project URL**: `https://tqrhrbebgucsyfbdirgi.supabase.co`
- **Anon Key**: Already configured in `.env.local`

## Step 2: Create Your Admin Account

1. Go to `http://localhost:3000/admin/login`
2. Click **"Don't have an account? Sign up"**
3. Enter your email: `victorperez0313@gmail.com`
4. Create a password (minimum 6 characters)
5. Click **"Create Account"**
6. Check your email for a confirmation link
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
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tqrhrbebgucsyfbdirgi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcmhyYmViZ3Vjc3lmYmRpcmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzQ4MzMsImV4cCI6MjA4NDAxMDgzM30.ZXgM9GRbz2F6YwLVfDGeI_Hvq7BzUIkoXABnsLRNJW4` |
| `ADMIN_EMAIL` | `victorperez0313@gmail.com` |

## How Security Works

1. **Email Restriction**: Only `victorperez0313@gmail.com` can access `/admin`
2. **Middleware Protection**: Every request to `/admin/*` is checked
3. **Supabase Sessions**: Secure, HTTP-only cookies managed by Supabase

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

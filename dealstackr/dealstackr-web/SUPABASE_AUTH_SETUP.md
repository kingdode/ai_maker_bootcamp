# Supabase Auth Setup for DealStackr Admin

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Name it `dealstackr` and choose a strong database password
4. Wait for the project to be created

## Step 2: Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (the longer key)

## Step 3: Configure Google OAuth (Optional)

If you want "Sign in with Google":

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth credentials (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. In Supabase: **Authentication** → **Providers** → **Google**
5. Enable and paste your Client ID and Client Secret

## Step 4: Set Environment Variables

### Local Development

Create `.env.local` in the `dealstackr-web` folder:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Admin email restriction (optional - only this email can access admin)
ADMIN_EMAIL=your-email@gmail.com
```

### Railway Production

In Railway dashboard → Your Service → **Variables**:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
| `ADMIN_EMAIL` | your-email@gmail.com |

## Step 5: Create Your Admin Account

### Option A: Magic Link (Easiest)
1. Go to `/admin/login`
2. Enter your email and click "Send Magic Link"
3. Check your email and click the link

### Option B: Email/Password
1. Go to `/admin/login`
2. Click "Sign Up" tab
3. Enter email and password
4. Confirm via email link

### Option C: Google Sign-In
1. Go to `/admin/login`
2. Click "Continue with Google"
3. Sign in with your Google account

## Authentication Methods Available

| Method | Description |
|--------|-------------|
| **Magic Link** | Passwordless - get a link via email |
| **Email/Password** | Traditional sign up/sign in |
| **Google OAuth** | One-click Google sign in |

## Restricting Admin Access

Set the `ADMIN_EMAIL` environment variable to restrict access:

```bash
ADMIN_EMAIL=victor@example.com
```

Only this email can access `/admin`. Other users will see "Access denied".

## How It Works

1. User visits `/admin` → middleware checks auth
2. If not logged in → redirects to `/admin/login`
3. User signs in via preferred method
4. Supabase creates a secure session cookie
5. Middleware validates session on each request
6. If `ADMIN_EMAIL` is set, only that email can access

## Troubleshooting

### "Access denied" error
- Check that your email matches `ADMIN_EMAIL` exactly
- Clear cookies and try again

### Magic link not arriving
- Check spam folder
- Verify email is correct
- Check Supabase dashboard → Logs

### Google sign-in not working
- Verify OAuth credentials in Supabase
- Check redirect URI matches exactly
- Ensure Google provider is enabled in Supabase

### Session expires quickly
- Supabase handles session refresh automatically
- The middleware refreshes tokens on each request
